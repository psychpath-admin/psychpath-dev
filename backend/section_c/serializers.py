from rest_framework import serializers
from .models import SupervisionEntry, SupervisionWeeklySummary, SupervisionObservation, SupervisionComplianceReport

class SupervisionEntrySerializer(serializers.ModelSerializer):
    trainee_email = serializers.CharField(source='trainee.user.email', read_only=True)
    week_starting = serializers.DateField(read_only=True)
    duration_display = serializers.CharField(read_only=True)
    duration_hours_minutes = serializers.CharField(read_only=True)

    class Meta:
        model = SupervisionEntry
        fields = [
            'id', 'trainee', 'trainee_email', 'date_of_supervision', 'week_starting', 'supervisor_name',
            'supervisor_type', 'supervision_type', 'duration_minutes', 'summary',
            'supervision_mode', 'is_cultural_supervision', 'supervisor_is_board_approved',
            'duration_display', 'duration_hours_minutes',
            'locked', 'supervisor_comment', 'trainee_response',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['trainee', 'duration_display', 'duration_hours_minutes', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate the entry data"""
        date_of_supervision = data.get('date_of_supervision')
        
        # Prevent post-dating of any record
        if date_of_supervision:
            from datetime import date
            today = date.today()
            if date_of_supervision > today:
                raise serializers.ValidationError({
                    'date_of_supervision': f'Cannot create records for future dates. Today is {today.strftime("%d/%m/%Y")}. Please select a date on or before today.'
                })
        
        return data

class SupervisionWeeklySummarySerializer(serializers.ModelSerializer):
    week_total_display = serializers.CharField(read_only=True)
    cumulative_total_display = serializers.CharField(read_only=True)
    entries = SupervisionEntrySerializer(many=True, read_only=True)

    class Meta:
        model = SupervisionWeeklySummary
        fields = [
            'id', 'trainee', 'week_starting', 'week_total_minutes',
            'cumulative_total_minutes', 'week_total_display',
            'cumulative_total_display', 'entries', 'created_at', 'updated_at'
        ]


class SupervisionObservationSerializer(serializers.ModelSerializer):
    """Serializer for supervision observations"""
    trainee_email = serializers.CharField(source='trainee.user.email', read_only=True)
    supervisor_email = serializers.CharField(source='supervisor.user.email', read_only=True)
    supervisor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = SupervisionObservation
        fields = [
            'id', 'trainee', 'trainee_email', 'supervisor', 'supervisor_email', 'supervisor_name',
            'observation_date', 'observation_type', 'observation_method', 'client_pseudonym',
            'session_duration_minutes', 'supervisor_feedback', 'trainee_reflection',
            'related_supervision_entry', 'created_at', 'updated_at'
        ]
        read_only_fields = ['trainee', 'supervisor', 'created_at', 'updated_at']
    
    def get_supervisor_name(self, obj):
        """Get supervisor's full name"""
        return f"{obj.supervisor.first_name} {obj.supervisor.last_name}".strip() or obj.supervisor.user.email
    
    def validate(self, data):
        """Validate observation data"""
        from system_config.models import SystemConfiguration
        
        observation_date = data.get('observation_date')
        observation_type = data.get('observation_type')
        
        # Prevent post-dating
        if observation_date:
            from datetime import date
            today = date.today()
            if observation_date > today:
                raise serializers.ValidationError({
                    'observation_date': f'Cannot create observations for future dates. Today is {today.strftime("%d/%m/%Y")}.'
                })
        
        # Check observation limits
        if observation_type and self.instance is None:  # Only check on creation
            trainee = self.context.get('trainee')
            if trainee:
                config = SystemConfiguration.get_config()
                existing_count = SupervisionObservation.objects.filter(
                    trainee=trainee,
                    observation_type=observation_type
                ).count()
                
                max_allowed = (config.required_assessment_observations 
                             if observation_type == 'ASSESSMENT' 
                             else config.required_intervention_observations)
                
                if existing_count >= max_allowed:
                    obs_type_name = 'assessment' if observation_type == 'ASSESSMENT' else 'intervention'
                    raise serializers.ValidationError({
                        'observation_type': f'Maximum {max_allowed} {obs_type_name} observations already logged.'
                    })
        
        return data


class SupervisionComplianceReportSerializer(serializers.ModelSerializer):
    """Serializer for supervision compliance reports"""
    trainee_email = serializers.CharField(source='trainee.user.email', read_only=True)
    trainee_name = serializers.SerializerMethodField()
    
    class Meta:
        model = SupervisionComplianceReport
        fields = [
            'id', 'trainee', 'trainee_email', 'trainee_name',
            'total_supervision_hours', 'individual_supervision_hours', 'group_supervision_hours',
            'direct_inperson_hours', 'direct_video_hours', 'direct_phone_hours', 'indirect_hours',
            'cultural_supervision_hours',
            'assessment_observations_count', 'intervention_observations_count',
            'meets_total_hours', 'meets_individual_requirement', 'meets_direct_requirement',
            'meets_observation_requirement', 'meets_distribution_requirement', 'is_compliant',
            'warnings', 'last_calculated'
        ]
        read_only_fields = '__all__'
    
    def get_trainee_name(self, obj):
        """Get trainee's full name"""
        return f"{obj.trainee.first_name} {obj.trainee.last_name}".strip() or obj.trainee.user.email
