from django.urls import path
from . import views

urlpatterns = [
    path('', views.support_dashboard, name='support_dashboard'),
    path('docs/testing-guide/', views.testing_guide_view, name='testing_guide_view'),
    path('docs/testing-checklist/', views.testing_checklist_view, name='testing_checklist_view'),
    path('tests/', views.tests_list_view, name='tests_list_view'),
    path('tests/<int:ticket_id>/', views.test_detail_view, name='test_detail_view'),
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
    path('api/tickets/<int:ticket_id>/test-plan/get/', views.get_test_plan, name='get_test_plan'),
    path('api/tickets/<int:ticket_id>/test-plan/suite/', views.add_test_suite, name='add_test_suite'),
    path('api/tickets/<int:ticket_id>/test-plan/test/', views.add_test_case, name='add_test_case'),
    path('api/tickets/<int:ticket_id>/test-plan/step/', views.add_test_step, name='add_test_step'),
    path('api/tickets/<int:ticket_id>/test-plan/step/update/', views.update_test_step, name='update_test_step'),
    path('api/tickets/<int:ticket_id>/test-plan/promote/', views.promote_testing_level, name='promote_testing_level'),
    path('api/tickets/<int:ticket_id>/test-plan/suite/notes/', views.update_suite_notes, name='update_suite_notes'),
    path('api/tickets/<int:ticket_id>/test-plan/test/notes/', views.update_test_notes, name='update_test_notes'),
    path('api/tickets/<int:ticket_id>/test-plan/suite/delete/', views.delete_suite, name='delete_suite'),
    path('api/tickets/<int:ticket_id>/test-plan/test/delete/', views.delete_test, name='delete_test'),
    path('api/tickets/<int:ticket_id>/test-plan/step/delete/', views.delete_step, name='delete_step'),
    path('api/tickets/<int:ticket_id>/stage/', views.update_ticket_stage, name='update_ticket_stage'),
    path('api/tickets/<int:ticket_id>/attach-default-test-plan/', views.attach_default_test_plan, name='attach_default_test_plan'),
    path('api/tickets/<int:ticket_id>/move-to-roadmap/', views.move_to_roadmap, name='move_to_roadmap'),
    path('api/tickets/<int:ticket_id>/test-plan/bootstrap/', views.bootstrap_test_plan, name='bootstrap_test_plan'),
    
    # Session-based test plan URLs for Django admin template
    path('api/tickets/<int:ticket_id>/test-plan/step/session/', views.add_test_step_session, name='add_test_step_session'),
    path('api/tickets/<int:ticket_id>/test-plan/suite/session/', views.add_test_suite_session, name='add_test_suite_session'),
    path('api/tickets/<int:ticket_id>/test-plan/test/session/', views.add_test_case_session, name='add_test_case_session'),
    path('api/tickets/<int:ticket_id>/test-plan/step/update/session/', views.update_test_step_session, name='update_test_step_session'),
    path('api/tickets/<int:ticket_id>/test-plan/get/session/', views.get_test_plan_session, name='get_test_plan_session'),
    path('api/tickets/<int:ticket_id>/test-plan/save/session/', views.save_test_plan_session, name='save_test_plan_session'),
    
    # Release workflow
    path('api/releases/', views.create_release, name='create_release'),
    path('api/releases/list/', views.list_releases, name='list_releases'),
    path('api/releases/<int:release_id>/', views.release_detail, name='release_detail'),
    path('api/releases/<int:release_id>/update/', views.update_release, name='update_release'),
    path('api/releases/<int:release_id>/add-ticket/', views.release_add_ticket, name='release_add_ticket'),
    path('api/tickets/<int:ticket_id>/qa-status/', views.set_ticket_qa_status, name='set_ticket_qa_status'),
]
