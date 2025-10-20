from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from api.models import UserProfile
from decimal import Decimal
import json

class CPDCategory(models.Model):
    """CPD activity categories for classification"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = "CPD Category"
        verbose_name_plural = "CPD Categories"
        ordering = ['name']

class CPDActivity(models.Model):
    """CPD activities for all psychologists"""
    
    ACTIVITY_TYPE_CHOICES = [
        ('FORMAL_LEARNING', 'Formal Learning'),
        ('PEER_CONSULTATION', 'Peer Consultation'),
        ('SUPERVISION', 'Supervision'),
        ('RESEARCH', 'Research'),
        ('TEACHING', 'Teaching/Training'),
        ('PROFESSIONAL_DEVELOPMENT', 'Professional Development'),
        ('CONFERENCE', 'Conference/Workshop'),
        ('ONLINE_LEARNING', 'Online Learning'),
        ('READING', 'Professional Reading'),
        ('OTHER', 'Other'),
    ]
    
    DELIVERY_MODE_CHOICES = [
        ('FACE_TO_FACE', 'Face-to-Face'),
        ('ONLINE', 'Online'),
        ('HYBRID', 'Hybrid'),
        ('SELF_DIRECTED', 'Self-Directed'),
        ('GROUP', 'Group'),
        ('INDIVIDUAL', 'Individual'),
    ]
    
    EVIDENCE_TYPE_CHOICES = [
        ('CERTIFICATE', 'Certificate'),
        ('ATTENDANCE_RECORD', 'Attendance Record'),
        ('REFLECTION', 'Reflection'),
        ('ASSESSMENT', 'Assessment'),
        ('PORTFOLIO', 'Portfolio'),
        ('OTHER', 'Other'),
    ]
    
    # Basic Information
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cpd_activities')
    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='cpd_activities')
    
    # Activity Details
    title = models.CharField(max_length=200, help_text="Title of the CPD activity")
    activity_type = models.CharField(max_length=30, choices=ACTIVITY_TYPE_CHOICES)
    category = models.ForeignKey(CPDCategory, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.TextField(help_text="Detailed description of the activity")
    
    # Dates and Duration
    activity_date = models.DateField(help_text="Date when the activity took place")
    duration_hours = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        validators=[MinValueValidator(0.25), MaxValueValidator(1000)],
        help_text="Duration in hours (minimum 0.25 hours)"
    )
    delivery_mode = models.CharField(max_length=20, choices=DELIVERY_MODE_CHOICES, default='FACE_TO_FACE')
    
    # Learning Outcomes
    learning_outcomes = models.TextField(
        blank=True, 
        help_text="What did you learn from this activity?"
    )
    skills_developed = models.TextField(
        blank=True, 
        help_text="What skills did you develop or enhance?"
    )
    application_to_practice = models.TextField(
        blank=True, 
        help_text="How will you apply this learning to your practice?"
    )
    
    # Evidence and Assessment
    evidence_type = models.CharField(max_length=20, choices=EVIDENCE_TYPE_CHOICES, default='REFLECTION')
    evidence_description = models.TextField(
        blank=True, 
        help_text="Description of evidence submitted"
    )
    evidence_file = models.FileField(
        upload_to='cpd_evidence/%Y/%m/', 
        null=True, 
        blank=True,
        help_text="Upload evidence file (certificate, reflection, etc.)"
    )
    
    # AHPRA Compliance
    is_active_cpd = models.BooleanField(
        default=True, 
        help_text="Does this count as 'active' CPD (involves interaction, assessment, or structured learning)?"
    )
    is_peer_consultation = models.BooleanField(
        default=False, 
        help_text="Is this peer consultation activity?"
    )
    is_supervision = models.BooleanField(
        default=False, 
        help_text="Is this supervision-related activity?"
    )
    
    # Professional Development Areas
    professional_areas = models.JSONField(
        default=list, 
        blank=True,
        help_text="List of professional areas this activity relates to"
    )
    competencies_addressed = models.JSONField(
        default=list, 
        blank=True,
        help_text="List of competencies this activity addresses"
    )
    
    # Quality and Reflection
    quality_rating = models.IntegerField(
        choices=[(i, f'{i} stars') for i in range(1, 6)],
        null=True, 
        blank=True,
        help_text="Rate the quality of this CPD activity (1-5 stars)"
    )
    reflection = models.TextField(
        blank=True, 
        help_text="Personal reflection on the learning experience"
    )
    
    # Status and Approval
    status = models.CharField(
        max_length=20,
        choices=[
            ('DRAFT', 'Draft'),
            ('SUBMITTED', 'Submitted'),
            ('APPROVED', 'Approved'),
            ('REJECTED', 'Rejected'),
            ('REQUIRES_REVISION', 'Requires Revision'),
        ],
        default='DRAFT'
    )
    
    # Supervisor/Peer Review (for certain activities)
    reviewer = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='reviewed_cpd_activities'
    )
    reviewer_comments = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.title} - {self.user.get_full_name()}"
    
    class Meta:
        verbose_name = "CPD Activity"
        verbose_name_plural = "CPD Activities"
        ordering = ['-activity_date', '-created_at']
        indexes = [
            models.Index(fields=['user', 'activity_date']),
            models.Index(fields=['user', 'activity_type']),
            models.Index(fields=['user', 'is_active_cpd']),
            models.Index(fields=['status']),
        ]

class CPDPlan(models.Model):
    """Annual CPD plans for psychologists"""
    
    PLAN_STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
        ('APPROVED', 'Approved'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cpd_plans')
    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='cpd_plans')
    
    # Plan Details
    year = models.IntegerField(help_text="Year this plan covers")
    title = models.CharField(max_length=200, help_text="Title of the CPD plan")
    description = models.TextField(help_text="Description of planned CPD activities")
    
    # Goals and Objectives
    learning_goals = models.TextField(help_text="What do you want to achieve this year?")
    professional_areas = models.JSONField(
        default=list, 
        help_text="Professional areas to focus on"
    )
    competencies_to_develop = models.JSONField(
        default=list, 
        help_text="Competencies to develop or enhance"
    )
    
    # Requirements
    total_hours_planned = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        help_text="Total CPD hours planned for the year"
    )
    active_cpd_hours_planned = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        help_text="Active CPD hours planned (minimum 50% of total)"
    )
    peer_consultation_hours_planned = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=Decimal('0.00'),
        help_text="Peer consultation hours planned"
    )
    
    # Status and Approval
    status = models.CharField(max_length=20, choices=PLAN_STATUS_CHOICES, default='DRAFT')
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='approved_cpd_plans'
    )
    
    # Progress Tracking
    total_hours_completed = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=Decimal('0.00')
    )
    active_cpd_hours_completed = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=Decimal('0.00')
    )
    peer_consultation_hours_completed = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=Decimal('0.00')
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.title} - {self.user.get_full_name()} ({self.year})"
    
    class Meta:
        verbose_name = "CPD Plan"
        verbose_name_plural = "CPD Plans"
        ordering = ['-year', '-created_at']
        unique_together = ['user', 'year']
        indexes = [
            models.Index(fields=['user', 'year']),
            models.Index(fields=['status']),
        ]
    
    @property
    def progress_percentage(self):
        """Calculate completion percentage"""
        if self.total_hours_planned > 0:
            return (self.total_hours_completed / self.total_hours_planned) * 100
        return 0
    
    @property
    def active_cpd_percentage(self):
        """Calculate active CPD percentage"""
        if self.total_hours_completed > 0:
            return (self.active_cpd_hours_completed / self.total_hours_completed) * 100
        return 0

class CPDRequirement(models.Model):
    """CPD requirements by role and year"""
    
    ROLE_CHOICES = [
        ('PROVISIONAL', 'Provisional Psychologist'),
        ('REGISTRAR', 'Psychology Registrar'),
        ('GENERAL', 'General Registration'),
        ('SUPERVISOR', 'Board-Approved Supervisor'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    year = models.IntegerField()
    
    # Requirements
    total_hours_required = models.IntegerField(help_text="Total CPD hours required per year")
    active_cpd_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=Decimal('50.00'),
        help_text="Minimum percentage that must be active CPD"
    )
    peer_consultation_hours = models.IntegerField(
        default=0,
        help_text="Required peer consultation hours per year"
    )
    
    # Additional Requirements
    requires_plan_approval = models.BooleanField(
        default=False,
        help_text="Does this role require CPD plan approval?"
    )
    requires_evidence = models.BooleanField(
        default=True,
        help_text="Does this role require evidence submission?"
    )
    
    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.get_role_display()} - {self.year} ({self.total_hours_required}h)"
    
    class Meta:
        verbose_name = "CPD Requirement"
        verbose_name_plural = "CPD Requirements"
        unique_together = ['role', 'year']
        ordering = ['-year', 'role']

class CPDComplianceReport(models.Model):
    """Annual CPD compliance reports"""
    
    REPORT_STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
        ('APPROVED', 'Approved'),
        ('NON_COMPLIANT', 'Non-Compliant'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cpd_reports')
    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='cpd_reports')
    
    # Report Details
    year = models.IntegerField()
    report_period_start = models.DateField()
    report_period_end = models.DateField()
    
    # Compliance Data
    total_hours_completed = models.DecimalField(max_digits=5, decimal_places=2)
    active_cpd_hours = models.DecimalField(max_digits=5, decimal_places=2)
    peer_consultation_hours = models.DecimalField(max_digits=5, decimal_places=2)
    
    # Requirements
    total_hours_required = models.IntegerField()
    active_cpd_percentage_required = models.DecimalField(max_digits=5, decimal_places=2)
    peer_consultation_hours_required = models.IntegerField()
    
    # Compliance Status
    is_compliant = models.BooleanField(default=False)
    compliance_notes = models.TextField(blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=REPORT_STATUS_CHOICES, default='DRAFT')
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='approved_cpd_reports'
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"CPD Report {self.year} - {self.user.get_full_name()}"
    
    class Meta:
        verbose_name = "CPD Compliance Report"
        verbose_name_plural = "CPD Compliance Reports"
        unique_together = ['user', 'year']
        ordering = ['-year', '-created_at']