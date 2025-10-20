from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from utils.duration_utils import minutes_to_hours_minutes, minutes_to_display_format, minutes_to_decimal_hours
import json


class WeeklyLogbook(models.Model):
    """Weekly logbook for trainees"""
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('ready', 'Ready for Submission'),
        ('submitted', 'Submitted'),
        ('returned_for_edits', 'Returned for Edits'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('unlocked_for_edits', 'Unlocked for Editing'),
        ('locked', 'Locked'),
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
    
    # Workflow timestamps for review process
    review_started_at = models.DateTimeField(null=True, blank=True, help_text="When supervisor started reviewing this logbook")
    review_completed_at = models.DateTimeField(null=True, blank=True, help_text="When supervisor completed review of this logbook")
    supervisor_decision_at = models.DateTimeField(null=True, blank=True, help_text="When supervisor made final decision (approve/reject)")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Cumulative totals (added by migration 0009)
    cumulative_cra_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    cumulative_dcc_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    cumulative_pd_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    cumulative_sup_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    cumulative_total_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    
    # Weekly totals (added by migration 0009)
    total_cra_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_dcc_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_pd_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_sup_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_weekly_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # ════════════════════════════════════════════════════════════════
    # AHPRA COMPLIANCE FIELDS (Provisional 5+1)
    # ════════════════════════════════════════════════════════════════
    
    # Practice type tracking (for Provisional)
    PRACTICE_TYPE_CHOICES = [
        ('DIRECT_REAL', 'Direct Real Client Contact'),
        ('DIRECT_SIMULATED', 'Direct Simulated Client Contact'),
        ('CLIENT_RELATED', 'Client-Related Activities'),
        ('INDEPENDENT_CLIENT_RELATED', 'Independent Client-Related Activities'),
    ]
    practice_type = models.CharField(
        max_length=30,
        choices=PRACTICE_TYPE_CHOICES,
        blank=True,
        null=True,
        help_text="Primary practice type for this week (Provisional 5+1 program)"
    )
    
    # Competencies (C1-C8) - stores list of competency codes referenced this week
    competencies_referenced = models.JSONField(
        default=list,
        blank=True,
        help_text="List of competency codes (C1-C8) referenced in this week's activities"
    )
    
    # Reflection field for practice (Section A)
    reflection_text = models.TextField(
        blank=True,
        help_text="Mandatory reflection for direct_real and direct_simulated practice types"
    )
    
    # Supervisor approval for practice hours
    practice_supervisor_approved = models.BooleanField(
        default=False,
        help_text="Whether supervisor has approved the practice hours for this week"
    )
    practice_approved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When supervisor approved the practice hours"
    )
    
    # Simulated hours tracking (for 60-hour limit)
    simulated_hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Simulated skills training hours for this week (max 60 total for 5+1 program)"
    )
    cumulative_simulated_hours = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
        help_text="Cumulative simulated hours to date"
    )
    
    class Meta:
        ordering = ['-week_start_date']
        unique_together = ['trainee', 'week_start_date']
    
    def __str__(self):
        return f"{self.trainee.email} - Week {self.week_number} ({self.week_start_date})"
    
    @property
    def has_logbook(self):
        """Returns True if this logbook has been created (has an ID)"""
        return self.pk is not None
    
    def calculate_section_totals(self):
        """Calculate weekly and cumulative totals for all sections"""
        # Import here to avoid circular imports
        from section_a.models import SectionAEntry
        from section_b.models import ProfessionalDevelopmentEntry
        from section_c.models import SupervisionEntry
        
        # Calculate Section A totals (split by DCC and CRA/ICRA)
        section_a_entries = SectionAEntry.objects.filter(id__in=self.section_a_entry_ids)
        
        # Separate DCC and CRA/ICRA entries
        dcc_entries = section_a_entries.filter(entry_type='client_contact')
        cra_entries = section_a_entries.filter(entry_type__in=['cra', 'independent_activity'])
        
        dcc_total_minutes = sum(entry.duration_minutes or 0 for entry in dcc_entries)
        cra_total_minutes = sum(entry.duration_minutes or 0 for entry in cra_entries)
        section_a_total_minutes = dcc_total_minutes + cra_total_minutes
        
        # Calculate cumulative totals (all entries from previous weeks + current week)
        # For the first week, this should equal the weekly total
        all_previous_dcc = SectionAEntry.objects.filter(
            trainee=self.trainee,
            week_starting__lt=self.week_start_date,
            entry_type='client_contact'
            # Include ALL entries from previous weeks, not just locked ones
        )
        all_previous_cra = SectionAEntry.objects.filter(
            trainee=self.trainee,
            week_starting__lt=self.week_start_date,
            entry_type__in=['cra', 'independent_activity']
            # Include ALL entries from previous weeks, not just locked ones
        )
        
        cumulative_dcc = sum(entry.duration_minutes or 0 for entry in all_previous_dcc) + dcc_total_minutes
        cumulative_cra = sum(entry.duration_minutes or 0 for entry in all_previous_cra) + cra_total_minutes
        
        # Calculate Section B totals
        section_b_entries = ProfessionalDevelopmentEntry.objects.filter(id__in=self.section_b_entry_ids)
        section_b_total_minutes = sum(entry.duration_minutes or 0 for entry in section_b_entries)
        
        # Calculate cumulative Section B
        all_previous_section_b = ProfessionalDevelopmentEntry.objects.filter(
            trainee=self.trainee,
            week_starting__lt=self.week_start_date
            # Include ALL entries from previous weeks, not just locked ones
        )
        cumulative_section_b = sum(entry.duration_minutes or 0 for entry in all_previous_section_b) + section_b_total_minutes
        
        # Calculate Section C totals
        section_c_entries = SupervisionEntry.objects.filter(id__in=self.section_c_entry_ids)
        section_c_total_minutes = sum(entry.duration_minutes or 0 for entry in section_c_entries)
        
        # Calculate cumulative Section C (SupervisionEntry uses UserProfile, not User)
        from api.models import UserProfile
        try:
            trainee_profile = UserProfile.objects.get(user=self.trainee)
            all_previous_section_c = SupervisionEntry.objects.filter(
                trainee=trainee_profile,
                week_starting__lt=self.week_start_date
                # Include ALL entries from previous weeks, not just locked ones
            )
        except UserProfile.DoesNotExist:
            all_previous_section_c = SupervisionEntry.objects.none()
        cumulative_section_c = sum(entry.duration_minutes or 0 for entry in all_previous_section_c) + section_c_total_minutes
        
        return {
            'section_a': {
                'weekly_hours': minutes_to_hours_minutes(section_a_total_minutes),
                'cumulative_hours': minutes_to_hours_minutes(cumulative_dcc + cumulative_cra),
                'dcc': {
                    'weekly_hours': minutes_to_hours_minutes(dcc_total_minutes),
                    'cumulative_hours': minutes_to_hours_minutes(cumulative_dcc)
                },
                'cra': {
                    'weekly_hours': minutes_to_hours_minutes(cra_total_minutes),
                    'cumulative_hours': minutes_to_hours_minutes(cumulative_cra)
                }
            },
            'section_b': {
                'weekly_hours': minutes_to_hours_minutes(section_b_total_minutes),
                'cumulative_hours': minutes_to_hours_minutes(cumulative_section_b)
            },
            'section_c': {
                'weekly_hours': minutes_to_hours_minutes(section_c_total_minutes),
                'cumulative_hours': minutes_to_hours_minutes(cumulative_section_c)
            },
            'total': {
                'weekly_hours': minutes_to_hours_minutes(section_a_total_minutes + section_b_total_minutes + section_c_total_minutes),
                'cumulative_hours': minutes_to_hours_minutes(cumulative_dcc + cumulative_cra + cumulative_section_b + cumulative_section_c)
            }
        }
    
    @property
    def week_display(self):
        """Display week in readable format"""
        return f"{self.week_start_date.strftime('%d %b %Y')} - {self.week_end_date.strftime('%d %b %Y')}"
    
    def is_editable(self):
        """Check if this logbook is currently editable (unlocked)"""
        # Check if there's an active unlock request
        try:
            active_unlock = self.unlock_requests.filter(
                status='approved',
                manually_relocked=False,
                unlock_expires_at__gt=timezone.now()
            ).first()
            return active_unlock is not None
        except Exception:
            # Handle case where unlock_requests table doesn't exist
            return False
    
    def get_active_unlock(self):
        """Get the currently active unlock request if any"""
        try:
            return self.unlock_requests.filter(
                status='approved',
                manually_relocked=False,
                unlock_expires_at__gt=timezone.now()
            ).first()
        except Exception:
            # Handle case where unlock_requests table doesn't exist
            return None
    
    def get_rag_status(self):
        """Get RAG status for dashboard display"""
        if self.status in ['rejected'] or self.is_overdue():
            return 'red'  # Overdue or Rejected
        elif self.status == 'ready':
            return 'amber'  # Ready but not yet submitted
        elif self.status == 'approved':
            return 'green'  # Approved by supervisor
        else:
            return 'amber'  # Submitted (waiting for review)
    
    def is_overdue(self):
        """Check if logbook is overdue (past week end date and not approved)"""
        if self.status == 'approved':
            return False
        return timezone.now().date() > self.week_end_date
    
    def has_supervisor_comments(self):
        """Check if supervisor has provided comments"""
        return bool(self.supervisor_comments.strip()) if self.supervisor_comments else False
    
    def is_editable_by_user(self, user):
        """Check if logbook can be edited by the given user"""
        if user != self.trainee:
            return False
        
        # Can edit if status is ready or rejected
        if self.status in ['ready', 'rejected']:
            return True
        
        # Can edit if there's an active unlock
        if self.is_editable():
            return True
        
        return False


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


class LogbookReviewRequest(models.Model):
    """Model for tracking logbook review requests"""
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    logbook = models.ForeignKey(WeeklyLogbook, on_delete=models.CASCADE, related_name='review_requests')
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='requested_reviews')
    requested_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    review_started_at = models.DateTimeField(null=True, blank=True)
    review_completed_at = models.DateTimeField(null=True, blank=True)
    supervisor_notes = models.TextField(blank=True, help_text="Internal notes for supervisor")
    
    class Meta:
        ordering = ['-requested_at']
    
    def __str__(self):
        return f"Review request for {self.logbook} by {self.requested_by.email}"


class UnlockRequest(models.Model):
    """Model for tracking unlock requests for logbooks"""
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('EXPIRED', 'Expired'),
    ]
    
    logbook = models.ForeignKey(WeeklyLogbook, on_delete=models.CASCADE, related_name='unlock_requests')
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='unlock_requests')
    reason = models.TextField(help_text="Reason for requesting unlock")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_unlock_requests')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    unlock_expires_at = models.DateTimeField(null=True, blank=True, help_text="When the unlock expires (if approved)")
    manually_relocked = models.BooleanField(default=False, help_text="Whether the logbook was manually relocked before expiration")
    supervisor_response = models.TextField(blank=True, help_text="Supervisor's response to the unlock request")
    
    class Meta:
        ordering = ['-requested_at']
    
    def __str__(self):
        return f"Unlock request for {self.logbook} by {self.requester.email}"
    
    @property
    def is_expired(self):
        """Check if the unlock request has expired"""
        if not self.unlock_expires_at:
            return False
        from django.utils import timezone
        return timezone.now() > self.unlock_expires_at
    
    def can_be_approved(self):
        """Check if this unlock request can be approved"""
        return self.status == 'PENDING' and not self.logbook.status == 'locked'


# ════════════════════════════════════════════════════════════════
# ENHANCED LOGBOOK REVIEW PROCESS MODELS
# ════════════════════════════════════════════════════════════════

import uuid
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class EnhancedLogbook(models.Model):
    """
    Enhanced Logbook model with UUID primary key and comprehensive state management.
    Implements the complete logbook review process as specified.
    """
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('changes_requested', 'Changes Requested'),
        ('approved', 'Approved'),
        ('locked', 'Locked'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='enhanced_logbooks')
    supervisor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='supervised_enhanced_logbooks')
    week_start_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Hours tracking
    total_dcc_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_cra_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_pd_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_supervision_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    locked_at = models.DateTimeField(null=True, blank=True)
    
    # Additional fields
    pdf_url = models.URLField(null=True, blank=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-week_start_date']
        unique_together = ['owner', 'week_start_date']
    
    def __str__(self):
        return f"Enhanced Logbook {self.week_start_date} - {self.owner.email} ({self.status})"
    
    def is_locked(self):
        """Check if logbook is currently locked"""
        return self.status in ['submitted', 'under_review', 'approved', 'locked']
    
    def can_be_edited_by(self, user):
        """Check if user can edit this logbook"""
        if user != self.owner:
            return False
        return self.status in ['draft', 'changes_requested']
    
    def can_be_submitted_by(self, user):
        """Check if user can submit this logbook"""
        return user == self.owner and self.status == 'draft'
    
    def can_be_approved_by(self, user):
        """Check if user can approve this logbook"""
        return user == self.supervisor and self.status == 'under_review'
    
    def can_be_rejected_by(self, user):
        """Check if user can reject this logbook"""
        return user == self.supervisor and self.status == 'under_review'
    
    def can_request_unlock_by(self, user):
        """Check if user can request unlock after approval"""
        return user == self.owner and self.status == 'approved'
    
    def can_grant_unlock_by(self, user):
        """Check if user can grant unlock request"""
        return user == self.supervisor and self.status == 'approved'


class EnhancedLogbookSection(models.Model):
    """
    Represents a section (A, B, C) within an enhanced logbook.
    Stores the content as JSON and tracks locking status.
    """
    
    SECTION_CHOICES = [
        ('A', 'Section A - Direct Client Contact'),
        ('B', 'Section B - Professional Development'),
        ('C', 'Section C - Supervision'),
    ]
    
    logbook = models.ForeignKey(EnhancedLogbook, on_delete=models.CASCADE, related_name='sections')
    section_type = models.CharField(max_length=1, choices=SECTION_CHOICES)
    title = models.CharField(max_length=100)
    content_json = models.JSONField(default=dict, help_text="Stores records from that section")
    is_locked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['logbook', 'section_type']
        ordering = ['section_type']
    
    def __str__(self):
        return f"{self.logbook} - {self.get_section_type_display()}"
    
    def lock(self):
        """Lock this section"""
        self.is_locked = True
        self.save()
    
    def unlock(self):
        """Unlock this section"""
        self.is_locked = False
        self.save()


class EnhancedLogbookComment(models.Model):
    """
    Immutable comments on enhanced logbooks, sections, or specific records.
    Comments cannot be edited once created.
    """
    
    SCOPE_CHOICES = [
        ('record', 'Record'),
        ('section', 'Section'),
        ('document', 'Document'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    logbook = models.ForeignKey(EnhancedLogbook, on_delete=models.CASCADE, related_name='comments')
    section = models.ForeignKey(EnhancedLogbookSection, on_delete=models.CASCADE, null=True, blank=True, related_name='comments')
    record_id = models.UUIDField(null=True, blank=True, help_text="ID of specific record if comment is on a specific line")
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    scope = models.CharField(max_length=10, choices=SCOPE_CHOICES)
    parent_comment = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Enhanced Comment by {self.author.email} on {self.logbook} - {self.scope}"
    
    def save(self, *args, **kwargs):
        """Override save to prevent editing after creation"""
        if self.pk:
            # Check if this is an update (not creation)
            original = EnhancedLogbookComment.objects.get(pk=self.pk)
            if original.text != self.text:
                raise ValidationError("Comments are immutable once created")
        super().save(*args, **kwargs)
    
    def can_be_replied_to_by(self, user):
        """Check if user can reply to this comment"""
        return user.is_authenticated


class EnhancedLogbookAudit(models.Model):
    """
    Comprehensive audit trail for all enhanced logbook actions.
    Records every state change and action with full context.
    """
    
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('unlocked', 'Unlocked'),
        ('edit_requested', 'Edit Requested'),
        ('edit_granted', 'Edit Granted'),
        ('pdf_generated', 'PDF Generated'),
        ('comment_added', 'Comment Added'),
        ('section_locked', 'Section Locked'),
        ('section_unlocked', 'Section Unlocked'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    logbook = models.ForeignKey(EnhancedLogbook, on_delete=models.CASCADE, related_name='audit_entries')
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    diff_snapshot = models.JSONField(null=True, blank=True, help_text="Captures changed fields")
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['logbook', '-timestamp']),
            models.Index(fields=['actor', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.logbook} - {self.action} by {self.actor.email if self.actor else 'System'} at {self.timestamp}"
    
    @classmethod
    def log_action(cls, logbook, action, actor, description, diff_snapshot=None):
        """Helper method to create audit entries"""
        return cls.objects.create(
            logbook=logbook,
            action=action,
            actor=actor,
            description=description,
            diff_snapshot=diff_snapshot
        )


class EnhancedNotification(models.Model):
    """
    Enhanced in-app notifications for platform events.
    """
    
    TYPE_CHOICES = [
        ('logbook_submitted', 'Logbook Submitted'),
        ('logbook_approved', 'Logbook Approved'),
        ('logbook_rejected', 'Logbook Rejected'),
        ('logbook_unlocked', 'Logbook Unlocked'),
        ('comment_added', 'Comment Added'),
        ('edit_requested', 'Edit Requested'),
        ('edit_granted', 'Edit Granted'),
        ('pdf_generated', 'PDF Generated'),
        ('rubric_completed', 'Rubric Completed'),
        ('rubric_approved', 'Rubric Approved'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='enhanced_notifications')
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='enhanced_notifications_sent')
    title = models.CharField(max_length=200)
    body = models.TextField()
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    related_object = GenericForeignKey('content_type', 'object_id')
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'read', '-created_at']),
            models.Index(fields=['notification_type']),
        ]
    
    def __str__(self):
        return f"{self.recipient.email} - {self.title}"
    
    def mark_as_read(self):
        """Mark this notification as read"""
        self.read = True
        self.save()
    
    @classmethod
    def create_notification(cls, recipient, notification_type, title, body, related_object=None, actor=None):
        """Helper method to create notifications"""
        content_type = None
        object_id = None
        
        if related_object:
            content_type = ContentType.objects.get_for_model(related_object)
            object_id = related_object.pk
        
        return cls.objects.create(
            recipient=recipient,
            actor=actor,
            title=title,
            body=body,
            notification_type=notification_type,
            content_type=content_type,
            object_id=object_id
        )


class LogbookStateMachine:
    """
    State machine for enhanced logbook status transitions.
    Implements the exact state machine from the specification.
    """
    
    VALID_TRANSITIONS = {
        'draft': ['submitted'],
        'submitted': ['under_review'],
        'under_review': ['approved', 'changes_requested'],
        'changes_requested': ['submitted'],
        'approved': ['edit_requested'],
        'edit_requested': ['unlocked'],
        'unlocked': ['submitted'],
    }
    
    @classmethod
    def can_transition(cls, from_status, to_status):
        """Check if a transition is valid"""
        return to_status in cls.VALID_TRANSITIONS.get(from_status, [])
    
    @classmethod
    def get_valid_transitions(cls, current_status):
        """Get all valid transitions from current status"""
        return cls.VALID_TRANSITIONS.get(current_status, [])
    
    @classmethod
    def transition_logbook(cls, logbook, new_status, actor, description=None):
        """Perform a state transition with validation and audit logging"""
        if not cls.can_transition(logbook.status, new_status):
            raise ValidationError(f"Invalid transition from {logbook.status} to {new_status}")
        
        old_status = logbook.status
        logbook.status = new_status
        
        # Update timestamps based on status
        now = timezone.now()
        if new_status == 'submitted':
            logbook.submitted_at = now
        elif new_status == 'approved':
            logbook.approved_at = now
        elif new_status == 'locked':
            logbook.locked_at = now
        
        logbook.save()
        
        # Create audit entry
        EnhancedLogbookAudit.log_action(
            logbook=logbook,
            action=new_status,
            actor=actor,
            description=description or f"Status changed from {old_status} to {new_status}",
            diff_snapshot={'status': {'from': old_status, 'to': new_status}}
        )
        
        # Lock/unlock sections based on status
        if new_status in ['submitted', 'under_review', 'approved', 'locked']:
            for section in logbook.sections.all():
                section.lock()
        elif new_status in ['changes_requested', 'unlocked']:
            for section in logbook.sections.all():
                section.unlock()
        
        return logbook