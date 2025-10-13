from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
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
    role_type = models.CharField(max_length=20, choices=[('Provisional', 'Provisional'), ('Registrar', 'Registrar')], default='Provisional')
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
    review_comments = models.TextField(blank=True)
    supervisor_decision_at = models.DateTimeField(null=True, blank=True)
    resubmitted_at = models.DateTimeField(null=True, blank=True)
    returned_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    
    # Enhanced review fields
    review_started_at = models.DateTimeField(null=True, blank=True, help_text="When supervisor started reviewing")
    change_requests_count = models.PositiveIntegerField(default=0, help_text="Number of change requests made")
    resubmission_count = models.PositiveIntegerField(default=0, help_text="Number of times resubmitted")
    pending_change_requests = models.JSONField(default=list, help_text="List of pending change request IDs")
    
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
                status__in=['approved', 'approve'],  # Handle both status values
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
        elif self.status == 'draft':
            return 'amber'  # Draft but not yet submitted
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
        return bool(self.review_comments.strip()) if self.review_comments else False
    
    @property
    def is_editable(self):
        """Computed property: check if logbook is editable based on status or active unlock"""
        # Can edit if status allows it
        if self.status in ['draft', 'returned_for_edits', 'rejected']:
            return True
        
        # Can edit if there's an active unlock request
        active_unlock = self.get_active_unlock()
        if active_unlock:
            return True
            
        return False
    
    def is_editable_by_user(self, user):
        """Check if logbook can be edited by the given user"""
        if user != self.trainee:
            return False
        
        # Can edit if status is draft, returned_for_edits, or rejected
        return self.is_editable
    
    def is_complete(self):
        """Check if logbook is complete and ready for submission"""
        # Basic checks - can be expanded based on requirements
        has_entries = (
            len(self.section_a_entry_ids) > 0 or 
            len(self.section_b_entry_ids) > 0 or 
            len(self.section_c_entry_ids) > 0
        )
        return has_entries
    
    def submit_for_review(self, user):
        """Submit logbook for supervisor review"""
        if not self.is_complete():
            raise ValueError("Logbook must be complete before submission")
        
        # Use state machine to transition to submitted
        try:
            audit_log = self.transition_to('submitted', user, 'Logbook submitted for review')
        except ValidationError as e:
            raise ValueError(str(e))
        
        # Send notification to supervisor if assigned
        if self.supervisor:
            self._send_notification_to_supervisor('submitted')
        
        return audit_log
    
    def approve(self, supervisor, comments=''):
        """Approve logbook by supervisor"""
        if self.status != 'submitted':
            raise ValueError("Only submitted logbooks can be approved")
        
        self.status = 'approved'
        self.reviewed_by = supervisor
        self.reviewed_at = timezone.now()
        self.supervisor_decision_at = timezone.now()
        if comments:
            self.review_comments = comments
        self.save()
        
        # Log audit trail
        LogbookAuditLog.objects.create(
            logbook=self,
            action='approved',
            user=supervisor,
            user_role='supervisor',
            comments=comments or 'Logbook approved',
            previous_status='submitted',
            new_status='approved'
        )
        
        # Send notification to trainee
        self._send_notification_to_trainee('approved')
    
    def return_for_edits(self, supervisor, comments):
        """Return logbook to trainee for edits"""
        if self.status != 'submitted':
            raise ValueError("Only submitted logbooks can be returned for edits")
        
        self.status = 'returned_for_edits'
        self.reviewed_by = supervisor
        self.returned_at = timezone.now()
        self.supervisor_decision_at = timezone.now()
        self.review_comments = comments
        self.save()
        
        # Log audit trail
        LogbookAuditLog.objects.create(
            logbook=self,
            action='returned_for_edits',
            user=supervisor,
            user_role='supervisor',
            comments=comments,
            previous_status='submitted',
            new_status='returned_for_edits'
        )
        
        # Send notification to trainee
        self._send_notification_to_trainee('returned_for_edits')
    
    def reject(self, supervisor, comments):
        """Reject logbook by supervisor - returns to draft for re-editing"""
        if self.status != 'submitted':
            raise ValueError("Only submitted logbooks can be rejected")
        
        self.status = 'draft'  # Return to draft so trainee can edit and resubmit
        self.reviewed_by = supervisor
        self.rejected_at = timezone.now()
        self.supervisor_decision_at = timezone.now()
        self.review_comments = comments
        self.save()
        
        # Log audit trail
        LogbookAuditLog.objects.create(
            logbook=self,
            action='rejected',
            user=supervisor,
            user_role='supervisor',
            comments=comments,
            previous_status='submitted',
            new_status='draft'  # Show it was rejected but is now back to draft
        )
        
        # Send notification to trainee
        self._send_notification_to_trainee('rejected')
    
    def resubmit(self, user):
        """Resubmit logbook after edits"""
        if self.status not in ['returned_for_edits', 'rejected']:
            raise ValueError("Only returned or rejected logbooks can be resubmitted")
        
        previous_status = self.status
        self.status = 'submitted'
        self.resubmitted_at = timezone.now()
        self.resubmission_count += 1
        
        # Clear pending change requests when resubmitting
        self.pending_change_requests = []
        
        self.save()
        
        # Log audit trail
        LogbookAuditLog.objects.create(
            logbook=self,
            action='resubmitted',
            user=user,
            user_role=self._get_user_role(user),
            comments='Logbook resubmitted after edits',
            previous_status=previous_status,
            new_status='submitted'
        )
        
        # Send notification to supervisor
        if self.supervisor:
            self._send_notification_to_supervisor('resubmitted')
    
    def start_review(self, supervisor):
        """
        DEPRECATED: Start the review process
        
        This method is deprecated as we no longer use the 'under_review' status.
        Supervisors now approve/reject directly from 'submitted' status.
        """
        raise NotImplementedError("start_review method is deprecated. Use approve_with_changes or reject_with_reason directly.")
    
    def request_changes(self, supervisor, change_requests):
        """Request specific changes from trainee"""
        if self.status != 'submitted':
            raise ValueError("Can only request changes for submitted logbooks")
        
        self.status = 'returned_for_edits'
        self.returned_at = timezone.now()
        self.change_requests_count += len(change_requests)
        
        # Add change request IDs to pending list
        request_ids = [req.id for req in change_requests]
        self.pending_change_requests = request_ids
        
        self.save()
        
        # Log audit trail
        LogbookAuditLog.objects.create(
            logbook=self,
            action='changes_requested',
            user=supervisor,
            user_role=self._get_user_role(supervisor),
            comments=f'Requested {len(change_requests)} changes',
            new_status='returned_for_edits'
        )
        
        # Send notification to trainee
        self._send_notification_to_trainee('changes_requested', len(change_requests))
    
    def approve_with_changes(self, supervisor, comments=""):
        """Approve logbook with optional comments"""
        if self.status != 'submitted':
            raise ValueError("Can only approve submitted logbooks")
        
        self.status = 'approved'
        self.reviewed_at = timezone.now()
        self.reviewed_by = supervisor
        if comments:
            self.review_comments = comments
        self.save()
        
        # Log audit trail
        LogbookAuditLog.objects.create(
            logbook=self,
            action='approved',
            user=supervisor,
            user_role=self._get_user_role(supervisor),
            comments=comments or 'Logbook approved',
            new_status='approved'
        )
        
        # Send notification to trainee
        self._send_notification_to_trainee('approved')
    
    def reject_with_reason(self, supervisor, reason):
        """Reject logbook with detailed reason"""
        if self.status not in ['submitted', 'draft']:
            raise ValueError("Can only reject submitted or draft logbooks")
        
        self.status = 'rejected'
        self.rejected_at = timezone.now()
        self.reviewed_by = supervisor
        self.review_comments = reason
        self.save()
        
        # Log audit trail
        LogbookAuditLog.objects.create(
            logbook=self,
            action='rejected',
            user=supervisor,
            user_role=self._get_user_role(supervisor),
            comments=reason,
            new_status='rejected'
        )
        
        # Send notification to trainee
        self._send_notification_to_trainee('rejected')
    
    def _send_notification_to_trainee(self, action, change_count=None):
        """Send notification to trainee"""
        if not self.trainee:
            return
            
        if action == 'changes_requested':
            message = f"Your supervisor has requested {change_count} change(s) for your logbook for the week of {self.week_start_date.strftime('%B %d, %Y')}"
            notification_type = 'logbook_changes_requested'
            link = f"/logbooks/{self.id}/edit"
        elif action == 'approved':
            message = f"Your logbook for the week of {self.week_start_date.strftime('%B %d, %Y')} has been approved by your supervisor"
            notification_type = 'logbook_approved'
            link = f"/logbooks/{self.id}"
        elif action == 'rejected':
            message = f"Your logbook for the week of {self.week_start_date.strftime('%B %d, %Y')} has been rejected by your supervisor"
            notification_type = 'logbook_rejected'
            link = f"/logbooks/{self.id}/edit"
        else:
            return
        
        # Create notification
        try:
            from .models import Notification
            Notification.create_notification(
                recipient=self.trainee,
                message=message,
                notification_type=notification_type,
                link=link
            )
        except Exception:
            # Handle case where Notification model doesn't exist
            pass
    
    def _get_user_role(self, user):
        """Get user role for audit logging"""
        try:
            from api.models import UserProfile
            profile = UserProfile.objects.get(user=user)
            return profile.role.lower()
        except:
            return 'provisional'
    
    def _send_notification_to_supervisor(self, action):
        """Send notification to supervisor"""
        if not self.supervisor:
            return
            
        # Create notification based on action
        if action == 'submitted':
            message = f"{self.trainee.first_name} {self.trainee.last_name} submitted a logbook for the week of {self.week_start_date.strftime('%B %d, %Y')}"
            notification_type = 'logbook_submission'
            link = f"/logbooks/{self.id}/review"
        elif action == 'resubmitted':
            message = f"{self.trainee.first_name} {self.trainee.last_name} resubmitted a logbook for the week of {self.week_start_date.strftime('%B %d, %Y')}"
            notification_type = 'logbook_submission'
            link = f"/logbooks/{self.id}/review"
        else:
            message = f"Logbook update: {action}"
            notification_type = 'system_alert'
            link = f"/logbooks/{self.id}/review"
        
        # Create the notification
        Notification.create_notification(
            recipient=self.supervisor,
            message=message,
            notification_type=notification_type,
            link=link
        )
        
        # Log in audit trail
        LogbookAuditLog.objects.create(
            logbook=self,
            action='notification_sent',
            user=self.supervisor,
            user_role='supervisor',
            comments=f'Notification sent to supervisor for {action}',
            metadata={'action': action, 'recipient': 'supervisor'}
        )
    
    def _send_notification_to_trainee(self, action):
        """Send notification to trainee"""
        # This would integrate with your notification system
        # For now, we'll just log it
        LogbookAuditLog.objects.create(
            logbook=self,
            action='notification_sent',
            user=self.trainee,
            user_role=self._get_user_role(self.trainee),
            comments=f'Notification sent to trainee for {action}',
            metadata={'action': action, 'recipient': 'trainee'}
        )
    
    # State Machine Methods
    def transition_to(self, new_state: str, user, comments: str = '', metadata: dict = None, **kwargs):
        """
        Transition logbook to new state using the state machine.
        
        Args:
            new_state: Target state
            user: User making the transition
            comments: Optional comments
            metadata: Optional metadata
            **kwargs: Additional fields for audit log
            
        Returns:
            LogbookAuditLog instance
            
        Raises:
            ValidationError: If transition is invalid
        """
        from .state_machine import LogbookStateTransition
        return LogbookStateTransition.transition_to(
            self, new_state, user, comments, metadata, **kwargs
        )
    
    def can_transition_to(self, new_state: str, user) -> bool:
        """
        Check if a state transition is valid for the given user.
        
        Args:
            new_state: Target state
            user: User attempting the transition
            
        Returns:
            True if transition is valid, False otherwise
        """
        from .state_machine import LogbookStateMachine
        user_role = getattr(user.profile, 'role', 'unknown').lower()
        return LogbookStateMachine.can_transition(self.status, new_state, user_role)
    
    def get_valid_transitions(self, user) -> list:
        """
        Get valid state transitions for the given user.
        
        Args:
            user: User requesting valid transitions
            
        Returns:
            List of valid next states
        """
        from .state_machine import LogbookStateMachine
        user_role = getattr(user.profile, 'role', 'unknown').lower()
        return LogbookStateMachine.get_valid_transitions(self.status, user_role)
    
    def get_status_display(self) -> str:
        """Get human-readable status display name."""
        from .state_machine import LogbookStateMachine
        return LogbookStateMachine.get_state_display_name(self.status)


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
        ('returned_for_edits', 'Returned for Edits'),
        ('resubmitted', 'Resubmitted'),
        ('unlocked', 'Unlocked'),
        ('locked', 'Locked'),
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
        # Allow multiple requests per logbook, but check for pending in business logic
    
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
    """System notifications for users"""
    
    NOTIFICATION_TYPES = [
        ('logbook_submission', 'Logbook Submission'),
        ('logbook_approved', 'Logbook Approved'),
        ('logbook_rejected', 'Logbook Rejected'),
        ('logbook_returned', 'Logbook Returned for Edits'),
        ('supervision_invite', 'Supervision Invitation'),
        ('supervision_accepted', 'Supervision Accepted'),
        ('supervision_rejected', 'Supervision Rejected'),
        ('system_alert', 'System Alert'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    payload = models.JSONField(blank=True, null=True, help_text="Additional data for the notification")
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
    def create_notification(cls, recipient, message, notification_type, link=None):
        """Create a notification"""
        payload = {
            'message': message,
            'link': link
        }
        notification = cls.objects.create(
            user=recipient,
            notification_type=notification_type,
            payload=payload
        )
        return notification


class LogbookReviewRequest(models.Model):
    """Model for tracking specific change requests during logbook review"""
    
    REQUEST_TYPE_CHOICES = [
        ('entry_modification', 'Entry Modification'),
        ('additional_info', 'Additional Information'),
        ('clarification', 'Clarification Needed'),
        ('format_issue', 'Format Issue'),
        ('completeness', 'Completeness Check'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('dismissed', 'Dismissed'),
    ]
    
    logbook = models.ForeignKey(WeeklyLogbook, on_delete=models.CASCADE, related_name='review_requests')
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='change_requests_made')
    request_type = models.CharField(max_length=20, choices=REQUEST_TYPE_CHOICES)
    title = models.CharField(max_length=200, help_text="Brief title of the change request")
    description = models.TextField(help_text="Detailed description of what needs to be changed")
    
    # Entry-specific information
    target_section = models.CharField(max_length=20, choices=[
        ('section_a', 'Section A'),
        ('section_b', 'Section B'), 
        ('section_c', 'Section C'),
        ('general', 'General'),
    ], default='general')
    target_entry_id = models.CharField(max_length=50, blank=True, help_text="ID of specific entry if applicable")
    
    # Status and tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=10, choices=[
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ], default='medium')
    
    # Response information
    trainee_response = models.TextField(blank=True, help_text="Trainee's response to the change request")
    supervisor_notes = models.TextField(blank=True, help_text="Additional supervisor notes")
    
    # Timestamps
    requested_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-requested_at']
        verbose_name = 'Logbook Review Request'
        verbose_name_plural = 'Logbook Review Requests'
    
    def __str__(self):
        return f"Review Request: {self.title} - {self.logbook.week_display}"
    
    def mark_as_responded(self, response_text):
        """Mark request as responded to by trainee"""
        self.trainee_response = response_text
        self.responded_at = timezone.now()
        self.status = 'in_progress'
        self.save()
    
    def mark_as_completed(self, supervisor_notes=""):
        """Mark request as completed by supervisor"""
        self.supervisor_notes = supervisor_notes
        self.completed_at = timezone.now()
        self.status = 'completed'
        self.save()
    
    def dismiss(self, reason=""):
        """Dismiss the request"""
        self.supervisor_notes = f"Dismissed: {reason}" if reason else "Dismissed"
        self.status = 'dismissed'
        self.save()
    
    @property
    def is_overdue(self):
        """Check if request is overdue (more than 7 days old and pending)"""
        if self.status != 'pending':
            return False
        return (timezone.now() - self.requested_at).days > 7
    
    @property
    def days_since_requested(self):
        """Get number of days since request was made"""
        return (timezone.now() - self.requested_at).days