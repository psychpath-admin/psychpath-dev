from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum
from datetime import timedelta, datetime
from .models import SupervisionEntry, SupervisionWeeklySummary
from api.models import UserProfile
from .serializers import SupervisionEntrySerializer, SupervisionWeeklySummarySerializer
from permissions import TenantPermissionMixin, RoleBasedPermission, DenyOrgAdmin
from logging_utils import support_error_handler, audit_data_access, log_data_access

class SupervisionEntryViewSet(TenantPermissionMixin, viewsets.ModelViewSet):
    queryset = SupervisionEntry.objects.all()
    serializer_class = SupervisionEntrySerializer
    permission_classes = [RoleBasedPermission, DenyOrgAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and hasattr(user, 'profile'):
            if user.profile.role in ['INTERN', 'REGISTRAR']:
                return SupervisionEntry.objects.filter(trainee=user.profile).order_by('-date_of_supervision')
            elif user.profile.role == 'SUPERVISOR':
                trainee_ids = user.profile.supervising.values_list('id', flat=True)
                return SupervisionEntry.objects.filter(trainee__id__in=trainee_ids).order_by('-date_of_supervision')
            elif user.profile.role == 'ORG_ADMIN':
                org_trainee_ids = UserProfile.objects.filter(organization=user.profile.organization, role__in=['INTERN', 'REGISTRAR']).values_list('id', flat=True)
                return SupervisionEntry.objects.filter(trainee__id__in=org_trainee_ids).order_by('-date_of_supervision')
        return SupervisionEntry.objects.none()

    def perform_create(self, serializer):
        if not hasattr(self.request.user, 'profile') or self.request.user.profile.role not in ['INTERN', 'REGISTRAR']:
            raise serializers.ValidationError("Only interns and registrars can create supervision entries.")
        serializer.save(trainee=self.request.user.profile)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def grouped_by_week(self, request):
        queryset = self.get_queryset()
        
        # Group entries by week_starting
        entries_by_week = {}
        for entry in queryset:
            week_start = entry.week_starting
            if week_start not in entries_by_week:
                entries_by_week[week_start] = []
            entries_by_week[week_start].append(entry)

        # Create SupervisionWeeklySummary objects for serialization
        weekly_summaries = []
        cumulative_total_minutes = 0
        sorted_weeks = sorted(entries_by_week.keys(), reverse=True)

        for week_start in sorted_weeks:
            week_entries = sorted(entries_by_week[week_start], key=lambda x: x.date_of_supervision, reverse=True)
            week_total_minutes = sum(entry.duration_minutes for entry in week_entries)
            
            # Calculate cumulative up to the end of this week
            # Use the same filtering logic as get_queryset()
            user = request.user
            if user.is_authenticated and hasattr(user, 'profile'):
                if user.profile.role in ['INTERN', 'REGISTRAR']:
                    all_entries_up_to_week = SupervisionEntry.objects.filter(
                        trainee=user.profile,
                        date_of_supervision__lt=week_start + timedelta(days=7)
                    )
                elif user.profile.role == 'SUPERVISOR':
                    trainee_ids = user.profile.supervising.values_list('id', flat=True)
                    all_entries_up_to_week = SupervisionEntry.objects.filter(
                        trainee__id__in=trainee_ids,
                        date_of_supervision__lt=week_start + timedelta(days=7)
                    )
                elif user.profile.role == 'ORG_ADMIN':
                    org_trainee_ids = UserProfile.objects.filter(organization=user.profile.organization, role__in=['INTERN', 'REGISTRAR']).values_list('id', flat=True)
                    all_entries_up_to_week = SupervisionEntry.objects.filter(
                        trainee__id__in=org_trainee_ids,
                        date_of_supervision__lt=week_start + timedelta(days=7)
                    )
                else:
                    all_entries_up_to_week = SupervisionEntry.objects.none()
            else:
                all_entries_up_to_week = SupervisionEntry.objects.none()
            cumulative_total_minutes = all_entries_up_to_week.aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0

            summary = SupervisionWeeklySummary(
                trainee=request.user.profile, # This is a dummy for serializer, actual object not saved here
                week_starting=week_start,
                week_total_minutes=week_total_minutes,
                cumulative_total_minutes=cumulative_total_minutes
            )
            summary.entries = week_entries # Attach entries for nested serialization
            weekly_summaries.append(summary)

        serializer = SupervisionWeeklySummarySerializer(weekly_summaries, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def summary_metrics(self, request):
        # Some users might not have a related profile due to data seeding; guard against it
        try:
            user_profile = request.user.profile
        except Exception:
            return Response({'detail': 'User profile not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        total_supervision_minutes = SupervisionEntry.objects.filter(trainee=user_profile).aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0

        today = datetime.now().date()
        days_since_monday = today.weekday()
        current_week_start = today - timedelta(days=days_since_monday)
        current_week_end = current_week_start + timedelta(days=7)

        current_week_supervision_minutes = SupervisionEntry.objects.filter(
            trainee=user_profile,
            date_of_supervision__gte=current_week_start,
            date_of_supervision__lt=current_week_end
        ).aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0

        def format_minutes_to_hhmm(minutes):
            hours = minutes // 60
            remaining_minutes = minutes % 60
            return f"{hours:02d}:{remaining_minutes:02d}"

        data = {
            'total_supervision_hours': format_minutes_to_hhmm(total_supervision_minutes),
            'current_week_supervision_hours': format_minutes_to_hhmm(current_week_supervision_minutes),
            'total_supervision_minutes': total_supervision_minutes,
            'current_week_supervision_minutes': current_week_supervision_minutes,
        }
        return Response(data)
