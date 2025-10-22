from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SupervisionEntryViewSet, check_supervision_quality

router = DefaultRouter()
router.register(r'entries', SupervisionEntryViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('check-quality/', check_supervision_quality, name='check-supervision-quality'),
]
