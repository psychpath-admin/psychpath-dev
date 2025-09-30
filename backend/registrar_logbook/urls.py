from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'programs', views.RegistrarProgramViewSet, basename='registrar-program')
router.register(r'practice-entries', views.RegistrarPracticeEntryViewSet, basename='registrar-practice-entry')
router.register(r'supervision-entries', views.RegistrarSupervisionEntryViewSet, basename='registrar-supervision-entry')
router.register(r'cpd-entries', views.RegistrarCpdEntryViewSet, basename='registrar-cpd-entry')
router.register(r'supervisor-profiles', views.SupervisorProfileViewSet, basename='supervisor-profile')
router.register(r'competency-framework', views.CompetencyFrameworkViewSet, basename='competency-framework')
router.register(r'audit-logs', views.AuditLogViewSet, basename='audit-log')

urlpatterns = [
    path('', include(router.urls)),
    path('reports/<int:program_id>/', views.RegistrarReportsAPIView.as_view(), name='registrar-reports'),
]


