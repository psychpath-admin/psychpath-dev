from rest_framework import serializers
from .models import UserProfile, Organization, EPA, Milestone, Supervision, MilestoneProgress, Reflection

class UserProfileSerializer(serializers.ModelSerializer):
    # Ensure prior_hours always a dict
    prior_hours = serializers.JSONField(required=False)
    # Accept relative URLs or plain paths for signature
    signature_url = serializers.CharField(required=False, allow_blank=True)
    class Meta:
        model = UserProfile
        fields = [
            'id', 'role', 'organization', 'first_name', 'middle_name', 'last_name',
            'ahpra_registration_number', 'intern_start_date', 'report_start_day',
            'principal_supervisor', 'secondary_supervisor', 'supervisor_emails',
            'signature_url', 'prior_hours', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name']

class EPASerializer(serializers.ModelSerializer):
    class Meta:
        model = EPA
        fields = ['id', 'code', 'title', 'description']

class MilestoneSerializer(serializers.ModelSerializer):
    epa_title = serializers.CharField(source='epa.title', read_only=True)
    
    class Meta:
        model = Milestone
        fields = ['id', 'code', 'description', 'epa', 'epa_title']

class SupervisionSerializer(serializers.ModelSerializer):
    supervisor_email = serializers.CharField(source='supervisor.email', read_only=True)
    supervisee_email = serializers.CharField(source='supervisee.email', read_only=True)
    
    class Meta:
        model = Supervision
        fields = ['id', 'supervisor', 'supervisee', 'supervisor_email', 'supervisee_email', 'active']

class MilestoneProgressSerializer(serializers.ModelSerializer):
    milestone_code = serializers.CharField(source='milestone.code', read_only=True)
    milestone_description = serializers.CharField(source='milestone.description', read_only=True)
    epa_code = serializers.CharField(source='milestone.epa.code', read_only=True)
    epa_title = serializers.CharField(source='milestone.epa.title', read_only=True)
    
    class Meta:
        model = MilestoneProgress
        fields = ['id', 'milestone', 'milestone_code', 'milestone_description', 'epa_code', 'epa_title', 'is_completed', 'updated_at']

class ReflectionSerializer(serializers.ModelSerializer):
    author_email = serializers.CharField(source='author.email', read_only=True)
    epa_code = serializers.CharField(source='epa.code', read_only=True)
    epa_title = serializers.CharField(source='epa.title', read_only=True)
    milestone_code = serializers.CharField(source='milestone.code', read_only=True)
    approved_by_email = serializers.CharField(source='approved_by.email', read_only=True)
    
    class Meta:
        model = Reflection
        fields = [
            'id', 'author', 'author_email', 'epa', 'epa_code', 'epa_title',
            'milestone', 'milestone_code', 'title', 'content', 'is_approved',
            'approved_by', 'approved_by_email', 'approved_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['author', 'approved_by', 'approved_at', 'created_at', 'updated_at']