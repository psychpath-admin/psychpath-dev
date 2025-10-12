from rest_framework import serializers
from .models import SupervisionEntry, SupervisionWeeklySummary

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
