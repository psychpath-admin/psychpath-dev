from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WeeklyLogbookViewSet, DCCEntryViewSet, CRAEntryViewSet,
    PDEntryViewSet, SUPEntryViewSet, LogbookStatsView
)

router = DefaultRouter()
router.register(r'logbooks', WeeklyLogbookViewSet, basename='logbook')

# Nested routers for entries
logbook_entries_router = DefaultRouter()
logbook_entries_router.register(r'dcc-entries', DCCEntryViewSet, basename='dcc-entry')
logbook_entries_router.register(r'cra-entries', CRAEntryViewSet, basename='cra-entry')
logbook_entries_router.register(r'pd-entries', PDEntryViewSet, basename='pd-entry')
logbook_entries_router.register(r'sup-entries', SUPEntryViewSet, basename='sup-entry')

urlpatterns = [
    path('', include(router.urls)),
    path('logbooks/<int:logbook_pk>/', include(logbook_entries_router.urls)),
    path('stats/', LogbookStatsView.as_view(), name='logbook-stats'),
]

