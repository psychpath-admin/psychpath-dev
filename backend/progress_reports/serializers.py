from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ProgressReportConfig, ProgressReport
from competency_tracking.models import CompetencyDefinition

User = get_user_model()


class ProgressReportConfigSerializer(serializers.ModelSerializer):
    """Serializer for progress report configuration"""
    
    class Meta:
        model = ProgressReportConfig
        fields = [
            'id', 'program_type', 'report_type', 'report_label',
            'trigger_condition', 'due_offset_days', 'is_required',
            'allows_draft', 'requires_all_competencies',
            'supervisor_approval_required', 'can_request_revision',
            'instructions'
        ]


class ProgressReportListSerializer(serializers.ModelSerializer):
    """Serializer for progress report list views"""
    
    trainee_name = serializers.CharField(source='trainee.profile.get_full_name', read_only=True)
    supervisor_name = serializers.CharField(source='supervisor.profile.get_full_name', read_only=True)
    report_config_label = serializers.CharField(source='report_config.report_label', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    can_be_edited = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = ProgressReport
        fields = [
            'id', 'trainee', 'trainee_name', 'supervisor', 'supervisor_name',
            'report_config', 'report_config_label', 'status',
            'reporting_period_start', 'reporting_period_end',
            'submission_date', 'due_date', 'is_overdue', 'can_be_edited',
            'created_at', 'updated_at'
        ]


class ProgressReportSerializer(serializers.ModelSerializer):
    """Full serializer for progress report with validation"""
    
    trainee_name = serializers.CharField(source='trainee.profile.get_full_name', read_only=True)
    supervisor_name = serializers.CharField(source='supervisor.profile.get_full_name', read_only=True)
    report_config_label = serializers.CharField(source='report_config.report_label', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    can_be_edited = serializers.BooleanField(read_only=True)
    can_be_submitted = serializers.BooleanField(read_only=True)
    
    # Supervisor fields (read-only for trainees)
    supervisor_comments = serializers.CharField(read_only=True)
    supervisor_recommendations = serializers.CharField(read_only=True)
    competency_feedback = serializers.JSONField(read_only=True)
    reviewed_at = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = ProgressReport
        fields = [
            'id', 'trainee', 'trainee_name', 'supervisor', 'supervisor_name',
            'report_config', 'report_config_label', 'status',
            'reporting_period_start', 'reporting_period_end',
            'submission_date', 'due_date', 'is_overdue', 'can_be_edited', 'can_be_submitted',
            
            # Competency self-assessment
            'competency_ratings',
            
            # Overall reflections
            'achievements', 'challenges', 'learning_goals', 'support_needed', 'additional_comments',
            
            # Supervisor review (read-only for trainees)
            'supervisor_comments', 'supervisor_recommendations', 'competency_feedback', 'reviewed_at',
            
            # Audit fields
            'created_at', 'updated_at'
        ]
    
    def validate_competency_ratings(self, value):
        """Validate competency ratings"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Competency ratings must be a dictionary")
        
        # Get all competency definitions
        competencies = CompetencyDefinition.objects.all()
        competency_codes = [c.code for c in competencies]
        
        # Check if all required competencies are present
        if self.instance and self.instance.report_config.requires_all_competencies:
            missing_competencies = set(competency_codes) - set(value.keys())
            if missing_competencies:
                raise serializers.ValidationError(
                    f"Missing required competencies: {', '.join(sorted(missing_competencies))}"
                )
        
        # Validate each competency rating
        valid_milestones = ['M1', 'M2', 'M3', 'M4']
        for comp_code, rating in value.items():
            if comp_code not in competency_codes:
                raise serializers.ValidationError(f"Invalid competency code: {comp_code}")
            
            if not isinstance(rating, dict):
                raise serializers.ValidationError(f"Rating for {comp_code} must be a dictionary")
            
            if 'milestone' not in rating:
                raise serializers.ValidationError(f"Missing milestone for {comp_code}")
            
            if rating['milestone'] not in valid_milestones:
                raise serializers.ValidationError(
                    f"Invalid milestone for {comp_code}: {rating['milestone']}. Must be one of {valid_milestones}"
                )
            
            if 'reflection' not in rating:
                raise serializers.ValidationError(f"Missing reflection for {comp_code}")
            
            if not isinstance(rating['reflection'], str):
                raise serializers.ValidationError(f"Reflection for {comp_code} must be a string")
        
        return value


class ProgressReportCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating progress reports"""
    
    class Meta:
        model = ProgressReport
        fields = [
            'report_config', 'reporting_period_start', 'reporting_period_end',
            'due_date', 'competency_ratings', 'achievements', 'challenges',
            'learning_goals', 'support_needed', 'additional_comments'
        ]
    
    def validate(self, data):
        """Validate the entire report data"""
        # Set trainee from request user
        data['trainee'] = self.context['request'].user
        
        # Set supervisor from trainee's supervisor relationship
        trainee = data['trainee']
        if hasattr(trainee, 'profile') and hasattr(trainee.profile, 'supervisor'):
            data['supervisor'] = trainee.profile.supervisor
        
        # Validate competency ratings
        if 'competency_ratings' in data:
            config = data['report_config']
            if config.requires_all_competencies:
                competencies = CompetencyDefinition.objects.all()
                competency_codes = [c.code for c in competencies]
                missing_competencies = set(competency_codes) - set(data['competency_ratings'].keys())
                if missing_competencies:
                    raise serializers.ValidationError(
                        f"Missing required competencies: {', '.join(sorted(missing_competencies))}"
                    )
        
        return data


class ProgressReportReviewSerializer(serializers.ModelSerializer):
    """Serializer for supervisor review actions"""
    
    class Meta:
        model = ProgressReport
        fields = [
            'supervisor_comments', 'supervisor_recommendations', 'competency_feedback'
        ]
    
    def validate_competency_feedback(self, value):
        """Validate competency feedback"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Competency feedback must be a dictionary")
        
        # Get all competency definitions
        competencies = CompetencyDefinition.objects.all()
        competency_codes = [c.code for c in competencies]
        
        # Validate each feedback entry
        for comp_code, feedback in value.items():
            if comp_code not in competency_codes:
                raise serializers.ValidationError(f"Invalid competency code: {comp_code}")
            
            if not isinstance(feedback, str):
                raise serializers.ValidationError(f"Feedback for {comp_code} must be a string")
        
        return value
