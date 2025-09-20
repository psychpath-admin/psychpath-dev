from django.urls import path
from .views import health, user_profile, me, password_reset_request, password_reset_confirm, register_terms_agree, register_details_submit, register_verify_code, register_complete

urlpatterns = [
    path('health/', health, name='health'),
    path('me/', me, name='me'),
    path('user-profile/', user_profile, name='user-profile'),
    path('auth/password-reset/request/', password_reset_request, name='password-reset-request'),
    path('auth/password-reset/confirm/', password_reset_confirm, name='password-reset-confirm'),
    path('auth/register/terms/', register_terms_agree, name='register-terms'),
    path('auth/register/details/', register_details_submit, name='register-details'),
    path('auth/register/verify/', register_verify_code, name='register-verify'),
    path('auth/register/complete/', register_complete, name='register-complete'),
]

