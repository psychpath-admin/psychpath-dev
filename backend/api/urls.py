from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import health, EPAViewSet, MilestoneViewSet, ReflectionViewSet

router = DefaultRouter()
router.register(r'epas', EPAViewSet)
router.register(r'milestones', MilestoneViewSet)
router.register(r'reflections', ReflectionViewSet)

urlpatterns = [
    path('health/', health, name='health'),
    path('', include(router.urls)),
]

