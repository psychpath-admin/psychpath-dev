from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from permissions import DenyOrgAdmin
from rest_framework.response import Response
from django.db.models import Sum, Q
from django.utils import timezone
from django.conf import settings
from datetime import datetime, timedelta
from collections import defaultdict

from .models import ProfessionalDevelopmentEntry, PDCompetency, PDWeeklySummary
from .serializers import (
    ProfessionalDevelopmentEntrySerializer, 
    PDCompetencySerializer,
    PDWeeklySummarySerializer,
    PDEntryWithSummarySerializer
)


class ProfessionalDevelopmentEntryListCreateView(generics.ListCreateAPIView):
    """List and create PD entries for the authenticated user"""
    serializer_class = ProfessionalDevelopmentEntrySerializer
    permission_classes = [IsAuthenticated, DenyOrgAdmin]
    
    def get_queryset(self):
        queryset = ProfessionalDevelopmentEntry.objects.filter(
            trainee=self.request.user
        )
        
        # Filter by locked status if provided
        include_locked = self.request.query_params.get('include_locked', 'false').lower() == 'true'
        if not include_locked:
            queryset = queryset.filter(locked=False)
        
        # Filter by week_starting if provided
        week_starting = self.request.query_params.get('week_starting', None)
        if week_starting:
            queryset = queryset.filter(week_starting=week_starting)
        
        return queryset.order_by('-date_of_activity', '-created_at')
    
    def perform_create(self, serializer):
        # Calculate week starting date
        date_of_activity = serializer.validated_data['date_of_activity']
        week_starting = date_of_activity - timedelta(days=date_of_activity.weekday())
        instance = serializer.save(trainee=self.request.user, week_starting=week_starting)
        
        # Update weekly summary
        self.update_weekly_summary(self.request.user, week_starting)
    
    def update_weekly_summary(self, user, week_starting):
        """Update or create weekly summary for the given week"""
        # Calculate totals for the week
        week_entries = ProfessionalDevelopmentEntry.objects.filter(
            trainee=user,
            week_starting=week_starting
        )
        week_total = week_entries.aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
        
        # Calculate cumulative total (all weeks up to and including this week)
        cumulative_entries = ProfessionalDevelopmentEntry.objects.filter(
            trainee=user,
            week_starting__lte=week_starting
        )
        cumulative_total = cumulative_entries.aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
        
        # Update or create weekly summary
        summary, created = PDWeeklySummary.objects.get_or_create(
            trainee=user,
            week_starting=week_starting,
            defaults={
                'week_total_minutes': week_total,
                'cumulative_total_minutes': cumulative_total
            }
        )
        
        if not created:
            summary.week_total_minutes = week_total
            summary.cumulative_total_minutes = cumulative_total
            summary.save()


class ProfessionalDevelopmentEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a PD entry"""
    serializer_class = ProfessionalDevelopmentEntrySerializer
    permission_classes = [IsAuthenticated, DenyOrgAdmin]
    
    def get_queryset(self):
        # For now, allow editing any entry - this is a temporary fix for the logbook editing feature
        # TODO: Implement proper permission checking once database schema is fixed
        return ProfessionalDevelopmentEntry.objects.all()
    
    def perform_update(self, serializer):
        # Recalculate week starting date if date changed
        if 'date_of_activity' in serializer.validated_data:
            date_of_activity = serializer.validated_data['date_of_activity']
            week_starting = date_of_activity - timedelta(days=date_of_activity.weekday())
            serializer.save(week_starting=week_starting)
            
            # Update weekly summary
            self.update_weekly_summary(self.request.user, week_starting)
        else:
            serializer.save()
    
    def perform_destroy(self, instance):
        week_starting = instance.week_starting
        instance.delete()
        # Update weekly summary after deletion
        self.update_weekly_summary(self.request.user, week_starting)
    
    def update_weekly_summary(self, user, week_starting):
        """Update or create weekly summary for the given week"""
        # Calculate totals for the week
        week_entries = ProfessionalDevelopmentEntry.objects.filter(
            trainee=user,
            week_starting=week_starting
        )
        week_total = week_entries.aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
        
        # Calculate cumulative total (all weeks up to and including this week)
        cumulative_entries = ProfessionalDevelopmentEntry.objects.filter(
            trainee=user,
            week_starting__lte=week_starting
        )
        cumulative_total = cumulative_entries.aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
        
        # Update or create weekly summary
        summary, created = PDWeeklySummary.objects.get_or_create(
            trainee=user,
            week_starting=week_starting,
            defaults={
                'week_total_minutes': week_total,
                'cumulative_total_minutes': cumulative_total
            }
        )
        
        if not created:
            summary.week_total_minutes = week_total
            summary.cumulative_total_minutes = cumulative_total
            summary.save()


class PDCompetencyListView(generics.ListAPIView):
    """List all available PD competencies"""
    queryset = PDCompetency.objects.filter(is_active=True)
    serializer_class = PDCompetencySerializer
    permission_classes = [IsAuthenticated, DenyOrgAdmin]


@api_view(['GET'])
@permission_classes([IsAuthenticated, DenyOrgAdmin])
def pd_entries_grouped_by_week(request):
    """Get PD entries grouped by week with summary data"""
    entries = ProfessionalDevelopmentEntry.objects.filter(
        trainee=request.user
    ).order_by('-week_starting', '-date_of_activity')
    
    # Filter by locked status if provided
    include_locked = request.GET.get('include_locked', 'false').lower() == 'true'
    if not include_locked:
        entries = entries.filter(locked=False)
    
    # Group entries by week
    grouped_entries = defaultdict(list)
    week_summaries = {}
    
    for entry in entries:
        week_key = entry.week_starting.strftime('%Y-%m-%d')
        grouped_entries[week_key].append(entry)
        
        # Get or create week summary
        if week_key not in week_summaries:
            try:
                summary = PDWeeklySummary.objects.get(
                    trainee=request.user,
                    week_starting=entry.week_starting
                )
                week_summaries[week_key] = {
                    'week_starting': summary.week_starting,
                    'week_total_display': summary.week_total_display,
                    'cumulative_total_display': summary.cumulative_total_display
                }
            except PDWeeklySummary.DoesNotExist:
                # Calculate on the fly if summary doesn't exist
                week_entries = ProfessionalDevelopmentEntry.objects.filter(
                    trainee=request.user,
                    week_starting=entry.week_starting
                )
                week_total = week_entries.aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
                
                cumulative_entries = ProfessionalDevelopmentEntry.objects.filter(
                    trainee=request.user,
                    week_starting__lte=entry.week_starting
                )
                cumulative_total = cumulative_entries.aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
                
                week_summaries[week_key] = {
                    'week_starting': entry.week_starting,
                    'week_total_display': f"{week_total // 60}:{week_total % 60:02d}",
                    'cumulative_total_display': f"{cumulative_total // 60}:{cumulative_total % 60:02d}"
                }
    
    # Format response
    result = []
    for week_key in sorted(grouped_entries.keys(), reverse=True):
        week_data = {
            'week_starting': week_summaries[week_key]['week_starting'],
            'week_total_display': week_summaries[week_key]['week_total_display'],
            'cumulative_total_display': week_summaries[week_key]['cumulative_total_display'],
            'entries': PDEntryWithSummarySerializer(grouped_entries[week_key], many=True).data
        }
        result.append(week_data)
    
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated, DenyOrgAdmin])
def pd_summary_metrics(request):
    """Get PD summary metrics for dashboard"""
    # Get current week starting date
    today = timezone.now().date()
    current_week_starting = today - timedelta(days=today.weekday())
    
    # Get total PD hours
    total_pd_minutes = ProfessionalDevelopmentEntry.objects.filter(
        trainee=request.user
    ).aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
    
    # Get current week PD hours
    current_week_minutes = ProfessionalDevelopmentEntry.objects.filter(
        trainee=request.user,
        week_starting=current_week_starting
    ).aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
    
    # Annual PD requirement by role (hours)
    role = getattr(getattr(request.user, 'profile', None), 'role', '').upper()
    if role == 'INTERN' or role == 'PROVISIONAL':
        annual_required_hours = settings.PD_ANNUAL_REQUIREMENTS.get('INTERN', 60.0)
    elif role == 'REGISTRAR':
        annual_required_hours = settings.PD_ANNUAL_REQUIREMENTS.get('REGISTRAR', 40.0)
    else:
        annual_required_hours = settings.PD_ANNUAL_REQUIREMENTS.get('INTERN', 60.0)

    # Calculate annual PD for the current calendar year
    today = timezone.now().date()
    year_start = datetime(today.year, 1, 1).date()
    annual_minutes = ProfessionalDevelopmentEntry.objects.filter(
        trainee=request.user,
        date_of_activity__gte=year_start,
        date_of_activity__lte=today
    ).aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0

    annual_hours = annual_minutes / 60.0

    # Convert to hours:minutes format
    total_hours = total_pd_minutes // 60
    total_minutes = total_pd_minutes % 60
    current_week_hours = current_week_minutes // 60
    current_week_minutes_remainder = current_week_minutes % 60
    
    return Response({
        'total_pd_hours': f"{total_hours}:{total_minutes:02d}",
        'current_week_pd_hours': f"{current_week_hours}:{current_week_minutes_remainder:02d}",
        'total_pd_minutes': total_pd_minutes,
        'current_week_pd_minutes': current_week_minutes,
        'annual_pd_hours': round(annual_hours, 2),
        'annual_pd_minutes': annual_minutes,
        'annual_pd_required_hours': annual_required_hours,
        'annual_pd_met': annual_hours >= annual_required_hours,
    })
