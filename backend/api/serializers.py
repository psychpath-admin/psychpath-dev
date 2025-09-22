from rest_framework import serializers
from .models import UserProfile, Organization, EPA, Milestone, Supervision, MilestoneProgress, Reflection, Message, SupervisorRequest, SupervisorInvitation, SupervisorEndorsement, SupervisionNotification, SupervisionAssignment

class UserProfileSerializer(serializers.ModelSerializer):
    # Ensure prior_hours always a dict
    prior_hours = serializers.JSONField(required=False)
    # Accept relative URLs or plain paths for signature and initials
    signature_url = serializers.CharField(required=False, allow_blank=True)
    initials_url = serializers.CharField(required=False, allow_blank=True)
    # Add email from the related User model
    email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'role', 'organization', 'first_name', 'middle_name', 'last_name',
            'ahpra_registration_number', 'email', 'provisional_start_date',
            'principal_supervisor', 'principal_supervisor_email', 
            'secondary_supervisor', 'secondary_supervisor_email', 'supervisor_emails',
            'signature_url', 'initials_url', 'prior_hours', 'created_at', 'updated_at',
            # Location & Contact Information
            'city', 'state', 'timezone', 'mobile',
            # New role-specific fields
            'program_type', 'start_date', 'target_weeks', 'weekly_commitment',
            'aope', 'qualification_level', 'profile_completed', 'first_login_completed',
            # Prior hours processing
            'prior_hours_declined', 'prior_hours_submitted',
            # Supervisor-specific fields
            'is_board_approved_supervisor', 'supervisor_registration_date', 'can_supervise_provisionals', 'can_supervise_registrars',
            'supervisor_welcome_seen',
            # Provisional psychologist-specific fields
            'provisional_registration_date', 'internship_start_date', 'is_full_time', 'estimated_completion_weeks', 'weekly_commitment_hours'
        ]
        read_only_fields = ['id', 'email', 'ahpra_registration_number', 'provisional_start_date', 'start_date', 'created_at', 'updated_at']

    def validate_mobile(self, value):
        """
        Validate mobile number format and uniqueness
        """
        if not value or value.strip() == '':
            return value  # Mobile is optional
        
        import re
        
        # Strip spaces and dashes
        clean_mobile = re.sub(r'[\s\-]', '', value)
        
        # Validate format: (+61|0)4xxxxxxxx
        mobile_regex = r'^(\+61|0)4\d{8}$'
        
        if not re.match(mobile_regex, clean_mobile):
            raise serializers.ValidationError(
                'Mobile number must be in format: 04xx xxx xxx or +61 4xx xxx xxx'
            )
        
        # Check uniqueness across all users
        from .models import UserProfile
        
        # Check if mobile number already exists for a different user
        existing_profile = UserProfile.objects.filter(mobile=clean_mobile).exclude(id=self.instance.id if self.instance else None).first()
        if existing_profile:
            raise serializers.ValidationError(
                'This mobile number is already registered to another user.'
            )
        
        return clean_mobile

    def validate(self, data):
        """
        Validate supervisor-specific requirements
        """
        # Get role from data or instance
        role = data.get('role')
        if not role and self.instance:
            role = self.instance.role
        
        # Only validate supervisor requirements if the user is actually a SUPERVISOR
        # Don't apply supervisor validation to provisional psychologists or registrars
        if role == 'SUPERVISOR':
            # Must be board-approved supervisor
            if not data.get('is_board_approved_supervisor'):
                raise serializers.ValidationError({
                    'is_board_approved_supervisor': 'You must be a Board-approved supervisor to access supervisor features.'
                })
            
            # If board-approved, supervisor registration date is required
            if data.get('is_board_approved_supervisor') and not data.get('supervisor_registration_date'):
                raise serializers.ValidationError({
                    'supervisor_registration_date': 'Supervisor registration date is required for board-approved supervisors.'
                })
            
            # Must select at least one supervision scope
            if not data.get('can_supervise_provisionals') and not data.get('can_supervise_registrars'):
                raise serializers.ValidationError({
                    'can_supervise_registrars': 'Please select at least one supervision scope (provisionals or registrars).'
                })
        
        # Validate provisional psychologist requirements
        if role == 'PROVISIONAL':
            from datetime import date, timedelta
            
            # Provisional registration date is required and must be less than 5 years ago
            provisional_reg_date = data.get('provisional_registration_date')
            if not provisional_reg_date:
                raise serializers.ValidationError({
                    'provisional_registration_date': 'Provisional registration date is required for provisional psychologists.'
                })
            
            # Check if date is less than 5 years ago
            five_years_ago = date.today() - timedelta(days=5*365)
            if provisional_reg_date < five_years_ago:
                raise serializers.ValidationError({
                    'provisional_registration_date': 'Provisional registration date must be less than 5 years ago.'
                })
            
            # Estimated completion weeks must be at least 44 for full-time
            if data.get('is_full_time', True) and data.get('estimated_completion_weeks'):
                if data['estimated_completion_weeks'] < 44:
                    raise serializers.ValidationError({
                        'estimated_completion_weeks': 'Full-time internship must be at least 44 weeks.'
                    })
        
        return data

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


class SupervisionAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for supervision assignments made at logbook submission"""
    provisional_name = serializers.SerializerMethodField()
    
    class Meta:
        model = SupervisionAssignment
        fields = [
            'id', 'provisional', 'provisional_name', 'supervisor_name', 
            'supervisor_email', 'role', 'supervisor_user', 'status', 'created_at'
        ]
        read_only_fields = ['id', 'provisional', 'provisional_name', 'supervisor_user', 'created_at']
    
    def get_provisional_name(self, obj):
        """Get the provisional psychologist's full name"""
        if obj.provisional and obj.provisional.profile:
            profile = obj.provisional.profile
            return f"{profile.first_name} {profile.last_name}".strip()
        return obj.provisional.username if obj.provisional else "Unknown"


class SupervisionAssignmentCreateSerializer(serializers.Serializer):
    """Serializer for creating supervision assignments"""
    primary_supervisor_name = serializers.CharField(max_length=255)
    primary_supervisor_email = serializers.EmailField()
    secondary_supervisor_name = serializers.CharField(max_length=255)
    secondary_supervisor_email = serializers.EmailField()
    
    def validate_primary_supervisor_email(self, value):
        """Ensure primary and secondary supervisor emails are different"""
        secondary_email = self.initial_data.get('secondary_supervisor_email')
        if secondary_email and value.lower() == secondary_email.lower():
            raise serializers.ValidationError("Primary and secondary supervisor emails must be different")
        return value
    
    def validate_secondary_supervisor_email(self, value):
        """Ensure secondary supervisor email is different from primary"""
        primary_email = self.initial_data.get('primary_supervisor_email')
        if primary_email and value.lower() == primary_email.lower():
            raise serializers.ValidationError("Primary and secondary supervisor emails must be different")
        return value