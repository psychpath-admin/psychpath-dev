from rest_framework import serializers
from django.contrib.auth.models import User
from .models import WeeklyLogbook, DCCEntry, CRAEntry, PDEntry, SUPEntry, LogbookAuditLog


class LogbookEntrySerializer(serializers.ModelSerializer):
    """Base serializer for logbook entries"""
    
    class Meta:
        fields = [
            'id', 'date', 'client_age', 'client_issue', 'activity_description',
            'duration_hours', 'reflection', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DCCEntrySerializer(LogbookEntrySerializer):
    class Meta(LogbookEntrySerializer.Meta):
        model = DCCEntry


class CRAEntrySerializer(LogbookEntrySerializer):
    class Meta(LogbookEntrySerializer.Meta):
        model = CRAEntry


class PDEntrySerializer(LogbookEntrySerializer):
    class Meta(LogbookEntrySerializer.Meta):
        model = PDEntry


class SUPEntrySerializer(LogbookEntrySerializer):
    class Meta(LogbookEntrySerializer.Meta):
        model = SUPEntry


class WeeklyLogbookSerializer(serializers.ModelSerializer):
    """Serializer for weekly logbook with nested entries"""
    
    dcc_entries = DCCEntrySerializer(many=True, read_only=True)
    cra_entries = CRAEntrySerializer(many=True, read_only=True)
    pd_entries = PDEntrySerializer(many=True, read_only=True)
    sup_entries = SUPEntrySerializer(many=True, read_only=True)
    
    trainee_name = serializers.CharField(source='trainee.get_full_name', read_only=True)
    trainee_email = serializers.CharField(source='trainee.email', read_only=True)
    supervisor_name = serializers.CharField(source='supervisor.get_full_name', read_only=True)
    supervisor_email = serializers.CharField(source='supervisor.email', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)
    
    class Meta:
        model = WeeklyLogbook
        fields = [
            'id', 'trainee', 'trainee_name', 'trainee_email', 'week_start_date', 'week_end_date',
            'status', 'total_dcc_hours', 'total_cra_hours', 'total_pd_hours', 'total_sup_hours',
            'total_weekly_hours', 'cumulative_dcc_hours', 'cumulative_cra_hours',
            'cumulative_pd_hours', 'cumulative_sup_hours', 'cumulative_total_hours',
            'supervisor', 'supervisor_name', 'supervisor_email', 'submitted_at', 'reviewed_by',
            'reviewed_by_name', 'reviewed_at', 'supervisor_comments', 'created_at', 'updated_at',
            'dcc_entries', 'cra_entries', 'pd_entries', 'sup_entries'
        ]
        read_only_fields = [
            'id', 'trainee', 'total_dcc_hours', 'total_cra_hours', 'total_pd_hours',
            'total_sup_hours', 'total_weekly_hours', 'cumulative_dcc_hours',
            'cumulative_cra_hours', 'cumulative_pd_hours', 'cumulative_sup_hours',
            'cumulative_total_hours', 'submitted_at', 'reviewed_by', 'reviewed_at',
            'created_at', 'updated_at'
        ]


class WeeklyLogbookListSerializer(serializers.ModelSerializer):
    """Simplified serializer for logbook lists"""
    
    trainee_name = serializers.CharField(source='trainee.get_full_name', read_only=True)
    trainee_email = serializers.CharField(source='trainee.email', read_only=True)
    supervisor_name = serializers.CharField(source='supervisor.get_full_name', read_only=True)
    
    class Meta:
        model = WeeklyLogbook
        fields = [
            'id', 'trainee', 'trainee_name', 'trainee_email', 'week_start_date', 'week_end_date',
            'status', 'total_weekly_hours', 'cumulative_total_hours', 'supervisor',
            'supervisor_name', 'submitted_at', 'reviewed_at', 'created_at'
        ]


class LogbookAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for audit log entries"""
    
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = LogbookAuditLog
        fields = [
            'id', 'action', 'user', 'user_name', 'user_email', 'timestamp',
            'comments', 'previous_status', 'new_status'
        ]
        read_only_fields = ['id', 'timestamp']


class LogbookSubmitSerializer(serializers.Serializer):
    """Serializer for submitting a logbook"""
    comments = serializers.CharField(required=False, allow_blank=True)


class LogbookApproveSerializer(serializers.Serializer):
    """Serializer for approving/rejecting a logbook"""
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    comments = serializers.CharField(required=False, allow_blank=True)

