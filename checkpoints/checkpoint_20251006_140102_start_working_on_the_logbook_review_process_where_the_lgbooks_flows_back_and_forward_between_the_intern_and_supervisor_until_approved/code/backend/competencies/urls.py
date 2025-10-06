from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompetencyViewSet

router = DefaultRouter()
router.register(r'competencies', CompetencyViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]
