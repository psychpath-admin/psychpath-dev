from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.exceptions import ValidationError
from datetime import timedelta, time, datetime
import json
import re
import uuid


class RegistrarProgram(models.Model):
    """Registrar program tracking model"""
    
    QUALIFICATION_TIER_CHOICES = [
        ('masters', 'Masters (6th-year) or APAC bridging (first AoPE)'),
        ('masters_phd', 'Combined Masters/PhD (6th-year w/ doctoral thesis) or bridging (subsequent AoPE)'),
        ('doctoral', 'Doctoral (7th-year+)'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('midpoint_submitted', 'Midpoint Submitted'),
        ('final_submitted', 'Final Submitted'),
        ('endorsed', 'Endorsed'),
    ]
    
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
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='registrar_programs')
    aope = models.CharField(max_length=50, choices=AOPE_CHOICES)
    qualification_tier = models.CharField(max_length=30, choices=QUALIFICATION_TIER_CHOICES)
    fte_fraction = models.DecimalField(max_digits=3, decimal_places=2, default=1.00, help_text="Full-time equivalent fraction")
    start_date = models.DateField()
    expected_end_date = models.DateField()
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft')
    
    # Program targets based on qualification tier
    targets_practice_hrs = models.IntegerField(help_text="Target practice hours for this program")
    targets_supervision_hrs = models.IntegerField(help_text="Target supervision hours for this program")
    targets_cpd_hrs = models.IntegerField(help_text="Target CPD hours for this program")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('user', 'aope', 'start_date')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.get_aope_display()} ({self.get_qualification_tier_display()})"
    
    def clean(self):
        # Set targets based on qualification tier
        if self.qualification_tier == 'masters':
            self.targets_practice_hrs = 3000
            self.targets_supervision_hrs = 80
            self.targets_cpd_hrs = 80
        elif self.qualification_tier == 'masters_phd':
            self.targets_practice_hrs = 2250
            self.targets_supervision_hrs = 60
            self.targets_cpd_hrs = 60
        elif self.qualification_tier == 'doctoral':
            self.targets_practice_hrs = 1500
            self.targets_supervision_hrs = 40
            self.targets_cpd_hrs = 40
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


class RegistrarPracticeEntry(models.Model):
    """Practice hours tracking for registrar program"""
    
    SETTING_CHOICES = [
        ('clinic', 'Clinic'),
        ('inpatient', 'Inpatient'),
        ('community', 'Community'),
        ('edu', 'Educational'),
        ('research', 'Research'),
        ('mgmt', 'Management'),
        ('other', 'Other'),
    ]
    
    CLIENT_GROUP_CHOICES = [
        ('adult', 'Adult'),
        ('child', 'Child'),
        ('family', 'Family'),
        ('org', 'Organisation'),
        ('other', 'Other'),
    ]
    
    program = models.ForeignKey(RegistrarProgram, on_delete=models.CASCADE, related_name='practice_entries')
    date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    hours = models.DecimalField(max_digits=4, decimal_places=2, help_text="Hours worked")
    is_dcc = models.BooleanField(default=False, help_text="Direct Client Contact")
    setting = models.CharField(max_length=20, choices=SETTING_CHOICES, default='clinic')
    client_group = models.CharField(max_length=20, choices=CLIENT_GROUP_CHOICES, default='adult')
    description = models.TextField()
    competency_tags = models.JSONField(default=list, blank=True, help_text="Array of competency tags")
    evidence_files = models.JSONField(default=dict, blank=True, help_text="Evidence file references")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date', '-created_at']
    
    def __str__(self):
        return f"{self.program.user.email} - {self.date} - {self.hours}h ({'DCC' if self.is_dcc else 'Practice'})"


class RegistrarSupervisionEntry(models.Model):
    """Supervision sessions tracking for registrar program"""
    
    MODE_CHOICES = [
        ('in_person', 'In Person'),
        ('video', 'Video'),
        ('phone', 'Phone'),
    ]
    
    TYPE_CHOICES = [
        ('individual', 'Individual (1:1)'),
        ('group', 'Group'),
    ]
    
    SUPERVISOR_CATEGORY_CHOICES = [
        ('principal', 'Principal Supervisor'),
        ('secondary_same_aope', 'Secondary Supervisor (Same AoPE)'),
        ('secondary_other_or_not_endorsed', 'Secondary Supervisor (Different AoPE or Not Endorsed)'),
    ]
    
    program = models.ForeignKey(RegistrarProgram, on_delete=models.CASCADE, related_name='supervision_entries')
    date = models.DateField()
    duration_minutes = models.PositiveIntegerField(help_text="Duration in minutes")
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default='in_person')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='individual')
    supervisor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='supervision_sessions_given')
    supervisor_category = models.CharField(max_length=50, choices=SUPERVISOR_CATEGORY_CHOICES)
    topics = models.TextField(blank=True)
    observed = models.BooleanField(default=False, help_text="Was this session observed?")
    shorter_than_60min = models.BooleanField(default=False, help_text="Session shorter than 60 minutes")
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date', '-created_at']
    
    def __str__(self):
        return f"{self.program.user.email} - {self.date} - {self.duration_minutes}min ({self.get_type_display()})"
    
    def clean(self):
        # Auto-set shorter_than_60min based on duration
        if self.duration_minutes < 60:
            self.shorter_than_60min = True
        else:
            self.shorter_than_60min = False


class RegistrarCpdEntry(models.Model):
    """CPD activities tracking for registrar program"""
    
    program = models.ForeignKey(RegistrarProgram, on_delete=models.CASCADE, related_name='cpd_entries')
    date = models.DateField()
    provider = models.CharField(max_length=255)
    title = models.CharField(max_length=255)
    hours = models.DecimalField(max_digits=4, decimal_places=2)
    is_active_cpd = models.BooleanField(default=True, help_text="Active CPD vs other learning")
    learning_goal = models.TextField(blank=True)
    reflection = models.TextField(blank=True)
    evidence_files = models.JSONField(default=dict, blank=True, help_text="Evidence file references")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date', '-created_at']
    
    def __str__(self):
        return f"{self.program.user.email} - {self.date} - {self.title} ({self.hours}h)"


class SupervisorProfile(models.Model):
    """Enhanced supervisor profile for registrar supervision"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='supervisor_profile')
    is_BAS = models.BooleanField(default=False, help_text="Board-Approved Supervisor")
    aope_endorsements = models.JSONField(default=list, blank=True, help_text="List of AoPE endorsements")
    years_endorsed = models.JSONField(default=dict, blank=True, help_text="Years endorsed per AoPE")
    is_registrar_principal_approved = models.BooleanField(default=False, help_text="Approved as Principal Supervisor for Registrars")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.email} - BAS: {self.is_BAS}, Principal: {self.is_registrar_principal_approved}"
    
    def can_supervise_principal(self, registrar_aope):
        """Check if can be principal supervisor for specific AoPE"""
        if not self.is_BAS or not self.is_registrar_principal_approved:
            return False
        
        if registrar_aope not in self.aope_endorsements:
            return False
        
        # Must be endorsed for at least 2 years in the AoPE
        years = self.years_endorsed.get(registrar_aope, 0)
        return years >= 2
    
    def can_supervise_secondary_same_aope(self, registrar_aope):
        """Check if can be secondary supervisor with same AoPE"""
        if not self.is_BAS:
            return False
        
        return registrar_aope in self.aope_endorsements
    
    def get_supervisor_category(self, registrar_aope):
        """Determine supervisor category for registrar"""
        if self.can_supervise_principal(registrar_aope):
            return 'principal'
        elif self.can_supervise_secondary_same_aope(registrar_aope):
            return 'secondary_same_aope'
        else:
            return 'secondary_other_or_not_endorsed'


class CompetencyFramework(models.Model):
    """AoPE competency framework definitions"""
    
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
    
    aope = models.CharField(max_length=50, choices=AOPE_CHOICES)
    category_code = models.CharField(max_length=20)
    label = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    class Meta:
        unique_together = ('aope', 'category_code')
        ordering = ['aope', 'category_code']
    
    def __str__(self):
        return f"{self.get_aope_display()} - {self.category_code}: {self.label}"


class ProgressSnapshot(models.Model):
    """Immutable progress snapshots for PREA/AECR reports"""
    
    SNAPSHOT_TYPE_CHOICES = [
        ('midpoint', 'Midpoint (PREA-76)'),
        ('final', 'Final (AECR-76)'),
    ]
    
    program = models.ForeignKey(RegistrarProgram, on_delete=models.CASCADE, related_name='progress_snapshots')
    type = models.CharField(max_length=20, choices=SNAPSHOT_TYPE_CHOICES)
    snapshot_json = models.JSONField(help_text="Complete snapshot of program state")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.program.user.email} - {self.get_type_display()} ({self.created_at.date()})"


class AuditLog(models.Model):
    """Audit trail for registrar program activities"""
    
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('submit', 'Submit'),
        ('approve', 'Approve'),
        ('export', 'Export'),
    ]
    
    ENTITY_TYPE_CHOICES = [
        ('program', 'Program'),
        ('practice_entry', 'Practice Entry'),
        ('supervision_entry', 'Supervision Entry'),
        ('cpd_entry', 'CPD Entry'),
        ('progress_snapshot', 'Progress Snapshot'),
    ]
    
    actor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='audit_actions')
    program = models.ForeignKey(RegistrarProgram, on_delete=models.CASCADE, related_name='audit_logs')
    entity_type = models.CharField(max_length=30, choices=ENTITY_TYPE_CHOICES)
    entity_id = models.PositiveIntegerField(null=True, blank=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional action metadata")
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['program', 'timestamp']),
            models.Index(fields=['actor', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.actor.email} - {self.action} {self.entity_type} in {self.program.user.email}'s program"


