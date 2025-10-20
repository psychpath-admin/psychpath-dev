from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    RegistrarProfile, PracticeLog, CPDActivity, LeaveRecord, 
    ProgressReport, EndorsementApplication, ObservationRecord
)
from api.models import UserProfile
from registrar_logbook.models import SupervisorProfile
from .validators import RegistrarValidator, SupervisorEligibilityValidator


class RegistrarProfileSerializer(serializers.ModelSerializer):
    """Serializer for RegistrarProfile"""
    
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_full_name = serializers.SerializerMethodField()
    principal_supervisor_name = serializers.SerializerMethodField()
    secondary_supervisor_name = serializers.SerializerMethodField()
    years_since_enrollment = serializers.ReadOnlyField()
    is_on_track = serializers.ReadOnlyField()
    compliance_status = serializers.SerializerMethodField()
    
    class Meta:
        model = RegistrarProfile
        fields = [
            'id', 'user', 'user_email', 'user_full_name',
            'aope_area', 'program_track', 'enrollment_date', 'expected_completion_date',
            'fte_fraction', 'principal_supervisor', 'principal_supervisor_name',
            'secondary_supervisor', 'secondary_supervisor_name',
            'direct_contact_requirement', 'board_variation_enabled', 'board_variation_doc',
            'total_weeks_required', 'supervision_hours_required', 'cpd_hours_required',
            'status', 'years_since_enrollment', 'is_on_track', 'compliance_status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_user_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
    
    def get_principal_supervisor_name(self, obj):
        if obj.principal_supervisor and hasattr(obj.principal_supervisor, 'user'):
            return f"{obj.principal_supervisor.user.first_name} {obj.principal_supervisor.user.last_name}".strip()
        return None
    
    def get_secondary_supervisor_name(self, obj):
        if obj.secondary_supervisor and hasattr(obj.secondary_supervisor, 'user'):
            return f"{obj.secondary_supervisor.user.first_name} {obj.secondary_supervisor.user.last_name}".strip()
        return None
    
    def get_compliance_status(self, obj):
        """Get comprehensive compliance status"""
        return RegistrarValidator.get_comprehensive_compliance(obj)
    
    def validate_principal_supervisor(self, value):
        """Validate principal supervisor eligibility"""
        if not value:
            raise serializers.ValidationError("Principal supervisor is required")
        
        # This will be validated in the view when we have the full context
        return value
    
    def validate_secondary_supervisor(self, value):
        """Validate secondary supervisor if provided"""
        if value:
            # This will be validated in the view when we have the full context
            pass
        return value
    
    def validate_enrollment_date(self, value):
        """Validate enrollment date is not in the future"""
        from django.utils import timezone
        if value > timezone.now().date():
            raise serializers.ValidationError("Enrollment date cannot be in the future")
        return value
    
    def validate_expected_completion_date(self, value):
        """Validate expected completion date is after enrollment date"""
        enrollment_date = self.initial_data.get('enrollment_date')
        if enrollment_date and value <= enrollment_date:
            raise serializers.ValidationError("Expected completion date must be after enrollment date")
        return value


class PracticeLogSerializer(serializers.ModelSerializer):
    """Serializer for PracticeLog"""
    
    registrar_name = serializers.SerializerMethodField()
    practice_type_display = serializers.CharField(source='get_practice_type_display', read_only=True)
    competencies_display = serializers.SerializerMethodField()
    requires_reflection = serializers.SerializerMethodField()
    reflection_complete = serializers.SerializerMethodField()
    
    class Meta:
        model = PracticeLog
        fields = [
            'id', 'registrar', 'registrar_name', 'date', 'duration_hours',
            'practice_type', 'practice_type_display', 'aope_alignment',
            'activity_description', 'setting', 'competencies', 'competencies_display',
            'reflection_text', 'requires_reflection', 'reflection_complete',
            'supervisor_reviewed', 'supervisor_feedback', 'reviewed_by', 'reviewed_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'reviewed_at']
    
    def get_registrar_name(self, obj):
        return f"{obj.registrar.user.first_name} {obj.registrar.user.last_name}".strip()
    
    def get_competencies_display(self, obj):
        competency_choices = dict(PracticeLog.COMPETENCY_CHOICES)
        return [competency_choices.get(comp, comp) for comp in obj.competencies]
    
    def get_requires_reflection(self, obj):
        return obj.practice_type == PracticeLog.DIRECT_CLIENT
    
    def get_reflection_complete(self, obj):
        if obj.practice_type == PracticeLog.DIRECT_CLIENT:
            return bool(obj.reflection_text and obj.reflection_text.strip())
        return True
    
    def validate(self, data):
        """Validate practice log entry"""
        # Check reflection requirement for direct client contact
        if data.get('practice_type') == PracticeLog.DIRECT_CLIENT:
            if not data.get('reflection_text') or not data['reflection_text'].strip():
                raise serializers.ValidationError({
                    'reflection_text': 'Reflection is required for direct client contact activities'
                })
        
        # Validate competencies
        valid_competencies = [choice[0] for choice in PracticeLog.COMPETENCY_CHOICES]
        competencies = data.get('competencies', [])
        invalid_competencies = [comp for comp in competencies if comp not in valid_competencies]
        if invalid_competencies:
            raise serializers.ValidationError({
                'competencies': f'Invalid competencies: {invalid_competencies}'
            })
        
        return data


class CPDActivitySerializer(serializers.ModelSerializer):
    """Serializer for CPDActivity"""
    
    registrar_name = serializers.SerializerMethodField()
    activity_type_display = serializers.CharField(source='get_activity_type_display', read_only=True)
    competencies_display = serializers.SerializerMethodField()
    supervisor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = CPDActivity
        fields = [
            'id', 'registrar', 'registrar_name', 'title', 'provider', 'date',
            'duration_hours', 'activity_type', 'activity_type_display',
            'is_active', 'supervisor_set_task', 'aope_alignment', 'is_peer_consultation',
            'learning_objectives', 'competencies', 'competencies_display',
            'reflection', 'evidence_file', 'supervisor_approval', 'supervisor_name',
            'approved_by', 'approved_at', 'supervisor_notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'approved_at']
    
    def get_registrar_name(self, obj):
        return f"{obj.registrar.user.first_name} {obj.registrar.user.last_name}".strip()
    
    def get_competencies_display(self, obj):
        competency_choices = dict(PracticeLog.COMPETENCY_CHOICES)
        return [competency_choices.get(comp, comp) for comp in obj.competencies]
    
    def get_supervisor_name(self, obj):
        if obj.approved_by and hasattr(obj.approved_by, 'user'):
            return f"{obj.approved_by.user.first_name} {obj.approved_by.user.last_name}".strip()
        return None
    
    def validate(self, data):
        """Validate CPD activity"""
        # If not active, supervisor set task is required
        if not data.get('is_active', True) and not data.get('supervisor_set_task'):
            raise serializers.ValidationError({
                'supervisor_set_task': 'Supervisor set task is required for non-active CPD'
            })
        
        # Validate competencies
        valid_competencies = [choice[0] for choice in PracticeLog.COMPETENCY_CHOICES]
        competencies = data.get('competencies', [])
        invalid_competencies = [comp for comp in competencies if comp not in valid_competencies]
        if invalid_competencies:
            raise serializers.ValidationError({
                'competencies': f'Invalid competencies: {invalid_competencies}'
            })
        
        return data


class LeaveRecordSerializer(serializers.ModelSerializer):
    """Serializer for LeaveRecord"""
    
    registrar_name = serializers.SerializerMethodField()
    leave_type_display = serializers.CharField(source='get_leave_type_display', read_only=True)
    duration_days = serializers.ReadOnlyField()
    supervisor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = LeaveRecord
        fields = [
            'id', 'registrar', 'registrar_name', 'leave_type', 'leave_type_display',
            'start_date', 'end_date', 'duration_days', 'approved_by_supervisor',
            'supervisor_name', 'approved_by', 'approved_at', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'approved_at']
    
    def get_registrar_name(self, obj):
        return f"{obj.registrar.user.first_name} {obj.registrar.user.last_name}".strip()
    
    def get_supervisor_name(self, obj):
        if obj.approved_by and hasattr(obj.approved_by, 'user'):
            return f"{obj.approved_by.user.first_name} {obj.approved_by.user.last_name}".strip()
        return None
    
    def validate(self, data):
        """Validate leave record"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date'
            })
        
        return data


class ProgressReportSerializer(serializers.ModelSerializer):
    """Serializer for ProgressReport"""
    
    registrar_name = serializers.SerializerMethodField()
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    competency_ratings_display = serializers.SerializerMethodField()
    is_signed = serializers.SerializerMethodField()
    
    class Meta:
        model = ProgressReport
        fields = [
            'id', 'registrar', 'registrar_name', 'report_type', 'report_type_display',
            'competency_ratings', 'competency_ratings_display', 'supervisor_feedback',
            'action_plan', 'registrar_signature', 'supervisor_signature',
            'signed_at', 'is_signed', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'signed_at']
    
    def get_registrar_name(self, obj):
        return f"{obj.registrar.user.first_name} {obj.registrar.user.last_name}".strip()
    
    def get_competency_ratings_display(self, obj):
        competency_choices = dict(PracticeLog.COMPETENCY_CHOICES)
        level_choices = dict(ProgressReport.COMPETENCY_LEVEL_CHOICES)
        
        display_ratings = {}
        for comp, level in obj.competency_ratings.items():
            comp_display = competency_choices.get(comp, comp)
            level_display = level_choices.get(level, level)
            display_ratings[comp_display] = level_display
        
        return display_ratings
    
    def get_is_signed(self, obj):
        return bool(obj.registrar_signature and obj.supervisor_signature and obj.signed_at)
    
    def validate_competency_ratings(self, value):
        """Validate competency ratings"""
        valid_competencies = [f'C{i}' for i in range(1, 9)]  # C1-C8
        valid_levels = [choice[0] for choice in ProgressReport.COMPETENCY_LEVEL_CHOICES]
        
        for comp, level in value.items():
            if comp not in valid_competencies:
                raise serializers.ValidationError(f'Invalid competency: {comp}')
            if level not in valid_levels:
                raise serializers.ValidationError(f'Invalid competency level: {level}')
        
        return value


class EndorsementApplicationSerializer(serializers.ModelSerializer):
    """Serializer for EndorsementApplication"""
    
    registrar_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_ready_for_submission = serializers.SerializerMethodField()
    
    class Meta:
        model = EndorsementApplication
        fields = [
            'id', 'registrar', 'registrar_name', 'submission_date', 'completion_date',
            'total_hours', 'supervision_summary', 'cpd_summary', 'competency_attestation',
            'supervisor_declaration', 'registrar_declaration', 'exported_pdf_path',
            'status', 'status_display', 'is_ready_for_submission',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'submission_date']
    
    def get_registrar_name(self, obj):
        return f"{obj.registrar.user.first_name} {obj.registrar.user.last_name}".strip()
    
    def get_is_ready_for_submission(self, obj):
        """Check if application is ready for submission"""
        # This would check all requirements are met
        # For now, just check basic fields
        return bool(
            obj.total_hours and
            obj.supervision_summary and
            obj.cpd_summary and
            obj.competency_attestation and
            obj.supervisor_declaration and
            obj.registrar_declaration
        )


class ObservationRecordSerializer(serializers.ModelSerializer):
    """Serializer for ObservationRecord"""
    
    registrar_name = serializers.SerializerMethodField()
    method_display = serializers.CharField(source='get_method_display', read_only=True)
    supervisor_name = serializers.SerializerMethodField()
    supervision_session_details = serializers.SerializerMethodField()
    
    class Meta:
        model = ObservationRecord
        fields = [
            'id', 'registrar', 'registrar_name', 'supervision_session',
            'supervision_session_details', 'observation_date', 'method', 'method_display',
            'consent_confirmed', 'privacy_confirmed', 'feedback_text',
            'supervisor', 'supervisor_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_registrar_name(self, obj):
        return f"{obj.registrar.user.first_name} {obj.registrar.user.last_name}".strip()
    
    def get_supervisor_name(self, obj):
        if obj.supervisor and hasattr(obj.supervisor, 'user'):
            return f"{obj.supervisor.user.first_name} {obj.supervisor.user.last_name}".strip()
        return None
    
    def get_supervision_session_details(self, obj):
        if obj.supervision_session:
            return {
                'id': obj.supervision_session.id,
                'date': obj.supervision_session.date_of_supervision,
                'duration_minutes': obj.supervision_session.duration_minutes,
                'supervisor_name': obj.supervision_session.supervisor_name,
                'supervision_type': obj.supervision_session.supervision_type,
            }
        return None
    
    def validate(self, data):
        """Validate observation record"""
        # Consent and privacy must be confirmed
        if not data.get('consent_confirmed'):
            raise serializers.ValidationError({
                'consent_confirmed': 'Consent must be confirmed for observation'
            })
        
        if not data.get('privacy_confirmed'):
            raise serializers.ValidationError({
                'privacy_confirmed': 'Privacy confirmation is required for observation'
            })
        
        return data


class RegistrarDashboardStatsSerializer(serializers.Serializer):
    """Serializer for comprehensive dashboard statistics"""
    
    # Program Progress
    total_program_weeks = serializers.IntegerField()
    weeks_elapsed = serializers.FloatField()
    weeks_remaining = serializers.FloatField()
    program_completion_percentage = serializers.FloatField()
    
    # Practice Hours
    total_practice_hours = serializers.DecimalField(max_digits=7, decimal_places=2)
    required_practice_hours = serializers.IntegerField()
    practice_hours_percentage = serializers.FloatField()
    
    # Direct Client Contact
    direct_client_contact_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    required_direct_client_contact_hours = serializers.IntegerField()
    direct_client_contact_percentage = serializers.FloatField()
    
    # Supervision
    total_supervision_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    required_supervision_hours = serializers.IntegerField()
    supervision_percentage = serializers.FloatField()
    principal_supervisor_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    secondary_supervisor_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    individual_supervision_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    group_supervision_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    short_supervision_hours = serializers.DecimalField(max_digits=5, decimal_places=2)
    short_supervision_limit = serializers.IntegerField()
    short_supervision_remaining = serializers.DecimalField(max_digits=5, decimal_places=2)
    
    # CPD
    cpd_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    required_cpd_hours = serializers.IntegerField()
    cpd_percentage = serializers.FloatField()
    active_cpd_hours = serializers.DecimalField(max_digits=6, decimal_places=2)
    required_active_cpd_percentage = serializers.FloatField()
    peer_consultation_hours = serializers.DecimalField(max_digits=5, decimal_places=2)
    required_peer_consultation_hours = serializers.IntegerField()
    
    # Observation
    last_observation_date = serializers.DateField(allow_null=True)
    next_observation_due_date = serializers.DateField(allow_null=True)
    observation_status = serializers.ChoiceField(choices=['compliant', 'warning', 'overdue', 'not_applicable'])
    
    # Reflection
    reflection_completion_rate = serializers.FloatField()
    
    # Competencies
    competency_ratings = serializers.ListField(child=serializers.DictField())
    
    # Alerts
    alerts = serializers.ListField(child=serializers.CharField())
