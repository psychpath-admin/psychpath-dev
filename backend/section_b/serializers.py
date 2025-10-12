from rest_framework import serializers
from .models import ProfessionalDevelopmentEntry, PDCompetency, PDWeeklySummary


class PDCompetencySerializer(serializers.ModelSerializer):
    class Meta:
        model = PDCompetency
        fields = ['id', 'name', 'description', 'is_active']


class ProfessionalDevelopmentEntrySerializer(serializers.ModelSerializer):
    duration_display = serializers.ReadOnlyField()
    duration_hours_minutes = serializers.ReadOnlyField()
    
    class Meta:
        model = ProfessionalDevelopmentEntry
        fields = [
            'id', 'activity_type', 'date_of_activity', 'duration_minutes',
            'is_active_activity', 'activity_details', 'topics_covered',
            'competencies_covered', 'reflection', 'week_starting', 'duration_display',
            'duration_hours_minutes', 'locked', 'supervisor_comment', 'trainee_response',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['trainee', 'week_starting', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['trainee'] = self.context['request'].user
        return super().create(validated_data)


class PDWeeklySummarySerializer(serializers.ModelSerializer):
    week_total_display = serializers.ReadOnlyField()
    cumulative_total_display = serializers.ReadOnlyField()
    
    class Meta:
        model = PDWeeklySummary
        fields = [
            'id', 'week_starting', 'week_total_minutes', 'cumulative_total_minutes',
            'week_total_display', 'cumulative_total_display', 'created_at', 'updated_at'
        ]
        read_only_fields = ['trainee', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['trainee'] = self.context['request'].user
        return super().create(validated_data)


class PDEntryWithSummarySerializer(serializers.ModelSerializer):
    """Serializer for PD entries grouped by week with summary data"""
    duration_display = serializers.ReadOnlyField()
    duration_hours_minutes = serializers.ReadOnlyField()
    
    class Meta:
        model = ProfessionalDevelopmentEntry
        fields = [
            'id', 'activity_type', 'date_of_activity', 'duration_minutes',
            'is_active_activity', 'activity_details', 'topics_covered',
            'competencies_covered', 'reflection', 'week_starting', 'duration_display', 'duration_hours_minutes',
            'locked', 'supervisor_comment', 'trainee_response'
        ]
