from rest_framework import viewsets, status, permissions, serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum
from datetime import timedelta, datetime
from .models import SupervisionEntry, SupervisionWeeklySummary, SupervisionObservation, SupervisionComplianceReport
from api.models import UserProfile
from .serializers import (
    SupervisionEntrySerializer, 
    SupervisionWeeklySummarySerializer,
    SupervisionObservationSerializer,
    SupervisionComplianceReportSerializer
)
from .compliance import SupervisionComplianceService
from permissions import TenantPermissionMixin, RoleBasedPermission, DenyOrgAdmin
from logging_utils import support_error_handler, audit_data_access, log_data_access
from audit_utils import log_section_c_create, log_section_c_update, log_section_c_delete

class SupervisionEntryViewSet(TenantPermissionMixin, viewsets.ModelViewSet):
    queryset = SupervisionEntry.objects.all()
    serializer_class = SupervisionEntrySerializer
    permission_classes = [RoleBasedPermission, DenyOrgAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and hasattr(user, 'profile'):
            # Filter by current user's entries
            if user.profile.role in ['PROVISIONAL', 'REGISTRAR']:
                queryset = SupervisionEntry.objects.filter(trainee=user.profile)
            elif user.profile.role == 'SUPERVISOR':
                trainee_ids = user.profile.supervising.values_list('id', flat=True)
                queryset = SupervisionEntry.objects.filter(trainee__id__in=trainee_ids)
            elif user.profile.role == 'ORG_ADMIN':
                from api.models import UserProfile
                org_trainee_ids = UserProfile.objects.filter(
                    organization=user.profile.organization, 
                    role__in=['PROVISIONAL', 'REGISTRAR']
                ).values_list('id', flat=True)
                queryset = SupervisionEntry.objects.filter(trainee__id__in=org_trainee_ids)
            elif user.profile.role == 'SUPPORT_ADMIN':
                # Support admin can see all entries
                queryset = SupervisionEntry.objects.all()
            else:
                queryset = SupervisionEntry.objects.none()
            
            # Filter by locked status if provided
            include_locked = self.request.query_params.get('include_locked', 'false').lower() == 'true'
            if not include_locked:
                queryset = queryset.filter(locked=False)
            
            # Filter by week_starting if provided
            week_starting = self.request.query_params.get('week_starting', None)
            if week_starting:
                queryset = queryset.filter(week_starting=week_starting)
            
            return queryset.order_by('-date_of_supervision')
        return SupervisionEntry.objects.none()

    def perform_create(self, serializer):
        if not hasattr(self.request.user, 'profile') or self.request.user.profile.role not in ['PROVISIONAL', 'REGISTRAR']:
            raise serializers.ValidationError("Only provisional psychologists and registrars can create supervision entries.")
        
        # Calculate week_starting from date_of_supervision
        date_of_supervision = serializer.validated_data['date_of_supervision']
        week_starting = date_of_supervision - timedelta(days=date_of_supervision.weekday())
        
        instance = serializer.save(trainee=self.request.user.profile, week_starting=week_starting)
        
        # Log the creation
        log_section_c_create(self.request.user, instance, self.request)
    
    def perform_update(self, serializer):
        # Capture old data before update
        instance = self.get_object()
        old_data = {
            'supervision_type': instance.supervision_type,
            'supervisor_type': instance.supervisor_type,
            'date_of_supervision': str(instance.date_of_supervision) if instance.date_of_supervision else None,
            'duration_minutes': instance.duration_minutes,
            'supervisor_name': instance.supervisor_name,
        }
        
        # Perform update
        updated_instance = serializer.save()
        
        # Log the update
        log_section_c_update(self.request.user, updated_instance, old_data, self.request)
    
    def perform_destroy(self, instance):
        # Capture entry data before deletion
        entry_data = {
            'supervision_type': instance.supervision_type,
            'supervisor_type': instance.supervisor_type,
            'date_of_supervision': str(instance.date_of_supervision) if instance.date_of_supervision else None,
            'duration_minutes': instance.duration_minutes,
            'supervisor_name': instance.supervisor_name,
        }
        entry_id = instance.id
        
        # Perform deletion
        instance.delete()
        
        # Log the deletion
        log_section_c_delete(self.request.user, entry_id, entry_data, self.request)

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
                if user.profile.role in ['PROVISIONAL', 'REGISTRAR']:
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
                    org_trainee_ids = UserProfile.objects.filter(organization=user.profile.organization, role__in=['PROVISIONAL', 'REGISTRAR']).values_list('id', flat=True)
                    all_entries_up_to_week = SupervisionEntry.objects.filter(
                        trainee__id__in=org_trainee_ids,
                        date_of_supervision__lt=week_start + timedelta(days=7)
                    )
                elif user.profile.role == 'SUPPORT_ADMIN':
                    all_entries_up_to_week = SupervisionEntry.objects.filter(
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
    
    @action(detail=False, methods=['get'], url_path='compliance-summary', permission_classes=[permissions.IsAuthenticated])
    def compliance_summary(self, request):
        """Get AHPRA supervision compliance summary for the authenticated user"""
        try:
            user_profile = request.user.profile
        except Exception:
            return Response({'detail': 'User profile not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate compliance
        service = SupervisionComplianceService(user_profile)
        summary = service.get_supervision_summary()
        
        return Response(summary)


class SupervisionObservationViewSet(TenantPermissionMixin, viewsets.ModelViewSet):
    """ViewSet for managing supervision observations"""
    queryset = SupervisionObservation.objects.all()
    serializer_class = SupervisionObservationSerializer
    permission_classes = [RoleBasedPermission, DenyOrgAdmin]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and hasattr(user, 'profile'):
            # Trainees can see their own observations
            if user.profile.role in ['PROVISIONAL', 'REGISTRAR']:
                queryset = SupervisionObservation.objects.filter(trainee=user.profile)
            # Supervisors can see observations they conducted
            elif user.profile.role == 'SUPERVISOR':
                queryset = SupervisionObservation.objects.filter(supervisor=user.profile)
            # Support admin can see all
            elif user.profile.role == 'SUPPORT_ADMIN':
                queryset = SupervisionObservation.objects.all()
            else:
                queryset = SupervisionObservation.objects.none()
            
            return queryset.order_by('-observation_date')
        return SupervisionObservation.objects.none()
    
    def get_serializer_context(self):
        """Add trainee to serializer context for validation"""
        context = super().get_serializer_context()
        if self.request.user.is_authenticated and hasattr(self.request.user, 'profile'):
            context['trainee'] = self.request.user.profile
        return context
    
    def perform_create(self, serializer):
        """Create observation with proper trainee and supervisor assignment"""
        if not hasattr(self.request.user, 'profile'):
            raise serializers.ValidationError("User profile not found")
        
        user_profile = self.request.user.profile
        
        # If supervisor is creating, they set trainee via request data
        # If trainee is creating (self-reporting), set trainee automatically
        if user_profile.role == 'SUPERVISOR':
            serializer.save(supervisor=user_profile)
        elif user_profile.role in ['PROVISIONAL', 'REGISTRAR']:
            # Trainee creating - must specify supervisor
            serializer.save(trainee=user_profile)
        else:
            raise serializers.ValidationError("Only supervisors and trainees can create observations")


class SupervisionComplianceViewSet(TenantPermissionMixin, viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing supervision compliance reports"""
    queryset = SupervisionComplianceReport.objects.all()
    serializer_class = SupervisionComplianceReportSerializer
    permission_classes = [RoleBasedPermission, DenyOrgAdmin]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and hasattr(user, 'profile'):
            # Trainees can see their own compliance
            if user.profile.role in ['PROVISIONAL', 'REGISTRAR']:
                queryset = SupervisionComplianceReport.objects.filter(trainee=user.profile)
            # Supervisors can see compliance of their supervisees
            elif user.profile.role == 'SUPERVISOR':
                trainee_ids = user.profile.supervising.values_list('id', flat=True)
                queryset = SupervisionComplianceReport.objects.filter(trainee__id__in=trainee_ids)
            # Support admin can see all
            elif user.profile.role == 'SUPPORT_ADMIN':
                queryset = SupervisionComplianceReport.objects.all()
            else:
                queryset = SupervisionComplianceReport.objects.none()
            
            return queryset
        return SupervisionComplianceReport.objects.none()
    
    @action(detail=False, methods=['post'], url_path='recalculate', permission_classes=[permissions.IsAuthenticated])
    def recalculate(self, request):
        """Recalculate compliance for the authenticated user"""
        try:
            user_profile = request.user.profile
        except Exception:
            return Response({'detail': 'User profile not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Only allow trainees to recalculate their own compliance
        if user_profile.role not in ['PROVISIONAL', 'REGISTRAR']:
            return Response(
                {'detail': 'Only trainees can recalculate their compliance'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        service = SupervisionComplianceService(user_profile)
        report = service.calculate_compliance()
        serializer = self.get_serializer(report)
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='recalculate-all', permission_classes=[permissions.IsAuthenticated])
    def recalculate_all(self, request):
        """Recalculate compliance for all trainees (support admin only)"""
        try:
            user_profile = request.user.profile
        except Exception:
            return Response({'detail': 'User profile not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Only support admin can recalculate all
        if user_profile.role != 'SUPPORT_ADMIN':
            return Response(
                {'detail': 'Only support admins can recalculate all compliance reports'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        results = SupervisionComplianceService.recalculate_all_compliance()
        
        return Response({
            'message': f'Recalculated compliance for {len(results)} trainees',
            'results': results
        })
