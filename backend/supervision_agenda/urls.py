from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MySupervisionAgendaViewSet, AgendaItemViewSet, SectionCImportViewSet

# Create router for ViewSets
router = DefaultRouter()
router.register(r'agendas', MySupervisionAgendaViewSet, basename='agenda')
router.register(r'items', AgendaItemViewSet, basename='agenda-item')
router.register(r'imports', SectionCImportViewSet, basename='section-c-import')

app_name = 'supervision_agenda'

urlpatterns = [
    # Include all ViewSet routes
    path('', include(router.urls)),
]
