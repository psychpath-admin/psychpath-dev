from django.urls import path
from .views import health, user_profile, me, password_reset_request, password_reset_confirm, register_terms_agree, register_details_submit, register_verify_code, register_complete, program_summary, messages, message_detail, supervisor_requests, supervisor_request_response, supervisor_invitation_detail, supervisor_invitation_accept, supervisor_invitations, supervisor_endorsements, supervisor_endorsement_detail, available_supervisors, user_lookup, supervision_invite, supervision_list, supervision_respond, supervision_pending_requests, supervision_cancel, supervision_remove, supervision_stats, supervision_assignments, meeting_list, meeting_detail, meeting_invites, meeting_invite_response, meeting_stats, log_error, disconnection_requests, disconnection_request_detail, disconnection_request_cancel

urlpatterns = [
    path('health/', health, name='health'),
    path('me/', me, name='me'),
    path('user-profile/', user_profile, name='user-profile'),
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
    # Disconnection requests
    path('disconnection-requests/', disconnection_requests, name='disconnection-requests'),
    path('disconnection-requests/<int:request_id>/', disconnection_request_detail, name='disconnection-request-detail'),
    path('disconnection-requests/<int:request_id>/cancel/', disconnection_request_cancel, name='disconnection-request-cancel'),
    # Error logging
    path('audit-log/errors/', log_error, name='log-error'),
]

