from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categories', views.ConfigurationCategoryViewSet)
router.register(r'configurations', views.SystemConfigurationViewSet)
router.register(r'items', views.ConfigurationItemViewSet)
router.register(r'presets', views.ConfigurationPresetViewSet)
router.register(r'audit-logs', views.ConfigurationAuditLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
