from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import json


class WeeklyLogbook(models.Model):
    """Weekly logbook for trainees"""
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    trainee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='logbooks')
    week_start_date = models.DateField()
    week_end_date = models.DateField()
    week_number = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    section_a_entry_ids = models.JSONField(default=list, help_text="List of Section A entry IDs")
    section_b_entry_ids = models.JSONField(default=list, help_text="List of Section B entry IDs")
    section_c_entry_ids = models.JSONField(default=list, help_text="List of Section C entry IDs")
    supervisor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='supervised_logbooks')
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_logbooks')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    supervisor_comments = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-week_start_date']
        unique_together = ['trainee', 'week_start_date']
    
    def __str__(self):
        return f"{self.trainee.email} - Week {self.week_number} ({self.week_start_date})"
    
    def calculate_section_totals(self):
        """Calculate weekly and cumulative totals for all sections"""
        # Import here to avoid circular imports
        from section_a.models import SectionAEntry
        from section_b.models import ProfessionalDevelopmentEntry
        from section_c.models import SupervisionEntry
        
        # Calculate Section A totals
        section_a_entries = SectionAEntry.objects.filter(id__in=self.section_a_entry_ids)
        section_a_total_minutes = sum(entry.duration_minutes for entry in section_a_entries)
        
        # Calculate cumulative Section A (all previous weeks)
        previous_section_a = SectionAEntry.objects.filter(
            logbook__trainee=self.trainee,
            logbook__week_start_date__lt=self.week_start_date
        )
        cumulative_section_a = sum(entry.duration_minutes for entry in previous_section_a)
        
        # Calculate Section B totals
        section_b_entries = ProfessionalDevelopmentEntry.objects.filter(id__in=self.section_b_entry_ids)
        section_b_total_minutes = sum(entry.duration_minutes for entry in section_b_entries)
        
        # Calculate cumulative Section B
        previous_section_b = ProfessionalDevelopmentEntry.objects.filter(
            logbook__trainee=self.trainee,
            logbook__week_start_date__lt=self.week_start_date
        )
        cumulative_section_b = sum(entry.duration_minutes for entry in previous_section_b)
        
        # Calculate Section C totals
        section_c_entries = SupervisionEntry.objects.filter(id__in=self.section_c_entry_ids)
        section_c_total_minutes = sum(entry.duration_minutes for entry in section_c_entries)
        
        # Calculate cumulative Section C
        previous_section_c = SupervisionEntry.objects.filter(
            logbook__trainee=self.trainee,
            logbook__week_start_date__lt=self.week_start_date
        )
        cumulative_section_c = sum(entry.duration_minutes for entry in previous_section_c)
        
        return {
            'section_a': {
                'weekly_hours': round(section_a_total_minutes / 60, 1),
                'cumulative_hours': round((cumulative_section_a + section_a_total_minutes) / 60, 1)
            },
            'section_b': {
                'weekly_hours': round(section_b_total_minutes / 60, 1),
                'cumulative_hours': round((cumulative_section_b + section_b_total_minutes) / 60, 1)
            },
            'section_c': {
                'weekly_hours': round(section_c_total_minutes / 60, 1),
                'cumulative_hours': round((cumulative_section_c + section_c_total_minutes) / 60, 1)
            },
            'total': {
                'weekly_hours': round((section_a_total_minutes + section_b_total_minutes + section_c_total_minutes) / 60, 1),
                'cumulative_hours': round((cumulative_section_a + cumulative_section_b + cumulative_section_c) / 60, 1)
            }
        }
    
    @property
    def week_display(self):
        """Display week in readable format"""
        return f"{self.week_start_date.strftime('%d %b %Y')} - {self.week_end_date.strftime('%d %b %Y')}"
    
    def is_editable(self):
        """Check if this logbook is currently editable (unlocked)"""
        # Check if there's an active unlock request
        active_unlock = self.unlock_requests.filter(
            status='approved',
            manually_relocked=False,
            unlock_expires_at__gt=timezone.now()
        ).first()
        
        return active_unlock is not None
    
    def get_active_unlock(self):
        """Get the currently active unlock request if any"""
        return self.unlock_requests.filter(
            status='approved',
            manually_relocked=False,
            unlock_expires_at__gt=timezone.now()
        ).first()


class LogbookEntry(models.Model):
    """Base class for logbook entries"""
    
    logbook = models.ForeignKey(WeeklyLogbook, on_delete=models.CASCADE, related_name='%(class)s_entries')
    date = models.DateField()
    client_age = models.PositiveIntegerField(validators=[MinValueValidator(0), MaxValueValidator(120)])
    client_issue = models.CharField(max_length=200)
    activity_description = models.TextField()
    duration_hours = models.DecimalField(max_digits=4, decimal_places=2, validators=[MinValueValidator(0.1)])
    duration_minutes = models.PositiveIntegerField(help_text="Duration in minutes")
    reflection = models.TextField()
    epa_competencies = models.JSONField(default=list, help_text="List of EPA competency codes")
    locked = models.BooleanField(default=False, help_text="True if entry is locked (e.g., in submitted logbook)")
    supervisor_comment = models.TextField(blank=True, help_text="Comment from supervisor")
    trainee_response = models.TextField(blank=True, help_text="Response from trainee to supervisor comment")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True


class LogbookAuditLog(models.Model):
    """Comprehensive audit log for logbook lifecycle tracking"""
    
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('unlocked', 'Unlocked'),
        ('locked', 'Locked'),
        ('resubmitted', 'Resubmitted'),
        ('message_sent', 'Message Sent'),
        ('entry_edited', 'Entry Edited'),
        ('comment_added', 'Comment Added'),
        ('comment_replied', 'Comment Replied'),
        ('comment_edited', 'Comment Edited'),
        ('comment_deleted', 'Comment Deleted'),
        ('comment_viewed', 'Comment Viewed'),
        ('response_added', 'Response Added'),
        ('unlock_requested', 'Unlock Requested'),
        ('unlock_approved', 'Unlock Approved'),
        ('unlock_denied', 'Unlock Denied'),
        ('unlock_activated', 'Unlock Activated'),
        ('unlock_expired', 'Unlock Expired'),
        ('unlock_force_relocked', 'Unlock Force Re-locked'),
        ('notification_sent', 'Notification Sent'),
    ]
    
    USER_ROLE_CHOICES = [
        ('supervisor', 'Supervisor'),
        ('provisional', 'Provisional Psychologist'),
        ('registrar', 'Registrar Psychologist'),
        ('org_admin', 'Organization Admin'),
        ('system', 'System'),
    ]
    
    logbook = models.ForeignKey(WeeklyLogbook, on_delete=models.CASCADE, related_name='audit_logs')
    action = models.CharField(max_length=25, choices=ACTION_CHOICES)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    user_role = models.CharField(max_length=20, choices=USER_ROLE_CHOICES, default='provisional')
    timestamp = models.DateTimeField(auto_now_add=True)
    comments = models.TextField(blank=True)
    previous_status = models.CharField(max_length=20, blank=True)
    new_status = models.CharField(max_length=20, blank=True)
    target_id = models.CharField(max_length=100, blank=True, help_text="ID of entry or message if applicable")
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional structured information")
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.logbook} - {self.action} by {self.user_role} at {self.timestamp}"


class LogbookMessage(models.Model):
    """Messages in rejection thread between supervisor and trainee"""
    
    # Use the same role choices as CommentMessage
    ROLE_CHOICES = [
        ('supervisor', 'Supervisor'),
        ('provisional', 'Provisional Psychologist'),
        ('registrar', 'Registrar Psychologist'),
        ('org_admin', 'Organization Admin'),
    ]
    
    logbook = models.ForeignKey(WeeklyLogbook, on_delete=models.CASCADE, related_name='messages')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    author_role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.logbook} - {self.author_role} message at {self.created_at}"


class CommentThread(models.Model):
    """Thread for comments on logbooks or entries"""
    
    THREAD_TYPE_CHOICES = [
        ('general', 'General Logbook Comment'),
        ('entry', 'Entry-Specific Comment'),
    ]
    
    logbook = models.ForeignKey(WeeklyLogbook, on_delete=models.CASCADE, related_name='comment_threads')
    entry_id = models.CharField(max_length=100, blank=True, null=True, help_text="Entry ID if this is an entry-specific thread")
    entry_section = models.CharField(max_length=20, blank=True, null=True, help_text="Section (A, B, C) if entry-specific")
    thread_type = models.CharField(max_length=10, choices=THREAD_TYPE_CHOICES, default='general')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        if self.entry_id:
            return f"{self.logbook} - Entry {self.entry_id} thread"
        return f"{self.logbook} - General thread"


class CommentMessage(models.Model):
    """Individual messages within a comment thread"""
    
    # Updated role choices to match PsychPathway user types
    ROLE_CHOICES = [
        ('supervisor', 'Supervisor'),
        ('provisional', 'Provisional Psychologist'),
        ('registrar', 'Registrar Psychologist'),
        ('org_admin', 'Organization Admin'),
    ]
    
    thread = models.ForeignKey(CommentThread, on_delete=models.CASCADE, related_name='messages')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    author_role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    message = models.TextField()
    reply_to = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Visibility and ownership tracking
    locked = models.BooleanField(default=False, help_text="True once viewed by the other party")
    seen_by = models.JSONField(default=list, help_text="User IDs who have viewed this comment")
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.thread} - {self.author_role} message at {self.created_at}"
    
    def mark_as_seen(self, user):
        """Mark this comment as seen by a user"""
        if user.id not in self.seen_by:
            self.seen_by.append(user.id)
            # Lock the comment if viewed by someone other than the author
            if user.id != self.author.id:
                self.locked = True
            self.save()
    
    def can_edit(self, user):
        """Check if user can edit this comment"""
        if self.locked:
            return False
        if self.author.id == user.id:
            return True
        return False
    
    def can_delete(self, user):
        """Check if user can delete this comment"""
        if self.locked:
            return False
        if self.author.id == user.id:
            return True
        return False


class UnlockRequest(models.Model):
    """Requests to unlock approved logbooks for editing"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('denied', 'Denied'),
    ]
    
    REVIEWER_ROLE_CHOICES = [
        ('org_admin', 'Organization Admin'),
        ('supervisor', 'Supervisor'),
    ]
    
    logbook = models.ForeignKey(WeeklyLogbook, on_delete=models.CASCADE, related_name='unlock_requests')
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='unlock_requests_made')
    requester_role = models.CharField(max_length=20, choices=CommentMessage.ROLE_CHOICES)
    reason = models.TextField(help_text="Reason for requesting unlock")
    target_section = models.CharField(max_length=20, blank=True, help_text="Specific section or entry ID if applicable")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='unlock_requests_reviewed')
    reviewer_role = models.CharField(max_length=20, choices=REVIEWER_ROLE_CHOICES, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    admin_comment = models.TextField(blank=True, help_text="Comment from reviewer")
    unlock_expires_at = models.DateTimeField(null=True, blank=True, help_text="When the unlock expires")
    duration_minutes = models.IntegerField(null=True, blank=True, help_text="Duration of unlock in minutes")
    manually_relocked = models.BooleanField(default=False, help_text="Whether manually re-locked before expiry")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['logbook', 'status']  # Only one pending request per logbook
    
    def __str__(self):
        return f"Unlock request for {self.logbook} by {self.requester} - {self.status}"
    
    def get_reviewer(self):
        """Determine who should review this unlock request based on organizational relationship"""
        trainee_profile = self.logbook.trainee.profile
        
        # If trainee is part of an organization, route to org_admin
        if trainee_profile.organization:
            return 'org_admin'
        # Otherwise, route to supervisor
        else:
            return 'supervisor'
    
    def can_be_requested_by(self, user):
        """Check if user can request unlock for this logbook"""
        # Only the logbook owner can request unlock
        if self.logbook.trainee != user:
            return False
        
        # Only approved logbooks can be unlocked
        if self.logbook.status != 'approved':
            return False
        
        # Only one pending request per logbook
        if self.logbook.unlock_requests.filter(status='pending').exists():
            return False
        
        return True
    
    def is_currently_unlocked(self):
        """Check if this unlock request is currently active and not expired"""
        if self.status != 'approved':
            return False
        
        if self.manually_relocked:
            return False
        
        if not self.unlock_expires_at:
            return False
        
        return timezone.now() < self.unlock_expires_at
    
    def get_remaining_time_minutes(self):
        """Get remaining unlock time in minutes"""
        if not self.is_currently_unlocked():
            return 0
        
        remaining = self.unlock_expires_at - timezone.now()
        return max(0, int(remaining.total_seconds() / 60))
    
    def force_relock(self, user):
        """Manually re-lock this unlock request"""
        self.manually_relocked = True
        self.save()
        
        # Log the force re-lock action
        LogbookAuditLog.objects.create(
            logbook=self.logbook,
            action='unlock_force_relocked',
            user=user,
            user_role=self.reviewer_role,
            comments=f"Manually re-locked unlock request",
            target_id=str(self.id),
            metadata={
                'duration_minutes': self.duration_minutes,
                'time_remaining': self.get_remaining_time_minutes()
            }
        )


class Notification(models.Model):
    """In-app notifications for platform events"""
    
    TYPE_CHOICES = [
        ('logbook_submitted', 'Logbook Submitted'),
        ('logbook_status_updated', 'Logbook Status Updated'),
        ('comment_added', 'Comment Added'),
        ('unlock_requested', 'Unlock Requested'),
        ('unlock_approved', 'Unlock Approved'),
        ('unlock_denied', 'Unlock Denied'),
        ('unlock_expiry_warning', 'Unlock Expiry Warning'),
        ('supervision_invite_pending', 'Supervision Invite Pending'),
        ('system_message', 'System Message'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    payload = models.JSONField(default=dict, help_text="Additional data for the notification")
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'read', '-created_at']),
            models.Index(fields=['notification_type']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.notification_type} at {self.created_at}"
    
    def mark_as_read(self):
        """Mark this notification as read"""
        self.read = True
        self.save()
    
    @classmethod
    def create_notification(cls, user, notification_type, payload=None, actor=None):
        """Create a notification and log it in audit trail"""
        if payload is None:
            payload = {}
        
        notification = cls.objects.create(
            user=user,
            notification_type=notification_type,
            payload=payload
        )
        
        # Log notification creation in audit trail if we have context
        if actor and hasattr(actor, 'profile'):
            # Try to find associated logbook from payload
            logbook_id = payload.get('logbookId')
            if logbook_id:
                try:
                    from .models import WeeklyLogbook
                    logbook = WeeklyLogbook.objects.get(id=logbook_id)
                    
                    # Determine actor role
                    role_mapping = {
                        'SUPERVISOR': 'supervisor',
                        'PROVISIONAL': 'provisional',
                        'REGISTRAR': 'registrar',
                        'ORG_ADMIN': 'org_admin'
                    }
                    actor_role = role_mapping.get(actor.profile.role, 'provisional')
                    
                    LogbookAuditLog.objects.create(
                        logbook=logbook,
                        action='notification_sent',
                        user=actor,
                        user_role=actor_role,
                        comments=f"Notification sent to {user.email}: {notification_type}",
                        target_id=str(notification.id),
                        metadata={
                            'notification_type': notification_type,
                            'recipient': user.email,
                            'payload': payload
                        }
                    )
                except WeeklyLogbook.DoesNotExist:
                    pass
        
        return notification