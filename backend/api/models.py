from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import secrets
import string

User = get_user_model()


class UserRole(models.TextChoices):
    PROVISIONAL = 'PROVISIONAL', 'Provisional Psychologist'
    REGISTRAR = 'REGISTRAR', 'Psychology Registrar'
    SUPERVISOR = 'SUPERVISOR', 'Board-Approved Supervisor'
    ORG_ADMIN = 'ORG_ADMIN', 'Organisation Admin'


class Organization(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=32, choices=UserRole.choices, default=UserRole.PROVISIONAL)
    organization = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    
    # Personal Information
    first_name = models.CharField(max_length=100, blank=True)
    middle_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    ahpra_registration_number = models.CharField(max_length=50, blank=True)
    
    # Location & Contact Information
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    timezone = models.CharField(max_length=50, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    
    # Training Information
    provisional_start_date = models.DateField(null=True, blank=True)
    report_start_day = models.CharField(max_length=20, default='Monday', choices=[
        ('Monday', 'Monday'),
        ('Tuesday', 'Tuesday'),
        ('Wednesday', 'Wednesday'),
        ('Thursday', 'Thursday'),
        ('Friday', 'Friday'),
        ('Saturday', 'Saturday'),
        ('Sunday', 'Sunday'),
    ])
    
    # Supervisor Information
    principal_supervisor = models.CharField(max_length=255, blank=True)
    principal_supervisor_email = models.EmailField(blank=True)
    secondary_supervisor = models.CharField(max_length=255, blank=True)
    secondary_supervisor_email = models.EmailField(blank=True)
    supervisor_emails = models.TextField(blank=True, help_text="Additional supervisor email addresses, one per line")
    
    # Signature (store data URL or relative path)
    signature_url = models.TextField(blank=True, help_text="Signature image (data URL or path)")
    initials_url = models.TextField(blank=True, help_text="Initials image (data URL or path)")
    
    # Prior Hours (for provisionals/registrars who started logging elsewhere)
    prior_hours = models.JSONField(default=dict, blank=True, help_text="Prior hours completed before using PsychPATH")
    prior_hours_declined = models.BooleanField(default=False, help_text="Whether the user declined to enter prior hours")
    prior_hours_submitted = models.BooleanField(default=False, help_text="Whether prior hours have been submitted and locked")
    
    # Provisional psychologist-specific fields
    provisional_registration_date = models.DateField(null=True, blank=True, help_text="Date when provisional registration was received from AHPRA")
    internship_start_date = models.DateField(null=True, blank=True, help_text="Official start date of 5+1 internship")
    is_full_time = models.BooleanField(default=True, help_text="Whether the internship is full-time or part-time")
    estimated_completion_weeks = models.IntegerField(null=True, blank=True, help_text="Estimated completion time in weeks (minimum 44)")
    weekly_commitment_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Weekly commitment in hours")
    
    # Registrar-specific fields
    AOPE_CHOICES = [
        ('CLINICAL', 'Clinical Psychology'),
        ('FORENSIC', 'Forensic Psychology'),
        ('ORGANISATIONAL', 'Organisational Psychology'),
        ('SPORT_EXERCISE', 'Sport and Exercise Psychology'),
        ('COMMUNITY', 'Community Psychology'),
        ('COUNSELLING', 'Counselling Psychology'),
        ('EDUCATIONAL_DEVELOPMENTAL', 'Educational and Developmental Psychology'),
        ('HEALTH', 'Health Psychology'),
        ('NEUROPSYCHOLOGY', 'Neuropsychology'),
    ]
    QUALIFICATION_LEVEL_CHOICES = [
        ('MASTERS', 'Masters'),
        ('COMBINED', 'Combined Masters/PhD'),
        ('DOCTORATE', 'Doctorate'),
        ('SECOND_AOPE', 'Second AoPE'),
    ]
    aope = models.CharField(max_length=50, choices=AOPE_CHOICES, blank=True, null=True)
    qualification_level = models.CharField(max_length=50, choices=QUALIFICATION_LEVEL_CHOICES, blank=True, null=True)
    
    # Shared program fields
    program_type = models.CharField(max_length=50, blank=True, null=True) # '5+1' or 'registrar'
    start_date = models.DateField(null=True, blank=True) # Program start date
    target_weeks = models.IntegerField(null=True, blank=True) # For planning, not strict enforcement
    weekly_commitment = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True) # For estimated pace
    
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
    
    # Track if profile setup is complete
    profile_completed = models.BooleanField(default=False, help_text="Whether the user has completed their profile setup")
    first_login_completed = models.BooleanField(default=False, help_text="Whether the user has completed their first login")
    
    # Supervisor-specific fields
    is_board_approved_supervisor = models.BooleanField(default=False, help_text="Whether the user is a board-approved supervisor")
    supervisor_registration_date = models.DateField(null=True, blank=True, help_text="Date when the user was approved as a supervisor by the Psychology Board")
    can_supervise_provisionals = models.BooleanField(default=False, help_text="Whether the supervisor can supervise provisional psychologists")
    can_supervise_registrars = models.BooleanField(default=False, help_text="Whether the supervisor can supervise psychology registrars")
    supervisor_welcome_seen = models.BooleanField(default=False, help_text="Whether the supervisor has seen the welcome overlay")

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.user.get_username()} ({self.role})"
    
    def can_supervise_registrar(self, registrar_profile):
        """
        Check if this supervisor can supervise a specific registrar based on endorsements.
        For registrars, the supervisor must have the same endorsement as the registrar's AOPE.
        """
        if self.role != UserRole.SUPERVISOR or not self.is_board_approved_supervisor:
            return False
        
        if not self.can_supervise_registrars:
            return False
        
        # Get supervisor's endorsements
        supervisor_endorsements = set(
            self.user.supervisor_endorsements.filter(is_active=True).values_list('endorsement', flat=True)
        )
        
        # Check if supervisor has the registrar's AOPE endorsement
        if registrar_profile.aope and registrar_profile.aope not in supervisor_endorsements:
            return False
        
        return True
    
    def get_required_endorsements_for_registrar(self, registrar_profile):
        """
        Get the endorsements required for this supervisor to supervise a specific registrar.
        """
        if not registrar_profile.aope:
            return []
        
        supervisor_endorsements = set(
            self.user.supervisor_endorsements.filter(is_active=True).values_list('endorsement', flat=True)
        )
        
        if registrar_profile.aope not in supervisor_endorsements:
            return [registrar_profile.aope]
        
        return []


class EPA(models.Model):
    code = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['code']

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.code} - {self.title}"


class Milestone(models.Model):
    epa = models.ForeignKey(EPA, on_delete=models.CASCADE, related_name='milestones')
    code = models.CharField(max_length=20)
    description = models.TextField(blank=True)

    class Meta:
        unique_together = ('epa', 'code')
        ordering = ['epa__code', 'code']

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.epa.code} - {self.code}"




class MilestoneProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='milestone_progress')
    milestone = models.ForeignKey(Milestone, on_delete=models.CASCADE, related_name='progress')
    is_completed = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'milestone')


class Reflection(models.Model):
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reflections')
    epa = models.ForeignKey(EPA, on_delete=models.SET_NULL, null=True, blank=True, related_name='reflections')
    milestone = models.ForeignKey(Milestone, on_delete=models.SET_NULL, null=True, blank=True, related_name='reflections')
    title = models.CharField(max_length=255)
    content = models.TextField()
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_reflections')
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.title} by {self.author.get_username()}"


class EmailVerificationCode(models.Model):
    """Model to store email verification codes for registration"""
    email = models.EmailField()
    code = models.CharField(max_length=6)
    psy_number = models.CharField(max_length=20, blank=True)
    registration_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    
    class Meta:
        indexes = [
            models.Index(fields=['email', 'code']),
            models.Index(fields=['expires_at']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self.generate_code()
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(minutes=30)
        super().save(*args, **kwargs)
    
    @staticmethod
    def generate_code():
        """Generate a 6-digit verification code"""
        return ''.join(secrets.choice(string.digits) for _ in range(6))
    
    def is_expired(self):
        """Check if the code has expired"""
        return timezone.now() > self.expires_at
    
    def is_valid(self):
        """Check if the code is valid (not used and not expired)"""
        return not self.is_used and not self.is_expired()


# Internal Messaging System
class Message(models.Model):
    """Internal messages between users"""
    MESSAGE_TYPES = [
        ('SUPERVISOR_REQUEST', 'Supervisor Request'),
        ('SUPERVISOR_RESPONSE', 'Supervisor Response'),
        ('SYSTEM_NOTIFICATION', 'System Notification'),
        ('GENERAL', 'General Message'),
    ]
    
    STATUS_CHOICES = [
        ('UNREAD', 'Unread'),
        ('READ', 'Read'),
        ('ARCHIVED', 'Archived'),
    ]
    
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    message_type = models.CharField(max_length=50, choices=MESSAGE_TYPES, default='GENERAL')
    subject = models.CharField(max_length=255)
    content = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='UNREAD')
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.sender.email} -> {self.recipient.email}: {self.subject}"


class SupervisorRequest(models.Model):
    """Tracks supervisor requests and responses"""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('DECLINED', 'Declined'),
        ('EXPIRED', 'Expired'),
    ]
    
    CAPACITY_CHOICES = [
        ('PRINCIPAL', 'Principal Supervisor'),
        ('SECONDARY', 'Secondary Supervisor'),
    ]
    
    trainee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='supervisor_requests_sent')
    supervisor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='supervisor_requests_received')
    capacity = models.CharField(max_length=20, choices=CAPACITY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    message = models.OneToOneField(Message, on_delete=models.CASCADE, related_name='supervisor_request')
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.trainee.email} requests {self.supervisor.email} as {self.capacity}"


class SupervisorInvitation(models.Model):
    """Tracks invitations sent to unregistered supervisors"""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('DECLINED', 'Declined'),
        ('EXPIRED', 'Expired'),
    ]
    
    CAPACITY_CHOICES = [
        ('PRINCIPAL', 'Principal Supervisor'),
        ('SECONDARY', 'Secondary Supervisor'),
    ]
    
    trainee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='supervisor_invitations_sent')
    supervisor_email = models.EmailField()
    supervisor_name = models.CharField(max_length=255, blank=True)
    capacity = models.CharField(max_length=20, choices=CAPACITY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    invitation_token = models.CharField(max_length=255, unique=True)
    message = models.OneToOneField(Message, on_delete=models.CASCADE, related_name='supervisor_invitation', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    responded_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Invitation to {self.supervisor_email} from {self.trainee.email} as {self.capacity}"
    
    def is_expired(self):
        """Check if the invitation has expired"""
        from django.utils import timezone
        return timezone.now() > self.expires_at
    
    def is_valid(self):
        """Check if the invitation is valid (not expired and pending)"""
        return self.status == 'PENDING' and not self.is_expired()


class SupervisorEndorsement(models.Model):
    """Tracks supervisor endorsements for specific areas of practice"""
    ENDORSEMENT_CHOICES = [
        ('CLINICAL', 'Clinical Psychology'),
        ('FORENSIC', 'Forensic Psychology'),
        ('ORGANISATIONAL', 'Organisational Psychology'),
        ('SPORT_EXERCISE', 'Sport and Exercise Psychology'),
        ('COMMUNITY', 'Community Psychology'),
        ('COUNSELLING', 'Counselling Psychology'),
        ('EDUCATIONAL_DEVELOPMENTAL', 'Educational and Developmental Psychology'),
        ('HEALTH', 'Health Psychology'),
        ('NEUROPSYCHOLOGY', 'Neuropsychology'),
    ]
    
    supervisor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='supervisor_endorsements')
    endorsement = models.CharField(max_length=50, choices=ENDORSEMENT_CHOICES)
    endorsement_date = models.DateField()
    endorsement_body = models.CharField(max_length=200, blank=True)  # e.g., "AHPRA", "APS"
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['supervisor', 'endorsement']
        ordering = ['supervisor', 'endorsement']
    
    def __str__(self):
        return f"{self.supervisor.profile.first_name} {self.supervisor.profile.last_name} - {self.endorsement}"


class Supervision(models.Model):
    """Tracks supervisor-trainee relationships"""
    SUPERVISION_ROLE_CHOICES = [
        ('PRIMARY', 'Primary Supervisor'),
        ('SECONDARY', 'Secondary Supervisor'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
        ('EXPIRED', 'Expired'),
    ]
    
    supervisor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='supervisions_given')
    supervisee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='supervisions_received', null=True, blank=True)
    supervisee_email = models.EmailField()  # Store email even if user doesn't exist yet
    role = models.CharField(max_length=20, choices=SUPERVISION_ROLE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    verification_token = models.CharField(max_length=64, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['supervisor', 'supervisee_email', 'role']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.supervisor.profile.first_name} {self.supervisor.profile.last_name} → {self.supervisee_email} ({self.role})"
    
    def save(self, *args, **kwargs):
        if not self.verification_token:
            self.verification_token = self.generate_verification_token()
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(days=7)
        super().save(*args, **kwargs)
    
    def generate_verification_token(self):
        """Generate a secure verification token"""
        return secrets.token_urlsafe(32)
    
    def is_expired(self):
        """Check if the invitation has expired"""
        return self.expires_at and timezone.now() > self.expires_at
    
    def can_be_accepted(self):
        """Check if the invitation can be accepted"""
        return self.status == 'PENDING' and not self.is_expired()


class SupervisionNotification(models.Model):
    """Tracks notifications sent for supervision requests"""
    supervision = models.ForeignKey(Supervision, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=50, choices=[
        ('INVITE_SENT', 'Invite Sent'),
        ('REMINDER_SENT', 'Reminder Sent'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
        ('EXPIRED', 'Expired'),
    ])
    sent_at = models.DateTimeField(auto_now_add=True)
    email_sent = models.BooleanField(default=False)
    in_app_sent = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-sent_at']
    
    def __str__(self):
        return f"{self.supervision} - {self.notification_type}"


class SupervisionAssignment(models.Model):
    """Supervision assignments made at logbook submission time"""
    ASSIGNMENT_ROLES = [
        ('PRIMARY', 'Primary Supervisor'),
        ('SECONDARY', 'Secondary Supervisor'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
        ('EXPIRED', 'Expired'),
    ]
    
    provisional = models.ForeignKey(User, on_delete=models.CASCADE, related_name='supervision_assignments')
    supervisor_name = models.CharField(max_length=255)
    supervisor_email = models.EmailField()
    role = models.CharField(max_length=20, choices=ASSIGNMENT_ROLES)
    supervisor_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_supervisions')
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    class Meta:
        unique_together = ['provisional', 'role']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.provisional.profile.first_name} {self.provisional.profile.last_name} → {self.supervisor_name} ({self.role})"


class Meeting(models.Model):
    """Meeting model for scheduling supervision meetings"""
    
    RECURRENCE_CHOICES = [
        ('NONE', 'No Recurrence'),
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
        ('BIWEEKLY', 'Bi-weekly'),
        ('MONTHLY', 'Monthly'),
    ]
    
    STATUS_CHOICES = [
        ('SCHEDULED', 'Scheduled'),
        ('CONFIRMED', 'Confirmed'),
        ('CANCELLED', 'Cancelled'),
        ('COMPLETED', 'Completed'),
    ]
    
    # Basic meeting info
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    meeting_url = models.URLField(blank=True, null=True)  # For virtual meetings
    
    # Scheduling
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=60)
    
    # Recurrence
    is_recurring = models.BooleanField(default=False)
    recurrence_type = models.CharField(max_length=20, choices=RECURRENCE_CHOICES, default='NONE')
    recurrence_end_date = models.DateTimeField(blank=True, null=True)
    recurrence_count = models.PositiveIntegerField(blank=True, null=True)  # Number of occurrences
    
    # Participants
    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organized_meetings')
    attendees = models.ManyToManyField(User, through='MeetingInvite', related_name='meetings')
    
    # Status and metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Supervision context
    supervision = models.ForeignKey(Supervision, on_delete=models.CASCADE, null=True, blank=True, related_name='meetings')
    
    class Meta:
        ordering = ['start_time']
        indexes = [
            models.Index(fields=['organizer', 'start_time']),
            models.Index(fields=['start_time', 'end_time']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.start_time.strftime('%Y-%m-%d %H:%M')}"
    
    def get_attendee_count(self):
        return self.attendees.count()
    
    def is_past(self):
        return timezone.now() > self.end_time
    
    def is_upcoming(self):
        return timezone.now() < self.start_time
    
    def is_current(self):
        now = timezone.now()
        return self.start_time <= now <= self.end_time


class MeetingInvite(models.Model):
    """Meeting invitation model for tracking attendee responses"""
    
    RESPONSE_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('DECLINED', 'Declined'),
        ('TENTATIVE', 'Tentative'),
    ]
    
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name='invites')
    attendee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='meeting_invites')
    response = models.CharField(max_length=20, choices=RESPONSE_CHOICES, default='PENDING')
    response_notes = models.TextField(blank=True, null=True)
    responded_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['meeting', 'attendee']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.attendee.email} - {self.meeting.title} ({self.response})"
    
    def accept(self, notes=None):
        self.response = 'ACCEPTED'
        self.response_notes = notes
        self.responded_at = timezone.now()
        self.save()
    
    def decline(self, notes=None):
        self.response = 'DECLINED'
        self.response_notes = notes
        self.responded_at = timezone.now()
        self.save()
    
    def set_tentative(self, notes=None):
        self.response = 'TENTATIVE'
        self.response_notes = notes
        self.responded_at = timezone.now()
        self.save()


class DisconnectionRequest(models.Model):
    """Tracks disconnection requests between supervisors and supervisees"""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('DECLINED', 'Declined'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    ROLE_CHOICES = [
        ('PRIMARY', 'Primary Supervisor'),
        ('SECONDARY', 'Secondary Supervisor'),
    ]
    
    # Request details
    supervisee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='disconnection_requests_sent')
    supervisor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='disconnection_requests_received')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    # Request content
    message = models.TextField(blank=True, help_text="Optional message from supervisee to supervisor")
    
    # Timestamps
    requested_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    
    # Response details
    response_notes = models.TextField(blank=True, help_text="Optional notes from supervisor")
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-requested_at']
        unique_together = ['supervisee', 'supervisor', 'role', 'status']
    
    def __str__(self):
        return f"{self.supervisee.profile.first_name} {self.supervisee.profile.last_name} → {self.supervisor.profile.first_name} {self.supervisor.profile.last_name} ({self.role}) - {self.status}"
    
    def approve(self, notes=None):
        """Approve the disconnection request"""
        self.status = 'APPROVED'
        self.response_notes = notes or ''
        self.responded_at = timezone.now()
        self.save()
        
        # Remove the supervision relationship
        try:
            supervision = Supervision.objects.get(
                supervisor=self.supervisor,
                supervisee=self.supervisee,
                role=self.role,
                status='ACCEPTED'
            )
            supervision.status = 'REJECTED'
            supervision.rejected_at = timezone.now()
            supervision.save()
            
            # Update supervisee profile to remove supervisor information
            supervisee_profile = self.supervisee.profile
            if self.role == 'PRIMARY':
                supervisee_profile.principal_supervisor = ''
                supervisee_profile.principal_supervisor_email = ''
                supervisee_profile.save(update_fields=['principal_supervisor', 'principal_supervisor_email'])
            else:
                supervisee_profile.secondary_supervisor = ''
                supervisee_profile.secondary_supervisor_email = ''
                supervisee_profile.save(update_fields=['secondary_supervisor', 'secondary_supervisor_email'])
                
        except Supervision.DoesNotExist:
            pass  # Supervision relationship already removed
    
    def decline(self, notes=None):
        """Decline the disconnection request"""
        self.status = 'DECLINED'
        self.response_notes = notes or ''
        self.responded_at = timezone.now()
        self.save()
    
    def cancel(self):
        """Cancel the disconnection request"""
        self.status = 'CANCELLED'
        self.responded_at = timezone.now()
        self.save()


# Create your models here.


class AuditLog(models.Model):
    """Comprehensive audit log for all system actions"""
    
    ACTION_TYPES = [
        ('CREATE', 'Create'),
        ('READ', 'Read'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('INVITE', 'Invite'),
        ('ACCEPT', 'Accept'),
        ('REJECT', 'Reject'),
        ('SUBMIT', 'Submit'),
        ('APPROVE', 'Approve'),
        ('REJECT', 'Reject'),
        ('UNLOCK', 'Unlock'),
        ('LOCK', 'Lock'),
        ('EXPORT', 'Export'),
        ('IMPORT', 'Import'),
        ('OTHER', 'Other'),
    ]
    
    RESOURCE_TYPES = [
        ('USER_PROFILE', 'User Profile'),
        ('WEEKLY_LOGBOOK', 'Weekly Logbook'),
        ('SECTION_A_ENTRY', 'Section A Entry'),
        ('SECTION_B_ENTRY', 'Section B Entry'),
        ('SECTION_C_ENTRY', 'Section C Entry'),
        ('SUPERVISION', 'Supervision'),
        ('SUPERVISION_REQUEST', 'Supervision Request'),
        ('SUPERVISION_INVITATION', 'Supervision Invitation'),
        ('MEETING', 'Meeting'),
        ('MESSAGE', 'Message'),
        ('NOTIFICATION', 'Notification'),
        ('UNLOCK_REQUEST', 'Unlock Request'),
        ('REVIEW_REQUEST', 'Review Request'),
        ('AUDIT_LOG', 'Audit Log'),
        ('SYSTEM', 'System'),
        ('OTHER', 'Other'),
    ]
    
    RESULT_TYPES = [
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
        ('PARTIAL', 'Partial'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_TYPES)
    resource_type = models.CharField(max_length=30, choices=RESOURCE_TYPES)
    resource_id = models.CharField(max_length=100, null=True, blank=True, help_text="ID of the affected resource")
    result = models.CharField(max_length=20, choices=RESULT_TYPES)
    details = models.JSONField(default=dict, help_text="Additional context and data")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    session_id = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['resource_type', 'created_at']),
            models.Index(fields=['result', 'created_at']),
            models.Index(fields=['ip_address', 'created_at']),
        ]
    
    def __str__(self):
        user_info = self.user.email if self.user else 'Anonymous'
        return f"{user_info} - {self.action} {self.resource_type} ({self.result})"
    
    @classmethod
    def log_action(cls, user, action, resource_type, result='SUCCESS', resource_id=None, 
                   details=None, ip_address=None, user_agent=None, session_id=None):
        """
        Create a new audit log entry
        """
        return cls.objects.create(
            user=user,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            result=result,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id
        )
