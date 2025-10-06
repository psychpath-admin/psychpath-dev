from rest_framework import serializers
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal
from .models import (
    RegistrarProgram, RegistrarPracticeEntry, RegistrarSupervisionEntry, 
    RegistrarCpdEntry, SupervisorProfile, CompetencyFramework, 
    ProgressSnapshot, AuditLog
)


class RegistrarValidationService:
    """Service class for registrar program validation rules"""
    
    @staticmethod
    def get_target_hours(qualification_tier):
        """Get target hours based on qualification tier"""
        targets = {
            'masters': {
                'practice_hrs': 3000,
                'supervision_hrs': 80,
                'cpd_hrs': 80
            },
            'masters_phd': {
                'practice_hrs': 2250,
                'supervision_hrs': 60,
                'cpd_hrs': 60
            },
            'doctoral': {
                'practice_hrs': 1500,
                'supervision_hrs': 40,
                'cpd_hrs': 40
            }
        }
        return targets.get(qualification_tier, targets['masters'])
    
    @staticmethod
    def validate_supervision_mix(program_id):
        """Validate supervision mix compliance"""
        entries = RegistrarSupervisionEntry.objects.filter(program_id=program_id)
        if not entries.exists():
            return {'valid': True, 'warnings': []}
        
        total_minutes = sum(entry.duration_minutes for entry in entries)
        if total_minutes == 0:
            return {'valid': True, 'warnings': []}
        
        # Calculate percentages
        principal_minutes = sum(
            entry.duration_minutes for entry in entries 
            if entry.supervisor_category == 'principal'
        )
        individual_minutes = sum(
            entry.duration_minutes for entry in entries 
            if entry.type == 'individual'
        )
        group_minutes = sum(
            entry.duration_minutes for entry in entries 
            if entry.type == 'group'
        )
        shorter_minutes = sum(
            entry.duration_minutes for entry in entries 
            if entry.shorter_than_60min
        )
        
        principal_percentage = (principal_minutes / total_minutes) * 100
        individual_percentage = (individual_minutes / total_minutes) * 100
        group_percentage = (group_minutes / total_minutes) * 100
        shorter_percentage = (shorter_minutes / total_minutes) * 100
        
        warnings = []
        errors = []
        
        # Principal supervisor must provide ≥50%
        if principal_percentage < 50:
            errors.append(f"Principal supervisor must provide ≥50% of supervision (currently {principal_percentage:.1f}%)")
        
        # Individual supervision must be ≥66%
        if individual_percentage < 66:
            errors.append(f"Individual supervision must be ≥66% (currently {individual_percentage:.1f}%)")
        
        # Group supervision must be ≤33%
        if group_percentage > 33:
            errors.append(f"Group supervision must be ≤33% (currently {group_percentage:.1f}%)")
        
        # Sessions shorter than 60min should be ≤25%
        if shorter_percentage > 25:
            warnings.append(f"Short sessions (<60min) exceed 25% cap (currently {shorter_percentage:.1f}%)")
        
        # Check secondary supervisor caps
        secondary_same_aope_minutes = sum(
            entry.duration_minutes for entry in entries 
            if entry.supervisor_category == 'secondary_same_aope'
        )
        secondary_other_minutes = sum(
            entry.duration_minutes for entry in entries 
            if entry.supervisor_category == 'secondary_other_or_not_endorsed'
        )
        
        secondary_same_aope_percentage = (secondary_same_aope_minutes / total_minutes) * 100
        secondary_other_percentage = (secondary_other_minutes / total_minutes) * 100
        
        if secondary_same_aope_percentage > 50:
            errors.append(f"Secondary supervisor (same AoPE) cannot exceed 50% (currently {secondary_same_aope_percentage:.1f}%)")
        
        if secondary_other_percentage > 33:
            errors.append(f"Secondary supervisor (different AoPE/not endorsed) cannot exceed 33% (currently {secondary_other_percentage:.1f}%)")
        
        return {
            'valid': len(errors) == 0,
            'warnings': warnings,
            'errors': errors,
            'percentages': {
                'principal': principal_percentage,
                'individual': individual_percentage,
                'group': group_percentage,
                'shorter_than_60min': shorter_percentage,
                'secondary_same_aope': secondary_same_aope_percentage,
                'secondary_other_or_not_endorsed': secondary_other_percentage
            }
        }
    
    @staticmethod
    def validate_dcc_minimum(program_id, fte_fraction=1.0):
        """Validate DCC minimum per FTE year"""
        entries = RegistrarPracticeEntry.objects.filter(
            program_id=program_id, 
            is_dcc=True
        )
        
        if not entries.exists():
            return {'valid': False, 'message': 'No DCC entries found'}
        
        # Calculate DCC hours per FTE year
        total_dcc_hours = sum(float(entry.hours) for entry in entries)
        
        # Get program duration to calculate FTE years
        try:
            program = RegistrarProgram.objects.get(id=program_id)
            duration_days = (program.expected_end_date - program.start_date).days
            fte_years = duration_days / 365.25 * float(fte_fraction)
            
            if fte_years <= 0:
                return {'valid': False, 'message': 'Invalid program duration'}
            
            dcc_per_fte_year = total_dcc_hours / fte_years
            min_dcc_per_fte_year = 176
            
            return {
                'valid': dcc_per_fte_year >= min_dcc_per_fte_year,
                'dcc_per_fte_year': dcc_per_fte_year,
                'min_required': min_dcc_per_fte_year,
                'total_dcc_hours': total_dcc_hours,
                'fte_years': fte_years
            }
        except RegistrarProgram.DoesNotExist:
            return {'valid': False, 'message': 'Program not found'}
    
    @staticmethod
    def get_program_compliance_summary(program_id):
        """Get comprehensive compliance summary for a program"""
        try:
            program = RegistrarProgram.objects.get(id=program_id)
        except RegistrarProgram.DoesNotExist:
            return {'error': 'Program not found'}
        
        # Calculate progress toward targets
        practice_entries = RegistrarPracticeEntry.objects.filter(program_id=program_id)
        supervision_entries = RegistrarSupervisionEntry.objects.filter(program_id=program_id)
        cpd_entries = RegistrarCpdEntry.objects.filter(program_id=program_id)
        
        total_practice_hours = sum(float(entry.hours) for entry in practice_entries)
        total_supervision_hours = sum(entry.duration_minutes / 60 for entry in supervision_entries)
        total_cpd_hours = sum(float(entry.hours) for entry in cpd_entries)
        total_dcc_hours = sum(float(entry.hours) for entry in practice_entries.filter(is_dcc=True))
        
        targets = RegistrarValidationService.get_target_hours(program.qualification_tier)
        
        # Validation checks
        supervision_validation = RegistrarValidationService.validate_supervision_mix(program_id)
        dcc_validation = RegistrarValidationService.validate_dcc_minimum(program_id, program.fte_fraction)
        
        return {
            'program_id': program_id,
            'targets': targets,
            'progress': {
                'practice_hours': {
                    'current': total_practice_hours,
                    'target': targets['practice_hrs'],
                    'percentage': (total_practice_hours / targets['practice_hrs']) * 100
                },
                'supervision_hours': {
                    'current': total_supervision_hours,
                    'target': targets['supervision_hrs'],
                    'percentage': (total_supervision_hours / targets['supervision_hrs']) * 100
                },
                'cpd_hours': {
                    'current': total_cpd_hours,
                    'target': targets['cpd_hrs'],
                    'percentage': (total_cpd_hours / targets['cpd_hrs']) * 100
                },
                'dcc_hours': {
                    'current': total_dcc_hours,
                    'per_fte_year': dcc_validation.get('dcc_per_fte_year', 0)
                }
            },
            'compliance': {
                'supervision_mix': supervision_validation,
                'dcc_minimum': dcc_validation,
                'targets_met': (
                    total_practice_hours >= targets['practice_hrs'] and
                    total_supervision_hours >= targets['supervision_hrs'] and
                    total_cpd_hours >= targets['cpd_hrs'] and
                    supervision_validation['valid'] and
                    dcc_validation['valid']
                )
            }
        }


class RegistrarProgramSerializer(serializers.ModelSerializer):
    """Serializer for registrar program"""
    
    aope_display = serializers.SerializerMethodField()
    qualification_tier_display = serializers.SerializerMethodField()

    class Meta:
        model = RegistrarProgram
        fields = [
            'id', 'user', 'aope', 'aope_display', 'qualification_tier', 'qualification_tier_display', 'fte_fraction',
            'start_date', 'expected_end_date', 'status',
            'targets_practice_hrs', 'targets_supervision_hrs', 'targets_cpd_hrs',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'targets_practice_hrs', 'targets_supervision_hrs', 'targets_cpd_hrs', 'created_at', 'updated_at']
    
    def get_aope_display(self, obj):
        """Get human-readable AoPE display name"""
        aope_display_map = {
            'CLINICAL': 'Clinical Psychology',
            'COUNSELLING': 'Counselling Psychology',
            'EDUCATIONAL': 'Educational Psychology',
            'FORENSIC': 'Forensic Psychology',
            'HEALTH': 'Health Psychology',
            'NEUROPSYCHOLOGY': 'Neuropsychology',
            'SPORT_EXERCISE': 'Sport & Exercise Psychology',
            'COMMUNITY': 'Community Psychology',
            'ORGANISATIONAL': 'Organisational Psychology'
        }
        return aope_display_map.get(obj.aope, obj.aope)
    
    def get_qualification_tier_display(self, obj):
        """Get human-readable qualification tier display name"""
        tier_display_map = {
            'masters': 'Masters (6th Year)',
            'masters_phd': 'Masters + PhD',
            'doctoral': 'Doctoral (7th Year+)'
        }
        return tier_display_map.get(obj.qualification_tier, obj.qualification_tier)
    
    def validate_fte_fraction(self, value):
        if value <= 0 or value > 1:
            raise serializers.ValidationError("FTE fraction must be between 0 and 1")
        return value

    def validate(self, attrs):
        start_date = attrs.get('start_date')
        expected_end_date = attrs.get('expected_end_date')
        
        if start_date and expected_end_date:
            if expected_end_date <= start_date:
                raise serializers.ValidationError("Expected end date must be after start date")
            
            # Minimum program duration based on qualification tier
            qualification_tier = attrs.get('qualification_tier')
            fte_fraction = attrs.get('fte_fraction', Decimal('1.00'))
            
            duration_days = (expected_end_date - start_date).days
            fte_years = duration_days / 365.25 * float(fte_fraction)
            
            min_weeks = {
                'masters': 88,
                'masters_phd': 66,
                'doctoral': 44
            }.get(qualification_tier, 44)
            
            min_days = min_weeks * 7
            
            if duration_days < min_days:
                raise serializers.ValidationError(
                    f"Program duration must be at least {min_weeks} FTE weeks "
                    f"({min_days} days) for {qualification_tier} qualification tier"
                )
        
        return attrs

    def create(self, validated_data):
        # Set target hours based on qualification tier
        qualification_tier = validated_data.get('qualification_tier')
        targets = RegistrarValidationService.get_target_hours(qualification_tier)
        
        validated_data['targets_practice_hrs'] = targets['practice_hrs']
        validated_data['targets_supervision_hrs'] = targets['supervision_hrs']
        validated_data['targets_cpd_hrs'] = targets['cpd_hrs']
        
        return super().create(validated_data)


class RegistrarPracticeEntrySerializer(serializers.ModelSerializer):
    """Serializer for registrar practice entries with comprehensive validation"""
    
    dcc_ratio = serializers.ReadOnlyField()
    duration_hours = serializers.ReadOnlyField()
    dcc_hours = serializers.ReadOnlyField()
    
    class Meta:
        model = RegistrarPracticeEntry
        fields = [
            'id', 'program', 'date', 'start_time', 'end_time', 'duration_minutes',
            'dcc_minutes', 'dcc_categories', 'setting', 'modality', 'client_code',
            'client_age_band', 'presenting_issue', 'tasks', 'competency_tags',
            'observed', 'supervisor_followup_date', 'evidence_files',
            'dcc_ratio', 'duration_hours', 'dcc_hours', 'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
    
    def validate_date(self, value):
        """Validate date is not in the future"""
        if value > date.today():
            raise serializers.ValidationError("Date cannot be in the future")
        return value
    
    def validate_duration_minutes(self, value):
        """Validate duration limits"""
        if value <= 0:
            raise serializers.ValidationError("Duration must be greater than 0 minutes")
        if value > 720:  # 12 hours
            raise serializers.ValidationError("Duration cannot exceed 720 minutes (12 hours)")
        return value
    
    def validate_dcc_minutes(self, value):
        """Validate DCC minutes"""
        if value < 0:
            raise serializers.ValidationError("DCC minutes cannot be negative")
        return value
    
    def validate_client_code(self, value):
        """Validate client code format - allow flexible anonymous codes"""
        import re
        if not re.match(r'^[A-Z0-9]+(-[A-Z0-9]+)*$', value):
            raise serializers.ValidationError(
                "Client code must contain only letters, numbers, and hyphens (e.g., C-044, BM-1961-M, A123-B456)"
            )
        return value
    
    def validate_tasks(self, value):
        """Validate tasks field length and content"""
        stripped = value.strip()
        if len(stripped) < 10:
            raise serializers.ValidationError("Tasks description must be at least 10 characters")
        if len(stripped) > 500:
            raise serializers.ValidationError("Tasks description cannot exceed 500 characters")
        
        # Check for PII patterns
        import re
        pii_patterns = [
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email
            r'\b\d{4}\s?\d{3}\s?\d{3}\b',  # Phone numbers
            r'\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b',  # Credit card
            r'\b\d{2}/\d{2}/\d{4}\b',  # Date patterns
            r'\b\d{2}-\d{2}-\d{4}\b',  # Date patterns
            r'\b\d{11}\b',  # Medicare number pattern
        ]
        
        for pattern in pii_patterns:
            if re.search(pattern, value, re.IGNORECASE):
                raise serializers.ValidationError(
                    "Tasks contains potentially identifying information. Please remove any names, emails, phone numbers, or dates."
                )
        
        return stripped
    
    def validate_presenting_issue(self, value):
        """Validate presenting issue field"""
        if value:
            stripped = value.strip()
            if len(stripped) > 120:
                raise serializers.ValidationError("Presenting issue cannot exceed 120 characters")
            
            # Check for PII patterns
            import re
            pii_patterns = [
                r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email
                r'\b\d{4}\s?\d{3}\s?\d{3}\b',  # Phone numbers
                r'\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b',  # Credit card
                r'\b\d{2}/\d{2}/\d{4}\b',  # Date patterns
                r'\b\d{2}-\d{2}-\d{4}\b',  # Date patterns
                r'\b\d{11}\b',  # Medicare number pattern
            ]
            
            for pattern in pii_patterns:
                if re.search(pattern, value, re.IGNORECASE):
                    raise serializers.ValidationError(
                        "Presenting issue contains potentially identifying information. Please remove any names, emails, phone numbers, or dates."
                    )
            
            return stripped
        return value
    
    def validate_dcc_categories(self, value):
        """Validate DCC categories"""
        valid_categories = [choice[0] for choice in RegistrarPracticeEntry.DCC_CATEGORIES]
        for category in value:
            if category not in valid_categories:
                raise serializers.ValidationError(f"Invalid DCC category: {category}")
        return value
    
    def validate_competency_tags(self, value):
        """Validate competency tags against framework"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Competency tags must be a list")
        
        # Get the program's AoPE to validate competency tags
        program_id = self.initial_data.get('program')
        if program_id:
            try:
                program = RegistrarProgram.objects.get(id=program_id)
                valid_competencies = CompetencyFramework.objects.filter(aope=program.aope).values_list('label', flat=True)
                
                for tag in value:
                    if tag not in valid_competencies:
                        raise serializers.ValidationError(f"Invalid competency tag: {tag}")
            except RegistrarProgram.DoesNotExist:
                raise serializers.ValidationError("Invalid program ID")
        
        return value

    def validate(self, attrs):
        """Cross-field validation"""
        # Validate DCC minutes vs duration
        dcc_minutes = attrs.get('dcc_minutes', 0)
        duration_minutes = attrs.get('duration_minutes')
        
        if duration_minutes and dcc_minutes > duration_minutes:
            raise serializers.ValidationError(
                "DCC minutes cannot exceed total duration minutes"
            )
        
        # Validate DCC categories when DCC > 0
        if dcc_minutes > 0:
            dcc_categories = attrs.get('dcc_categories', [])
            if not dcc_categories:
                raise serializers.ValidationError(
                    "DCC categories must be specified when DCC minutes > 0"
                )
        
        # Auto-calculate duration if start/end times provided
        start_time = attrs.get('start_time')
        end_time = attrs.get('end_time')
        duration_minutes = attrs.get('duration_minutes')
        
        if start_time and end_time:
            from datetime import datetime, date
            
            # Get the date (might be in attrs or instance)
            entry_date = attrs.get('date') or (self.instance.date if self.instance else None)
            if not entry_date:
                raise serializers.ValidationError("Date is required when start/end times are provided")
            
            start_datetime = datetime.combine(entry_date, start_time)
            end_datetime = datetime.combine(entry_date, end_time)
            
            # Check for cross-midnight entries
            if end_datetime <= start_datetime:
                raise serializers.ValidationError(
                    "End time must be after start time. Entries cannot span midnight."
                )
            
            # Calculate duration
            calculated_duration = int((end_datetime - start_datetime).total_seconds() / 60)
            
            # Use calculated duration if no duration provided or if there's a significant mismatch
            if not duration_minutes or abs(duration_minutes - calculated_duration) > 5:
                attrs['duration_minutes'] = calculated_duration
        
        return attrs

    def create(self, validated_data):
        """Create a new practice entry"""
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class RegistrarSupervisionEntrySerializer(serializers.ModelSerializer):
    """Serializer for supervision entries"""
    
    supervisor_name = serializers.CharField(source='supervisor.profile.first_name', read_only=True)
    supervisor_email = serializers.CharField(source='supervisor.email', read_only=True)
    
    class Meta:
        model = RegistrarSupervisionEntry
        fields = [
            'id', 'program', 'date', 'duration_minutes', 'mode', 'type',
            'supervisor', 'supervisor_category', 'supervisor_name', 'supervisor_email',
            'topics', 'observed', 'shorter_than_60min', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['shorter_than_60min', 'created_at', 'updated_at']
    
    def validate_duration_minutes(self, value):
        if value <= 0:
            raise serializers.ValidationError("Duration must be greater than 0 minutes")
        if value > 480:  # 8 hours
            raise serializers.ValidationError("Duration cannot exceed 8 hours")
        return value
    
    def validate_date(self, value):
        if value > date.today():
            raise serializers.ValidationError("Date cannot be in the future")
        return value
    
    def validate(self, attrs):
        # Auto-set shorter_than_60min based on duration
        duration_minutes = attrs.get('duration_minutes', 0)
        attrs['shorter_than_60min'] = duration_minutes < 60
        
        # Check supervision mix compliance after save (will be validated in views)
        return attrs
    
    def create(self, validated_data):
        instance = super().create(validated_data)
        
        # Validate supervision mix after creation
        program_id = instance.program_id
        validation_result = RegistrarValidationService.validate_supervision_mix(program_id)
        
        if not validation_result['valid']:
            # Log the validation errors but don't fail the creation
            # The errors will be shown in the dashboard
            pass
        
        return instance
    
    def update(self, instance, validated_data):
        updated_instance = super().update(instance, validated_data)
        
        # Validate supervision mix after update
        program_id = updated_instance.program_id
        validation_result = RegistrarValidationService.validate_supervision_mix(program_id)
        
        if not validation_result['valid']:
            # Log the validation errors but don't fail the update
            # The errors will be shown in the dashboard
            pass
        
        return updated_instance


class RegistrarCpdEntrySerializer(serializers.ModelSerializer):
    """Serializer for CPD entries"""
    
    class Meta:
        model = RegistrarCpdEntry
        fields = [
            'id', 'program', 'date', 'provider', 'title', 'hours',
            'is_active_cpd', 'learning_goal', 'reflection', 'evidence_files',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def validate_hours(self, value):
        if value <= 0:
            raise serializers.ValidationError("Hours must be greater than 0")
        if value > 40:
            raise serializers.ValidationError("CPD hours cannot exceed 40 per day")
        return value
    
    def validate_date(self, value):
        if value > date.today():
            raise serializers.ValidationError("Date cannot be in the future")
        return value


class SupervisorProfileSerializer(serializers.ModelSerializer):
    """Serializer for supervisor profiles"""
    
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = SupervisorProfile
        fields = [
            'id', 'user', 'user_email', 'user_name', 'is_BAS',
            'aope_endorsements', 'years_endorsed', 'is_registrar_principal_approved',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']
    
    def get_user_name(self, obj):
        profile = obj.user.profile
        return f"{profile.first_name} {profile.last_name}".strip() or obj.user.email


class CompetencyFrameworkSerializer(serializers.ModelSerializer):
    """Serializer for competency framework"""
    
    class Meta:
        model = CompetencyFramework
        fields = ['id', 'aope', 'category_code', 'label', 'description']


class ProgressSnapshotSerializer(serializers.ModelSerializer):
    """Serializer for progress snapshots"""
    
    class Meta:
        model = ProgressSnapshot
        fields = ['id', 'program', 'type', 'snapshot_json', 'created_at']
        read_only_fields = ['created_at']


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for audit logs"""
    
    actor_email = serializers.CharField(source='actor.email', read_only=True)
    actor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'actor', 'actor_email', 'actor_name', 'program',
            'entity_type', 'entity_id', 'action', 'timestamp', 'metadata'
        ]
        read_only_fields = ['timestamp']
    
    def get_actor_name(self, obj):
        profile = obj.actor.profile
        return f"{profile.first_name} {profile.last_name}".strip() or obj.actor.email


class RegistrarComplianceSummarySerializer(serializers.Serializer):
    """Serializer for comprehensive compliance summary"""
    
    program_id = serializers.IntegerField()
    targets = serializers.DictField()
    progress = serializers.DictField()
    compliance = serializers.DictField()
    
    def to_representation(self, instance):
        if isinstance(instance, dict):
            return instance
        return RegistrarValidationService.get_program_compliance_summary(instance.id)


# Specialized serializers for dashboard and reporting

class RegistrarProgramDashboardSerializer(serializers.ModelSerializer):
    """Serializer for registrar program dashboard with calculated metrics"""
    
    practice_hours_completed = serializers.SerializerMethodField()
    supervision_hours_completed = serializers.SerializerMethodField()
    cpd_hours_completed = serializers.SerializerMethodField()
    dcc_hours_completed = serializers.SerializerMethodField()
    active_cpd_hours_completed = serializers.SerializerMethodField()
    
    # Supervision mix compliance
    principal_supervision_percentage = serializers.SerializerMethodField()
    individual_supervision_percentage = serializers.SerializerMethodField()
    group_supervision_percentage = serializers.SerializerMethodField()
    short_sessions_percentage = serializers.SerializerMethodField()
    
    # Compliance status
    supervision_compliance_status = serializers.SerializerMethodField()
    dcc_compliance_status = serializers.SerializerMethodField()
    
    class Meta:
        model = RegistrarProgram
        fields = [
            'id', 'aope', 'qualification_tier', 'fte_fraction',
            'start_date', 'expected_end_date', 'status',
            'targets_practice_hrs', 'targets_supervision_hrs', 'targets_cpd_hrs',
            'practice_hours_completed', 'supervision_hours_completed', 'cpd_hours_completed',
            'dcc_hours_completed', 'active_cpd_hours_completed',
            'principal_supervision_percentage', 'individual_supervision_percentage',
            'group_supervision_percentage', 'short_sessions_percentage',
            'supervision_compliance_status', 'dcc_compliance_status',
            'created_at', 'updated_at'
        ]
    
    def get_practice_hours_completed(self, obj):
        from django.db.models import Sum
        total_minutes = obj.practice_entries.aggregate(
            total=Sum('duration_minutes')
        )['total'] or 0
        return round(total_minutes / 60, 2)
    
    def get_supervision_hours_completed(self, obj):
        from django.db.models import Sum
        total_minutes = obj.supervision_entries.aggregate(
            total=Sum('duration_minutes')
        )['total'] or 0
        return round(total_minutes / 60, 2)
    
    def get_cpd_hours_completed(self, obj):
        from django.db.models import Sum
        total_hours = obj.cpd_entries.aggregate(
            total=Sum('hours')
        )['total'] or 0
        return float(total_hours)
    
    def get_dcc_hours_completed(self, obj):
        from django.db.models import Sum
        total_dcc_minutes = obj.practice_entries.filter(dcc_minutes__gt=0).aggregate(
            total=Sum('dcc_minutes')
        )['total'] or 0
        return round(total_dcc_minutes / 60, 2)
    
    def get_active_cpd_hours_completed(self, obj):
        from django.db.models import Sum
        total_hours = obj.cpd_entries.filter(is_active_cpd=True).aggregate(
            total=Sum('hours')
        )['total'] or 0
        return float(total_hours)
    
    def get_principal_supervision_percentage(self, obj):
        from django.db.models import Sum
        total_minutes = obj.supervision_entries.aggregate(
            total=Sum('duration_minutes')
        )['total'] or 0
        principal_minutes = obj.supervision_entries.filter(
            supervisor_category='principal'
        ).aggregate(total=Sum('duration_minutes'))['total'] or 0
        
        if total_minutes == 0:
            return 0.0
        
        return round((principal_minutes / total_minutes) * 100, 1)
    
    def get_individual_supervision_percentage(self, obj):
        from django.db.models import Sum
        total_minutes = obj.supervision_entries.aggregate(
            total=Sum('duration_minutes')
        )['total'] or 0
        individual_minutes = obj.supervision_entries.filter(
            type='individual'
        ).aggregate(total=Sum('duration_minutes'))['total'] or 0
        
        if total_minutes == 0:
            return 0.0
        
        return round((individual_minutes / total_minutes) * 100, 1)
    
    def get_group_supervision_percentage(self, obj):
        from django.db.models import Sum
        total_minutes = obj.supervision_entries.aggregate(
            total=Sum('duration_minutes')
        )['total'] or 0
        group_minutes = obj.supervision_entries.filter(
            type='group'
        ).aggregate(total=Sum('duration_minutes'))['total'] or 0
        
        if total_minutes == 0:
            return 0.0
        
        return round((group_minutes / total_minutes) * 100, 1)
    
    def get_short_sessions_percentage(self, obj):
        from django.db.models import Sum
        total_minutes = obj.supervision_entries.aggregate(
            total=Sum('duration_minutes')
        )['total'] or 0
        short_minutes = obj.supervision_entries.filter(
            shorter_than_60min=True
        ).aggregate(total=Sum('duration_minutes'))['total'] or 0
        
        if total_minutes == 0:
            return 0.0
        
        return round((short_minutes / total_minutes) * 100, 1)
    
    def get_supervision_compliance_status(self, obj):
        """Check supervision mix compliance"""
        principal_pct = self.get_principal_supervision_percentage(obj)
        individual_pct = self.get_individual_supervision_percentage(obj)
        group_pct = self.get_group_supervision_percentage(obj)
        short_pct = self.get_short_sessions_percentage(obj)
        
        if (principal_pct >= 50 and individual_pct >= 66 and 
            group_pct <= 33 and short_pct <= 25):
            return 'compliant'
        elif (principal_pct >= 40 and individual_pct >= 60 and 
              group_pct <= 40 and short_pct <= 30):
            return 'warning'
        else:
            return 'non_compliant'
    
    def get_dcc_compliance_status(self, obj):
        """Check DCC minimum compliance per FTE year"""
        dcc_hours = self.get_dcc_hours_completed(obj)
        fte_fraction = float(obj.fte_fraction)
        
        # Calculate FTE years completed
        today = date.today()
        start_date = obj.start_date
        days_completed = (today - start_date).days
        fte_years_completed = (days_completed / 365.25) * fte_fraction
        
        if fte_years_completed <= 0:
            return 'insufficient_data'
        
        # DCC minimum is 176 hours per FTE year
        min_dcc_per_fte_year = 176
        required_dcc = fte_years_completed * min_dcc_per_fte_year
        
        if dcc_hours >= required_dcc:
            return 'compliant'
        elif dcc_hours >= required_dcc * 0.8:  # 80% of required
            return 'warning'
        else:
            return 'non_compliant'


class RegistrarProgramSummarySerializer(serializers.ModelSerializer):
    """Serializer for program summary reports"""
    
    practice_hours_completed = serializers.SerializerMethodField()
    supervision_hours_completed = serializers.SerializerMethodField()
    cpd_hours_completed = serializers.SerializerMethodField()
    dcc_hours_completed = serializers.SerializerMethodField()
    
    supervision_mix = serializers.SerializerMethodField()
    competency_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = RegistrarProgram
        fields = [
            'id', 'aope', 'qualification_tier', 'fte_fraction',
            'start_date', 'expected_end_date', 'status',
            'targets_practice_hrs', 'targets_supervision_hrs', 'targets_cpd_hrs',
            'practice_hours_completed', 'supervision_hours_completed',
            'cpd_hours_completed', 'dcc_hours_completed',
            'supervision_mix', 'competency_summary'
        ]
    
    def get_practice_hours_completed(self, obj):
        from django.db.models import Sum
        total_minutes = obj.practice_entries.aggregate(
            total=Sum('duration_minutes')
        )['total'] or 0
        return round(total_minutes / 60, 2)
    
    def get_supervision_hours_completed(self, obj):
        from django.db.models import Sum
        total_minutes = obj.supervision_entries.aggregate(
            total=Sum('duration_minutes')
        )['total'] or 0
        return round(total_minutes / 60, 2)
    
    def get_cpd_hours_completed(self, obj):
        from django.db.models import Sum
        total_hours = obj.cpd_entries.aggregate(
            total=Sum('hours')
        )['total'] or 0
        return float(total_hours)
    
    def get_dcc_hours_completed(self, obj):
        from django.db.models import Sum
        total_dcc_minutes = obj.practice_entries.filter(dcc_minutes__gt=0).aggregate(
            total=Sum('dcc_minutes')
        )['total'] or 0
        return round(total_dcc_minutes / 60, 2)
    
    def get_supervision_mix(self, obj):
        from django.db.models import Sum
        total_minutes = obj.supervision_entries.aggregate(
            total=Sum('duration_minutes')
        )['total'] or 0
        
        if total_minutes == 0:
            return {
                'total_hours': 0,
                'principal_percentage': 0,
                'individual_percentage': 0,
                'group_percentage': 0,
                'short_sessions_percentage': 0
            }
        
        principal_minutes = obj.supervision_entries.filter(
            supervisor_category='principal'
        ).aggregate(total=Sum('duration_minutes'))['total'] or 0
        
        individual_minutes = obj.supervision_entries.filter(
            type='individual'
        ).aggregate(total=Sum('duration_minutes'))['total'] or 0
        
        group_minutes = obj.supervision_entries.filter(
            type='group'
        ).aggregate(total=Sum('duration_minutes'))['total'] or 0
        
        short_minutes = obj.supervision_entries.filter(
            shorter_than_60min=True
        ).aggregate(total=Sum('duration_minutes'))['total'] or 0
        
        return {
            'total_hours': round(total_minutes / 60, 2),
            'principal_percentage': round((principal_minutes / total_minutes) * 100, 1),
            'individual_percentage': round((individual_minutes / total_minutes) * 100, 1),
            'group_percentage': round((group_minutes / total_minutes) * 100, 1),
            'short_sessions_percentage': round((short_minutes / total_minutes) * 100, 1)
        }
    
    def get_competency_summary(self, obj):
        # This would be implemented based on competency tracking requirements
        # For now, return a placeholder structure
        return {
            'total_competencies': 0,
            'completed_competencies': 0,
            'competency_areas': []
        }
