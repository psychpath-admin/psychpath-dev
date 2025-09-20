from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .services import InternshipValidationService
from .models import ValidationAlert
from api.models import UserProfile


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_internship_progress(request):
    """Get comprehensive internship progress for the authenticated user"""
    try:
        user_profile = request.user.profile
        validation_service = InternshipValidationService()
        
        progress_summary = validation_service.get_progress_summary(user_profile)
        
        if progress_summary.get('error'):
            return Response(progress_summary, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(progress_summary)
    
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_weekly_breakdown(request):
    """Get weekly breakdown for the last N weeks"""
    try:
        user_profile = request.user.profile
        weeks = int(request.GET.get('weeks', 12))
        
        validation_service = InternshipValidationService()
        
        if user_profile.role not in ['INTERN', 'PROVISIONAL']:
            return Response({
                'error': 'User is not enrolled in an internship program',
                'user_role': user_profile.role
            }, status=status.HTTP_400_BAD_REQUEST)
        
        weekly_data = validation_service.get_weekly_breakdown(user_profile, weeks)
        
        return Response({
            'weekly_breakdown': weekly_data
        })
    
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def validate_entry(request):
    """Validate a logbook entry before saving"""
    try:
        user_profile = request.user.profile
        entry_data = request.data
        
        validation_service = InternshipValidationService()
        is_valid, errors = validation_service.validate_entry(user_profile, entry_data)
        
        return Response({
            'is_valid': is_valid,
            'errors': errors
        })
    
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_validation_alerts(request):
    """Get active validation alerts for the user"""
    try:
        user_profile = request.user.profile
        validation_service = InternshipValidationService()
        
        if user_profile.role not in ['INTERN', 'PROVISIONAL']:
            return Response({
                'alerts': []
            })
        
        alerts = validation_service.get_active_alerts(user_profile)
        
        return Response({
            'alerts': alerts
        })
    
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def dismiss_alert(request):
    """Dismiss a validation alert"""
    try:
        user_profile = request.user.profile
        alert_id = request.data.get('alert_id')
        
        if not alert_id:
            return Response({
                'error': 'alert_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        validation_service = InternshipValidationService()
        validation_service.dismiss_alert(user_profile, alert_id)
        
        return Response({
            'success': True
        })
    
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_completion_eligibility(request):
    """Check if the user is eligible to complete their internship"""
    try:
        user_profile = request.user.profile
        validation_service = InternshipValidationService()
        
        can_complete, errors = validation_service.can_complete_internship(user_profile)
        
        return Response({
            'can_complete': can_complete,
            'errors': errors
        })
    
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_internship(request):
    """Mark internship as completed (if eligible)"""
    try:
        user_profile = request.user.profile
        validation_service = InternshipValidationService()
        
        # Check eligibility first
        can_complete, errors = validation_service.can_complete_internship(user_profile)
        
        if not can_complete:
            return Response({
                'can_complete': False,
                'errors': errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Mark as completed
        progress = validation_service._get_or_create_progress(user_profile)
        progress.is_completed = True
        progress.actual_end_date = timezone.now().date()
        progress.save()
        
        return Response({
            'success': True,
            'completion_date': progress.actual_end_date
        })
    
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_program_requirements(request):
    """Get the requirements for the 5+1 internship program"""
    try:
        validation_service = InternshipValidationService()
        program = validation_service.program_5_plus_1
        
        return Response({
            'program': {
                'name': program.name,
                'type': program.program_type,
                'version': program.version,
                'requirements': {
                    'total_hours': program.total_hours_required,
                    'practice_hours': program.practice_hours_required,
                    'dcc_minimum': program.dcc_hours_minimum,
                    'dcc_simulated_maximum': program.dcc_simulated_maximum,
                    'supervision_minimum': program.supervision_hours_minimum,
                    'pd_required': program.pd_hours_required,
                    'minimum_weeks': program.minimum_weeks,
                    'minimum_weekly_hours': program.minimum_weekly_hours,
                    'supervision_ratio': program.supervision_ratio,
                }
            }
        })
    
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)