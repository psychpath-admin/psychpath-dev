"""
Enhanced Logbook Review Process Models
Implements the comprehensive weekly logbook review system as specified.
"""

import uuid
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError


class Logbook(models.Model):
    """
    Enhanced Logbook model with UUID primary key and comprehensive state management.
    Replaces the existing WeeklyLogbook for the new review process.
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
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_logbooks')
    supervisor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='supervised_logbooks')
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
        return f"Logbook {self.week_start_date} - {self.owner.email} ({self.status})"
    
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


class LogbookSection(models.Model):
    """
    Represents a section (A, B, C) within a logbook.
    Stores the content as JSON and tracks locking status.
    """
    
    SECTION_CHOICES = [
        ('A', 'Section A - Direct Client Contact'),
        ('B', 'Section B - Professional Development'),
        ('C', 'Section C - Supervision'),
    ]
    
    logbook = models.ForeignKey(Logbook, on_delete=models.CASCADE, related_name='sections')
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


class LogbookComment(models.Model):
    """
    Immutable comments on logbooks, sections, or specific records.
    Comments cannot be edited once created.
    """
    
    SCOPE_CHOICES = [
        ('record', 'Record'),
        ('section', 'Section'),
        ('document', 'Document'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    logbook = models.ForeignKey(Logbook, on_delete=models.CASCADE, related_name='comments')
    section = models.ForeignKey(LogbookSection, on_delete=models.CASCADE, null=True, blank=True, related_name='comments')
    record_id = models.UUIDField(null=True, blank=True, help_text="ID of specific record if comment is on a specific line")
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    scope = models.CharField(max_length=10, choices=SCOPE_CHOICES)
    parent_comment = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.author.email} on {self.logbook} - {self.scope}"
    
    def save(self, *args, **kwargs):
        """Override save to prevent editing after creation"""
        if self.pk:
            # Check if this is an update (not creation)
            original = LogbookComment.objects.get(pk=self.pk)
            if original.text != self.text:
                raise ValidationError("Comments are immutable once created")
        super().save(*args, **kwargs)
    
    def can_be_replied_to_by(self, user):
        """Check if user can reply to this comment"""
        return user.is_authenticated


class LogbookAudit(models.Model):
    """
    Comprehensive audit trail for all logbook actions.
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
    logbook = models.ForeignKey(Logbook, on_delete=models.CASCADE, related_name='audit_entries')
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


class Notification(models.Model):
    """
    In-app notifications for platform events.
    Enhanced version with better structure.
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
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications_sent')
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
    State machine for logbook status transitions.
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
        LogbookAudit.log_action(
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
