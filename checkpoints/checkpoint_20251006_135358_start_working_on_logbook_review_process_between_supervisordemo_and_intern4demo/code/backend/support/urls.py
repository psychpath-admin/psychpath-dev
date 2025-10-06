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
]
