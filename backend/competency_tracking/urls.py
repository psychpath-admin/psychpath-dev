from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'definitions', views.CompetencyDefinitionViewSet)
router.register(r'evidence', views.CompetencyEvidenceViewSet)
router.register(r'ratings', views.CompetencyRatingViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
