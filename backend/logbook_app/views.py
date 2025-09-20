from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import datetime, timedelta
from django.db import transaction
from .models import WeeklyLogbook, LogbookAuditLog, LogbookMessage, CommentThread, CommentMessage, UnlockRequest, Notification
from .serializers import (
    LogbookSerializer, LogbookDraftSerializer, EligibleWeekSerializer, 
    LogbookSubmissionSerializer, LogbookAuditLogSerializer,
    CommentThreadSerializer, CommentMessageSerializer, UnlockRequestSerializer,
    NotificationSerializer
)
from logging_utils import support_error_handler
from rest_framework.parsers import JSONParser


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
                date_of_supervision__gte=week_start,
                date_of_supervision__lte=week_end,
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
        date_of_supervision__gte=week_start,
        date_of_supervision__lte=week_end,
        locked=False
    ).order_by('date_of_supervision', 'created_at')
    
    # Calculate totals
    section_a_total_minutes = sum(entry.duration_minutes or 0 for entry in section_a_entries)
    section_b_total_minutes = sum(entry.duration_minutes or 0 for entry in section_b_entries)
    section_c_total_minutes = sum(entry.duration_minutes or 0 for entry in section_c_entries)
    
    # Calculate cumulative totals up to this week
    cumulative_section_a = SectionAEntry.objects.filter(
        trainee=request.user,
        week_starting__lt=week_start + timedelta(days=7)
    ).aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
    
    cumulative_section_b = ProfessionalDevelopmentEntry.objects.filter(
        trainee=request.user,
        week_starting__lt=week_start + timedelta(days=7)
    ).aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
    
    cumulative_section_c = SupervisionEntry.objects.filter(
        trainee=trainee_profile,
        date_of_supervision__lt=week_start + timedelta(days=7)
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
                'weekly_hours': round(section_a_total_minutes / 60, 1),
                'cumulative_hours': round(cumulative_section_a / 60, 1)
            },
            'section_b': {
                'weekly_minutes': section_b_total_minutes,
                'cumulative_minutes': cumulative_section_b,
                'weekly_hours': round(section_b_total_minutes / 60, 1),
                'cumulative_hours': round(cumulative_section_b / 60, 1)
            },
            'section_c': {
                'weekly_minutes': section_c_total_minutes,
                'cumulative_minutes': cumulative_section_c,
                'weekly_hours': round(section_c_total_minutes / 60, 1),
                'cumulative_hours': round(cumulative_section_c / 60, 1)
            },
            'total': {
                'weekly_minutes': section_a_total_minutes + section_b_total_minutes + section_c_total_minutes,
                'cumulative_minutes': cumulative_section_a + cumulative_section_b + cumulative_section_c,
                'weekly_hours': round((section_a_total_minutes + section_b_total_minutes + section_c_total_minutes) / 60, 1),
                'cumulative_hours': round((cumulative_section_a + cumulative_section_b + cumulative_section_c) / 60, 1)
            }
        }
    }
    
    serializer = LogbookDraftSerializer(draft_data)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_submit(request):
    """Submit a logbook for supervisor review"""
    if not hasattr(request.user, 'profile') or request.user.profile.role not in ['PROVISIONAL', 'REGISTRAR']:
        return Response({'error': 'Only trainees can submit logbooks'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = LogbookSubmissionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    week_start = data['week_start']
    week_end = data['week_end']
    section_a_entry_ids = data['section_a_entry_ids']
    section_b_entry_ids = data['section_b_entry_ids']
    section_c_entry_ids = data['section_c_entry_ids']
    
    # Check if logbook already exists for this week
    existing_logbook = WeeklyLogbook.objects.filter(
        trainee=request.user,
        week_start_date=week_start
    ).first()
    
    if existing_logbook:
        return Response({'error': 'Logbook already exists for this week'}, status=status.HTTP_400_BAD_REQUEST)
    
    with transaction.atomic():
        # Create the logbook
        logbook = WeeklyLogbook.objects.create(
            trainee=request.user,
            week_start_date=week_start,
            week_end_date=week_end,
            status='submitted',
            section_a_entry_ids=section_a_entry_ids,
            section_b_entry_ids=section_b_entry_ids,
            section_c_entry_ids=section_c_entry_ids,
            submitted_at=timezone.now()
        )
        
        # Lock all entries
        from section_a.models import SectionAEntry
        from section_b.models import ProfessionalDevelopmentEntry
        from section_c.models import SupervisionEntry
        
        SectionAEntry.objects.filter(
            id__in=section_a_entry_ids,
            trainee=request.user
        ).update(locked=True)
        
        ProfessionalDevelopmentEntry.objects.filter(
            id__in=section_b_entry_ids,
            trainee=request.user
        ).update(locked=True)
        
        SupervisionEntry.objects.filter(
            id__in=section_c_entry_ids,
            trainee=request.user.profile
        ).update(locked=True)
        
        # Create audit log entry
        LogbookAuditLog.objects.create(
            logbook=logbook,
            action='submitted',
            user=request.user,
            new_status='submitted'
        )
        
        response_serializer = LogbookSerializer(logbook)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


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
    
    # Build queryset based on filter
    if status_filter == 'all':
        logbooks = WeeklyLogbook.objects.all()
    elif status_filter in ['submitted', 'rejected', 'approved']:
        logbooks = WeeklyLogbook.objects.filter(status=status_filter)
    else:
        logbooks = WeeklyLogbook.objects.filter(status='submitted')
    
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
@permission_classes([IsAuthenticated])
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
@permission_classes([IsAuthenticated])
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
@permission_classes([IsAuthenticated])
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
@permission_classes([IsAuthenticated])
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
@permission_classes([IsAuthenticated])
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