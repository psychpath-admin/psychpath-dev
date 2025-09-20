from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SupervisionEntryViewSet

router = DefaultRouter()
router.register(r'entries', SupervisionEntryViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
