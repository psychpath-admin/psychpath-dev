from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EPAViewSet

router = DefaultRouter()
router.register(r'epas', EPAViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
