from rest_framework import serializers
from .models import WeeklyLogbook, RegistrarLogEntry


class RegistrarLogEntrySerializer(serializers.ModelSerializer):
    duration_hours = serializers.FloatField(write_only=True, required=False)

    class Meta:
        model = RegistrarLogEntry
        fields = [
            'id', 'trainee', 'week', 'date', 'duration_minutes', 'duration_hours',
            'category', 'short_description', 'reflection', 'aope', 'program_type',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['trainee', 'program_type', 'created_at', 'updated_at']

    def validate(self, attrs):
        # Accept duration_hours convenience input
        hours = attrs.pop('duration_hours', None)
        if hours is not None and not attrs.get('duration_minutes'):
            attrs['duration_minutes'] = int(round(float(hours) * 60))
        return super().validate(attrs)

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user and not validated_data.get('trainee'):
            validated_data['trainee'] = request.user
        return super().create(validated_data)


class WeeklyLogbookSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyLogbook
        fields = [
            'id', 'trainee', 'week_starting', 'status', 'submitted_at', 'returned_reason',
            'dcc_minutes', 'cra_minutes', 'pd_minutes'
        ]
        read_only_fields = ['trainee', 'submitted_at', 'dcc_minutes', 'cra_minutes', 'pd_minutes']


