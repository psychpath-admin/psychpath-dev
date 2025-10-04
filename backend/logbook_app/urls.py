from django.urls import path
from .views import (
    logbook_list, logbook_dashboard_list, logbook_status_summary, eligible_weeks, logbook_draft, logbook_create, logbook_submit, 
    logbook_detail, logbook_audit_logs, supervisor_logbooks,
    logbook_approve, logbook_reject, logbook_entries, logbook_review,
    logbook_messages, logbook_audit_trail, logbook_resubmit,
    logbook_comment_threads, comment_message_reply, entry_comment_thread,
    comment_message_detail, create_unlock_request, unlock_requests_queue,
    review_unlock_request, force_relock_unlock_request,
    user_notifications, notification_stats, mark_notification_read,
    mark_all_notifications_read, create_notification,
    logbook_html_report, notification_list, notification_mark_read
)

urlpatterns = [
    # Logbook management endpoints
    path('', logbook_list, name='logbook-list'),
    path('dashboard/', logbook_dashboard_list, name='logbook-dashboard-list'),
    path('status-summary/', logbook_status_summary, name='logbook-status-summary'),
    path('eligible-weeks/', eligible_weeks, name='eligible-weeks'),
    path('draft/', logbook_draft, name='logbook-draft'),
    path('create/', logbook_create, name='logbook-create'),
    path('submit/', logbook_submit, name='logbook-submit'),
    path('<int:logbook_id>/', logbook_detail, name='logbook-detail'),
    path('<int:logbook_id>/audit-logs/', logbook_audit_logs, name='logbook-audit-logs'),
    
    # Supervisor endpoints
    path('supervisor/', supervisor_logbooks, name='supervisor-logbooks'),
    path('<int:logbook_id>/approve/', logbook_approve, name='logbook-approve'),
    path('<int:logbook_id>/reject/', logbook_reject, name='logbook-reject'),
    path('<int:logbook_id>/entries/', logbook_entries, name='logbook-entries'),
    path('<int:logbook_id>/review/', logbook_review, name='logbook-review'),
    path('<int:logbook_id>/messages/', logbook_messages, name='logbook-messages'),
    path('<int:logbook_id>/audit/', logbook_audit_trail, name='logbook-audit-trail'),
    path('<int:logbook_id>/resubmit/', logbook_resubmit, name='logbook-resubmit'),
    path('<int:logbook_id>/html-report/', logbook_html_report, name='logbook-html-report'),
    
    # Comment system endpoints
    path('<int:logbook_id>/comments/', logbook_comment_threads, name='logbook-comment-threads'),
    path('comments/<int:comment_id>/reply/', comment_message_reply, name='comment-message-reply'),
    path('comments/<int:comment_id>/', comment_message_detail, name='comment-message-detail'),
    path('entries/<int:entry_id>/<str:section>/comments/', entry_comment_thread, name='entry-comment-thread'),
    
    # Unlock request endpoints
    path('<int:logbook_id>/unlock-request/', create_unlock_request, name='create-unlock-request'),
    path('unlock-requests/queue/', unlock_requests_queue, name='unlock-requests-queue'),
    path('unlock-requests/<int:unlock_request_id>/review/', review_unlock_request, name='review-unlock-request'),
    path('unlock-requests/<int:unlock_request_id>/force-relock/', force_relock_unlock_request, name='force-relock-unlock-request'),
    
    # Notification endpoints
    path('notifications/', notification_list, name='notification-list'),
    path('notifications/stats/', notification_stats, name='notification-stats'),
    path('notifications/<int:notification_id>/read/', notification_mark_read, name='notification-mark-read'),
]

