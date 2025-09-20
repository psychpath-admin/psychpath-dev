from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum
from datetime import datetime, timedelta

from .models import WeeklyLogbook, RegistrarLogEntry
from .serializers import WeeklyLogbookSerializer, RegistrarLogEntrySerializer


class IsRegistrar(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and hasattr(request.user, 'profile') and getattr(request.user.profile, 'role', '').upper() == 'REGISTRAR'


class WeeklyLogbookViewSet(viewsets.ModelViewSet):
    serializer_class = WeeklyLogbookSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WeeklyLogbook.objects.filter(trainee=self.request.user).order_by('-week_starting')

    def perform_create(self, serializer):
        serializer.save(trainee=self.request.user)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        week = self.get_object()
        if week.status == 'submitted':
            return Response({'detail': 'Week already submitted'}, status=400)
        week.status = 'submitted'
        week.submitted_at = timezone.now()
        week.save(update_fields=['status', 'submitted_at'])
        return Response({'detail': 'Week submitted'})

    @action(detail=True, methods=['post'])
    def request_return(self, request, pk=None):
        week = self.get_object()
        if week.status != 'submitted':
            return Response({'detail': 'Only submitted weeks can be requested for return'}, status=400)
        week.status = 'returned'
        week.returned_reason = request.data.get('reason', '')
        week.save(update_fields=['status', 'returned_reason'])
        return Response({'detail': 'Return requested'})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        # Annual PD rule: minimum 40 hours per calendar year
        now = timezone.now().date()
        year_start = datetime(now.year, 1, 1).date()
        pd_minutes = RegistrarLogEntry.objects.filter(
            trainee=request.user,
            category='professional_development',
            date__gte=year_start,
            date__lte=now,
        ).aggregate(total=Sum('duration_minutes'))['total'] or 0

        pd_hours = round(pd_minutes / 60.0, 2)
        return Response({
            'pd_this_year_hours': pd_hours,
            'pd_required_hours': 40.0,
            'meets_pd_requirement': pd_hours >= 40.0,
        })


class RegistrarLogEntryViewSet(viewsets.ModelViewSet):
    serializer_class = RegistrarLogEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return RegistrarLogEntry.objects.filter(trainee=self.request.user).order_by('-date', '-created_at')

    def perform_create(self, serializer):
        serializer.save(trainee=self.request.user)
from django.shortcuts import render

# Create your views here.
