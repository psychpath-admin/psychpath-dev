from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Organization, EPA, Milestone, Supervision, MilestoneProgress, Reflection, Message, SupervisorRequest, SupervisorInvitation, SupervisorEndorsement, SupervisionNotification, SupervisionAssignment, Meeting, MeetingInvite, DisconnectionRequest, AuditLog, Competency, Rubric, RubricScore, RubricSummary

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
                f'The mobile number "{value}" is not valid. Please enter your Australian mobile number starting with 04 (e.g., 0412 345 678) or +61 4 (e.g., +61 412 345 678).'
            )
        
        # Check uniqueness across all users
        from .models import UserProfile
        
        # Check if mobile number already exists for a different user
        existing_profile = UserProfile.objects.filter(mobile=clean_mobile).exclude(id=self.instance.id if self.instance else None).first()
        if existing_profile:
            raise serializers.ValidationError(
                f'The mobile number "{value}" is already registered to another user. Please use a different mobile number or contact support if you believe this is an error.'
            )
        
        return clean_mobile

    def validate(self, data):
        """
        Validate role-specific requirements only when relevant fields are being updated
        """
        # Get role from data or instance
        role = data.get('role')
        if not role and self.instance:
            role = self.instance.role
        
        # Check if this is just a prior hours update (skip role validation)
        prior_hours_fields = {'prior_hours_declined', 'prior_hours_submitted', 'prior_hours'}
        if set(data.keys()).issubset(prior_hours_fields):
            return data
        
        # Prevent changes to critical dates once they're set
        if self.instance:
            # Provisional registration date cannot be changed once set
            if 'provisional_registration_date' in data and self.instance.provisional_registration_date:
                if data['provisional_registration_date'] != self.instance.provisional_registration_date:
                    current_date = self.instance.provisional_registration_date.strftime("%d %B %Y")
                    raise serializers.ValidationError({
                        'provisional_registration_date': f'Your Provisional Registration Date is currently set to {current_date} and cannot be changed. This date is locked once saved to ensure compliance with AHPRA requirements. If you need to correct this date, please contact support.'
                    })
            
            # Internship start date cannot be changed once set
            if 'internship_start_date' in data and self.instance.internship_start_date:
                if data['internship_start_date'] != self.instance.internship_start_date:
                    current_date = self.instance.internship_start_date.strftime("%d %B %Y")
                    raise serializers.ValidationError({
                        'internship_start_date': f'Your Internship Start Date is currently set to {current_date} and cannot be changed. This date is locked once saved to ensure compliance with AHPRA requirements. If you need to correct this date, please contact support.'
                    })
            
            # Registrar start date cannot be changed once set
            if 'start_date' in data and self.instance.start_date:
                if data['start_date'] != self.instance.start_date:
                    current_date = self.instance.start_date.strftime("%d %B %Y")
                    raise serializers.ValidationError({
                        'start_date': f'Your Program Start Date is currently set to {current_date} and cannot be changed. This date is locked once saved to ensure compliance with AHPRA requirements. If you need to correct this date, please contact support.'
                    })
        
        # Only validate supervisor requirements if the user is actually a SUPERVISOR
        # Don't apply supervisor validation to provisional psychologists or registrars
        if role == 'SUPERVISOR':
            # Allow acknowledging the welcome overlay without enforcing supervisor gates
            # If the only field being updated is supervisor_welcome_seen, skip further supervisor validation
            if set(data.keys()).issubset({'supervisor_welcome_seen'}):
                return data

            # Get current values from instance if not in data
            is_board_approved = data.get('is_board_approved_supervisor')
            if is_board_approved is None and self.instance:
                is_board_approved = self.instance.is_board_approved_supervisor
            
            supervisor_reg_date = data.get('supervisor_registration_date')
            if supervisor_reg_date is None and self.instance:
                supervisor_reg_date = self.instance.supervisor_registration_date
                
            can_supervise_provisionals = data.get('can_supervise_provisionals')
            if can_supervise_provisionals is None and self.instance:
                can_supervise_provisionals = self.instance.can_supervise_provisionals
                
            can_supervise_registrars = data.get('can_supervise_registrars')
            if can_supervise_registrars is None and self.instance:
                can_supervise_registrars = self.instance.can_supervise_registrars
            
            # Must be board-approved supervisor
            if not is_board_approved:
                raise serializers.ValidationError({
                    'is_board_approved_supervisor': 'You must be a Board-approved supervisor to access supervisor features.'
                })
            
            # If board-approved, supervisor registration date is required
            if is_board_approved and not supervisor_reg_date:
                raise serializers.ValidationError({
                    'supervisor_registration_date': 'Supervisor registration date is required for board-approved supervisors.'
                })
            
            # Must select at least one supervision scope
            if not can_supervise_provisionals and not can_supervise_registrars:
                raise serializers.ValidationError({
                    'can_supervise_registrars': 'Please select at least one supervision scope (provisionals or registrars).'
                })
        
        # Validate provisional psychologist requirements
        if role == 'PROVISIONAL':
            from datetime import date, timedelta
            
            # Provisional registration date is required and must be less than 5 years ago
            provisional_reg_date = data.get('provisional_registration_date')
            if provisional_reg_date is None and self.instance:
                provisional_reg_date = getattr(self.instance, 'provisional_registration_date', None)
            # Accept legacy/alternate field name from payload or instance
            if provisional_reg_date is None:
                alt = data.get('provisional_start_date')
                if alt is None and self.instance:
                    alt = getattr(self.instance, 'provisional_start_date', None)
                provisional_reg_date = alt or provisional_reg_date
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
            
            # Internship start date must be later than provisional registration date
            internship_start_date = data.get('internship_start_date')
            if internship_start_date is None and self.instance:
                internship_start_date = getattr(self.instance, 'internship_start_date', None)
            if provisional_reg_date is None and self.instance:
                provisional_reg_date = getattr(self.instance, 'provisional_registration_date', None)
            if internship_start_date and provisional_reg_date and internship_start_date < provisional_reg_date:
                raise serializers.ValidationError({
                    'internship_start_date': f'Your Internship Start Date ({internship_start_date.strftime("%d %B %Y")}) cannot be before your Provisional Registration Date ({provisional_reg_date.strftime("%d %B %Y")}). Please set your Internship Start Date to the same day or after {provisional_reg_date.strftime("%d %B %Y")}.'
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


class MeetingInviteSerializer(serializers.ModelSerializer):
    """Serializer for MeetingInvite model"""
    attendee_name = serializers.SerializerMethodField()
    attendee_email = serializers.SerializerMethodField()
    response_display = serializers.SerializerMethodField()
    
    class Meta:
        model = MeetingInvite
        fields = [
            'id', 'attendee', 'attendee_name', 'attendee_email', 'response', 
            'response_display', 'response_notes', 'responded_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'responded_at']
    
    def get_attendee_name(self, obj):
        try:
            profile = obj.attendee.profile
            return f"{profile.first_name} {profile.last_name}".strip() or obj.attendee.email
        except:
            return obj.attendee.email
    
    def get_attendee_email(self, obj):
        return obj.attendee.email
    
    def get_response_display(self, obj):
        response_map = {
            'PENDING': 'Pending',
            'ACCEPTED': 'Accepted',
            'DECLINED': 'Declined',
            'TENTATIVE': 'Tentative'
        }
        return response_map.get(obj.response, obj.response)


class MeetingSerializer(serializers.ModelSerializer):
    """Serializer for Meeting model"""
    organizer_name = serializers.SerializerMethodField()
    organizer_email = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    recurrence_display = serializers.SerializerMethodField()
    attendee_count = serializers.SerializerMethodField()
    invites = MeetingInviteSerializer(many=True, read_only=True)
    is_past = serializers.SerializerMethodField()
    is_upcoming = serializers.SerializerMethodField()
    is_current = serializers.SerializerMethodField()
    
    class Meta:
        model = Meeting
        fields = [
            'id', 'title', 'description', 'location', 'meeting_url',
            'start_time', 'end_time', 'duration_minutes',
            'is_recurring', 'recurrence_type', 'recurrence_display',
            'recurrence_end_date', 'recurrence_count',
            'status', 'status_display', 'created_at', 'updated_at',
            'organizer', 'organizer_name', 'organizer_email',
            'supervision', 'attendee_count', 'invites',
            'is_past', 'is_upcoming', 'is_current'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'organizer']
    
    def get_organizer_name(self, obj):
        try:
            profile = obj.organizer.profile
            return f"{profile.first_name} {profile.last_name}".strip() or obj.organizer.email
        except:
            return obj.organizer.email
    
    def get_organizer_email(self, obj):
        return obj.organizer.email
    
    def get_status_display(self, obj):
        status_map = {
            'SCHEDULED': 'Scheduled',
            'CONFIRMED': 'Confirmed',
            'CANCELLED': 'Cancelled',
            'COMPLETED': 'Completed'
        }
        return status_map.get(obj.status, obj.status)
    
    def get_recurrence_display(self, obj):
        recurrence_map = {
            'NONE': 'No Recurrence',
            'DAILY': 'Daily',
            'WEEKLY': 'Weekly',
            'BIWEEKLY': 'Bi-weekly',
            'MONTHLY': 'Monthly'
        }
        return recurrence_map.get(obj.recurrence_type, obj.recurrence_type)
    
    def get_attendee_count(self, obj):
        return obj.get_attendee_count()
    
    def get_is_past(self, obj):
        return obj.is_past()
    
    def get_is_upcoming(self, obj):
        return obj.is_upcoming()
    
    def get_is_current(self, obj):
        return obj.is_current()


class MeetingCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating meetings"""
    attendee_emails = serializers.ListField(
        child=serializers.EmailField(),
        write_only=True,
        required=False,
        help_text="List of email addresses to invite"
    )
    # Allow organizer to be set (for org-admin on-behalf scheduling); validated in views
    
    class Meta:
        model = Meeting
        fields = [
            'title', 'description', 'location', 'meeting_url',
            'start_time', 'end_time', 'duration_minutes',
            'is_recurring', 'recurrence_type',
            'recurrence_end_date', 'recurrence_count',
            'supervision', 'attendee_emails', 'organizer'
        ]
    
    def validate(self, data):
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        
        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError("End time must be after start time")
        
        # Validate recurrence settings
        if data.get('is_recurring'):
            recurrence_type = data.get('recurrence_type')
            if recurrence_type == 'NONE':
                raise serializers.ValidationError("Recurrence type must be specified for recurring meetings")
            
            recurrence_end_date = data.get('recurrence_end_date')
            recurrence_count = data.get('recurrence_count')
            
            if not recurrence_end_date and not recurrence_count:
                raise serializers.ValidationError("Either recurrence end date or count must be specified for recurring meetings")
        
        return data
    
    def create(self, validated_data):
        attendee_emails = validated_data.pop('attendee_emails', [])
        meeting = super().create(validated_data)
        
        # Create invites for attendees
        for email in attendee_emails:
            try:
                user = User.objects.get(email=email)
                MeetingInvite.objects.create(
                    meeting=meeting,
                    attendee=user,
                    response='PENDING'
                )
            except User.DoesNotExist:
                # Skip users that don't exist in the system
                continue
        
        return meeting


class MeetingInviteResponseSerializer(serializers.ModelSerializer):
    """Serializer for responding to meeting invites"""
    
    class Meta:
        model = MeetingInvite
        fields = ['response', 'response_notes']
    
    def validate_response(self, value):
        valid_responses = ['ACCEPTED', 'DECLINED', 'TENTATIVE']
        if value not in valid_responses:
            raise serializers.ValidationError(f"Response must be one of: {', '.join(valid_responses)}")
        return value


class DisconnectionRequestSerializer(serializers.ModelSerializer):
    """Serializer for disconnection requests"""
    supervisee_name = serializers.SerializerMethodField()
    supervisor_name = serializers.SerializerMethodField()
    supervisee_email = serializers.CharField(source='supervisee.email', read_only=True)
    supervisor_email = serializers.CharField(source='supervisor.email', read_only=True)
    
    class Meta:
        model = DisconnectionRequest
        fields = [
            'id', 'supervisee', 'supervisor', 'role', 'status', 'message',
            'requested_at', 'responded_at', 'response_notes', 'created_at', 'updated_at',
            'supervisee_name', 'supervisor_name', 'supervisee_email', 'supervisor_email'
        ]
        read_only_fields = ['supervisee', 'supervisor', 'requested_at', 'responded_at', 'created_at', 'updated_at']
    
    def get_supervisee_name(self, obj):
        if hasattr(obj.supervisee, 'profile'):
            return f"{obj.supervisee.profile.first_name} {obj.supervisee.profile.last_name}".strip()
        return obj.supervisee.email
    
    def get_supervisor_name(self, obj):
        if hasattr(obj.supervisor, 'profile'):
            return f"{obj.supervisor.profile.first_name} {obj.supervisor.profile.last_name}".strip()
        return obj.supervisor.email


class DisconnectionRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating disconnection requests"""
    
    class Meta:
        model = DisconnectionRequest
        fields = ['supervisor', 'role', 'message']
    
    def validate(self, data):
        # Check if user has a supervision relationship with the supervisor
        supervisee = self.context['request'].user
        supervisor = data['supervisor']
        role = data['role']
        
        try:
            supervision = Supervision.objects.get(
                supervisor=supervisor,
                supervisee=supervisee,
                role=role,
                status='ACCEPTED'
            )
        except Supervision.DoesNotExist:
            raise serializers.ValidationError(f"You do not have an active {role.lower()} supervision relationship with this supervisor.")
        
        # Check if there's already a pending request
        existing_request = DisconnectionRequest.objects.filter(
            supervisee=supervisee,
            supervisor=supervisor,
            role=role,
            status='PENDING'
        ).exists()
        
        if existing_request:
            raise serializers.ValidationError("You already have a pending disconnection request with this supervisor.")
        
        return data


class DisconnectionRequestResponseSerializer(serializers.ModelSerializer):
    """Serializer for responding to disconnection requests"""
    
    class Meta:
        model = DisconnectionRequest
        fields = ['response_notes']
    
    def validate(self, data):
        # The action (approve/decline) will be handled in the view
        return data


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for AuditLog model"""
    
    user_email = serializers.SerializerMethodField()
    action_display = serializers.SerializerMethodField()
    resource_type_display = serializers.SerializerMethodField()
    result_display = serializers.SerializerMethodField()
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_email', 'action', 'action_display',
            'resource_type', 'resource_type_display', 'resource_id',
            'result', 'result_display', 'details', 'ip_address',
            'user_agent', 'session_id', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_user_email(self, obj):
        return obj.user.email if obj.user else 'Anonymous'
    
    def get_action_display(self, obj):
        return obj.get_action_display()
    
    def get_resource_type_display(self, obj):
        return obj.get_resource_type_display()
    
    def get_result_display(self, obj):
        return obj.get_result_display()


# Rubric System Serializers

class CompetencySerializer(serializers.ModelSerializer):
    epa_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Competency
        fields = ['id', 'code', 'title', 'description', 'descriptors', 'order', 'is_active', 'epa_count']
    
    def get_epa_count(self, obj):
        return obj.epas.count()


class EPASerializer(serializers.ModelSerializer):
    competency = CompetencySerializer(read_only=True)
    milestones = serializers.SerializerMethodField()
    
    class Meta:
        model = EPA
        fields = ['id', 'code', 'title', 'description', 'competency', 'descriptors', 'order', 'milestones']
    
    def get_milestones(self, obj):
        milestones = obj.milestones.all()
        return [{'id': m.id, 'level': m.level, 'label': m.label, 'description': m.description} for m in milestones]


class MilestoneSerializer(serializers.ModelSerializer):
    epa = EPASerializer(read_only=True)
    
    class Meta:
        model = Milestone
        fields = ['id', 'epa', 'code', 'level', 'label', 'description']


class RubricSerializer(serializers.ModelSerializer):
    epa = EPASerializer(read_only=True)
    milestone = MilestoneSerializer(read_only=True)
    competency = CompetencySerializer(read_only=True)
    total_weight = serializers.SerializerMethodField()
    
    class Meta:
        model = Rubric
        fields = ['id', 'epa', 'milestone', 'competency', 'criteria', 
                  'weightings', 'guidance_notes', 'is_active', 'total_weight']
    
    def get_total_weight(self, obj):
        return obj.calculate_total_weight()


class RubricScoreSerializer(serializers.ModelSerializer):
    supervisee_name = serializers.SerializerMethodField()
    supervisor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = RubricScore
        fields = ['id', 'rubric', 'criterion_id', 'criterion_label', 
                  'selected_level', 'notes', 'supervisee_name', 'supervisor_name',
                  'created_at', 'updated_at']
    
    def get_supervisee_name(self, obj):
        return f"{obj.supervisee.first_name} {obj.supervisee.last_name}"
    
    def get_supervisor_name(self, obj):
        return f"{obj.supervisor.first_name} {obj.supervisor.last_name}"


class RubricScoreCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RubricScore
        fields = ['rubric', 'supervisee', 'criterion_id', 'criterion_label', 
                  'selected_level', 'notes']
    
    def create(self, validated_data):
        # Add supervisor from request
        validated_data['supervisor'] = self.context['request'].user
        return super().create(validated_data)


class RubricSummarySerializer(serializers.ModelSerializer):
    epa = EPASerializer(read_only=True)
    rubric = RubricSerializer(read_only=True)
    supervisee_name = serializers.SerializerMethodField()
    supervisor_name = serializers.SerializerMethodField()
    scores = serializers.SerializerMethodField()
    
    class Meta:
        model = RubricSummary
        fields = ['id', 'epa', 'rubric', 'supervisee_name', 'supervisor_name',
                  'total_weighted_score', 'milestone_equivalent', 'summary_comment',
                  'status', 'locked', 'evidence_links', 'scores', 'created_at', 'approved_at']
    
    def get_supervisee_name(self, obj):
        return f"{obj.supervisee.first_name} {obj.supervisee.last_name}"
    
    def get_supervisor_name(self, obj):
        return f"{obj.supervisor.first_name} {obj.supervisor.last_name}"
    
    def get_scores(self, obj):
        scores = RubricScore.objects.filter(
            rubric=obj.rubric,
            supervisee=obj.supervisee,
            supervisor=obj.supervisor
        )
        return RubricScoreSerializer(scores, many=True).data


class RubricSummaryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RubricSummary
        fields = ['epa', 'rubric', 'supervisee', 'summary_comment', 'evidence_links']
    
    def create(self, validated_data):
        supervisor = self.context['request'].user
        validated_data['supervisor'] = supervisor
        
        # Calculate weighted score
        rubric = validated_data['rubric']
        supervisee = validated_data['supervisee']
        
        summary = RubricSummary(**validated_data)
        summary.total_weighted_score = summary.calculate_weighted_score()
        summary.milestone_equivalent = summary.determine_milestone_level()
        summary.save()
        
        # Send WebSocket notification
        from logbook_app.notification_helpers import send_notification
        send_notification(
            recipient=supervisee,
            actor=supervisor,
            notification_type='rubric_completed',
            title='EPA Rubric Evaluation Completed',
            body=f"{supervisor.get_full_name()} has completed a rubric evaluation for {summary.epa.code}",
            related_object=summary
        )
        
        return summary