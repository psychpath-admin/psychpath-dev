from django.urls import path
from . import views

urlpatterns = [
    path('progress/', views.get_internship_progress, name='internship_progress'),
    path('weekly-breakdown/', views.get_weekly_breakdown, name='weekly_breakdown'),
    path('validate-entry/', views.validate_entry, name='validate_entry'),
    path('alerts/', views.get_validation_alerts, name='validation_alerts'),
    path('dismiss-alert/', views.dismiss_alert, name='dismiss_alert'),
    path('check-completion/', views.check_completion_eligibility, name='check_completion'),
    path('complete/', views.complete_internship, name='complete_internship'),
    path('requirements/', views.get_program_requirements, name='program_requirements'),
]

