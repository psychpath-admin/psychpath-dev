from rest_framework import serializers
from .models import SupervisionEntry, SupervisionWeeklySummary
from django.core.exceptions import ValidationError

class SupervisionEntrySerializer(serializers.ModelSerializer):
    trainee_email = serializers.CharField(source='trainee.user.email', read_only=True)
    week_starting = serializers.DateField(read_only=True)
    duration_display = serializers.CharField(read_only=True)
    duration_hours_minutes = serializers.CharField(read_only=True)

    class Meta:
        model = SupervisionEntry
        fields = [
            'id', 'trainee', 'trainee_email', 'date_of_supervision', 'week_starting', 'supervisor_name',
            'supervisor_type', 'supervision_type', 'supervision_medium', 'supervisor_initials',
            'is_short_session', 'supervision_mode', 'is_cultural_supervision', 'supervisor_is_board_approved',
            'duration_minutes', 'summary',
            'locked', 'supervisor_comment', 'trainee_response',
            'duration_display', 'duration_hours_minutes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['trainee', 'duration_display', 'duration_hours_minutes', 'created_at', 'updated_at']

    def validate(self, data):
        """Validate short session limits"""
        # Get the trainee from context or instance
        trainee = None
        if self.instance:
            trainee = self.instance.trainee
        elif 'trainee' in self.context:
            trainee = self.context['trainee']
        
        if not trainee:
            return data
        
        # Check if this would be a short session
        duration_minutes = data.get('duration_minutes', 0)
        is_short = duration_minutes < 60
        
        if is_short:
            # Calculate current short session total
            current_short_hours = SupervisionEntry.get_short_session_total(trainee)
            
            # If updating, subtract the current entry's duration if it was also short
            if self.instance and self.instance.is_short_session:
                current_short_hours -= self.instance.duration_minutes / 60.0
            
            # Add the new entry's duration
            new_total_hours = current_short_hours + (duration_minutes / 60.0)
            
            # Check limits
            if new_total_hours > 10.0:
                raise serializers.ValidationError({
                    'duration_minutes': f'Adding this {duration_minutes}-minute session would exceed the 10-hour limit for short sessions. Current short session total: {current_short_hours:.1f} hours. Maximum allowed: 10.0 hours.'
                })
            elif new_total_hours > 8.0:
                # Add a warning to the data
                data['_warning_message'] = f'Warning: You are approaching the 10-hour limit for short sessions. Current total: {new_total_hours:.1f}/10.0 hours.'
        
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
