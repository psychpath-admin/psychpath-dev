from django.db import models
from django.contrib.auth import get_user_model
from api.models import UserProfile

User = get_user_model()

# Define role choices here to avoid circular import
ROLE_CHOICES = [
    ('PROVISIONAL', 'Provisional Psychologist'),
    ('REGISTRAR', 'Registrar'),
    ('SUPERVISOR', 'Supervisor'),
    ('ORG_ADMIN', 'Organisation Administrator'),
]


class ProgressReportConfig(models.Model):
    """Metadata-driven configuration for progress reports by program type"""
    
    program_type = models.CharField(
        max_length=32, 
        choices=ROLE_CHOICES,
        help_text="Program type this configuration applies to"
    )
    report_type = models.CharField(
        max_length=32,
        help_text="Type of report (e.g., MIDPOINT, FINAL, QUARTERLY)"
    )
    report_label = models.CharField(
        max_length=100,
        help_text="Display name for this report type"
    )
    trigger_condition = models.JSONField(
        help_text="Condition that triggers this report (e.g., {'type': 'percentage', 'value': 50})"
    )
    due_offset_days = models.IntegerField(
        default=0,
        help_text="Days after trigger condition to set as due date"
    )
    is_required = models.BooleanField(
        default=True,
        help_text="Whether this report is mandatory"
    )
    allows_draft = models.BooleanField(
        default=True,
        help_text="Whether trainees can save drafts"
    )
    requires_all_competencies = models.BooleanField(
        default=True,
        help_text="Whether all competencies must be rated"
    )
    supervisor_approval_required = models.BooleanField(
        default=True,
        help_text="Whether supervisor approval is required"
    )
    can_request_revision = models.BooleanField(
        default=True,
        help_text="Whether supervisor can request revisions"
    )
    instructions = models.TextField(
        blank=True,
        help_text="Instructions for completing this report"
    )
    
    class Meta:
        unique_together = ['program_type', 'report_type']
        ordering = ['program_type', 'report_type']
    
    def __str__(self):
        return f"{self.get_program_type_display()} - {self.report_label}"


class ProgressReport(models.Model):
    """Universal progress report for all trainee types"""
    
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
        ('UNDER_REVIEW', 'Under Review'),
        ('APPROVED', 'Approved'),
        ('REQUIRES_REVISION', 'Requires Revision'),
    ]
    
    trainee = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='progress_reports',
        help_text="Trainee who created this report"
    )
    supervisor = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='supervised_reports',
        help_text="Supervisor assigned to review this report"
    )
    report_config = models.ForeignKey(
        ProgressReportConfig, 
        on_delete=models.PROTECT,
        help_text="Configuration used for this report"
    )
    
    # Report metadata
    status = models.CharField(
        max_length=32, 
        choices=STATUS_CHOICES, 
        default='DRAFT',
        help_text="Current status of the report"
    )
    reporting_period_start = models.DateField(
        help_text="Start date of the reporting period"
    )
    reporting_period_end = models.DateField(
        help_text="End date of the reporting period"
    )
    submission_date = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="When the report was submitted for review"
    )
    due_date = models.DateField(
        help_text="When the report is due"
    )
    
    # Competency self-assessment (links to competency_tracking)
    competency_ratings = models.JSONField(
        default=dict,
        help_text="Competency ratings: {'C1': {'milestone': 'M3', 'reflection': '...'}}"
    )
    
    # Overall reflections
    achievements = models.TextField(
        blank=True,
        help_text="Key achievements during the reporting period"
    )
    challenges = models.TextField(
        blank=True,
        help_text="Challenges faced during the reporting period"
    )
    learning_goals = models.TextField(
        blank=True,
        help_text="Learning goals for the next period"
    )
    support_needed = models.TextField(
        blank=True,
        help_text="Support or resources needed"
    )
    additional_comments = models.TextField(
        blank=True,
        help_text="Any additional comments"
    )
    
    # Supervisor review
    supervisor_comments = models.TextField(
        blank=True,
        help_text="Overall supervisor comments"
    )
    supervisor_recommendations = models.TextField(
        blank=True,
        help_text="Supervisor recommendations for next period"
    )
    competency_feedback = models.JSONField(
        default=dict,
        help_text="Supervisor feedback per competency: {'C1': 'Excellent progress...'}"
    )
    reviewed_at = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="When the supervisor completed their review"
    )
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['trainee', 'status']),
            models.Index(fields=['supervisor', 'status']),
            models.Index(fields=['due_date']),
        ]
    
    def __str__(self):
        return f"{self.trainee.profile.get_full_name()} - {self.report_config.report_label} ({self.get_status_display()})"
    
    @property
    def is_overdue(self):
        """Check if report is overdue"""
        from django.utils import timezone
        return self.status in ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REQUIRES_REVISION'] and self.due_date < timezone.now().date()
    
    @property
    def can_be_edited(self):
        """Check if report can be edited by trainee"""
        return self.status in ['DRAFT', 'REQUIRES_REVISION']
    
    @property
    def can_be_submitted(self):
        """Check if report can be submitted"""
        return self.status == 'DRAFT' and not self.is_overdue