from django.http import JsonResponse
from rest_framework import viewsets, permissions
from .models import EPA, Milestone, Reflection
from .serializers import EPASerializer, MilestoneSerializer, ReflectionSerializer


def health(_request):
    return JsonResponse({"status": "ok"})


class EPAViewSet(viewsets.ModelViewSet):
    queryset = EPA.objects.all()
    serializer_class = EPASerializer
    permission_classes = [permissions.AllowAny]


class MilestoneViewSet(viewsets.ModelViewSet):
    queryset = Milestone.objects.select_related('epa').all()
    serializer_class = MilestoneSerializer
    permission_classes = [permissions.AllowAny]


class ReflectionViewSet(viewsets.ModelViewSet):
    queryset = Reflection.objects.select_related('epa', 'milestone').all()
    serializer_class = ReflectionSerializer
    permission_classes = [permissions.AllowAny]

# Create your views here.
