from django.urls import path
from .views import health, user_profile, update_signature, me, password_reset_request, password_reset_confirm, register_terms_agree, register_details_submit, register_verify_code, register_complete, program_summary, messages, message_detail, supervisor_requests, supervisor_request_response, supervisor_invitation_detail, supervisor_invitation_accept, supervisor_invitations, supervisor_endorsements, supervisor_endorsement_detail, available_supervisors, user_lookup, supervisees_list, supervision_invite, supervision_list, supervision_respond, supervision_pending_requests, supervision_cancel, supervision_remove, supervision_stats, supervision_assignments, meeting_list, meeting_detail, meeting_invites, meeting_invite_response, meeting_stats, meeting_ics_download, log_error, disconnection_requests, disconnection_request_detail, disconnection_request_cancel, audit_logs_list, audit_logs_stats
# from . import rubric_views  # Temporarily commented out until rubric_views is created

urlpatterns = [
    path('health/', health, name='health'),
    path('me/', me, name='me'),
    path('user-profile/', user_profile, name='user-profile'),
    path('user-profile/update-signature/', update_signature, name='update-signature'),
    path('program-summary/', program_summary, name='program-summary'),
    path('auth/password-reset/request/', password_reset_request, name='password-reset-request'),
    path('auth/password-reset/confirm/', password_reset_confirm, name='password-reset-confirm'),
    path('auth/register/terms/', register_terms_agree, name='register-terms'),
    path('auth/register/details/', register_details_submit, name='register-details'),
    path('auth/register/verify/', register_verify_code, name='register-verify'),
    path('auth/register/complete/', register_complete, name='register-complete'),
    # Messaging system
    path('messages/', messages, name='messages'),
    path('messages/<int:message_id>/', message_detail, name='message-detail'),
    path('supervisor-requests/', supervisor_requests, name='supervisor-requests'),
    path('supervisor-requests/<int:request_id>/respond/', supervisor_request_response, name='supervisor-request-response'),
    # Supervisor invitations
    path('supervisor-invitations/', supervisor_invitations, name='supervisor-invitations'),
    path('invitation/<str:token>/', supervisor_invitation_detail, name='supervisor-invitation-detail'),
    path('invitation/<str:token>/accept/', supervisor_invitation_accept, name='supervisor-invitation-accept'),
    # Supervisor endorsements
    path('supervisor-endorsements/', supervisor_endorsements, name='supervisor-endorsements'),
    path('supervisor-endorsements/<int:endorsement_id>/', supervisor_endorsement_detail, name='supervisor-endorsement-detail'),
    path('available-supervisors/', available_supervisors, name='available-supervisors'),
    path('users/lookup/', user_lookup, name='user-lookup'),
    path('supervisees/', supervisees_list, name='supervisees-list'),
    # Supervision management
    path('supervisions/invite/', supervision_invite, name='supervision-invite'),
    path('supervisions/', supervision_list, name='supervision-list'),
    path('supervisions/respond/', supervision_respond, name='supervision-respond'),
    path('supervisions/pending/', supervision_pending_requests, name='supervision-pending-requests'),
    path('supervisions/<int:supervision_id>/cancel/', supervision_cancel, name='supervision-cancel'),
    path('supervisions/<int:supervision_id>/remove/', supervision_remove, name='supervision-remove'),
    path('supervisions/stats/', supervision_stats, name='supervision-stats'),
    # Supervision assignments for provisional psychologists
    path('supervision-assignments/', supervision_assignments, name='supervision-assignments'),
    # Meeting management
    path('meetings/', meeting_list, name='meeting-list'),
    path('meetings/<int:meeting_id>/', meeting_detail, name='meeting-detail'),
    path('meetings/invites/', meeting_invites, name='meeting-invites'),
    path('meetings/invites/<int:invite_id>/respond/', meeting_invite_response, name='meeting-invite-response'),
    path('meetings/stats/', meeting_stats, name='meeting-stats'),
    path('meetings/<int:meeting_id>/download/', meeting_ics_download, name='meeting-ics-download'),
    # Disconnection requests
    path('disconnection-requests/', disconnection_requests, name='disconnection-requests'),
    path('disconnection-requests/<int:request_id>/', disconnection_request_detail, name='disconnection-request-detail'),
    path('disconnection-requests/<int:request_id>/cancel/', disconnection_request_cancel, name='disconnection-request-cancel'),
    # Error logging
    path('audit-log/errors/', log_error, name='log-error'),
    # Audit logging
    path('audit-logs/', audit_logs_list, name='audit-logs-list'),
    path('audit-logs/stats/', audit_logs_stats, name='audit-logs-stats'),
    
    # Rubric System Routes (temporarily commented out)
    # path('competencies/', rubric_views.get_all_competencies, name='competencies-list'),
    # path('competencies/<str:competency_code>/epas/', rubric_views.get_competency_epas, name='competency-epas'),
    # path('epas/<str:epa_code>/milestones/', rubric_views.get_epa_milestones, name='epa-milestones'),
    # path('rubrics/epa/<str:epa_code>/', rubric_views.get_rubric_for_epa, name='rubric-by-epa'),
    # path('rubrics/<uuid:rubric_id>/', rubric_views.get_rubric_by_id, name='rubric-detail'),
    # path('rubrics/<uuid:rubric_id>/scores/<int:supervisee_id>/', rubric_views.get_rubric_scores, name='rubric-scores'),
    # path('rubrics/score/', rubric_views.submit_rubric_score, name='submit-rubric-score'),
    # path('rubrics/scores/<uuid:score_id>/', rubric_views.update_rubric_score, name='update-rubric-score'),
    # path('rubrics/scores/<uuid:score_id>/delete/', rubric_views.delete_rubric_score, name='delete-rubric-score'),
    # path('rubrics/summary/', rubric_views.submit_rubric_summary, name='submit-rubric-summary'),
    # path('rubrics/supervisee/<int:supervisee_id>/', rubric_views.get_supervisee_rubric_summaries, name='supervisee-rubrics'),
    # path('rubrics/my-progress/', rubric_views.get_my_rubric_summaries, name='my-rubric-progress'),
]

