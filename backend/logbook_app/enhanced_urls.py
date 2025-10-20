"""
Enhanced URL patterns for Logbook Review Process
Implements all required API endpoints as specified.
"""

from django.urls import path
from .enhanced_views import (
    logbook_list_create, logbook_detail, logbook_submit, logbook_approve, 
    logbook_reject, logbook_request_edit, logbook_grant_edit, logbook_audit,
    logbook_comments, user_notifications, mark_notification_read, 
    mark_all_notifications_read, supervisor_logbooks
)

urlpatterns = [
    # Main logbook management
    path('', logbook_list_create, name='enhanced-logbook-list-create'),
    path('<uuid:logbook_id>/', logbook_detail, name='enhanced-logbook-detail'),
    
    # State transitions
    path('<uuid:logbook_id>/submit/', logbook_submit, name='enhanced-logbook-submit'),
    path('<uuid:logbook_id>/approve/', logbook_approve, name='enhanced-logbook-approve'),
    path('<uuid:logbook_id>/reject/', logbook_reject, name='enhanced-logbook-reject'),
    path('<uuid:logbook_id>/request-edit/', logbook_request_edit, name='enhanced-logbook-request-edit'),
    path('<uuid:logbook_id>/grant-edit/', logbook_grant_edit, name='enhanced-logbook-grant-edit'),
    
    # Audit and comments
    path('<uuid:logbook_id>/audit/', logbook_audit, name='enhanced-logbook-audit'),
    path('<uuid:logbook_id>/comments/', logbook_comments, name='enhanced-logbook-comments'),
    
    # Notifications
    path('notifications/', user_notifications, name='enhanced-user-notifications'),
    path('notifications/<uuid:notification_id>/read/', mark_notification_read, name='enhanced-mark-notification-read'),
    path('notifications/read-all/', mark_all_notifications_read, name='enhanced-mark-all-notifications-read'),
    
    # Supervisor views
    path('supervisor/', supervisor_logbooks, name='enhanced-supervisor-logbooks'),
]
