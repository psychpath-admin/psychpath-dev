"""
Enhanced API Views for Logbook Review Process
Implements all required endpoints for the comprehensive logbook review system.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from django.contrib.auth.models import User
from permissions import DenyOrgAdmin
from logging_utils import support_error_handler

from .models import (
    EnhancedLogbook, EnhancedLogbookSection, EnhancedLogbookComment, 
    EnhancedLogbookAudit, EnhancedNotification, LogbookStateMachine
)
from .enhanced_serializers import (
    LogbookSerializer, LogbookListSerializer, LogbookCreateSerializer,
    LogbookUpdateSerializer, LogbookSubmitSerializer, LogbookApproveSerializer,
    LogbookRejectSerializer, LogbookUnlockRequestSerializer, LogbookUnlockGrantSerializer,
    LogbookCommentSerializer, LogbookAuditSerializer, NotificationSerializer
)
from .notification_helpers import send_notification


class LogbookPagination(PageNumberPagination):
    """Pagination for logbook lists"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_list_create(request):
    """
    GET: List user's logbooks
    POST: Create new logbook
    """
    if request.method == 'GET':
        # Get user's logbooks
        logbooks = EnhancedLogbook.objects.filter(owner=request.user).order_by('-week_start_date')
        
        # Apply pagination
        paginator = LogbookPagination()
        page = paginator.paginate_queryset(logbooks, request)
        
        if page is not None:
            serializer = LogbookListSerializer(page, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)
        
        serializer = LogbookListSerializer(logbooks, many=True, context={'request': request})
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = LogbookCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            with transaction.atomic():
                logbook = serializer.save()
                
                # Create default sections
                EnhancedLogbookSection.objects.create(
                    logbook=logbook,
                    section_type='A',
                    title='Section A - Direct Client Contact',
                    content_json={}
                )
                EnhancedLogbookSection.objects.create(
                    logbook=logbook,
                    section_type='B',
                    title='Section B - Professional Development',
                    content_json={}
                )
                EnhancedLogbookSection.objects.create(
                    logbook=logbook,
                    section_type='C',
                    title='Section C - Supervision',
                    content_json={}
                )
                
                # Log creation
                EnhancedLogbookAudit.log_action(
                    logbook=logbook,
                    action='created',
                    actor=request.user,
                    description=f"Logbook created for week {logbook.week_start_date}"
                )
                
                # Create notification for supervisor if assigned
                if logbook.supervisor:
                    EnhancedNotification.create_notification(
                        recipient=logbook.supervisor,
                        notification_type='logbook_submitted',
                        title='New Logbook Created',
                        body=f"A new logbook has been created for {logbook.owner.email}",
                        related_object=logbook
                    )
            
            return Response(LogbookSerializer(logbook, context={'request': request}).data, 
                          status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_detail(request, logbook_id):
    """
    GET: Retrieve logbook with full details
    PATCH: Update logbook
    """
    logbook = get_object_or_404(EnhancedLogbook, id=logbook_id)
    
    # Check permissions
    if logbook.owner != request.user and logbook.supervisor != request.user:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        serializer = LogbookSerializer(logbook, context={'request': request})
        return Response(serializer.data)
    
    elif request.method == 'PATCH':
        if not logbook.can_be_edited_by(request.user):
            return Response({'error': 'Logbook is locked and cannot be edited'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        serializer = LogbookUpdateSerializer(logbook, data=request.data, partial=True)
        if serializer.is_valid():
            with transaction.atomic():
                old_data = {
                    'notes': logbook.notes,
                    'total_dcc_hours': float(logbook.total_dcc_hours),
                    'total_cra_hours': float(logbook.total_cra_hours),
                    'total_pd_hours': float(logbook.total_pd_hours),
                    'total_supervision_hours': float(logbook.total_supervision_hours),
                }
                
                logbook = serializer.save()
                
                # Log update
                EnhancedLogbookAudit.log_action(
                    logbook=logbook,
                    action='updated',
                    actor=request.user,
                    description="Logbook updated",
                    diff_snapshot={'fields': old_data}
                )
            
            return Response(LogbookSerializer(logbook, context={'request': request}).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_submit(request, logbook_id):
    """
    Submit logbook for supervisor review
    """
    logbook = get_object_or_404(EnhancedLogbook, id=logbook_id)
    
    # Check permissions
    if logbook.owner != request.user:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = LogbookSubmitSerializer(data=request.data, context={'logbook': logbook})
    if serializer.is_valid():
        with transaction.atomic():
            # Transition to submitted status
            LogbookStateMachine.transition_logbook(
                logbook=logbook,
                new_status='submitted',
                actor=request.user,
                description="Logbook submitted for review"
            )
            
            # Create notification for supervisor
            if logbook.supervisor:
                send_notification(
                    recipient=logbook.supervisor,
                    actor=request.user,
                    notification_type='logbook_submitted',
                    title='Logbook Submitted for Review',
                    body=f"{request.user.get_full_name()} has submitted a logbook for week {logbook.week_start_date}",
                    related_object=logbook
                )
        
        return Response({'message': 'Logbook submitted successfully'}, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_approve(request, logbook_id):
    """
    Approve logbook (supervisor action)
    """
    logbook = get_object_or_404(EnhancedLogbook, id=logbook_id)
    
    # Check permissions
    if logbook.supervisor != request.user:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = LogbookApproveSerializer(data=request.data, context={'logbook': logbook})
    if serializer.is_valid():
        with transaction.atomic():
            # Transition to approved status
            LogbookStateMachine.transition_logbook(
                logbook=logbook,
                new_status='approved',
                actor=request.user,
                description=f"Logbook approved. Notes: {serializer.validated_data.get('supervisor_notes', '')}"
            )
            
            # Create notification for owner
            send_notification(
                recipient=logbook.owner,
                actor=request.user,
                notification_type='logbook_approved',
                title='Logbook Approved',
                body=f"Your logbook for week {logbook.week_start_date} has been approved",
                related_object=logbook
            )
        
        return Response({'message': 'Logbook approved successfully'}, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_reject(request, logbook_id):
    """
    Reject logbook (supervisor action)
    """
    logbook = get_object_or_404(EnhancedLogbook, id=logbook_id)
    
    # Check permissions
    if logbook.supervisor != request.user:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = LogbookRejectSerializer(data=request.data, context={'logbook': logbook})
    if serializer.is_valid():
        with transaction.atomic():
            # Transition to changes_requested status
            LogbookStateMachine.transition_logbook(
                logbook=logbook,
                new_status='changes_requested',
                actor=request.user,
                description=f"Logbook rejected. Reason: {serializer.validated_data['rejection_reason']}"
            )
            
            # Create notification for owner
            send_notification(
                recipient=logbook.owner,
                actor=request.user,
                notification_type='logbook_rejected',
                title='Logbook Changes Requested',
                body=f"Your logbook for week {logbook.week_start_date} requires changes. Reason: {serializer.validated_data['rejection_reason']}",
                related_object=logbook
            )
        
        return Response({'message': 'Logbook rejected successfully'}, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_request_edit(request, logbook_id):
    """
    Request edit access to approved logbook (owner action)
    """
    logbook = get_object_or_404(EnhancedLogbook, id=logbook_id)
    
    # Check permissions
    if logbook.owner != request.user:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = LogbookUnlockRequestSerializer(data=request.data, context={'logbook': logbook})
    if serializer.is_valid():
        with transaction.atomic():
            # Transition to edit_requested status
            LogbookStateMachine.transition_logbook(
                logbook=logbook,
                new_status='edit_requested',
                actor=request.user,
                description=f"Edit access requested. Reason: {serializer.validated_data['reason']}"
            )
            
            # Create notification for supervisor
            if logbook.supervisor:
                EnhancedNotification.create_notification(
                    recipient=logbook.supervisor,
                    notification_type='edit_requested',
                    title='Edit Access Requested',
                    body=f"{logbook.owner.email} has requested edit access to their logbook",
                    related_object=logbook
                )
        
        return Response({'message': 'Edit access requested successfully'}, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_grant_edit(request, logbook_id):
    """
    Grant edit access to logbook (supervisor action)
    """
    logbook = get_object_or_404(EnhancedLogbook, id=logbook_id)
    
    # Check permissions
    if logbook.supervisor != request.user:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = LogbookUnlockGrantSerializer(data=request.data, context={'logbook': logbook})
    if serializer.is_valid():
        with transaction.atomic():
            # Transition to unlocked status
            LogbookStateMachine.transition_logbook(
                logbook=logbook,
                new_status='unlocked',
                actor=request.user,
                description=f"Edit access granted for {serializer.validated_data['duration_hours']} hours"
            )
            
            # Create notification for owner
            EnhancedNotification.create_notification(
                recipient=logbook.owner,
                notification_type='edit_granted',
                title='Edit Access Granted',
                body=f"Edit access has been granted to your logbook for {serializer.validated_data['duration_hours']} hours",
                related_object=logbook
            )
        
        return Response({'message': 'Edit access granted successfully'}, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_audit(request, logbook_id):
    """
    Get audit trail for logbook
    """
    logbook = get_object_or_404(EnhancedLogbook, id=logbook_id)
    
    # Check permissions
    if logbook.owner != request.user and logbook.supervisor != request.user:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    audit_entries = EnhancedLogbookAudit.objects.filter(logbook=logbook).order_by('-timestamp')
    
    # Apply pagination
    paginator = LogbookPagination()
    page = paginator.paginate_queryset(audit_entries, request)
    
    if page is not None:
        serializer = LogbookAuditSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    serializer = LogbookAuditSerializer(audit_entries, many=True)
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def logbook_comments(request, logbook_id):
    """
    GET: List comments for logbook
    POST: Add comment to logbook
    """
    logbook = get_object_or_404(EnhancedLogbook, id=logbook_id)
    
    # Check permissions
    if logbook.owner != request.user and logbook.supervisor != request.user:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        comments = EnhancedLogbookComment.objects.filter(
            logbook=logbook, 
            parent_comment__isnull=True
        ).order_by('created_at')
        
        serializer = LogbookCommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = LogbookCommentSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            with transaction.atomic():
                comment = serializer.save()
                
                # Log comment creation
                EnhancedLogbookAudit.log_action(
                    logbook=logbook,
                    action='comment_added',
                    actor=request.user,
                    description=f"Comment added: {comment.text[:50]}...",
                    diff_snapshot={'comment_id': str(comment.id)}
                )
                
                # Create notification for other party
                other_user = logbook.supervisor if request.user == logbook.owner else logbook.owner
                if other_user:
                    send_notification(
                        recipient=other_user,
                        actor=request.user,
                        notification_type='comment_added',
                        title='New Comment on Logbook',
                        body=f"{request.user.get_full_name()} commented on the logbook for week {logbook.week_start_date}",
                        related_object=logbook
                    )
            
            return Response(LogbookCommentSerializer(comment, context={'request': request}).data, 
                          status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
def user_notifications(request):
    """
    Get user's notifications
    """
    notifications = EnhancedNotification.objects.filter(recipient=request.user).order_by('-created_at')
    
    # Apply pagination
    paginator = LogbookPagination()
    page = paginator.paginate_queryset(notifications, request)
    
    if page is not None:
        serializer = NotificationSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    serializer = NotificationSerializer(notifications, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def mark_notification_read(request, notification_id):
    """
    Mark notification as read
    """
    notification = get_object_or_404(EnhancedNotification, id=notification_id, recipient=request.user)
    notification.mark_as_read()
    return Response({'message': 'Notification marked as read'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def mark_all_notifications_read(request):
    """
    Mark all user notifications as read
    """
    EnhancedNotification.objects.filter(recipient=request.user, read=False).update(read=True)
    return Response({'message': 'All notifications marked as read'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
def supervisor_logbooks(request):
    """
    Get logbooks for supervisor review
    """
    # Check if user is a supervisor
    if not hasattr(request.user, 'profile') or request.user.profile.role not in ['SUPERVISOR', 'ORG_ADMIN']:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    logbooks = EnhancedLogbook.objects.filter(supervisor=request.user).order_by('-submitted_at')
    
    # Apply pagination
    paginator = LogbookPagination()
    page = paginator.paginate_queryset(logbooks, request)
    
    if page is not None:
        serializer = LogbookListSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)
    
    serializer = LogbookListSerializer(logbooks, many=True, context={'request': request})
    return Response(serializer.data)
