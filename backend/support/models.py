from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from api.models import UserProfile

class SupportUser(models.Model):
    """Support team user with enhanced permissions"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='support_profile')
    support_level = models.CharField(max_length=20, choices=[
        ('LEVEL_1', 'Level 1 - Basic Support'),
        ('LEVEL_2', 'Level 2 - Technical Support'),
        ('LEVEL_3', 'Level 3 - Senior Support'),
        ('ADMIN', 'Support Admin'),
    ], default='LEVEL_1')
    can_view_logs = models.BooleanField(default=True)
    can_view_user_data = models.BooleanField(default=True)
    can_manage_users = models.BooleanField(default=False)
    can_access_chat = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.email} ({self.support_level})"

class UserActivity(models.Model):
    """Track user activities for support dashboard"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=50, choices=[
        ('LOGIN', 'User Login'),
        ('LOGOUT', 'User Logout'),
        ('REGISTER', 'User Registration'),
        ('PROFILE_UPDATE', 'Profile Update'),
        ('PD_ENTRY', 'PD Entry Created/Updated'),
        ('SUPERVISION_ENTRY', 'Supervision Entry Created/Updated'),
        ('SECTION_A_ENTRY', 'Section A Entry Created/Updated'),
        ('PASSWORD_RESET', 'Password Reset'),
        ('EMAIL_VERIFICATION', 'Email Verification'),
        # Detailed Section A activities
        ('SECTION_A_CREATE', 'Section A Entry Created'),
        ('SECTION_A_UPDATE', 'Section A Entry Updated'),
        ('SECTION_A_DELETE', 'Section A Entry Deleted'),
        # Detailed Section B activities
        ('SECTION_B_CREATE', 'Section B Entry Created'),
        ('SECTION_B_UPDATE', 'Section B Entry Updated'),
        ('SECTION_B_DELETE', 'Section B Entry Deleted'),
        # Detailed Section C activities
        ('SECTION_C_CREATE', 'Section C Entry Created'),
        ('SECTION_C_UPDATE', 'Section C Entry Updated'),
        ('SECTION_C_DELETE', 'Section C Entry Deleted'),
        # Logbook activities
        ('LOGBOOK_CREATE', 'Logbook Created'),
        ('LOGBOOK_UPDATE', 'Logbook Updated'),
        ('LOGBOOK_DELETE', 'Logbook Deleted'),
        # Meeting activities
        ('MEETING_CREATE', 'Meeting Created'),
        ('MEETING_UPDATE', 'Meeting Updated'),
        ('MEETING_DELETE', 'Meeting Deleted'),
    ])
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'activity_type']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.activity_type} at {self.created_at}"

class SupportTicket(models.Model):
    """Support tickets/requests from users"""
    TYPE_CHOICES = [
        ('BUG', 'Bug'),
        ('FEATURE', 'Feature'),
        ('TASK', 'Task'),
        ('QUESTION', 'Question'),
    ]
    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]
    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('IN_PROGRESS', 'In Progress'),
        ('WAITING_USER', 'Waiting for User'),
        ('RESOLVED', 'Resolved'),
        ('CLOSED', 'Closed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='support_tickets')
    ticket_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='QUESTION')
    subject = models.CharField(max_length=200)
    description = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='OPEN')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                                   related_name='assigned_tickets')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    tags = models.JSONField(default=list, blank=True)
    has_unread_messages = models.BooleanField(default=False)
    last_message_at = models.DateTimeField(null=True, blank=True)
    
    # Auto-captured metadata
    current_url = models.URLField(max_length=500, blank=True, null=True)
    browser_info = models.CharField(max_length=200, blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    app_version = models.CharField(max_length=50, blank=True, null=True)
    
    # Planning fields for Feature/Task tickets
    stage = models.CharField(max_length=20, choices=[
        ('IDEA', 'Idea'),
        ('PLANNED', 'Planned'),
        ('IN_DEVELOPMENT', 'In Development'),
        ('TESTING', 'Testing'),
        ('DEPLOYED', 'Deployed'),
        ('ARCHIVED', 'Archived')
    ], default='IDEA', blank=True)
    
    # Effort estimation
    effort_estimate = models.CharField(max_length=20, choices=[
        ('XS', 'Extra Small (1-2 hours)'),
        ('S', 'Small (3-8 hours)'),
        ('M', 'Medium (1-3 days)'),
        ('L', 'Large (1-2 weeks)'),
        ('XL', 'Extra Large (2+ weeks)')
    ], blank=True, null=True)
    
    # Business value/priority
    business_value = models.CharField(max_length=20, choices=[
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical')
    ], default='MEDIUM', blank=True)
    
    # Implementation details
    implementation_notes = models.TextField(blank=True, help_text="Technical approach, considerations, dependencies")
    
    # User story format
    user_story = models.TextField(blank=True, help_text="As a [user], I want [goal], so that [benefit]")
    
    # Acceptance criteria
    acceptance_criteria = models.JSONField(default=list, blank=True, help_text="List of acceptance criteria")
    
    # Test plan (structured format)
    test_plan = models.JSONField(default=dict, blank=True, help_text="""
    {
      "preconditions": "",
      "test_cases": [
        {
          "description": "",
          "steps": [],
          "expected_result": "",
          "actual_result": "",
          "status": "NOT_TESTED|PASSED|FAILED"
        }
      ]
    }
    """)
    
    # Related tickets
    related_tickets = models.ManyToManyField('self', blank=True, symmetrical=False)
    
    # Target milestone/version
    target_milestone = models.CharField(max_length=50, blank=True, null=True)
    
    # Actual completion date
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Context data captured when ticket was created
    context_data = models.JSONField(default=dict, blank=True, help_text="Technical context, form data, console errors, etc.")

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'priority']),
            models.Index(fields=['assigned_to']),
            models.Index(fields=['stage', 'business_value']),
            models.Index(fields=['ticket_type', 'stage']),
            models.Index(fields=['target_milestone']),
        ]

    def __str__(self):
        return f"#{self.id} - {self.subject} ({self.status})"

class SupportMessage(models.Model):
    """Messages in support tickets"""
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    is_internal = models.BooleanField(default=False)  # Internal notes not visible to user
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message in #{self.ticket.id} from {self.sender.email}"

class SystemAlert(models.Model):
    """System alerts and notifications for support team"""
    ALERT_TYPES = [
        ('ERROR_RATE', 'High Error Rate'),
        ('LOGIN_FAILURES', 'Multiple Login Failures'),
        ('PERFORMANCE', 'Performance Issue'),
        ('SECURITY', 'Security Alert'),
        ('SYSTEM', 'System Issue'),
    ]

    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES)
    title = models.CharField(max_length=200)
    description = models.TextField()
    severity = models.CharField(max_length=10, choices=[
        ('INFO', 'Info'),
        ('WARNING', 'Warning'),
        ('ERROR', 'Error'),
        ('CRITICAL', 'Critical'),
    ], default='INFO')
    is_resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.alert_type} - {self.title}"

class WeeklyStats(models.Model):
    """Weekly statistics for support dashboard"""
    week_start = models.DateField()
    total_users = models.IntegerField(default=0)
    active_users = models.IntegerField(default=0)
    new_registrations = models.IntegerField(default=0)
    pd_entries_created = models.IntegerField(default=0)
    supervision_entries_created = models.IntegerField(default=0)
    section_a_entries_created = models.IntegerField(default=0)
    support_tickets_created = models.IntegerField(default=0)
    support_tickets_resolved = models.IntegerField(default=0)
    error_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['week_start']
        ordering = ['-week_start']

    def __str__(self):
        return f"Week of {self.week_start} - {self.active_users} active users"


class SupportUserStatus(models.Model):
    """Track support team online/offline status"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='support_status')
    is_online = models.BooleanField(default=False, help_text="Manual override for online status")
    last_activity = models.DateTimeField(auto_now=True, help_text="Last activity timestamp")
    auto_status = models.BooleanField(default=True, help_text="If True, use last_activity for status")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_activity']

    def __str__(self):
        return f"{self.user.email} - {'Online' if self.is_online else 'Offline'}"

    @property
    def is_actually_online(self):
        """Determine if user is actually online based on auto_status and last_activity"""
        if not self.auto_status:
            return self.is_online
        
        from django.utils import timezone
        from datetime import timedelta
        
        # Consider online if activity within last 10 minutes
        return self.last_activity > (timezone.now() - timedelta(minutes=10))


class ChatSession(models.Model):
    """Chat sessions between users and support"""
    SESSION_STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('CLOSED', 'Closed'),
        ('WAITING', 'Waiting for Support'),
    ]
    
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, null=True, blank=True, related_name='chat_sessions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_chat_sessions')
    support_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='support_chat_sessions')
    status = models.CharField(max_length=10, choices=SESSION_STATUS_CHOICES, default='WAITING')
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    last_message_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-last_message_at']

    def __str__(self):
        return f"Chat #{self.id} - {self.user.email} ({self.status})"


class ChatMessage(models.Model):
    """Individual chat messages"""
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    is_support = models.BooleanField(default=False, help_text="True if message is from support team")
    read_by_user = models.BooleanField(default=False)
    read_by_support = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message from {self.sender.email} in session #{self.session.id}"


