from rest_framework import serializers
from django.contrib.auth.models import User
from .models import CPDCategory, CPDActivity, CPDPlan, CPDRequirement, CPDComplianceReport
from api.models import UserProfile
from decimal import Decimal

class CPDCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CPDCategory
        fields = ['id', 'name', 'description', 'is_active', 'created_at']
        read_only_fields = ['created_at']

class CPDActivitySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    evidence_file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = CPDActivity
        fields = [
            'id', 'user', 'user_name', 'user_email', 'user_profile',
            'title', 'activity_type', 'category', 'category_name',
            'description', 'activity_date', 'duration_hours', 'delivery_mode',
            'learning_outcomes', 'skills_developed', 'application_to_practice',
            'evidence_type', 'evidence_description', 'evidence_file', 'evidence_file_url',
            'is_active_cpd', 'is_peer_consultation', 'is_supervision',
            'professional_areas', 'competencies_addressed',
            'quality_rating', 'reflection',
            'status', 'reviewer', 'reviewer_comments', 'reviewed_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'user_profile', 'created_at', 'updated_at', 'reviewed_at']
    
    def get_evidence_file_url(self, obj):
        if obj.evidence_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.evidence_file.url)
        return None
    
    def validate_duration_hours(self, value):
        if value < Decimal('0.25'):
            raise serializers.ValidationError("Duration must be at least 0.25 hours")
        if value > Decimal('1000'):
            raise serializers.ValidationError("Duration cannot exceed 1000 hours")
        return value
    
    def validate_active_cpd_percentage(self, data):
        """Validate that active CPD percentage is reasonable"""
        if data.get('is_active_cpd') and data.get('duration_hours'):
            # This would be validated against the user's CPD plan
            pass
        return data

class CPDPlanSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    progress_percentage = serializers.ReadOnlyField()
    active_cpd_percentage = serializers.ReadOnlyField()
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    
    class Meta:
        model = CPDPlan
        fields = [
            'id', 'user', 'user_name', 'user_profile',
            'year', 'title', 'description',
            'learning_goals', 'professional_areas', 'competencies_to_develop',
            'total_hours_planned', 'active_cpd_hours_planned', 'peer_consultation_hours_planned',
            'status', 'submitted_at', 'approved_at', 'approved_by', 'approved_by_name',
            'total_hours_completed', 'active_cpd_hours_completed', 'peer_consultation_hours_completed',
            'progress_percentage', 'active_cpd_percentage',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'user_profile', 'created_at', 'updated_at', 'submitted_at', 'approved_at']
    
    def validate_active_cpd_hours_planned(self, value):
        """Validate that active CPD hours are at least 50% of total"""
        total_hours = self.initial_data.get('total_hours_planned')
        if total_hours and value:
            if value < total_hours * Decimal('0.5'):
                raise serializers.ValidationError(
                    "Active CPD hours must be at least 50% of total planned hours"
                )
        return value

class CPDRequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = CPDRequirement
        fields = [
            'id', 'role', 'year', 'total_hours_required',
            'active_cpd_percentage', 'peer_consultation_hours',
            'requires_plan_approval', 'requires_evidence',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

class CPDComplianceReportSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    
    class Meta:
        model = CPDComplianceReport
        fields = [
            'id', 'user', 'user_name', 'user_profile',
            'year', 'report_period_start', 'report_period_end',
            'total_hours_completed', 'active_cpd_hours', 'peer_consultation_hours',
            'total_hours_required', 'active_cpd_percentage_required', 'peer_consultation_hours_required',
            'is_compliant', 'compliance_notes',
            'status', 'submitted_at', 'approved_at', 'approved_by', 'approved_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'user_profile', 'created_at', 'updated_at', 'submitted_at', 'approved_at']

class CPDDashboardStatsSerializer(serializers.Serializer):
    """Serializer for CPD dashboard statistics"""
    
    # Current Year Stats
    current_year = serializers.IntegerField()
    total_hours_current_year = serializers.DecimalField(max_digits=5, decimal_places=2)
    active_cpd_hours_current_year = serializers.DecimalField(max_digits=5, decimal_places=2)
    peer_consultation_hours_current_year = serializers.DecimalField(max_digits=5, decimal_places=2)
    
    # Requirements
    total_hours_required = serializers.IntegerField()
    active_cpd_percentage_required = serializers.DecimalField(max_digits=5, decimal_places=2)
    peer_consultation_hours_required = serializers.IntegerField()
    
    # Progress
    progress_percentage = serializers.FloatField()
    active_cpd_percentage = serializers.FloatField()
    peer_consultation_progress_percentage = serializers.FloatField()
    
    # Compliance Status
    is_compliant = serializers.BooleanField()
    compliance_status = serializers.ChoiceField(choices=['compliant', 'warning', 'non_compliant'])
    
    # Recent Activities
    recent_activities_count = serializers.IntegerField()
    pending_activities_count = serializers.IntegerField()
    
    # Alerts
    alerts = serializers.ListField(child=serializers.CharField())
    
    # Plan Status
    has_approved_plan = serializers.BooleanField()
    plan_status = serializers.CharField()

class CPDActivitySummarySerializer(serializers.Serializer):
    """Summary serializer for CPD activities list view"""
    
    id = serializers.IntegerField()
    title = serializers.CharField()
    activity_type = serializers.CharField()
    activity_date = serializers.DateField()
    duration_hours = serializers.DecimalField(max_digits=5, decimal_places=2)
    is_active_cpd = serializers.BooleanField()
    is_peer_consultation = serializers.BooleanField()
    status = serializers.CharField()
    quality_rating = serializers.IntegerField(allow_null=True)
    created_at = serializers.DateTimeField()
