from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from permissions import DenyOrgAdmin
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import datetime, timedelta
from django.db import transaction
from django.shortcuts import render
from .models import WeeklyLogbook, LogbookAuditLog, LogbookMessage, CommentThread, CommentMessage, LogbookReviewRequest, UnlockRequest, Notification
from api.models import Supervision
from .serializers import (
    LogbookSerializer, LogbookDraftSerializer, EligibleWeekSerializer, 
    LogbookSubmissionSerializer, LogbookAuditLogSerializer,
    CommentThreadSerializer, CommentMessageSerializer, LogbookReviewRequestSerializer,
    UnlockRequestSerializer, NotificationSerializer
)
from logging_utils import support_error_handler
from rest_framework.parsers import JSONParser
from utils.duration_utils import minutes_to_hours_minutes, minutes_to_display_format, minutes_to_decimal_hours


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_list(request):
    """Get all submitted logbooks for the current user"""
    if not hasattr(request.user, 'profile') or request.user.profile.role not in ['PROVISIONAL', 'REGISTRAR']:
        return Response({'error': 'Only trainees can view logbooks'}, status=status.HTTP_403_FORBIDDEN)
    
    logbooks = WeeklyLogbook.objects.filter(trainee=request.user).order_by('-week_start_date')
    serializer = LogbookSerializer(logbooks, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_dashboard_list(request):
    """Get all weeks with entries for dashboard view, including weeks without logbooks"""
    try:
        print(f"DEBUG: Dashboard API called by user: {request.user.email}")
        
        if not hasattr(request.user, 'profile') or request.user.profile.role not in ['PROVISIONAL', 'REGISTRAR']:
            return Response({'error': 'Only trainees can view logbooks'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get current week start (Monday)
        today = timezone.now().date()
        current_week_start = today - timedelta(days=today.weekday())

        # Optional query params to widen or constrain the range returned
        # limit: max number of weeks returned (default 104, capped to 156)
        # since: only include weeks on/after this ISO date (YYYY-MM-DD)
        raw_limit = request.query_params.get('limit') or request.GET.get('limit')
        try:
            limit = int(raw_limit) if raw_limit else 104
            limit = 10 if limit < 10 else limit
            limit = 156 if limit > 156 else limit
        except (TypeError, ValueError):
            limit = 104

        since = request.query_params.get('since') or request.GET.get('since')
        since_date = None
        if since:
            try:
                since_date = datetime.strptime(since, '%Y-%m-%d').date()
            except ValueError:
                since_date = None
        
        # Import section models
        from section_a.models import SectionAEntry
        from section_b.models import ProfessionalDevelopmentEntry
        from section_c.models import SupervisionEntry
        from django.db.models import Sum
        
        # Get all weeks that have entries
        section_a_weeks = SectionAEntry.objects.filter(
            trainee=request.user,
            locked=False
        ).values_list('week_starting', flat=True).distinct()
        
        section_b_weeks = ProfessionalDevelopmentEntry.objects.filter(
            trainee=request.user,
            locked=False
        ).values_list('week_starting', flat=True).distinct()
        
        # For Section C, calculate week_starting from date_of_supervision
        trainee_profile = request.user.profile
        section_c_weeks = SupervisionEntry.objects.filter(
            trainee=trainee_profile,
            locked=False
        ).values_list('date_of_supervision', flat=True).distinct()
        
        # Convert Section C dates to week starts
        section_c_week_starts = set()
        for date in section_c_weeks:
            week_start = date - timedelta(days=date.weekday())
            section_c_week_starts.add(week_start)
        
        # Combine all weeks
        all_weeks = set(section_a_weeks) | set(section_b_weeks) | section_c_week_starts

        # Apply optional lower bound filter
        if since_date:
            all_weeks = {w for w in all_weeks if w >= since_date}
        
        # Limit to last N weeks to prevent performance issues
        sorted_weeks = sorted(all_weeks, reverse=True)[:limit]
        
        # Filter out current week and future weeks
        available_weeks = []
        for week_start in sorted_weeks:
            if week_start < current_week_start:  # Only past weeks
                week_end = week_start + timedelta(days=6)
                
                # Check if logbook exists for this week
                try:
                    logbook = WeeklyLogbook.objects.get(
                        trainee=request.user,
                        week_start_date=week_start
                    )
                    # Logbook exists - use its data
                    totals = logbook.calculate_section_totals()
                    active_unlock = logbook.get_active_unlock()
                    
                    available_weeks.append({
                        'id': logbook.id,
                        'week_start_date': logbook.week_start_date,
                        'week_end_date': logbook.week_end_date,
                        'week_display': logbook.week_display,
                        'week_starting_display': f"Week of {logbook.week_start_date.strftime('%d %b %Y')}",
                        'status': logbook.status,
                        'rag_status': logbook.get_rag_status(),
                        'is_overdue': logbook.is_overdue(),
                        'has_supervisor_comments': logbook.has_supervisor_comments(),
                        'is_editable': logbook.is_editable_by_user(request.user),
                        'supervisor_comments': logbook.supervisor_comments,
                        'submitted_at': logbook.submitted_at,
                        'reviewed_at': logbook.reviewed_at,
                        'reviewed_by_name': f"{logbook.reviewed_by.profile.first_name} {logbook.reviewed_by.profile.last_name}".strip() if logbook.reviewed_by and hasattr(logbook.reviewed_by, 'profile') and logbook.reviewed_by.profile else None,
                        'section_totals': totals,
                        'active_unlock': {
                            'unlock_expires_at': active_unlock.unlock_expires_at,
                            'duration_minutes': active_unlock.duration_minutes,
                            'remaining_minutes': active_unlock.get_remaining_time_minutes()
                        } if active_unlock else None,
                        'has_logbook': True
                    })
                except WeeklyLogbook.DoesNotExist:
                    # No logbook exists - create a "ready" entry with calculated stats
                    
                    # Calculate totals from entries
                    section_a_entries = SectionAEntry.objects.filter(
                        trainee=request.user,
                        week_starting=week_start,
                        locked=False
                    )
                    section_b_entries = ProfessionalDevelopmentEntry.objects.filter(
                        trainee=request.user,
                        week_starting=week_start,
                        locked=False
                    )
                    section_c_entries = SupervisionEntry.objects.filter(
                        trainee=trainee_profile,
                        week_starting=week_start,
                        locked=False
                    )
                    
                    # Create a temporary logbook to use its calculation method
                    temp_logbook = WeeklyLogbook(
                        trainee=request.user,
                        week_start_date=week_start,
                        week_end_date=week_end,
                        section_a_entry_ids=[entry.id for entry in section_a_entries],
                        section_b_entry_ids=[entry.id for entry in section_b_entries],
                        section_c_entry_ids=[entry.id for entry in section_c_entries]
                    )
                    
                    # Use the same calculation method as the model
                    try:
                        totals = temp_logbook.calculate_section_totals()
                    except Exception as e:
                        print(f"ERROR calculating totals for week {week_start}: {e}")
                        import traceback
                        traceback.print_exc()
                        # Skip this week if calculation fails
                        continue
                    
                    # Check if overdue (past week end date)
                    is_overdue = today > week_end
                    
                    available_weeks.append({
                        'id': None,  # No logbook ID yet
                        'week_start_date': week_start,
                        'week_end_date': week_end,
                        'week_display': f"{week_start.strftime('%d %b %Y')} - {week_end.strftime('%d %b %Y')}",
                        'week_starting_display': f"Week of {week_start.strftime('%d %b %Y')}",
                        'status': 'ready',
                        'rag_status': 'red' if is_overdue else 'amber',
                        'is_overdue': is_overdue,
                        'has_supervisor_comments': False,
                        'is_editable': True,
                        'supervisor_comments': None,
                        'submitted_at': None,
                        'reviewed_at': None,
                        'reviewed_by_name': None,
                        'section_totals': totals,
                        'active_unlock': None,
                        'has_logbook': False
                    })
        
        # Sort by week start date (most recent first)
        available_weeks.sort(key=lambda x: x['week_start_date'], reverse=True)
        
        print(f"DEBUG: Returning {len(available_weeks)} weeks")
        return Response(available_weeks)
        
    except Exception as e:
        print(f"ERROR in logbook_dashboard_list: {e}")
        import traceback
        traceback.print_exc()
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_status_summary(request):
    """Get logbook status summary for dashboard display"""
    if not hasattr(request.user, 'profile') or request.user.profile.role not in ['PROVISIONAL', 'REGISTRAR']:
        return Response({'error': 'Only trainees can view logbook status'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get current week start (Monday)
    today = timezone.now().date()
    current_week_start = today - timedelta(days=today.weekday())
    
    # Import section models
    from section_a.models import SectionAEntry
    from section_b.models import ProfessionalDevelopmentEntry
    from section_c.models import SupervisionEntry
    from django.db.models import Sum
    
    # Get all weeks that have entries
    section_a_weeks = SectionAEntry.objects.filter(
        trainee=request.user,
        locked=False
    ).values_list('week_starting', flat=True).distinct()
    
    section_b_weeks = ProfessionalDevelopmentEntry.objects.filter(
        trainee=request.user,
        locked=False
    ).values_list('week_starting', flat=True).distinct()
    
    # For Section C, calculate week_starting from date_of_supervision
    trainee_profile = request.user.profile
    section_c_weeks = SupervisionEntry.objects.filter(
        trainee=trainee_profile,
        locked=False
    ).values_list('date_of_supervision', flat=True).distinct()
    
    # Convert Section C dates to week starts
    section_c_week_starts = set()
    for date in section_c_weeks:
        week_start = date - timedelta(days=date.weekday())
        section_c_week_starts.add(week_start)
    
    # Combine all weeks
    all_weeks = set(section_a_weeks) | set(section_b_weeks) | section_c_week_starts
    
    # Filter out current week and future weeks
    available_weeks = []
    for week_start in all_weeks:
        if week_start < current_week_start:  # Only past weeks
            week_end = week_start + timedelta(days=6)
            
            # Check if logbook exists for this week
            try:
                logbook = WeeklyLogbook.objects.get(
                    trainee=request.user,
                    week_start_date=week_start
                )
                # Logbook exists - use its data
                available_weeks.append({
                    'status': logbook.status,
                    'rag_status': logbook.get_rag_status(),
                    'is_overdue': logbook.is_overdue(),
                    'has_logbook': True
                })
            except WeeklyLogbook.DoesNotExist:
                # No logbook exists - treat as ready but check if overdue
                is_overdue = today > week_end
                available_weeks.append({
                    'status': 'ready',
                    'rag_status': 'red' if is_overdue else 'amber',
                    'is_overdue': is_overdue,
                    'has_logbook': False
                })
    
    # Count by status
    status_counts = {
        'total': len(available_weeks),
        'ready': 0,
        'submitted': 0,
        'approved': 0,
        'rejected': 0,
        'overdue': 0,
        'new': 0  # weeks without logbooks
    }
    
    for week in available_weeks:
        if week['is_overdue']:
            status_counts['overdue'] += 1
        if week['status'] == 'ready':
            status_counts['ready'] += 1
        if week['status'] == 'submitted':
            status_counts['submitted'] += 1
        if week['status'] == 'approved':
            status_counts['approved'] += 1
        if week['status'] == 'rejected':
            status_counts['rejected'] += 1
        if not week['has_logbook']:
            status_counts['new'] += 1
    
    # Determine overall RAG status
    if status_counts['overdue'] > 0:
        overall_status = 'red'
        status_message = f"{status_counts['overdue']} logbook(s) overdue"
    elif status_counts['rejected'] > 0:
        overall_status = 'red'
        status_message = f"{status_counts['rejected']} logbook(s) need revision"
    elif status_counts['new'] > 0:
        overall_status = 'amber'
        status_message = f"{status_counts['new']} week(s) ready for logbook creation"
    elif status_counts['submitted'] > 0:
        overall_status = 'amber'
        status_message = f"{status_counts['submitted']} logbook(s) awaiting review"
    else:
        overall_status = 'green'
        status_message = "All logbooks up to date"
    
    return Response({
        'overall_status': overall_status,
        'status_message': status_message,
        'status_counts': status_counts,
        'total_weeks': len(available_weeks)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
def eligible_weeks(request):
    """Get eligible weeks for logbook submission (weeks with unlinked entries, excluding current week)"""
    if not hasattr(request.user, 'profile') or request.user.profile.role not in ['PROVISIONAL', 'REGISTRAR']:
        return Response({'error': 'Only trainees can view eligible weeks'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get current week start (Monday)
    today = timezone.now().date()
    current_week_start = today - timedelta(days=today.weekday())
    
    # Import section models
    from section_a.models import SectionAEntry
    from section_b.models import ProfessionalDevelopmentEntry
    from section_c.models import SupervisionEntry
    
    # Get all weeks that have entries
    section_a_weeks = SectionAEntry.objects.filter(
        trainee=request.user,
        locked=False
    ).values_list('week_starting', flat=True).distinct()
    
    section_b_weeks = ProfessionalDevelopmentEntry.objects.filter(
        trainee=request.user,
        locked=False
    ).values_list('week_starting', flat=True).distinct()
    
    # For Section C, we need to calculate week_starting from date_of_supervision
    trainee_profile = request.user.profile
    section_c_weeks = SupervisionEntry.objects.filter(
        trainee=trainee_profile,
        locked=False
    ).values_list('date_of_supervision', flat=True).distinct()
    
    # Convert Section C dates to week starts
    section_c_week_starts = set()
    for date in section_c_weeks:
        week_start = date - timedelta(days=date.weekday())
        section_c_week_starts.add(week_start)
    
    # Combine all weeks
    all_weeks = set(section_a_weeks) | set(section_b_weeks) | section_c_week_starts
    
    # Filter out current week and future weeks
    eligible_weeks = []
    for week_start in all_weeks:
        if week_start < current_week_start:  # Only past weeks
            week_end = week_start + timedelta(days=6)
            
            # Count entries for this week
            section_a_count = SectionAEntry.objects.filter(
                trainee=request.user,
                week_starting=week_start,
                locked=False
            ).count()
            
            section_b_count = ProfessionalDevelopmentEntry.objects.filter(
                trainee=request.user,
                week_starting=week_start,
                locked=False
            ).count()
            
            section_c_count = SupervisionEntry.objects.filter(
                trainee=trainee_profile,
                week_starting=week_start,
                locked=False
            ).count()
            
            total_entries = section_a_count + section_b_count + section_c_count
            
            # Only include weeks that have entries
            if total_entries > 0:
                eligible_weeks.append({
                    'week_start': week_start,
                    'week_end': week_end,
                    'week_display': f"{week_start.strftime('%d %b %Y')} - {week_end.strftime('%d %b %Y')}",
                    'section_a_count': section_a_count,
                    'section_b_count': section_b_count,
                    'section_c_count': section_c_count,
                    'total_entries': total_entries
                })
    
    # Sort by week start date (most recent first)
    eligible_weeks.sort(key=lambda x: x['week_start'], reverse=True)
    
    serializer = EligibleWeekSerializer(eligible_weeks, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_draft(request):
    """Create a draft logbook preview for a specific week"""
    if not hasattr(request.user, 'profile') or request.user.profile.role not in ['PROVISIONAL', 'REGISTRAR']:
        return Response({'error': 'Only trainees can create logbook drafts'}, status=status.HTTP_403_FORBIDDEN)
    
    week_start = request.data.get('week_start')
    if not week_start:
        return Response({'error': 'week_start is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Parse date
    try:
        if isinstance(week_start, str):
            week_start = datetime.strptime(week_start, '%Y-%m-%d').date()
    except ValueError:
        return Response({'error': 'Invalid week_start format'}, status=status.HTTP_400_BAD_REQUEST)
    
    week_end = week_start + timedelta(days=6)
    
    # Import section models
    from section_a.models import SectionAEntry
    from section_b.models import ProfessionalDevelopmentEntry
    from section_c.models import SupervisionEntry
    from django.db.models import Sum
    
    # Get entries for this week
    trainee_profile = request.user.profile
    
    section_a_entries = SectionAEntry.objects.filter(
        trainee=request.user,
        week_starting=week_start,
        locked=False
    ).order_by('session_date', 'created_at')
    
    section_b_entries = ProfessionalDevelopmentEntry.objects.filter(
        trainee=request.user,
        week_starting=week_start,
        locked=False
    ).order_by('date_of_activity', 'created_at')
    
    section_c_entries = SupervisionEntry.objects.filter(
        trainee=trainee_profile,
        week_starting=week_start,
        locked=False
    ).order_by('date_of_supervision', 'created_at')
    
    # Calculate totals
    section_a_total_minutes = sum(entry.duration_minutes or 0 for entry in section_a_entries)
    section_b_total_minutes = sum(entry.duration_minutes or 0 for entry in section_b_entries)
    section_c_total_minutes = sum(entry.duration_minutes or 0 for entry in section_c_entries)
    
    # Calculate cumulative totals up to this week
    cumulative_section_a = SectionAEntry.objects.filter(
        trainee=request.user,
        week_starting__lt=week_start + timedelta(days=6)
    ).aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
    
    cumulative_section_b = ProfessionalDevelopmentEntry.objects.filter(
        trainee=request.user,
        week_starting__lt=week_start + timedelta(days=6)
    ).aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
    
    cumulative_section_c = SupervisionEntry.objects.filter(
        trainee=trainee_profile,
        week_starting__lt=week_start + timedelta(days=6)
    ).aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
    
    draft_data = {
        'week_start': week_start,
        'week_end': week_end,
        'section_a_entries': section_a_entries,
        'section_b_entries': section_b_entries,
        'section_c_entries': section_c_entries,
        'totals': {
            'section_a': {
                'weekly_minutes': section_a_total_minutes,
                'cumulative_minutes': cumulative_section_a,
                'weekly_hours': minutes_to_hours_minutes(section_a_total_minutes),
                'cumulative_hours': minutes_to_hours_minutes(cumulative_section_a)
            },
            'section_b': {
                'weekly_minutes': section_b_total_minutes,
                'cumulative_minutes': cumulative_section_b,
                'weekly_hours': minutes_to_hours_minutes(section_b_total_minutes),
                'cumulative_hours': minutes_to_hours_minutes(cumulative_section_b)
            },
            'section_c': {
                'weekly_minutes': section_c_total_minutes,
                'cumulative_minutes': cumulative_section_c,
                'weekly_hours': minutes_to_hours_minutes(section_c_total_minutes),
                'cumulative_hours': minutes_to_hours_minutes(cumulative_section_c)
            },
            'total': {
                'weekly_minutes': section_a_total_minutes + section_b_total_minutes + section_c_total_minutes,
                'cumulative_minutes': cumulative_section_a + cumulative_section_b + cumulative_section_c,
                'weekly_hours': minutes_to_hours_minutes(section_a_total_minutes + section_b_total_minutes + section_c_total_minutes),
                'cumulative_hours': minutes_to_hours_minutes(cumulative_section_a + cumulative_section_b + cumulative_section_c)
            }
        }
    }
    
    serializer = LogbookDraftSerializer(draft_data)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_create(request):
    """Create a new weekly logbook"""
    if not hasattr(request.user, 'profile') or request.user.profile.role not in ['PROVISIONAL', 'REGISTRAR']:
        return Response({'error': 'Only trainees can create logbooks'}, status=status.HTTP_403_FORBIDDEN)
    
    week_start_date = request.data.get('week_start_date')
    if not week_start_date:
        return Response({'error': 'week_start_date is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Parse date
    try:
        if isinstance(week_start_date, str):
            week_start_date = datetime.strptime(week_start_date, '%Y-%m-%d').date()
    except ValueError:
        return Response({'error': 'Invalid week_start_date format'}, status=status.HTTP_400_BAD_REQUEST)
    
    week_end_date = week_start_date + timedelta(days=6)
    
    # Check if logbook already exists for this week
    existing_logbook = WeeklyLogbook.objects.filter(
        trainee=request.user,
        week_start_date=week_start_date
    ).first()
    
    if existing_logbook:
        # If it exists and is approved or submitted, don't allow regeneration
        if existing_logbook.status in ['approved', 'submitted']:
            return Response({
                'error': f'Cannot regenerate logbook with status: {existing_logbook.status}',
                'existing_logbook_id': existing_logbook.id,
                'status': existing_logbook.status
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # If it exists and is ready or rejected, delete it and create new one
        existing_logbook.delete()
    
    # Import section models to get entry IDs
    from section_a.models import SectionAEntry
    from section_b.models import ProfessionalDevelopmentEntry
    from section_c.models import SupervisionEntry
    
    # Get entries for this week
    trainee_profile = request.user.profile
    
    section_a_entries = SectionAEntry.objects.filter(
        trainee=request.user,
        week_starting=week_start_date,
        locked=False
    )
    
    section_b_entries = ProfessionalDevelopmentEntry.objects.filter(
        trainee=request.user,
        week_starting=week_start_date,
        locked=False
    )
    
    section_c_entries = SupervisionEntry.objects.filter(
        trainee=trainee_profile,
        week_starting=week_start_date,
        locked=False
    )
    
    # Create the logbook
    logbook = WeeklyLogbook.objects.create(
        trainee=request.user,
        week_start_date=week_start_date,
        week_end_date=week_end_date,
        status='ready',
        section_a_entry_ids=[entry.id for entry in section_a_entries],
        section_b_entry_ids=[entry.id for entry in section_b_entries],
        section_c_entry_ids=[entry.id for entry in section_c_entries]
    )
    
    # Calculate and return totals
    totals = logbook.calculate_section_totals()
    
    return Response({
        'id': logbook.id,
        'week_start_date': logbook.week_start_date,
        'week_end_date': logbook.week_end_date,
        'week_display': logbook.week_display,
        'week_starting_display': f"Week of {logbook.week_start_date.strftime('%d %b %Y')}",
        'status': logbook.status,
        'rag_status': logbook.get_rag_status(),
        'is_overdue': logbook.is_overdue(),
        'has_supervisor_comments': logbook.has_supervisor_comments(),
        'is_editable': logbook.is_editable_by_user(request.user),
        'supervisor_comments': logbook.supervisor_comments,
        'submitted_at': logbook.submitted_at,
        'reviewed_at': logbook.reviewed_at,
        'reviewed_by_name': f"{logbook.reviewed_by.profile.first_name} {logbook.reviewed_by.profile.last_name}".strip() if logbook.reviewed_by and hasattr(logbook.reviewed_by, 'profile') else None,
        'section_totals': totals,
        'active_unlock': None,
        'has_logbook': True
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_submit(request):
    """Submit a logbook for supervisor review"""
    if not hasattr(request.user, 'profile') or request.user.profile.role not in ['PROVISIONAL', 'REGISTRAR']:
        return Response({'error': 'Only trainees can submit logbooks'}, status=status.HTTP_403_FORBIDDEN)
    
    # Check if user has a principal supervisor assigned
    user_profile = request.user.profile
    if not user_profile.principal_supervisor or not user_profile.principal_supervisor_email:
        return Response({
            'error': 'You must have a principal supervisor assigned before submitting a logbook. Please update your profile with supervisor information.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if supervisor relationship is accepted
    supervisor_relationship = Supervision.objects.filter(
        supervisee=request.user,
        role='PRIMARY',
        status='ACCEPTED'
    ).first()
    
    if not supervisor_relationship:
        return Response({
            'error': 'Your supervisor relationship must be accepted before submitting a logbook. Please ensure your supervisor has accepted your supervision invitation.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    week_start_date = request.data.get('week_start')
    if not week_start_date:
        return Response({'error': 'week_start is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Parse date
    try:
        if isinstance(week_start_date, str):
            week_start_date = datetime.strptime(week_start_date, '%Y-%m-%d').date()
    except ValueError:
        return Response({'error': 'Invalid week_start format'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if logbook already exists for this week
    existing_logbook = WeeklyLogbook.objects.filter(
        trainee=request.user,
        week_start_date=week_start_date
    ).first()
    
    if not existing_logbook:
        return Response({'error': 'No logbook found for this week. Please save a draft first.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if existing_logbook.status in ['submitted', 'approved']:
        return Response({'error': f'Logbook already {existing_logbook.status}'}, status=status.HTTP_400_BAD_REQUEST)
    
    with transaction.atomic():
        # Update existing logbook to submitted status
        existing_logbook.status = 'submitted'
        existing_logbook.submitted_at = timezone.now()
        existing_logbook.save()
        
        # Lock all entries
        from section_a.models import SectionAEntry
        from section_b.models import ProfessionalDevelopmentEntry
        from section_c.models import SupervisionEntry
        
        SectionAEntry.objects.filter(
            id__in=existing_logbook.section_a_entry_ids,
            trainee=request.user
        ).update(locked=True)
        
        ProfessionalDevelopmentEntry.objects.filter(
            id__in=existing_logbook.section_b_entry_ids,
            trainee=request.user
        ).update(locked=True)
        
        SupervisionEntry.objects.filter(
            id__in=existing_logbook.section_c_entry_ids,
            trainee=request.user.profile
        ).update(locked=True)
        
        # Create audit log entry
        LogbookAuditLog.objects.create(
            logbook=existing_logbook,
            action='submitted',
            user=request.user,
            new_status='submitted'
        )
        
        # Return updated logbook data
        return Response({
            'id': existing_logbook.id,
            'week_start_date': existing_logbook.week_start_date,
            'week_end_date': existing_logbook.week_end_date,
            'week_display': existing_logbook.week_display,
            'week_starting_display': f"Week of {existing_logbook.week_start_date.strftime('%d %b %Y')}",
            'status': existing_logbook.status,
            'rag_status': existing_logbook.get_rag_status(),
            'is_overdue': existing_logbook.is_overdue(),
            'has_supervisor_comments': existing_logbook.has_supervisor_comments(),
            'is_editable': existing_logbook.is_editable_by_user(request.user),
            'supervisor_comments': existing_logbook.supervisor_comments,
            'submitted_at': existing_logbook.submitted_at,
            'reviewed_at': existing_logbook.reviewed_at,
            'reviewed_by_name': f"{existing_logbook.reviewed_by.profile.first_name} {existing_logbook.reviewed_by.profile.last_name}".strip() if existing_logbook.reviewed_by and hasattr(existing_logbook.reviewed_by, 'profile') else None,
            'section_totals': existing_logbook.calculate_section_totals(),
            'active_unlock': None,
            'has_logbook': True
        }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_detail(request, logbook_id):
    """Get detailed information about a specific logbook"""
    try:
        logbook = WeeklyLogbook.objects.get(id=logbook_id)
    except WeeklyLogbook.DoesNotExist:
        return Response({'error': 'Logbook not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check permissions
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)
    
    user_role = request.user.profile.role
    if user_role not in ['PROVISIONAL', 'REGISTRAR', 'SUPERVISOR']:
        return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    # Trainees can only view their own logbooks
    if user_role in ['PROVISIONAL', 'REGISTRAR'] and logbook.trainee != request.user:
        return Response({'error': 'Can only view your own logbooks'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = LogbookSerializer(logbook)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_audit_logs(request, logbook_id):
    """Get audit logs for a specific logbook"""
    try:
        logbook = WeeklyLogbook.objects.get(id=logbook_id)
    except WeeklyLogbook.DoesNotExist:
        return Response({'error': 'Logbook not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check permissions
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)
    
    user_role = request.user.profile.role
    if user_role not in ['PROVISIONAL', 'REGISTRAR', 'SUPERVISOR']:
        return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    # Trainees can only view their own logbooks
    if user_role in ['PROVISIONAL', 'REGISTRAR'] and logbook.trainee != request.user:
        return Response({'error': 'Can only view your own logbooks'}, status=status.HTTP_403_FORBIDDEN)
    
    audit_logs = LogbookAuditLog.objects.filter(logbook=logbook).order_by('-timestamp')
    serializer = LogbookAuditLogSerializer(audit_logs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
def supervisor_logbooks(request):
    """Get all logbooks submitted by supervisees for supervisor review"""
    if not hasattr(request.user, 'profile') or request.user.profile.role != 'SUPERVISOR':
        return Response({'error': 'Only supervisors can view supervisee logbooks'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get filter parameter
    status_filter = request.query_params.get('status', 'submitted')
    
    # Get supervisees for this supervisor
    supervisee_relationships = Supervision.objects.filter(
        supervisor=request.user,
        role='PRIMARY',
        status='ACCEPTED'
    )
    supervisee_users = [rel.supervisee for rel in supervisee_relationships if rel.supervisee]
    
    if not supervisee_users:
        return Response([])
    
    # Build queryset based on filter and supervisees
    if status_filter == 'all':
        logbooks = WeeklyLogbook.objects.filter(trainee__in=supervisee_users)
    elif status_filter in ['submitted', 'rejected', 'approved']:
        logbooks = WeeklyLogbook.objects.filter(
            trainee__in=supervisee_users,
            status=status_filter
        )
    else:
        logbooks = WeeklyLogbook.objects.filter(
            trainee__in=supervisee_users,
            status='submitted'
        )
    
    logbooks = logbooks.order_by('-submitted_at')
    
    # Format the response for supervisor review
    supervisor_logbooks = []
    for logbook in logbooks:
        trainee_profile = logbook.trainee.profile
        supervisor_logbooks.append({
            'id': logbook.id,
            'trainee_name': f"{trainee_profile.first_name} {trainee_profile.last_name}".strip(),
            'trainee_email': logbook.trainee.email,
            'week_start_date': logbook.week_start_date,
            'week_end_date': logbook.week_end_date,
            'week_display': logbook.week_display,
            'status': logbook.status,
            'submitted_at': logbook.submitted_at,
            'reviewed_at': logbook.reviewed_at,
            'supervisor_comments': logbook.supervisor_comments,
            'section_totals': logbook.calculate_section_totals(),
            'message_count': logbook.messages.count()
        })
    
    return Response(supervisor_logbooks)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_approve(request, logbook_id):
    """Approve a logbook"""
    if not hasattr(request.user, 'profile') or request.user.profile.role != 'SUPERVISOR':
        return Response({'error': 'Only supervisors can approve logbooks'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        logbook = WeeklyLogbook.objects.get(id=logbook_id)
    except WeeklyLogbook.DoesNotExist:
        return Response({'error': 'Logbook not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if logbook.status != 'submitted':
        return Response({'error': 'Can only approve submitted logbooks'}, status=status.HTTP_400_BAD_REQUEST)
    
    logbook.status = 'approved'
    logbook.reviewed_at = timezone.now()
    logbook.reviewed_by = request.user
    logbook.save()
    
    # Create audit log entry
    LogbookAuditLog.objects.create(
        logbook=logbook,
        action='approved',
        user=request.user,
        new_status='approved'
    )
    
    return Response({'message': 'Logbook approved successfully'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_reject(request, logbook_id):
    """Reject a logbook with comments"""
    if not hasattr(request.user, 'profile') or request.user.profile.role != 'SUPERVISOR':
        return Response({'error': 'Only supervisors can reject logbooks'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        logbook = WeeklyLogbook.objects.get(id=logbook_id)
    except WeeklyLogbook.DoesNotExist:
        return Response({'error': 'Logbook not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if logbook.status != 'submitted':
        return Response({'error': 'Can only reject submitted logbooks'}, status=status.HTTP_400_BAD_REQUEST)
    
    comments = request.data.get('comments', '')
    if not comments:
        return Response({'error': 'Comments are required for rejection'}, status=status.HTTP_400_BAD_REQUEST)
    
    logbook.status = 'rejected'
    logbook.reviewed_at = timezone.now()
    logbook.reviewed_by = request.user
    logbook.supervisor_comments = comments
    logbook.save()
    
    # Create audit log entry
    LogbookAuditLog.objects.create(
        logbook=logbook,
        action='rejected',
        user=request.user,
        new_status='rejected',
        comments=comments
    )
    
    return Response({'message': 'Logbook rejected successfully'})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_messages(request, logbook_id):
    """Get or send messages for a logbook rejection thread"""
    try:
        logbook = WeeklyLogbook.objects.get(id=logbook_id)
    except WeeklyLogbook.DoesNotExist:
        return Response({'error': 'Logbook not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)
    
    user_role = request.user.profile.role
    if user_role not in ['SUPERVISOR', 'PROVISIONAL', 'REGISTRAR']:
        return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    # Trainees can only view their own logbooks
    if user_role in ['PROVISIONAL', 'REGISTRAR'] and logbook.trainee != request.user:
        return Response({'error': 'Can only view your own logbooks'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        messages = LogbookMessage.objects.filter(logbook=logbook).order_by('created_at')
        return Response([{
            'id': msg.id,
            'author_role': msg.author_role,
            'author_name': f"{msg.author.profile.first_name} {msg.author.profile.last_name}".strip() if hasattr(msg.author, 'profile') else msg.author.email,
            'message': msg.message,
            'created_at': msg.created_at
        } for msg in messages])
    
    elif request.method == 'POST':
        message_text = request.data.get('message', '').strip()
        if not message_text:
            return Response({'error': 'Message cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Determine author role - map UserProfile roles to CommentMessage roles
        role_mapping = {
            'SUPERVISOR': 'supervisor',
            'PROVISIONAL': 'provisional', 
            'REGISTRAR': 'registrar',
            'ORG_ADMIN': 'org_admin'
        }
        author_role = role_mapping.get(user_role, 'provisional')
        
        # Create message
        message = LogbookMessage.objects.create(
            logbook=logbook,
            author=request.user,
            author_role=author_role,
            message=message_text
        )
        
        # Log in audit trail
        LogbookAuditLog.objects.create(
            logbook=logbook,
            action='message_sent',
            user=request.user,
            user_role=author_role,
            comments=message_text,
            target_id=str(message.id)
        )
        
        return Response({
            'id': message.id,
            'author_role': message.author_role,
            'author_name': f"{message.author.profile.first_name} {message.author.profile.last_name}".strip() if hasattr(message.author, 'profile') else message.author.email,
            'message': message.message,
            'created_at': message.created_at
        }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_audit_trail(request, logbook_id):
    """Get comprehensive audit trail for a logbook"""
    try:
        logbook = WeeklyLogbook.objects.get(id=logbook_id)
    except WeeklyLogbook.DoesNotExist:
        return Response({'error': 'Logbook not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)
    
    user_role = request.user.profile.role
    if user_role not in ['SUPERVISOR', 'PROVISIONAL', 'REGISTRAR', 'ORG_ADMIN']:
        return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    # Trainees can only view their own logbooks
    if user_role in ['PROVISIONAL', 'REGISTRAR'] and logbook.trainee != request.user:
        return Response({'error': 'Can only view your own logbooks'}, status=status.HTTP_403_FORBIDDEN)
    
    audit_logs = LogbookAuditLog.objects.filter(logbook=logbook).order_by('-timestamp')
    return Response([{
        'id': log.id,
        'action': log.action,
        'user_role': log.user_role,
        'user_name': f"{log.user.profile.first_name} {log.user.profile.last_name}".strip() if log.user and hasattr(log.user, 'profile') else (log.user.email if log.user else 'System'),
        'timestamp': log.timestamp,
        'comments': log.comments,
        'previous_status': log.previous_status,
        'new_status': log.new_status,
        'target_id': log.target_id,
        'metadata': log.metadata
    } for log in audit_logs])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_resubmit(request, logbook_id):
    """Resubmit a rejected logbook for review"""
    if not hasattr(request.user, 'profile') or request.user.profile.role not in ['PROVISIONAL', 'REGISTRAR']:
        return Response({'error': 'Only trainees can resubmit logbooks'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        logbook = WeeklyLogbook.objects.get(id=logbook_id)
    except WeeklyLogbook.DoesNotExist:
        return Response({'error': 'Logbook not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if logbook.trainee != request.user:
        return Response({'error': 'Can only resubmit your own logbooks'}, status=status.HTTP_403_FORBIDDEN)
    
    if logbook.status != 'rejected':
        return Response({'error': 'Can only resubmit rejected logbooks'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Update status and timestamps
    logbook.status = 'submitted'
    logbook.submitted_at = timezone.now()
    logbook.save()
    
    # Lock entries again
    from section_a.models import SectionAEntry
    from section_b.models import ProfessionalDevelopmentEntry
    from section_c.models import SupervisionEntry
    
    SectionAEntry.objects.filter(id__in=logbook.section_a_entry_ids).update(locked=True)
    ProfessionalDevelopmentEntry.objects.filter(id__in=logbook.section_b_entry_ids).update(locked=True)
    SupervisionEntry.objects.filter(id__in=logbook.section_c_entry_ids).update(locked=True)
    
    # Log resubmission
    LogbookAuditLog.objects.create(
        logbook=logbook,
        action='resubmitted',
        user=request.user,
        user_role='trainee',
        previous_status='rejected',
        new_status='submitted'
    )
    
    return Response({'message': 'Logbook resubmitted successfully'})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_comment_threads(request, logbook_id):
    """Get or create comment threads for a logbook"""
    try:
        logbook = WeeklyLogbook.objects.get(id=logbook_id)
    except WeeklyLogbook.DoesNotExist:
        return Response({'error': 'Logbook not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)
    
    user_role = request.user.profile.role
    if user_role not in ['SUPERVISOR', 'PROVISIONAL', 'REGISTRAR']:
        return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    # Trainees can only view their own logbooks
    if user_role in ['PROVISIONAL', 'REGISTRAR'] and logbook.trainee != request.user:
        return Response({'error': 'Can only view your own logbooks'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        # Get all comment threads for this logbook
        threads = CommentThread.objects.filter(logbook=logbook).prefetch_related('messages__author__profile')
        serializer = CommentThreadSerializer(threads, many=True, context={'request': request})
        
        # Mark comments as seen by the current user
        for thread in threads:
            for message in thread.messages.all():
                message.mark_as_seen(request.user)
        
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Create a new comment thread
        thread_type = request.data.get('thread_type', 'general')
        entry_id = request.data.get('entry_id', '')
        entry_section = request.data.get('entry_section', '')
        message_text = request.data.get('message', '').strip()
        
        if not message_text:
            return Response({'error': 'Message cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
        
        if thread_type == 'entry' and not entry_id:
            return Response({'error': 'Entry ID required for entry-specific comments'}, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            # Create or get thread
            thread, created = CommentThread.objects.get_or_create(
                logbook=logbook,
                entry_id=entry_id if thread_type == 'entry' else None,
                entry_section=entry_section if thread_type == 'entry' else None,
                thread_type=thread_type,
                defaults={'logbook': logbook}
            )
            
            # Create the first message
            # Determine author role - map UserProfile roles to CommentMessage roles
            role_mapping = {
                'SUPERVISOR': 'supervisor',
                'PROVISIONAL': 'provisional', 
                'REGISTRAR': 'registrar',
                'ORG_ADMIN': 'org_admin'
            }
            author_role = role_mapping.get(user_role, 'provisional')
            comment_message = CommentMessage.objects.create(
                thread=thread,
                author=request.user,
                author_role=author_role,
                message=message_text
            )
            
            # Log in audit trail
            LogbookAuditLog.objects.create(
                logbook=logbook,
                action='comment_added',
                user=request.user,
                user_role=author_role,
                comments=f"Added {thread_type} comment",
                target_id=str(comment_message.id),
                metadata={
                    'thread_id': thread.id,
                    'entry_id': entry_id,
                    'entry_section': entry_section
                }
            )
        
        # Return the thread with messages
        serializer = CommentThreadSerializer(thread)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def comment_message_reply(request, comment_id):
    """Add a reply to an existing comment message"""
    try:
        parent_message = CommentMessage.objects.get(id=comment_id)
        thread = parent_message.thread
        logbook = thread.logbook
    except CommentMessage.DoesNotExist:
        return Response({'error': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)
    
    user_role = request.user.profile.role
    if user_role not in ['SUPERVISOR', 'PROVISIONAL', 'REGISTRAR']:
        return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    # Trainees can only reply to their own logbooks
    if user_role in ['PROVISIONAL', 'REGISTRAR'] and logbook.trainee != request.user:
        return Response({'error': 'Can only reply to your own logbooks'}, status=status.HTTP_403_FORBIDDEN)
    
    message_text = request.data.get('message', '').strip()
    if not message_text:
        return Response({'error': 'Message cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if logbook is approved (no replies allowed)
    if logbook.status == 'approved':
        return Response({'error': 'Cannot reply to comments on approved logbooks'}, status=status.HTTP_400_BAD_REQUEST)
    
    with transaction.atomic():
        # Create reply
        # Determine author role - map UserProfile roles to CommentMessage roles
        role_mapping = {
            'SUPERVISOR': 'supervisor',
            'PROVISIONAL': 'provisional', 
            'REGISTRAR': 'registrar',
            'ORG_ADMIN': 'org_admin'
        }
        author_role = role_mapping.get(user_role, 'provisional')
        reply_message = CommentMessage.objects.create(
            thread=thread,
            author=request.user,
            author_role=author_role,
            message=message_text,
            reply_to=parent_message
        )
        
        # Log in audit trail
        LogbookAuditLog.objects.create(
            logbook=logbook,
            action='comment_replied',
            user=request.user,
            user_role=author_role,
            comments=f"Replied to comment",
            target_id=str(reply_message.id),
            metadata={
                'parent_comment_id': parent_message.id,
                'thread_id': thread.id,
                'entry_id': thread.entry_id
            }
        )
    
    # Return the updated thread
    serializer = CommentThreadSerializer(thread)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
def entry_comment_thread(request, entry_id, section):
    """Get comment thread for a specific entry"""
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)
    
    user_role = request.user.profile.role
    if user_role not in ['SUPERVISOR', 'PROVISIONAL', 'REGISTRAR']:
        return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    # Find the logbook that contains this entry
    try:
        # Get all logbooks and find which one contains this entry
        logbooks = WeeklyLogbook.objects.filter(
            **{f'section_{section.lower()}_entry_ids__contains': [int(entry_id)]}
        )
        
        if not logbooks.exists():
            return Response({'error': 'Entry not found in any logbook'}, status=status.HTTP_404_NOT_FOUND)
        
        logbook = logbooks.first()
        
        # Check permissions
        if user_role in ['PROVISIONAL', 'REGISTRAR'] and logbook.trainee != request.user:
            return Response({'error': 'Can only view your own logbooks'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get or create thread for this entry
        thread, created = CommentThread.objects.get_or_create(
            logbook=logbook,
            entry_id=entry_id,
            entry_section=section.upper(),
            thread_type='entry'
        )
        
        serializer = CommentThreadSerializer(thread)
        return Response(serializer.data)
        
    except ValueError:
        return Response({'error': 'Invalid entry ID'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def create_unlock_request(request, logbook_id):
    """Create an unlock request for an approved logbook"""
    if not hasattr(request.user, 'profile') or request.user.profile.role not in ['PROVISIONAL', 'REGISTRAR']:
        return Response({'error': 'Only provisionals and registrars can request unlocks'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        logbook = WeeklyLogbook.objects.get(id=logbook_id)
    except WeeklyLogbook.DoesNotExist:
        return Response({'error': 'Logbook not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if user owns this logbook
    if logbook.trainee != request.user:
        return Response({'error': 'Can only request unlock for your own logbooks'}, status=status.HTTP_403_FORBIDDEN)
    
    # Check if logbook is approved
    if logbook.status != 'approved':
        return Response({'error': 'Can only request unlock for approved logbooks'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if there's already a pending request
    if UnlockRequest.objects.filter(logbook=logbook, status='pending').exists():
        return Response({'error': 'There is already a pending unlock request for this logbook'}, status=status.HTTP_400_BAD_REQUEST)
    
    reason = request.data.get('reason', '').strip()
    if not reason:
        return Response({'error': 'Reason is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    target_section = request.data.get('target_section', '').strip()
    
    # Role mapping for audit logs
    role_mapping = {
        'SUPERVISOR': 'supervisor',
        'PROVISIONAL': 'provisional', 
        'REGISTRAR': 'registrar',
        'ORG_ADMIN': 'org_admin'
    }
    
    with transaction.atomic():
        # Create unlock request
        unlock_request = UnlockRequest.objects.create(
            logbook=logbook,
            requester=request.user,
            requester_role=role_mapping.get(request.user.profile.role, 'provisional'),
            reason=reason,
            target_section=target_section
        )
        
        # Log in audit trail
        LogbookAuditLog.objects.create(
            logbook=logbook,
            action='unlock_requested',
            user=request.user,
            user_role=role_mapping.get(request.user.profile.role, 'provisional'),
            comments=f"Unlock requested: {reason[:100]}...",
            target_id=str(unlock_request.id),
            metadata={
                'reason': reason,
                'target_section': target_section,
                'expected_reviewer': unlock_request.get_reviewer()
            }
        )
    
    serializer = UnlockRequestSerializer(unlock_request, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
def unlock_requests_queue(request):
    """Get unlock requests for review based on user role"""
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)
    
    user_role = request.user.profile.role
    
    if user_role == 'ORG_ADMIN':
        # Org admins see requests from users in their organization
        user_org = request.user.profile.organization
        if not user_org:
            return Response({'error': 'Organization admin must be part of an organization'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get requests where the logbook owner is in the same organization
        requests = UnlockRequest.objects.filter(
            status='pending',
            logbook__trainee__profile__organization=user_org
        ).prefetch_related('logbook__trainee__profile', 'requester__profile')
        
    elif user_role == 'SUPERVISOR':
        # Supervisors see requests from users not in an organization
        requests = UnlockRequest.objects.filter(
            status='pending',
            logbook__trainee__profile__organization__isnull=True
        ).prefetch_related('logbook__trainee__profile', 'requester__profile')
        
    else:
        return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = UnlockRequestSerializer(requests, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def review_unlock_request(request, unlock_request_id):
    """Approve or deny an unlock request"""
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)
    
    user_role = request.user.profile.role
    
    if user_role not in ['ORG_ADMIN', 'SUPERVISOR']:
        return Response({'error': 'Only org admins and supervisors can review unlock requests'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        unlock_request = UnlockRequest.objects.select_related('logbook__trainee__profile').get(id=unlock_request_id)
    except UnlockRequest.DoesNotExist:
        return Response({'error': 'Unlock request not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if unlock_request.status != 'pending':
        return Response({'error': 'Can only review pending unlock requests'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user is the correct reviewer
    expected_reviewer = unlock_request.get_reviewer()
    if expected_reviewer == 'org_admin' and user_role != 'ORG_ADMIN':
        return Response({'error': 'This request must be reviewed by an organization admin'}, status=status.HTTP_403_FORBIDDEN)
    elif expected_reviewer == 'supervisor' and user_role != 'SUPERVISOR':
        return Response({'error': 'This request must be reviewed by a supervisor'}, status=status.HTTP_403_FORBIDDEN)
    
    decision = request.data.get('decision')  # 'approve' or 'deny'
    admin_comment = request.data.get('admin_comment', '').strip()
    duration_minutes = request.data.get('duration_minutes')
    
    if decision not in ['approve', 'deny']:
        return Response({'error': 'Decision must be "approve" or "deny"'}, status=status.HTTP_400_BAD_REQUEST)
    
    if decision == 'approve' and not duration_minutes:
        return Response({'error': 'Duration is required when approving unlock request'}, status=status.HTTP_400_BAD_REQUEST)
    
    if decision == 'approve':
        try:
            duration_minutes = int(duration_minutes)
            if duration_minutes <= 0:
                return Response({'error': 'Duration must be greater than 0'}, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid duration value'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Role mapping for audit logs
    role_mapping = {
        'SUPERVISOR': 'supervisor',
        'PROVISIONAL': 'provisional', 
        'REGISTRAR': 'registrar',
        'ORG_ADMIN': 'org_admin'
    }
    
    with transaction.atomic():
        # Update unlock request
        unlock_request.status = decision
        unlock_request.reviewed_by = request.user
        unlock_request.reviewer_role = expected_reviewer
        unlock_request.reviewed_at = timezone.now()
        unlock_request.admin_comment = admin_comment
        
        # If approved, set unlock duration and expiry
        if decision == 'approve':
            unlock_request.duration_minutes = duration_minutes
            unlock_request.unlock_expires_at = timezone.now() + timedelta(minutes=duration_minutes)
        
        unlock_request.save()
        
        # If approved, unlock the logbook and entries
        if decision == 'approve':
            logbook = unlock_request.logbook
            logbook.status = 'submitted'  # Change back to submitted for editing
            logbook.save()
            
            # Unlock all associated entries
            from section_a.models import SectionAEntry
            from section_b.models import ProfessionalDevelopmentEntry
            from section_c.models import SupervisionEntry
            
            SectionAEntry.objects.filter(id__in=logbook.section_a_entry_ids).update(locked=False)
            ProfessionalDevelopmentEntry.objects.filter(id__in=logbook.section_b_entry_ids).update(locked=False)
            SupervisionEntry.objects.filter(id__in=logbook.section_c_entry_ids).update(locked=False)
            
            # Log unlock activation
            LogbookAuditLog.objects.create(
                logbook=logbook,
                action='unlock_activated',
                user=request.user,
                user_role=role_mapping.get(user_role, 'supervisor'),
                comments=f"Logbook unlocked for {duration_minutes} minutes: {admin_comment[:100]}...",
                previous_status='approved',
                new_status='submitted',
                target_id=str(unlock_request.id),
                metadata={
                    'duration_minutes': duration_minutes,
                    'expires_at': unlock_request.unlock_expires_at.isoformat()
                }
            )
        
        # Log review decision
        action = 'unlock_approved' if decision == 'approve' else 'unlock_denied'
        LogbookAuditLog.objects.create(
            logbook=unlock_request.logbook,
            action=action,
            user=request.user,
            user_role=role_mapping.get(user_role, 'supervisor'),
            comments=f"Unlock {decision}d: {admin_comment[:100]}...",
            target_id=str(unlock_request.id),
            metadata={
                'decision': decision,
                'admin_comment': admin_comment,
                'requester': unlock_request.requester.email
            }
        )
    
    serializer = UnlockRequestSerializer(unlock_request, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def force_relock_unlock_request(request, unlock_request_id):
    """Force re-lock an active unlock request"""
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)
    
    user_role = request.user.profile.role
    
    if user_role not in ['ORG_ADMIN', 'SUPERVISOR']:
        return Response({'error': 'Only org admins and supervisors can force re-lock'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        unlock_request = UnlockRequest.objects.select_related('logbook__trainee__profile').get(id=unlock_request_id)
    except UnlockRequest.DoesNotExist:
        return Response({'error': 'Unlock request not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if unlock_request.status != 'approved' or not unlock_request.is_currently_unlocked():
        return Response({'error': 'Can only force re-lock active unlock requests'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user is the correct reviewer
    expected_reviewer = unlock_request.get_reviewer()
    if expected_reviewer == 'org_admin' and user_role != 'ORG_ADMIN':
        return Response({'error': 'This unlock can only be re-locked by an organization admin'}, status=status.HTTP_403_FORBIDDEN)
    elif expected_reviewer == 'supervisor' and user_role != 'SUPERVISOR':
        return Response({'error': 'This unlock can only be re-locked by a supervisor'}, status=status.HTTP_403_FORBIDDEN)
    
    # Role mapping for audit logs
    role_mapping = {
        'SUPERVISOR': 'supervisor',
        'PROVISIONAL': 'provisional', 
        'REGISTRAR': 'registrar',
        'ORG_ADMIN': 'org_admin'
    }
    
    with transaction.atomic():
        # Force re-lock the unlock request
        unlock_request.force_relock(request.user)
        
        # Re-lock the logbook and entries
        logbook = unlock_request.logbook
        logbook.status = 'approved'  # Change back to approved (locked)
        logbook.save()
        
        # Re-lock all associated entries
        from section_a.models import SectionAEntry
        from section_b.models import ProfessionalDevelopmentEntry
        from section_c.models import SupervisionEntry
        
        SectionAEntry.objects.filter(id__in=logbook.section_a_entry_ids).update(locked=True)
        ProfessionalDevelopmentEntry.objects.filter(id__in=logbook.section_b_entry_ids).update(locked=True)
        SupervisionEntry.objects.filter(id__in=logbook.section_c_entry_ids).update(locked=True)
        
        # Log the re-lock action
        LogbookAuditLog.objects.create(
            logbook=logbook,
            action='unlock_activated',  # Using existing action for logbook status change
            user=request.user,
            user_role=role_mapping.get(user_role, 'supervisor'),
            comments=f"Logbook re-locked manually before expiry",
            previous_status='submitted',
            new_status='approved',
            target_id=str(unlock_request.id),
            metadata={
                'duration_minutes': unlock_request.duration_minutes,
                'time_remaining': unlock_request.get_remaining_time_minutes(),
                'manually_relocked': True
            }
        )
    
    serializer = UnlockRequestSerializer(unlock_request, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, DenyOrgAdmin])
@support_error_handler
def user_notifications(request):
    """Get user's notifications with optional filtering"""
    user = request.user
    
    # Query parameters
    limit = request.GET.get('limit', 50)
    read_filter = request.GET.get('read')  # 'true', 'false', or None for all
    type_filter = request.GET.get('type')  # notification type filter
    
    try:
        limit = int(limit)
        limit = min(limit, 100)  # Cap at 100
    except ValueError:
        limit = 50
    
    # Build queryset
    notifications = Notification.objects.filter(user=user)
    
    # Apply filters
    if read_filter is not None:
        notifications = notifications.filter(read=read_filter.lower() == 'true')
    
    if type_filter:
        notifications = notifications.filter(notification_type=type_filter)
    
    # Order and limit
    notifications = notifications.order_by('-created_at')[:limit]
    
    serializer = NotificationSerializer(notifications, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, DenyOrgAdmin])
@support_error_handler
def notification_stats(request):
    """Get notification statistics for the user"""
    user = request.user
    
    total_notifications = Notification.objects.filter(user=user).count()
    unread_count = Notification.objects.filter(user=user, read=False).count()
    
    # Get counts by type
    type_counts = {}
    for notification_type, _ in Notification.TYPE_CHOICES:
        count = Notification.objects.filter(user=user, notification_type=notification_type, read=False).count()
        if count > 0:
            type_counts[notification_type] = count
    
    return Response({
        'total': total_notifications,
        'unread': unread_count,
        'by_type': type_counts
    })


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, DenyOrgAdmin])
@support_error_handler
def mark_notification_read(request, notification_id):
    """Mark a specific notification as read"""
    user = request.user
    
    try:
        notification = Notification.objects.get(id=notification_id, user=user)
    except Notification.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)
    
    notification.mark_as_read()
    
    serializer = NotificationSerializer(notification)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, DenyOrgAdmin])
@support_error_handler
def mark_all_notifications_read(request):
    """Mark all notifications as read for the user"""
    user = request.user
    
    updated_count = Notification.objects.filter(user=user, read=False).update(read=True)
    
    return Response({
        'message': f'Marked {updated_count} notifications as read',
        'updated_count': updated_count
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, DenyOrgAdmin])
@support_error_handler
def create_notification(request):
    """Create a notification (for testing or system use)"""
    if not hasattr(request.user, 'profile') or request.user.profile.role not in ['ORG_ADMIN', 'SUPERVISOR']:
        return Response({'error': 'Only org admins and supervisors can create notifications'}, status=status.HTTP_403_FORBIDDEN)
    
    notification_type = request.data.get('notification_type')
    target_user_id = request.data.get('target_user_id')
    payload = request.data.get('payload', {})
    
    if not notification_type or not target_user_id:
        return Response({'error': 'notification_type and target_user_id are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate notification type
    valid_types = [choice[0] for choice in Notification.TYPE_CHOICES]
    if notification_type not in valid_types:
        return Response({'error': f'Invalid notification type. Must be one of: {valid_types}'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        target_user = User.objects.get(id=target_user_id)
    except User.DoesNotExist:
        return Response({'error': 'Target user not found'}, status=status.HTTP_404_NOT_FOUND)
    
    notification = Notification.create_notification(
        user=target_user,
        notification_type=notification_type,
        payload=payload,
        actor=request.user
    )
    
    serializer = NotificationSerializer(notification)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
@support_error_handler
def comment_message_detail(request, comment_id):
    """Edit or delete a specific comment message"""
    try:
        comment = CommentMessage.objects.select_related('thread__logbook').get(id=comment_id)
        logbook = comment.thread.logbook
    except CommentMessage.DoesNotExist:
        return Response({'error': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)
    
    user_role = request.user.profile.role
    if user_role not in ['SUPERVISOR', 'PROVISIONAL', 'REGISTRAR']:
        return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    # Role mapping for audit logs
    role_mapping = {
        'SUPERVISOR': 'supervisor',
        'PROVISIONAL': 'provisional', 
        'REGISTRAR': 'registrar',
        'ORG_ADMIN': 'org_admin'
    }
    
    # Check permissions based on role and ownership
    if user_role in ['PROVISIONAL', 'REGISTRAR'] and logbook.trainee != request.user:
        return Response({'error': 'Can only modify comments on your own logbooks'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'PUT':
        # Edit comment
        if not comment.can_edit(request.user):
            return Response({'error': 'Cannot edit this comment'}, status=status.HTTP_403_FORBIDDEN)
        
        new_message = request.data.get('message', '').strip()
        if not new_message:
            return Response({'error': 'Message cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
        
        old_message = comment.message
        comment.message = new_message
        comment.save()
        
        # Log in audit trail
        LogbookAuditLog.objects.create(
            logbook=logbook,
            action='comment_edited',
            user=request.user,
            user_role=role_mapping.get(user_role, 'provisional'),
            comments=f"Edited comment: '{old_message[:50]}...' -> '{new_message[:50]}...'",
            target_id=str(comment.id),
            metadata={
                'thread_id': comment.thread.id,
                'entry_id': comment.thread.entry_id,
                'old_message': old_message,
                'new_message': new_message
            }
        )
        
        serializer = CommentMessageSerializer(comment, context={'request': request})
        return Response(serializer.data)
    
    elif request.method == 'DELETE':
        # Delete comment
        if not comment.can_delete(request.user):
            return Response({'error': 'Cannot delete this comment'}, status=status.HTTP_403_FORBIDDEN)
        
        # Log before deletion
        LogbookAuditLog.objects.create(
            logbook=logbook,
            action='comment_deleted',
            user=request.user,
            user_role=role_mapping.get(user_role, 'provisional'),
            comments=f"Deleted comment: '{comment.message[:50]}...'",
            target_id=str(comment.id),
            metadata={
                'thread_id': comment.thread.id,
                'entry_id': comment.thread.entry_id,
                'deleted_message': comment.message
            }
        )
        
        comment.delete()
        return Response({'message': 'Comment deleted successfully'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_entries(request, logbook_id):
    """Return all section entries linked to a logbook for review UI"""
    logbook = WeeklyLogbook.objects.get(id=logbook_id)
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)
    role = request.user.profile.role
    if role == 'SUPERVISOR':
        pass
    elif role in ['PROVISIONAL', 'REGISTRAR'] and logbook.trainee != request.user:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    from section_a.serializers import SectionAEntrySerializer
    from section_b.serializers import ProfessionalDevelopmentEntrySerializer
    from section_c.serializers import SupervisionEntrySerializer
    from section_a.models import SectionAEntry
    from section_b.models import ProfessionalDevelopmentEntry
    from section_c.models import SupervisionEntry

    a = SectionAEntry.objects.filter(id__in=logbook.section_a_entry_ids)
    b = ProfessionalDevelopmentEntry.objects.filter(id__in=logbook.section_b_entry_ids)
    c = SupervisionEntry.objects.filter(id__in=logbook.section_c_entry_ids)

    return Response({
        'section_a': SectionAEntrySerializer(a, many=True).data,
        'section_b': ProfessionalDevelopmentEntrySerializer(b, many=True).data,
        'section_c': SupervisionEntrySerializer(c, many=True).data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_review(request, logbook_id):
    """Supervisor approves or rejects with per-entry comments"""
    if not hasattr(request.user, 'profile') or request.user.profile.role != 'SUPERVISOR':
        return Response({'error': 'Only supervisors can review'}, status=status.HTTP_403_FORBIDDEN)

    data = request.data if isinstance(request.data, dict) else JSONParser().parse(request)
    decision = data.get('decision')
    general_comment = data.get('generalComment', '')
    entry_comments = data.get('entryComments', [])

    try:
        logbook = WeeklyLogbook.objects.get(id=logbook_id)
    except WeeklyLogbook.DoesNotExist:
        return Response({'error': 'Logbook not found'}, status=status.HTTP_404_NOT_FOUND)

    if logbook.status != 'submitted':
        return Response({'error': 'Logbook is not awaiting review'}, status=status.HTTP_400_BAD_REQUEST)

    # Persist per-entry supervisor comments
    from section_a.models import SectionAEntry
    from section_b.models import ProfessionalDevelopmentEntry
    from section_c.models import SupervisionEntry

    entry_map = {}
    for e in entry_comments or []:
        entry_map[int(e.get('entryId'))] = e.get('comment', '')

    for model, ids in (
        (SectionAEntry, logbook.section_a_entry_ids),
        (ProfessionalDevelopmentEntry, logbook.section_b_entry_ids),
        (SupervisionEntry, logbook.section_c_entry_ids),
    ):
        items = model.objects.filter(id__in=ids)
        for it in items:
            if it.id in entry_map:
                it.supervisor_comment = entry_map[it.id]
                it.save(update_fields=['supervisor_comment'])

    if decision == 'approve':
        logbook.status = 'approved'
        logbook.reviewed_at = timezone.now()
        logbook.reviewed_by = request.user
        logbook.supervisor_comments = general_comment
        logbook.save()

        # Lock entries
        SectionAEntry.objects.filter(id__in=logbook.section_a_entry_ids).update(locked=True)
        ProfessionalDevelopmentEntry.objects.filter(id__in=logbook.section_b_entry_ids).update(locked=True)
        SupervisionEntry.objects.filter(id__in=logbook.section_c_entry_ids).update(locked=True)

        LogbookAuditLog.objects.create(
            logbook=logbook,
            action='approved',
            user=request.user,
            new_status='approved',
            comments=general_comment
        )
        return Response({'message': 'Approved'})

    if decision == 'reject':
        logbook.status = 'rejected'
        logbook.reviewed_at = timezone.now()
        logbook.reviewed_by = request.user
        logbook.supervisor_comments = general_comment or ''
        logbook.save()

        # Unlock entries for editing
        SectionAEntry.objects.filter(id__in=logbook.section_a_entry_ids).update(locked=False)
        ProfessionalDevelopmentEntry.objects.filter(id__in=logbook.section_b_entry_ids).update(locked=False)
        SupervisionEntry.objects.filter(id__in=logbook.section_c_entry_ids).update(locked=False)

        LogbookAuditLog.objects.create(
            logbook=logbook,
            action='rejected',
            user=request.user,
            new_status='rejected',
            comments=general_comment
        )
        return Response({'message': 'Rejected'})

    return Response({'error': 'Invalid decision'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_html_report(request, logbook_id):
    """Generate HTML report view for a logbook"""
    try:
        logbook = WeeklyLogbook.objects.get(id=logbook_id)
    except WeeklyLogbook.DoesNotExist:
        return Response({'error': 'Logbook not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check permissions
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)
    
    user_role = request.user.profile.role
    
    # Trainees can view their own logbooks, supervisors can view all
    if user_role in ['PROVISIONAL', 'REGISTRAR']:
        if logbook.trainee != request.user:
            return Response({'error': 'Can only view your own logbooks'}, status=status.HTTP_403_FORBIDDEN)
    elif user_role != 'SUPERVISOR':
        return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get all entries
    from section_a.models import SectionAEntry
    from section_b.models import ProfessionalDevelopmentEntry
    from section_c.models import SupervisionEntry
    from django.db.models import Sum
    
    section_a_entries = SectionAEntry.objects.filter(id__in=logbook.section_a_entry_ids).order_by('session_date')
    section_b_entries = ProfessionalDevelopmentEntry.objects.filter(id__in=logbook.section_b_entry_ids).order_by('date_of_activity')
    section_c_entries = SupervisionEntry.objects.filter(id__in=logbook.section_c_entry_ids).order_by('date_of_supervision')
    
    # Calculate totals
    section_a_total_minutes = sum(e.duration_minutes or 0 for e in section_a_entries)
    section_b_total_minutes = sum(e.duration_minutes or 0 for e in section_b_entries)
    section_c_total_minutes = sum(e.duration_minutes or 0 for e in section_c_entries)
    
    # Calculate cumulative totals (all entries before and including this week)
    section_a_cumulative = SectionAEntry.objects.filter(
        trainee=logbook.trainee,
        session_date__lte=logbook.week_end_date
    ).aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
    
    section_b_cumulative = ProfessionalDevelopmentEntry.objects.filter(
        trainee=logbook.trainee,
        date_of_activity__lte=logbook.week_end_date
    ).aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
    
    section_c_cumulative = SupervisionEntry.objects.filter(
        trainee=logbook.trainee.profile,
        week_starting__lte=logbook.week_start_date
    ).aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
    
    # Helper function to format minutes to hours:minutes
    def format_minutes(minutes):
        hours = minutes // 60
        mins = minutes % 60
        return f"{hours}h {mins}m" if hours > 0 else f"{mins}m"
    
    # Get trainee info
    trainee_profile = logbook.trainee.profile
    trainee_name = f"{trainee_profile.first_name} {trainee_profile.last_name}".strip()
    ahpra_number = trainee_profile.ahpra_registration_number or "Not provided"
    supervisor_name = trainee_profile.principal_supervisor or "Not assigned"
    
    # Prepare context
    context = {
        'logbook': logbook,
        'trainee_name': trainee_name,
        'ahpra_number': ahpra_number,
        'supervisor_name': supervisor_name,
        'section_a_entries': section_a_entries,
        'section_b_entries': section_b_entries,
        'section_c_entries': section_c_entries,
        'section_a_total_minutes': section_a_total_minutes,
        'section_b_total_minutes': section_b_total_minutes,
        'section_c_total_minutes': section_c_total_minutes,
        'section_a_cumulative_minutes': section_a_cumulative,
        'section_b_cumulative_minutes': section_b_cumulative,
        'section_c_cumulative_minutes': section_c_cumulative,
        'section_a_total_hours': format_minutes(section_a_total_minutes),
        'section_b_total_hours': format_minutes(section_b_total_minutes),
        'section_c_total_hours': format_minutes(section_c_total_minutes),
        'section_a_cumulative_hours': format_minutes(section_a_cumulative),
        'section_b_cumulative_hours': format_minutes(section_b_cumulative),
        'section_c_cumulative_hours': format_minutes(section_c_cumulative),
        'total_weekly_hours': format_minutes(section_a_total_minutes + section_b_total_minutes + section_c_total_minutes),
        'total_cumulative_hours': format_minutes(section_a_cumulative + section_b_cumulative + section_c_cumulative),
        'now': timezone.now(),
    }
    
    return render(request, 'logbook_report.html', context)


# Review Workflow API Endpoints

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def create_review_request(request):
    """Create a new review request for a logbook"""
    try:
        logbook_id = request.data.get('logbook_id')
        if not logbook_id:
            return Response({'error': 'logbook_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            logbook = WeeklyLogbook.objects.get(id=logbook_id)
        except WeeklyLogbook.DoesNotExist:
            return Response({'error': 'Logbook not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user can request review
        if not hasattr(request.user, 'profile') or request.user.profile.role not in ['PROVISIONAL', 'REGISTRAR']:
            return Response({'error': 'Only trainees can request reviews'}, status=status.HTTP_403_FORBIDDEN)
        
        if logbook.trainee != request.user:
            return Response({'error': 'You can only request reviews for your own logbooks'}, status=status.HTTP_403_FORBIDDEN)
        
        # Check if logbook is in a state that allows review requests
        if logbook.status not in ['ready', 'submitted']:
            return Response({'error': f'Cannot request review for logbook in {logbook.status} status'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create review request
        review_request = LogbookReviewRequest.objects.create(
            logbook=logbook,
            requested_by=request.user,
            status='PENDING'
        )
        
        serializer = LogbookReviewRequestSerializer(review_request)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
def review_requests_list(request):
    """Get review requests for the current user"""
    try:
        if not hasattr(request.user, 'profile'):
            return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)
        
        user_role = request.user.profile.role
        
        if user_role in ['PROVISIONAL', 'REGISTRAR']:
            # Trainees see their own review requests
            review_requests = LogbookReviewRequest.objects.filter(
                requested_by=request.user
            ).order_by('-requested_at')
        elif user_role == 'SUPERVISOR':
            # Supervisors see review requests for logbooks they supervise
            review_requests = LogbookReviewRequest.objects.filter(
                logbook__supervisor=request.user
            ).order_by('-requested_at')
        else:
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = LogbookReviewRequestSerializer(review_requests, many=True)
        return Response(serializer.data)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
@support_error_handler
def update_review_request(request, request_id):
    """Update a review request (start, complete, cancel)"""
    try:
        try:
            review_request = LogbookReviewRequest.objects.get(id=request_id)
        except LogbookReviewRequest.DoesNotExist:
            return Response({'error': 'Review request not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check permissions
        if not hasattr(request.user, 'profile'):
            return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)
        
        user_role = request.user.profile.role
        action = request.data.get('action')
        
        if user_role in ['PROVISIONAL', 'REGISTRAR']:
            # Trainees can only cancel their own requests
            if review_request.requested_by != request.user:
                return Response({'error': 'You can only modify your own review requests'}, status=status.HTTP_403_FORBIDDEN)
            
            if action == 'cancel':
                review_request.status = 'CANCELLED'
                review_request.save()
            else:
                return Response({'error': 'Trainees can only cancel review requests'}, status=status.HTTP_400_BAD_REQUEST)
                
        elif user_role == 'SUPERVISOR':
            # Supervisors can start and complete reviews
            if review_request.logbook.supervisor != request.user:
                return Response({'error': 'You can only modify review requests for logbooks you supervise'}, status=status.HTTP_403_FORBIDDEN)
            
            if action == 'start':
                if review_request.status == 'PENDING':
                    review_request.status = 'IN_PROGRESS'
                    review_request.review_started_at = timezone.now()
                    review_request.save()
                else:
                    return Response({'error': 'Can only start pending review requests'}, status=status.HTTP_400_BAD_REQUEST)
                    
            elif action == 'complete':
                if review_request.status == 'IN_PROGRESS':
                    review_request.status = 'COMPLETED'
                    review_request.review_completed_at = timezone.now()
                    review_request.supervisor_notes = request.data.get('supervisor_notes', '')
                    review_request.save()
                else:
                    return Response({'error': 'Can only complete in-progress review requests'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({'error': 'Invalid action for supervisor'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = LogbookReviewRequestSerializer(review_request)
        return Response(serializer.data)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def create_unlock_request(request):
    """Create a new unlock request for a logbook"""
    try:
        logbook_id = request.data.get('logbook_id')
        reason = request.data.get('reason', '')
        
        if not logbook_id:
            return Response({'error': 'logbook_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not reason.strip():
            return Response({'error': 'reason is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            logbook = WeeklyLogbook.objects.get(id=logbook_id)
        except WeeklyLogbook.DoesNotExist:
            return Response({'error': 'Logbook not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user can request unlock
        if not hasattr(request.user, 'profile') or request.user.profile.role not in ['PROVISIONAL', 'REGISTRAR']:
            return Response({'error': 'Only trainees can request unlocks'}, status=status.HTTP_403_FORBIDDEN)
        
        if logbook.trainee != request.user:
            return Response({'error': 'You can only request unlocks for your own logbooks'}, status=status.HTTP_403_FORBIDDEN)
        
        # Check if logbook is in a state that allows unlock requests
        if logbook.status not in ['approved', 'locked']:
            return Response({'error': f'Cannot request unlock for logbook in {logbook.status} status'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if there's already a pending unlock request
        existing_request = UnlockRequest.objects.filter(
            logbook=logbook,
            status='PENDING'
        ).first()
        
        if existing_request:
            return Response({'error': 'There is already a pending unlock request for this logbook'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create unlock request
        unlock_request = UnlockRequest.objects.create(
            logbook=logbook,
            requester=request.user,
            reason=reason,
            status='PENDING'
        )
        
        serializer = UnlockRequestSerializer(unlock_request)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
def unlock_requests_list(request):
    """Get unlock requests for the current user"""
    try:
        if not hasattr(request.user, 'profile'):
            return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)
        
        user_role = request.user.profile.role
        
        if user_role in ['PROVISIONAL', 'REGISTRAR']:
            # Trainees see their own unlock requests
            unlock_requests = UnlockRequest.objects.filter(
                requester=request.user
            ).order_by('-requested_at')
        elif user_role == 'SUPERVISOR':
            # Supervisors see unlock requests for logbooks they supervise
            unlock_requests = UnlockRequest.objects.filter(
                logbook__supervisor=request.user
            ).order_by('-requested_at')
        else:
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = UnlockRequestSerializer(unlock_requests, many=True)
        return Response(serializer.data)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
@support_error_handler
def update_unlock_request(request, request_id):
    """Update an unlock request (approve, reject)"""
    try:
        try:
            unlock_request = UnlockRequest.objects.get(id=request_id)
        except UnlockRequest.DoesNotExist:
            return Response({'error': 'Unlock request not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check permissions - only supervisors can approve/reject
        if not hasattr(request.user, 'profile') or request.user.profile.role != 'SUPERVISOR':
            return Response({'error': 'Only supervisors can approve or reject unlock requests'}, status=status.HTTP_403_FORBIDDEN)
        
        if unlock_request.logbook.supervisor != request.user:
            return Response({'error': 'You can only modify unlock requests for logbooks you supervise'}, status=status.HTTP_403_FORBIDDEN)
        
        action = request.data.get('action')
        supervisor_response = request.data.get('supervisor_response', '')
        
        if action == 'approve':
            if unlock_request.status == 'PENDING':
                unlock_request.status = 'APPROVED'
                unlock_request.reviewed_by = request.user
                unlock_request.reviewed_at = timezone.now()
                unlock_request.supervisor_response = supervisor_response
                
                # Set unlock expiration (e.g., 7 days from now)
                unlock_request.unlock_expires_at = timezone.now() + timedelta(days=7)
                
                # Update logbook status
                unlock_request.logbook.status = 'unlocked_for_edits'
                unlock_request.logbook.save()
                
                unlock_request.save()
            else:
                return Response({'error': 'Can only approve pending unlock requests'}, status=status.HTTP_400_BAD_REQUEST)
                
        elif action == 'reject':
            if unlock_request.status == 'PENDING':
                unlock_request.status = 'REJECTED'
                unlock_request.reviewed_by = request.user
                unlock_request.reviewed_at = timezone.now()
                unlock_request.supervisor_response = supervisor_response
                unlock_request.save()
            else:
                return Response({'error': 'Can only reject pending unlock requests'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({'error': 'Invalid action. Use "approve" or "reject"'}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = UnlockRequestSerializer(unlock_request)
        return Response(serializer.data)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
def download_logbook_pdf(request, logbook_id):
    """Generate and download AHPRA LBPP-76 PDF for a specific logbook"""
    from .pdf_generator import LBPP76PDFGenerator
    from django.http import HttpResponse
    
    try:
        logbook = WeeklyLogbook.objects.get(id=logbook_id)
    except WeeklyLogbook.DoesNotExist:
        return Response({'error': 'Logbook not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check permissions
    user_role = request.user.profile.role
    if logbook.trainee != request.user and user_role not in ['SUPERVISOR', 'ORG_ADMIN']:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
    
    # Generate PDF
    generator = LBPP76PDFGenerator(logbook_id, request.user)
    pdf_bytes = generator.generate_pdf()
    
    # Return as downloadable file
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    filename = f"LBPP76_Week_{logbook.week_start_date.strftime('%Y%m%d')}_{logbook.trainee.profile.last_name}.pdf"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response