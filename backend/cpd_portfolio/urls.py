from rest_framework.routers import DefaultRouter
from django.urls import path, include
from . import views

router = DefaultRouter()
router.register(r'categories', views.CPDCategoryViewSet)
router.register(r'activities', views.CPDActivityViewSet)
router.register(r'plans', views.CPDPlanViewSet)
router.register(r'requirements', views.CPDRequirementViewSet)
router.register(r'reports', views.CPDComplianceReportViewSet)
router.register(r'dashboard', views.CPDDashboardViewSet, basename='cpd-dashboard')

urlpatterns = [
    path('', include(router.urls)),
]
