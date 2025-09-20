from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WeeklyLogbookViewSet, RegistrarLogEntryViewSet

router = DefaultRouter()
router.register(r'weeks', WeeklyLogbookViewSet, basename='registrar-weeks')
router.register(r'entries', RegistrarLogEntryViewSet, basename='registrar-entries')

urlpatterns = [
    path('', include(router.urls)),
]


