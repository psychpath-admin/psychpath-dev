from django.urls import path
from . import views

urlpatterns = [
    path('', views.support_dashboard, name='support_dashboard'),
    path('api/error-logs/', views.get_error_logs, name='get_error_logs'),
    path('api/audit-logs/', views.get_audit_logs, name='get_audit_logs'),
    path('api/user-stats/', views.get_user_stats, name='get_user_stats'),
    path('api/system-health/', views.get_system_health, name='get_system_health'),
    path('api/dashboard-stats/', views.get_dashboard_stats, name='get_dashboard_stats'),
    path('api/support-tickets/', views.get_support_tickets, name='get_support_tickets'),
    path('api/system-alerts/', views.get_system_alerts, name='get_system_alerts'),
    path('api/weekly-stats/', views.get_weekly_stats, name='get_weekly_stats'),
    path('api/server-status/', views.get_server_status, name='get_server_status'),
    path('api/control-server/', views.control_server, name='control_server'),
    path('api/reset-password/', views.reset_user_password, name='reset_user_password'),
    path('api/all-users/', views.get_all_users, name='get_all_users'),
    
    # New API endpoints for tickets and chat
    path('api/tickets/create/', views.create_support_ticket, name='create_support_ticket'),
    path('api/tickets/', views.get_user_tickets, name='get_user_tickets'),
    path('api/tickets/<int:ticket_id>/', views.get_ticket_detail, name='get_ticket_detail'),
    path('api/chat/online-status/', views.get_support_online_status, name='get_support_online_status'),
    path('api/status/toggle/', views.toggle_support_status, name='toggle_support_status'),
           path('api/tickets/all/', views.get_all_tickets_dashboard, name='get_all_tickets_dashboard'),
           path('api/tickets/<int:ticket_id>/admin/', views.get_admin_ticket_detail_dashboard, name='get_admin_ticket_detail_dashboard'),
           path('api/tickets/<int:ticket_id>/status/', views.update_ticket_status, name='update_ticket_status'),
           
    # JWT API endpoints (for React frontend)
    path('api/jwt/tickets/all/', views.get_all_tickets, name='get_all_tickets'),
    path('api/jwt/tickets/<int:ticket_id>/admin/', views.get_admin_ticket_detail, name='get_admin_ticket_detail'),
    
           # Message endpoints
           path('api/tickets/<int:ticket_id>/message/', views.send_ticket_message, name='send_ticket_message'),
           path('api/tickets/<int:ticket_id>/message/dashboard/', views.send_ticket_message_dashboard, name='send_ticket_message_dashboard'),
           
           # Change detection endpoints
           path('api/tickets/<int:ticket_id>/changes/', views.check_ticket_changes, name='check_ticket_changes'),
           
    # Planning API endpoints
    path('api/tickets/<int:ticket_id>/promote/', views.promote_to_planned, name='promote_to_planned'),
    path('api/roadmap/', views.get_roadmap, name='get_roadmap'),
    path('api/planning/dashboard/', views.get_planning_dashboard, name='get_planning_dashboard'),
    path('api/tickets/<int:ticket_id>/test-plan/', views.update_test_plan, name='update_test_plan'),
    path('api/tickets/<int:ticket_id>/stage/', views.update_ticket_stage, name='update_ticket_stage'),
]
