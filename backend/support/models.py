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
    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent'),
    ]
    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('IN_PROGRESS', 'In Progress'),
        ('WAITING_USER', 'Waiting for User'),
        ('RESOLVED', 'Resolved'),
        ('CLOSED', 'Closed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='support_tickets')
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

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'priority']),
            models.Index(fields=['assigned_to']),
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




