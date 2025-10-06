from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SectionAEntryViewSet, CustomSessionActivityTypeViewSet

router = DefaultRouter()
router.register(r'entries', SectionAEntryViewSet, basename='section-a-entry')
router.register(r'custom-activity-types', CustomSessionActivityTypeViewSet, basename='custom-activity-type')

urlpatterns = [
    path('', include(router.urls)),
]
