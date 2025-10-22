from rest_framework import viewsets, status, permissions, serializers
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from datetime import timedelta, datetime
from .models import SupervisionEntry, SupervisionWeeklySummary
from api.models import UserProfile
from .serializers import SupervisionEntrySerializer, SupervisionWeeklySummarySerializer
from .quality_validator import SupervisionQualityValidator
from .writing_prompts import SupervisionWritingPrompts
from permissions import TenantPermissionMixin, RoleBasedPermission, DenyOrgAdmin
from logging_utils import support_error_handler, audit_data_access, log_data_access

class SupervisionEntryViewSet(TenantPermissionMixin, viewsets.ModelViewSet):
    queryset = SupervisionEntry.objects.all()
    serializer_class = SupervisionEntrySerializer
    permission_classes = [RoleBasedPermission, DenyOrgAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and hasattr(user, 'profile'):
            if user.profile.role in ['PROVISIONAL', 'INTERN', 'REGISTRAR']:
                queryset = SupervisionEntry.objects.filter(trainee=user.profile)
            elif user.profile.role == 'SUPERVISOR':
                trainee_ids = user.profile.supervising.values_list('id', flat=True)
                queryset = SupervisionEntry.objects.filter(trainee__id__in=trainee_ids)
            elif user.profile.role == 'ORG_ADMIN':
                org_trainee_ids = UserProfile.objects.filter(organization=user.profile.organization, role__in=['PROVISIONAL', 'INTERN', 'REGISTRAR']).values_list('id', flat=True)
                queryset = SupervisionEntry.objects.filter(trainee__id__in=org_trainee_ids)
            else:
                return SupervisionEntry.objects.none()
            
            # Filter by week_starting if provided
            week_starting = self.request.query_params.get('week_starting', None)
            if week_starting:
                queryset = queryset.filter(week_starting=week_starting)
            
            return queryset.order_by('-date_of_supervision')
        return SupervisionEntry.objects.none()

    def perform_create(self, serializer):
        if not hasattr(self.request.user, 'profile') or self.request.user.profile.role not in ['PROVISIONAL', 'INTERN', 'REGISTRAR']:
            raise serializers.ValidationError("Only provisional psychologists, interns and registrars can create supervision entries.")
        
        # Calculate week_starting from date_of_supervision
        date_of_supervision = serializer.validated_data['date_of_supervision']
        week_starting = date_of_supervision - timedelta(days=date_of_supervision.weekday())
        
        # Check if user is a registrar and link to registrar profile
        try:
            from registrar_aope.models import RegistrarProfile
            registrar_profile = RegistrarProfile.objects.get(user=self.request.user)
            serializer.save(
                trainee=self.request.user.profile, 
                week_starting=week_starting,
                is_registrar_session=True,
                registrar_profile=registrar_profile
            )
        except RegistrarProfile.DoesNotExist:
            # Regular provisional psychologist or intern
            serializer.save(trainee=self.request.user.profile, week_starting=week_starting)

    @action(detail=False, methods=['get'], url_path='grouped-by-week', permission_classes=[permissions.IsAuthenticated])
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
                if user.profile.role in ['PROVISIONAL', 'INTERN', 'REGISTRAR']:
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
                    org_trainee_ids = UserProfile.objects.filter(organization=user.profile.organization, role__in=['PROVISIONAL', 'INTERN', 'REGISTRAR']).values_list('id', flat=True)
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

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def short_session_stats(self, request):
        """Get short session statistics for the current user"""
        try:
            user_profile = request.user.profile
        except Exception:
            return Response({'detail': 'User profile not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate short session statistics
        short_session_hours = SupervisionEntry.get_short_session_total(user_profile)
        short_session_minutes = int(short_session_hours * 60)
        limit_hours = 10.0
        remaining_hours = max(0, limit_hours - short_session_hours)
        percentage_used = (short_session_hours / limit_hours) * 100
        warning_threshold_reached = short_session_hours > 8.0
        
        data = {
            'short_session_hours': round(short_session_hours, 1),
            'short_session_minutes': short_session_minutes,
            'limit_hours': limit_hours,
            'remaining_hours': round(remaining_hours, 1),
            'percentage_used': round(percentage_used, 1),
            'warning_threshold_reached': warning_threshold_reached,
            'limit_exceeded': short_session_hours > limit_hours
        }
        return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_supervision_quality(request):
    """Check quality of supervision summary"""
    text = request.data.get('text', '')
    field_type = request.data.get('field_type', 'supervision_summary')
    
    validator = SupervisionQualityValidator()
    prompts_provider = SupervisionWritingPrompts()
    
    if field_type == 'supervision_summary':
        result = validator.validate_supervision_summary(text)
        result['prompts'] = prompts_provider.get_supervision_summary_prompts(text)
    else:
        return Response({'error': 'Invalid field_type'}, status=400)
    
    return Response(result)
