from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'profiles', views.RegistrarProfileViewSet)
router.register(r'practice-logs', views.PracticeLogViewSet)
router.register(r'cpd-activities', views.CPDActivityViewSet)
router.register(r'leave-records', views.LeaveRecordViewSet)
router.register(r'progress-reports', views.ProgressReportViewSet)
router.register(r'endorsement-applications', views.EndorsementApplicationViewSet)
router.register(r'observation-records', views.ObservationRecordViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
