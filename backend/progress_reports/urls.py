from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProgressReportConfigViewSet, ProgressReportViewSet

router = DefaultRouter()
router.register(r'configs', ProgressReportConfigViewSet)
router.register(r'reports', ProgressReportViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
