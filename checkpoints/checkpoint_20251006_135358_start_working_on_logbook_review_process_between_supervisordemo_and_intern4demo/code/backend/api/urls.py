from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health, name='health'),
    path('me/', views.me, name='me'),
    path('user-profile/', views.user_profile, name='user-profile'),
    path('program-summary/', views.program_summary, name='program-summary'),
    path('auth/password-reset/request/', views.password_reset_request, name='password-reset-request'),
    path('auth/password-reset/confirm/', views.password_reset_confirm, name='password-reset-confirm'),
    path('auth/register/terms/', views.register_terms_agree, name='register-terms'),
    path('auth/register/details/', views.register_details_submit, name='register-details'),
    path('auth/register/verify/', views.register_verify_code, name='register-verify'),
    path('auth/register/complete/', views.register_complete, name='register-complete'),
    # Messaging system
    path('messages/', views.messages, name='messages'),
    path('messages/<int:message_id>/', views.message_detail, name='message-detail'),
    path('supervisor-requests/', views.supervisor_requests, name='supervisor-requests'),
    path('supervisor-requests/<int:request_id>/respond/', views.supervisor_request_response, name='supervisor-request-response'),
    # Supervisor invitations
    path('supervisor-invitations/', views.supervisor_invitations, name='supervisor-invitations'),
    path('invitation/<str:token>/', views.supervisor_invitation_detail, name='supervisor-invitation-detail'),
    path('invitation/<str:token>/accept/', views.supervisor_invitation_accept, name='supervisor-invitation-accept'),
    # Supervisor endorsements
    path('supervisor-endorsements/', views.supervisor_endorsements, name='supervisor-endorsements'),
    path('supervisor-endorsements/<int:endorsement_id>/', views.supervisor_endorsement_detail, name='supervisor-endorsement-detail'),
    path('available-supervisors/', views.available_supervisors, name='available-supervisors'),
    path('users/lookup/', views.user_lookup, name='user-lookup'),
    path('supervisees/', views.supervisees_list, name='supervisees-list'),
    # Supervision management
    path('supervisions/invite/', views.supervision_invite, name='supervision-invite'),
    path('supervisions/', views.supervision_list, name='supervision-list'),
    path('supervisions/respond/', views.supervision_respond, name='supervision-respond'),
    path('supervisions/pending/', views.supervision_pending_requests, name='supervision-pending-requests'),
    path('supervisions/<int:supervision_id>/cancel/', views.supervision_cancel, name='supervision-cancel'),
    path('supervisions/<int:supervision_id>/remove/', views.supervision_remove, name='supervision-remove'),
    path('supervisions/stats/', views.supervision_stats, name='supervision-stats'),
    # Supervision assignments for provisional psychologists
    path('supervision-assignments/', views.supervision_assignments, name='supervision-assignments'),
    # Meeting management
    path('meetings/', views.meeting_list, name='meeting-list'),
    path('meetings/<int:meeting_id>/', views.meeting_detail, name='meeting-detail'),
    path('meetings/invites/', views.meeting_invites, name='meeting-invites'),
    path('meetings/invites/<int:invite_id>/respond/', views.meeting_invite_response, name='meeting-invite-response'),
    path('meetings/stats/', views.meeting_stats, name='meeting-stats'),
    path('meetings/<int:meeting_id>/download/', views.meeting_ics_download, name='meeting-ics-download'),
    # Disconnection requests
    path('disconnection-requests/', views.disconnection_requests, name='disconnection-requests'),
    path('disconnection-requests/<int:request_id>/', views.disconnection_request_detail, name='disconnection-request-detail'),
    path('disconnection-requests/<int:request_id>/cancel/', views.disconnection_request_cancel, name='disconnection-request-cancel'),
    # Error logging
    path('audit-log/errors/', views.log_error, name='log-error'),
]

