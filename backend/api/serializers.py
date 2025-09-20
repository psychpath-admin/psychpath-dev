from rest_framework import serializers
from .models import UserProfile, Organization, EPA, Milestone, Supervision, MilestoneProgress, Reflection, Message, SupervisorRequest, SupervisorInvitation, SupervisorEndorsement, SupervisionNotification

class UserProfileSerializer(serializers.ModelSerializer):
    # Ensure prior_hours always a dict
    prior_hours = serializers.JSONField(required=False)
    # Accept relative URLs or plain paths for signature
    signature_url = serializers.CharField(required=False, allow_blank=True)
    # Add email from the related User model
    email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'role', 'organization', 'first_name', 'middle_name', 'last_name',
            'ahpra_registration_number', 'email', 'provisional_start_date',
            'principal_supervisor', 'principal_supervisor_email', 
            'secondary_supervisor', 'secondary_supervisor_email', 'supervisor_emails',
            'signature_url', 'prior_hours', 'created_at', 'updated_at',
            # Location & Contact Information
            'city', 'state', 'timezone', 'mobile',
            # New role-specific fields
            'program_type', 'start_date', 'target_weeks', 'weekly_commitment',
            'aope', 'qualification_level'
        ]
        read_only_fields = ['id', 'email', 'ahpra_registration_number', 'provisional_start_date', 'start_date', 'created_at', 'updated_at']

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


class MessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.CharField(source='sender.email', read_only=True)
    recipient_email = serializers.CharField(source='recipient.email', read_only=True)
    
    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'recipient', 'sender_email', 'recipient_email',
            'message_type', 'subject', 'content', 'status', 'created_at', 'read_at'
        ]
        read_only_fields = ['sender', 'created_at', 'read_at']


class SupervisorRequestSerializer(serializers.ModelSerializer):
    trainee_email = serializers.CharField(source='trainee.email', read_only=True)
    supervisor_email = serializers.CharField(source='supervisor.email', read_only=True)
    message = MessageSerializer(read_only=True)
    
    class Meta:
        model = SupervisorRequest
        fields = [
            'id', 'trainee', 'supervisor', 'trainee_email', 'supervisor_email',
            'capacity', 'status', 'message', 'created_at', 'responded_at'
        ]
        read_only_fields = ['trainee', 'created_at', 'responded_at']


class SupervisorInvitationSerializer(serializers.ModelSerializer):
    trainee_email = serializers.CharField(source='trainee.email', read_only=True)
    message = MessageSerializer(read_only=True)
    
    class Meta:
        model = SupervisorInvitation
        fields = [
            'id', 'trainee', 'trainee_email', 'supervisor_email', 'supervisor_name',
            'capacity', 'status', 'invitation_token', 'message', 'created_at', 
            'expires_at', 'responded_at'
        ]
        read_only_fields = ['trainee', 'invitation_token', 'created_at', 'expires_at', 'responded_at']


class SupervisorEndorsementSerializer(serializers.ModelSerializer):
    supervisor_email = serializers.CharField(source='supervisor.email', read_only=True)
    supervisor_name = serializers.SerializerMethodField()
    
    def get_supervisor_name(self, obj):
        try:
            profile = obj.supervisor.profile
            return f"{profile.first_name} {profile.last_name}"
        except UserProfile.DoesNotExist:
            return f"{obj.supervisor.email}"
    
    class Meta:
        model = SupervisorEndorsement
        fields = [
            'id', 'supervisor', 'supervisor_email', 'supervisor_name',
            'endorsement', 'endorsement_date', 'endorsement_body', 
            'is_active', 'created_at'
        ]
        read_only_fields = ['supervisor', 'created_at']


class SupervisionSerializer(serializers.ModelSerializer):
    supervisor_name = serializers.SerializerMethodField()
    supervisee_name = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    can_be_accepted = serializers.SerializerMethodField()
    
    def get_supervisor_name(self, obj):
        try:
            profile = obj.supervisor.profile
            return f"{profile.first_name} {profile.last_name}"
        except UserProfile.DoesNotExist:
            return f"{obj.supervisor.email}"
    
    def get_supervisee_name(self, obj):
        if obj.supervisee:
            try:
                profile = obj.supervisee.profile
                return f"{profile.first_name} {profile.last_name}"
            except UserProfile.DoesNotExist:
                return f"{obj.supervisee.email}"
        return obj.supervisee_email
    
    def get_is_expired(self, obj):
        return obj.is_expired()
    
    def get_can_be_accepted(self, obj):
        return obj.can_be_accepted()
    
    class Meta:
        model = Supervision
        fields = [
            'id', 'supervisor', 'supervisor_name', 'supervisee', 'supervisee_email',
            'supervisee_name', 'role', 'status', 'verification_token', 'created_at',
            'expires_at', 'accepted_at', 'rejected_at', 'is_expired', 'can_be_accepted'
        ]
        read_only_fields = ['supervisor', 'verification_token', 'created_at', 'accepted_at', 'rejected_at']


class SupervisionNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupervisionNotification
        fields = [
            'id', 'supervision', 'notification_type', 'sent_at', 'email_sent', 'in_app_sent'
        ]
        read_only_fields = ['sent_at']


class SupervisionInviteSerializer(serializers.Serializer):
    """Serializer for inviting trainees to supervision"""
    emails = serializers.ListField(
        child=serializers.EmailField(),
        min_length=1,
        max_length=10,
        help_text="List of email addresses to invite (max 10)"
    )
    role = serializers.ChoiceField(
        choices=[('PRIMARY', 'Primary Supervisor'), ('SECONDARY', 'Secondary Supervisor')],
        help_text="Supervision role for the invitees"
    )


class SupervisionResponseSerializer(serializers.Serializer):
    """Serializer for responding to supervision invitations"""
    token = serializers.CharField(help_text="Verification token from the invitation")
    action = serializers.ChoiceField(
        choices=[('accept', 'Accept'), ('reject', 'Reject')],
        help_text="Action to take on the invitation"
    )