from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Q, Count
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

from .models import (
    RegistrarProgramConfig, RegistrarProfile, PracticeLog, CPDActivity, LeaveRecord,
    ProgressReport, EndorsementApplication, ObservationRecord
)
from .serializers import (
    RegistrarProfileSerializer, PracticeLogSerializer, CPDActivitySerializer,
    LeaveRecordSerializer, ProgressReportSerializer, EndorsementApplicationSerializer,
    ObservationRecordSerializer, RegistrarDashboardStatsSerializer
)
from .validators import RegistrarValidator, SupervisorEligibilityValidator
from .services import RegistrarValidationService
from api.models import UserProfile
from registrar_logbook.models import SupervisorProfile


class RegistrarProfileViewSet(viewsets.ModelViewSet):
    """ViewSet for RegistrarProfile management"""
    
    queryset = RegistrarProfile.objects.all()
    serializer_class = RegistrarProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter queryset based on user role"""
        user_profile = self.request.user.profile
        
        if user_profile.role == 'REGISTRAR':
            # Registrars can only see their own profile
            return RegistrarProfile.objects.filter(user=self.request.user)
        elif user_profile.role == 'SUPERVISOR':
            # Supervisors can see profiles of their supervisees
            return RegistrarProfile.objects.filter(
                Q(principal_supervisor__user=self.request.user) |
                Q(secondary_supervisor__user=self.request.user)
            )
        elif user_profile.role == 'ORG_ADMIN':
            # Org admins can see all profiles in their organization
            return RegistrarProfile.objects.filter(
                user__profile__organization=user_profile.organization
            )
        else:
            return RegistrarProfile.objects.none()
    
    def perform_create(self, serializer):
        """Create registrar profile with validation"""
        # Validate supervisor eligibility
        principal_supervisor = serializer.validated_data.get('principal_supervisor')
        secondary_supervisor = serializer.validated_data.get('secondary_supervisor')
        
        # Check principal supervisor eligibility
        principal_eligibility = SupervisorEligibilityValidator.validate_principal_supervisor_eligibility(
            principal_supervisor, serializer.validated_data
        )
        if not principal_eligibility['eligible']:
            raise serializers.ValidationError({
                'principal_supervisor': principal_eligibility['reason']
            })
        
        # Check secondary supervisor eligibility if provided
        if secondary_supervisor:
            secondary_eligibility = SupervisorEligibilityValidator.validate_secondary_supervisor_eligibility(
                secondary_supervisor, serializer.validated_data
            )
            if not secondary_eligibility['eligible']:
                raise serializers.ValidationError({
                    'secondary_supervisor': secondary_eligibility['reason']
                })
        
        # Set the user
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['get'])
    def compliance_check(self, request, pk=None):
        """Get comprehensive compliance status for a registrar"""
        registrar = self.get_object()
        compliance = RegistrarValidator.get_comprehensive_compliance(registrar)
        return Response(compliance)
    
    @action(detail=True, methods=['get'])
    def dashboard_stats(self, request, pk=None):
        """Get comprehensive dashboard statistics for a registrar"""
        registrar = self.get_object()
        
        # Get program configuration for metadata-driven calculations
        try:
            config = RegistrarProgramConfig.objects.get(track=registrar.program_track, is_active=True)
        except RegistrarProgramConfig.DoesNotExist:
            # Fallback to hardcoded values if config not found
            config = type('Config', (), {
                'total_hours_required': 2000,
                'direct_contact_annual_hours': 176,
                'supervision_hours_required': 80,
                'cpd_hours_required': 30,
                'active_cpd_percentage': 0.5,
                'peer_consultation_hours': 10,
                'short_session_max_hours': 10,
                'short_session_threshold_minutes': 60,
                'principal_supervisor_min_percentage': 50.0,
                'individual_supervision_min_percentage': 66.6,
                'observation_frequency_days': 180,
                'observation_warning_days': 150,
            })()
        
        # 1. Program Duration Tracking
        total_program_weeks = registrar.total_weeks_required
        weeks_elapsed = (date.today() - registrar.enrollment_date).days / 7
        weeks_remaining = max(0, total_program_weeks - weeks_elapsed)
        program_completion_percentage = min(100, (weeks_elapsed / total_program_weeks) * 100) if total_program_weeks > 0 else 0
        
        # 2. Practice Hours (from PracticeLog)
        total_practice_hours = PracticeLog.objects.filter(registrar=registrar).aggregate(
            total=Sum('duration_hours')
        )['total'] or Decimal('0')
        required_practice_hours = config.total_hours_required
        practice_hours_percentage = float((total_practice_hours / required_practice_hours) * 100) if required_practice_hours > 0 else 0
        
        # 3. Direct Client Contact (current year only)
        current_year = date.today().year
        direct_client_contact_hours = PracticeLog.objects.filter(
            registrar=registrar,
            practice_type='DIRECT_CLIENT',
            date__year=current_year
        ).aggregate(total=Sum('duration_hours'))['total'] or Decimal('0')
        
        required_direct_client_contact_hours = config.direct_contact_annual_hours
        # Adjust for FTE fraction
        if registrar.fte_fraction < 1.0:
            required_direct_client_contact_hours = int(required_direct_client_contact_hours * registrar.fte_fraction)
        
        direct_client_contact_percentage = float((direct_client_contact_hours / required_direct_client_contact_hours) * 100) if required_direct_client_contact_hours > 0 else 0
        
        # 4. Supervision Hours (from Section C)
        from section_c.models import SupervisionEntry
        
        # Get all supervision entries for this registrar
        supervision_entries = SupervisionEntry.objects.filter(
            is_registrar_session=True,
            registrar_profile=registrar
        )
        
        total_supervision_hours = supervision_entries.aggregate(
            total=Sum('duration_minutes')
        )['total'] or 0
        total_supervision_hours = Decimal(total_supervision_hours) / 60  # Convert minutes to hours
        
        required_supervision_hours = config.supervision_hours_required
        # Adjust for FTE fraction
        if registrar.fte_fraction < 1.0:
            required_supervision_hours = int(required_supervision_hours * registrar.fte_fraction)
        
        supervision_percentage = float((total_supervision_hours / required_supervision_hours) * 100) if required_supervision_hours > 0 else 0
        
        # Calculate supervision composition
        principal_supervisor_hours = supervision_entries.filter(
            supervisor_type='PRINCIPAL'
        ).aggregate(total=Sum('duration_minutes'))['total'] or 0
        principal_supervisor_hours = Decimal(principal_supervisor_hours) / 60
        
        secondary_supervisor_hours = supervision_entries.filter(
            supervisor_type='SECONDARY'
        ).aggregate(total=Sum('duration_minutes'))['total'] or 0
        secondary_supervisor_hours = Decimal(secondary_supervisor_hours) / 60
        
        individual_supervision_hours = supervision_entries.filter(
            supervision_type='INDIVIDUAL'
        ).aggregate(total=Sum('duration_minutes'))['total'] or 0
        individual_supervision_hours = Decimal(individual_supervision_hours) / 60
        
        group_supervision_hours = supervision_entries.filter(
            supervision_type='GROUP'
        ).aggregate(total=Sum('duration_minutes'))['total'] or 0
        group_supervision_hours = Decimal(group_supervision_hours) / 60
        
        # Short session hours (duration < threshold)
        short_supervision_hours = supervision_entries.filter(
            duration_minutes__lt=config.short_session_threshold_minutes
        ).aggregate(total=Sum('duration_minutes'))['total'] or 0
        short_supervision_hours = Decimal(short_supervision_hours) / 60
        
        short_supervision_limit = config.short_session_max_hours
        short_supervision_remaining = max(0, short_supervision_limit - short_supervision_hours)
        
        # 5. CPD Hours
        cpd_hours = CPDActivity.objects.filter(registrar=registrar).aggregate(
            total=Sum('duration_hours')
        )['total'] or Decimal('0')
        
        required_cpd_hours = config.cpd_hours_required
        # Adjust for FTE fraction
        if registrar.fte_fraction < 1.0:
            required_cpd_hours = int(required_cpd_hours * registrar.fte_fraction)
        
        cpd_percentage = float((cpd_hours / required_cpd_hours) * 100) if required_cpd_hours > 0 else 0
        
        # Active CPD hours
        active_cpd_hours = CPDActivity.objects.filter(
            registrar=registrar,
            is_active=True
        ).aggregate(total=Sum('duration_hours'))['total'] or Decimal('0')
        
        required_active_cpd_percentage = config.active_cpd_percentage * 100
        
        # Peer consultation hours
        peer_consultation_hours = CPDActivity.objects.filter(
            registrar=registrar,
            is_peer_consultation=True
        ).aggregate(total=Sum('duration_hours'))['total'] or Decimal('0')
        
        required_peer_consultation_hours = config.peer_consultation_hours
        
        # 6. Observation Frequency Tracking
        last_observation = ObservationRecord.objects.filter(
            registrar=registrar
        ).order_by('-observation_date').first()
        
        last_observation_date = last_observation.observation_date if last_observation else None
        next_observation_due_date = None
        observation_status = 'not_applicable'
        
        if last_observation_date:
            days_since_observation = (date.today() - last_observation_date).days
            next_observation_due_date = last_observation_date + timedelta(days=config.observation_frequency_days)
            
            if days_since_observation > config.observation_frequency_days:
                observation_status = 'overdue'
            elif days_since_observation > config.observation_warning_days:
                observation_status = 'warning'
            else:
                observation_status = 'compliant'
        
        # 7. Reflection Completion Rate
        practice_logs_with_reflection = PracticeLog.objects.filter(
            registrar=registrar,
            reflection_text__isnull=False
        ).exclude(reflection_text='').count()
        
        total_practice_logs = PracticeLog.objects.filter(registrar=registrar).count()
        
        supervision_with_reflection = supervision_entries.filter(
            summary__isnull=False
        ).exclude(summary='').count()
        
        total_supervision_sessions = supervision_entries.count()
        
        total_with_reflection = practice_logs_with_reflection + supervision_with_reflection
        total_activities = total_practice_logs + total_supervision_sessions
        
        reflection_completion_rate = (total_with_reflection / total_activities * 100) if total_activities > 0 else 0
        
        # 8. Competency Ratings (from latest ProgressReport)
        latest_progress_report = ProgressReport.objects.filter(
            registrar=registrar
        ).order_by('-created_at').first()
        
        competency_ratings = []
        if latest_progress_report and latest_progress_report.competency_ratings:
            competency_ratings = latest_progress_report.competency_ratings
        
        # 9. Alerts Generation
        alerts = []
        
        # Critical alerts
        if direct_client_contact_hours < required_direct_client_contact_hours and not registrar.board_variation_enabled:
            deficit = required_direct_client_contact_hours - direct_client_contact_hours
            alerts.append(f"Direct client contact deficit: {deficit:.1f} hours")
        
        if observation_status == 'overdue':
            days_overdue = (date.today() - last_observation_date).days - config.observation_frequency_days
            alerts.append(f"Observation overdue by {days_overdue} days")
        
        # Supervision composition alerts
        if total_supervision_hours > 0:
            principal_percentage = (principal_supervisor_hours / total_supervision_hours) * 100
            individual_percentage = (individual_supervision_hours / total_supervision_hours) * 100
            
            if principal_percentage < config.principal_supervisor_min_percentage:
                alerts.append(f"Principal supervisor hours below minimum ({principal_percentage:.1f}% < {config.principal_supervisor_min_percentage}%)")
            
            if individual_percentage < config.individual_supervision_min_percentage:
                alerts.append(f"Individual supervision below minimum ({individual_percentage:.1f}% < {config.individual_supervision_min_percentage}%)")
        
        # Warnings
        if short_supervision_hours > 8:
            alerts.append(f"High short session hours: {short_supervision_hours:.1f}h (limit: {short_supervision_limit}h)")
        
        if cpd_hours > 0 and (active_cpd_hours / cpd_hours) < config.active_cpd_percentage:
            active_percentage = (active_cpd_hours / cpd_hours) * 100
            alerts.append(f"Active CPD below required percentage ({active_percentage:.1f}% < {required_active_cpd_percentage}%)")
        
        if reflection_completion_rate < 80:
            alerts.append(f"Reflection completion rate below target ({reflection_completion_rate:.1f}% < 80%)")
        
        # Build comprehensive stats
        stats = {
            # Program Progress
            'total_program_weeks': total_program_weeks,
            'weeks_elapsed': weeks_elapsed,
            'weeks_remaining': weeks_remaining,
            'program_completion_percentage': program_completion_percentage,
            
            # Practice Hours
            'total_practice_hours': total_practice_hours,
            'required_practice_hours': required_practice_hours,
            'practice_hours_percentage': practice_hours_percentage,
            
            # Direct Client Contact
            'direct_client_contact_hours': direct_client_contact_hours,
            'required_direct_client_contact_hours': required_direct_client_contact_hours,
            'direct_client_contact_percentage': direct_client_contact_percentage,
            
            # Supervision
            'total_supervision_hours': total_supervision_hours,
            'required_supervision_hours': required_supervision_hours,
            'supervision_percentage': supervision_percentage,
            'principal_supervisor_hours': principal_supervisor_hours,
            'secondary_supervisor_hours': secondary_supervisor_hours,
            'individual_supervision_hours': individual_supervision_hours,
            'group_supervision_hours': group_supervision_hours,
            'short_supervision_hours': short_supervision_hours,
            'short_supervision_limit': short_supervision_limit,
            'short_supervision_remaining': short_supervision_remaining,
            
            # CPD
            'cpd_hours': cpd_hours,
            'required_cpd_hours': required_cpd_hours,
            'cpd_percentage': cpd_percentage,
            'active_cpd_hours': active_cpd_hours,
            'required_active_cpd_percentage': required_active_cpd_percentage,
            'peer_consultation_hours': peer_consultation_hours,
            'required_peer_consultation_hours': required_peer_consultation_hours,
            
            # Observation
            'last_observation_date': last_observation_date,
            'next_observation_due_date': next_observation_due_date,
            'observation_status': observation_status,
            
            # Reflection
            'reflection_completion_rate': reflection_completion_rate,
            
            # Competencies
            'competency_ratings': competency_ratings,
            
            # Alerts
            'alerts': alerts,
        }
        
        serializer = RegistrarDashboardStatsSerializer(stats)
        return Response(serializer.data)


class PracticeLogViewSet(viewsets.ModelViewSet):
    """ViewSet for PracticeLog management"""
    
    queryset = PracticeLog.objects.all()
    serializer_class = PracticeLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter queryset based on user role"""
        user_profile = self.request.user.profile
        
        if user_profile.role == 'REGISTRAR':
            # Registrars can only see their own practice logs
            return PracticeLog.objects.filter(registrar__user=self.request.user)
        elif user_profile.role == 'SUPERVISOR':
            # Supervisors can see practice logs of their supervisees
            return PracticeLog.objects.filter(
                Q(registrar__principal_supervisor__user=self.request.user) |
                Q(registrar__secondary_supervisor__user=self.request.user)
            )
        elif user_profile.role == 'ORG_ADMIN':
            # Org admins can see all practice logs in their organization
            return PracticeLog.objects.filter(
                registrar__user__profile__organization=user_profile.organization
            )
        else:
            return PracticeLog.objects.none()
    
    def perform_create(self, serializer):
        """Create practice log entry"""
        # Get registrar profile for the current user
        try:
            registrar_profile = RegistrarProfile.objects.get(user=self.request.user)
        except RegistrarProfile.DoesNotExist:
            raise serializers.ValidationError("Registrar profile not found")
        
        serializer.save(registrar=registrar_profile)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a practice log entry (supervisor only)"""
        practice_log = self.get_object()
        user_profile = request.user.profile
        
        if user_profile.role != 'SUPERVISOR':
            return Response({'error': 'Only supervisors can approve practice logs'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # Check if supervisor is assigned to this registrar
        if not (practice_log.registrar.principal_supervisor.user == request.user or 
                practice_log.registrar.secondary_supervisor.user == request.user):
            return Response({'error': 'Not authorized to approve this practice log'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        practice_log.supervisor_reviewed = True
        practice_log.supervisor_feedback = request.data.get('feedback', '')
        practice_log.reviewed_by = user_profile
        practice_log.reviewed_at = timezone.now()
        practice_log.save()
        
        return Response({'message': 'Practice log approved successfully'})
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get practice log statistics"""
        queryset = self.get_queryset()
        
        # Total hours by practice type
        stats = queryset.values('practice_type').annotate(
            total_hours=Sum('duration_hours'),
            count=Count('id')
        )
        
        # Total hours
        total_hours = queryset.aggregate(total=Sum('duration_hours'))['total'] or Decimal('0')
        
        # Recent activities
        recent_activities = queryset.order_by('-date')[:10]
        
        return Response({
            'total_hours': total_hours,
            'by_practice_type': list(stats),
            'recent_activities': PracticeLogSerializer(recent_activities, many=True).data
        })


class CPDActivityViewSet(viewsets.ModelViewSet):
    """ViewSet for CPDActivity management"""
    
    queryset = CPDActivity.objects.all()
    serializer_class = CPDActivitySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter queryset based on user role"""
        user_profile = self.request.user.profile
        
        if user_profile.role == 'REGISTRAR':
            return CPDActivity.objects.filter(registrar__user=self.request.user)
        elif user_profile.role == 'SUPERVISOR':
            return CPDActivity.objects.filter(
                Q(registrar__principal_supervisor__user=self.request.user) |
                Q(registrar__secondary_supervisor__user=self.request.user)
            )
        elif user_profile.role == 'ORG_ADMIN':
            return CPDActivity.objects.filter(
                registrar__user__profile__organization=user_profile.organization
            )
        else:
            return CPDActivity.objects.none()
    
    def perform_create(self, serializer):
        """Create CPD activity"""
        try:
            registrar_profile = RegistrarProfile.objects.get(user=self.request.user)
        except RegistrarProfile.DoesNotExist:
            raise serializers.ValidationError("Registrar profile not found")
        
        serializer.save(registrar=registrar_profile)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a CPD activity (supervisor only)"""
        cpd_activity = self.get_object()
        user_profile = request.user.profile
        
        if user_profile.role != 'SUPERVISOR':
            return Response({'error': 'Only supervisors can approve CPD activities'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        cpd_activity.supervisor_approval = True
        cpd_activity.approved_by = user_profile
        cpd_activity.approved_at = timezone.now()
        cpd_activity.supervisor_notes = request.data.get('notes', '')
        cpd_activity.save()
        
        return Response({'message': 'CPD activity approved successfully'})
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get CPD statistics"""
        queryset = self.get_queryset()
        
        # Total hours by activity type
        stats = queryset.values('activity_type').annotate(
            total_hours=Sum('duration_hours'),
            count=Count('id')
        )
        
        # Active vs non-active
        active_hours = queryset.filter(is_active=True).aggregate(
            total=Sum('duration_hours')
        )['total'] or Decimal('0')
        
        non_active_hours = queryset.filter(is_active=False).aggregate(
            total=Sum('duration_hours')
        )['total'] or Decimal('0')
        
        # Peer consultation hours
        peer_consultation_hours = queryset.filter(is_peer_consultation=True).aggregate(
            total=Sum('duration_hours')
        )['total'] or Decimal('0')
        
        return Response({
            'by_activity_type': list(stats),
            'active_hours': active_hours,
            'non_active_hours': non_active_hours,
            'peer_consultation_hours': peer_consultation_hours,
        })


class LeaveRecordViewSet(viewsets.ModelViewSet):
    """ViewSet for LeaveRecord management"""
    
    queryset = LeaveRecord.objects.all()
    serializer_class = LeaveRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter queryset based on user role"""
        user_profile = self.request.user.profile
        
        if user_profile.role == 'REGISTRAR':
            return LeaveRecord.objects.filter(registrar__user=self.request.user)
        elif user_profile.role == 'SUPERVISOR':
            return LeaveRecord.objects.filter(
                Q(registrar__principal_supervisor__user=self.request.user) |
                Q(registrar__secondary_supervisor__user=self.request.user)
            )
        elif user_profile.role == 'ORG_ADMIN':
            return LeaveRecord.objects.filter(
                registrar__user__profile__organization=user_profile.organization
            )
        else:
            return LeaveRecord.objects.none()
    
    def perform_create(self, serializer):
        """Create leave record"""
        try:
            registrar_profile = RegistrarProfile.objects.get(user=self.request.user)
        except RegistrarProfile.DoesNotExist:
            raise serializers.ValidationError("Registrar profile not found")
        
        serializer.save(registrar=registrar_profile)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a leave record (supervisor only)"""
        leave_record = self.get_object()
        user_profile = request.user.profile
        
        if user_profile.role != 'SUPERVISOR':
            return Response({'error': 'Only supervisors can approve leave records'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        leave_record.approved_by_supervisor = True
        leave_record.approved_by = user_profile
        leave_record.approved_at = timezone.now()
        leave_record.save()
        
        return Response({'message': 'Leave record approved successfully'})


class ProgressReportViewSet(viewsets.ModelViewSet):
    """ViewSet for ProgressReport management"""
    
    queryset = ProgressReport.objects.all()
    serializer_class = ProgressReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter queryset based on user role"""
        user_profile = self.request.user.profile
        
        if user_profile.role == 'REGISTRAR':
            return ProgressReport.objects.filter(registrar__user=self.request.user)
        elif user_profile.role == 'SUPERVISOR':
            return ProgressReport.objects.filter(
                Q(registrar__principal_supervisor__user=self.request.user) |
                Q(registrar__secondary_supervisor__user=self.request.user)
            )
        elif user_profile.role == 'ORG_ADMIN':
            return ProgressReport.objects.filter(
                registrar__user__profile__organization=user_profile.organization
            )
        else:
            return ProgressReport.objects.none()
    
    def perform_create(self, serializer):
        """Create progress report"""
        try:
            registrar_profile = RegistrarProfile.objects.get(user=self.request.user)
        except RegistrarProfile.DoesNotExist:
            raise serializers.ValidationError("Registrar profile not found")
        
        serializer.save(registrar=registrar_profile)
    
    @action(detail=True, methods=['post'])
    def sign(self, request, pk=None):
        """Sign a progress report"""
        progress_report = self.get_object()
        user_profile = request.user.profile
        
        if user_profile.role == 'REGISTRAR':
            progress_report.registrar_signature = request.data.get('signature', '')
        elif user_profile.role == 'SUPERVISOR':
            progress_report.supervisor_signature = request.data.get('signature', '')
        else:
            return Response({'error': 'Not authorized to sign this report'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # If both signatures are present, mark as signed
        if progress_report.registrar_signature and progress_report.supervisor_signature:
            progress_report.signed_at = timezone.now()
        
        progress_report.save()
        
        return Response({'message': 'Progress report signed successfully'})


class EndorsementApplicationViewSet(viewsets.ModelViewSet):
    """ViewSet for EndorsementApplication management"""
    
    queryset = EndorsementApplication.objects.all()
    serializer_class = EndorsementApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter queryset based on user role"""
        user_profile = self.request.user.profile
        
        if user_profile.role == 'REGISTRAR':
            return EndorsementApplication.objects.filter(registrar__user=self.request.user)
        elif user_profile.role == 'SUPERVISOR':
            return EndorsementApplication.objects.filter(
                Q(registrar__principal_supervisor__user=self.request.user) |
                Q(registrar__secondary_supervisor__user=self.request.user)
            )
        elif user_profile.role == 'ORG_ADMIN':
            return EndorsementApplication.objects.filter(
                registrar__user__profile__organization=user_profile.organization
            )
        else:
            return EndorsementApplication.objects.none()
    
    def perform_create(self, serializer):
        """Create endorsement application"""
        try:
            registrar_profile = RegistrarProfile.objects.get(user=self.request.user)
        except RegistrarProfile.DoesNotExist:
            raise serializers.ValidationError("Registrar profile not found")
        
        serializer.save(registrar=registrar_profile)
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit endorsement application"""
        application = self.get_object()
        
        if application.status != 'DRAFT':
            return Response({'error': 'Application has already been submitted'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Check if ready for submission
        if not application.is_ready_for_submission:
            return Response({'error': 'Application is not ready for submission'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        application.status = 'SUBMITTED'
        application.submission_date = timezone.now()
        application.save()
        
        return Response({'message': 'Endorsement application submitted successfully'})
    
    @action(detail=True, methods=['get'])
    def export_aeat76(self, request, pk=None):
        """Export AEAT-76 packet"""
        application = self.get_object()
        
        # This would generate the actual AEAT-76 export
        # For now, return a placeholder response
        return Response({
            'message': 'AEAT-76 export generated',
            'download_url': f'/api/registrar/endorsement/{application.id}/download/'
        })


class ObservationRecordViewSet(viewsets.ModelViewSet):
    """ViewSet for ObservationRecord management"""
    
    queryset = ObservationRecord.objects.all()
    serializer_class = ObservationRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter queryset based on user role"""
        user_profile = self.request.user.profile
        
        if user_profile.role == 'REGISTRAR':
            return ObservationRecord.objects.filter(registrar__user=self.request.user)
        elif user_profile.role == 'SUPERVISOR':
            return ObservationRecord.objects.filter(
                Q(registrar__principal_supervisor__user=self.request.user) |
                Q(registrar__secondary_supervisor__user=self.request.user) |
                Q(supervisor__user=self.request.user)
            )
        elif user_profile.role == 'ORG_ADMIN':
            return ObservationRecord.objects.filter(
                registrar__user__profile__organization=user_profile.organization
            )
        else:
            return ObservationRecord.objects.none()
    
    def perform_create(self, serializer):
        """Create observation record"""
        try:
            registrar_profile = RegistrarProfile.objects.get(user=self.request.user)
        except RegistrarProfile.DoesNotExist:
            raise serializers.ValidationError("Registrar profile not found")
        
        # Set supervisor to current user if they are a supervisor
        user_profile = self.request.user.profile
        if user_profile.role == 'SUPERVISOR':
            serializer.save(registrar=registrar_profile, supervisor=user_profile)
        else:
            serializer.save(registrar=registrar_profile)
    
    @action(detail=False, methods=['get'])
    def program_config(self, request):
        """Get configurable program requirements (metadata-driven)"""
        track = request.query_params.get('track', 'TRACK_1')
        service = RegistrarValidationService()
        config = service.get_track_requirements(track)
        
        return Response({
            'track': config.track,
            'duration_years': config.duration_years,
            'supervision_hours_required': config.supervision_hours_required,
            'cpd_hours_required': config.cpd_hours_required,
            'total_hours_required': config.total_hours_required,
            'direct_contact_annual_hours': config.direct_contact_annual_hours,
            'short_session_rules': {
                'max_hours': config.short_session_max_hours,
                'threshold_minutes': config.short_session_threshold_minutes,
            },
            'supervision_rules': {
                'principal_min_percentage': config.principal_supervisor_min_percentage,
                'individual_min_percentage': config.individual_supervision_min_percentage,
                'direct_supervision_hours_per_fte': config.direct_supervision_hours_per_fte,
            },
            'observation_rules': {
                'frequency_days': config.observation_frequency_days,
                'warning_days': config.observation_warning_days,
            }
        })