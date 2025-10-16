from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SupervisionEntryViewSet, SupervisionObservationViewSet, SupervisionComplianceViewSet

router = DefaultRouter()
router.register(r'entries', SupervisionEntryViewSet)
router.register(r'observations', SupervisionObservationViewSet)
router.register(r'compliance', SupervisionComplianceViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
