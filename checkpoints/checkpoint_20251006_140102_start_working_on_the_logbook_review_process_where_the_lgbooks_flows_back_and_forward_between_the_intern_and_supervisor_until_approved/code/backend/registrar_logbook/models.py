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


class RegistrarPracticeEntry(models.Model):
    """Registrar practice entry for tracking clinical work"""
    
    DCC_CATEGORIES = [
        ('assessment', 'Assessment'),
        ('intervention', 'Intervention'),
        ('consultation', 'Consultation'),
        ('management_planning', 'Management Planning'),
    ]
    
    SETTING_CHOICES = [
        ('outpatient', 'Outpatient'),
        ('inpatient', 'Inpatient'),
        ('community', 'Community'),
        ('education', 'Education'),
        ('research', 'Research'),
        ('management', 'Management'),
        ('telehealth', 'Telehealth'),
        ('other', 'Other'),
    ]
    
    MODALITY_CHOICES = [
        ('in_person', 'In Person'),
        ('video', 'Video'),
        ('phone', 'Phone'),
        ('asynchronous', 'Asynchronous'),
    ]
    
    CLIENT_AGE_BANDS = [
        ('0-12', '0-12 years'),
        ('13-17', '13-17 years'),
        ('18-25', '18-25 years'),
        ('26-44', '26-44 years'),
        ('45-64', '45-64 years'),
        ('65+', '65+ years'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    program = models.ForeignKey(RegistrarProgram, on_delete=models.CASCADE, related_name='practice_entries', db_index=True)
    date = models.DateField(help_text="Date of practice activity")
    start_time = models.TimeField(null=True, blank=True, help_text="Start time (optional)")
    end_time = models.TimeField(null=True, blank=True, help_text="End time (optional)")
    duration_minutes = models.PositiveIntegerField(help_text="Total practice minutes")
    dcc_minutes = models.PositiveIntegerField(default=0, help_text="Direct client contact minutes")
    dcc_categories = models.JSONField(default=list, help_text="DCC categories for this entry")
    
    setting = models.CharField(max_length=20, choices=SETTING_CHOICES, help_text="Practice setting")
    modality = models.CharField(max_length=20, choices=MODALITY_CHOICES, help_text="Service modality")
    client_code = models.CharField(max_length=10, help_text="Non-identifying client code (e.g., C-044)")
    client_age_band = models.CharField(max_length=10, choices=CLIENT_AGE_BANDS, help_text="Client age band")
    presenting_issue = models.CharField(max_length=120, blank=True, null=True, help_text="Brief presenting issue (no PII)")
    tasks = models.TextField(help_text="What was done (no PII)")
    competency_tags = models.JSONField(default=list, help_text="Competency framework tags")
    observed = models.BooleanField(default=False, help_text="Was any portion observed by supervisor")
    supervisor_followup_date = models.DateField(null=True, blank=True, help_text="Scheduled supervisor follow-up")
    evidence_files = models.JSONField(default=list, help_text="Evidence files metadata")
    
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_practice_entries')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'registrar_logbook_registrarpracticeentry'
        ordering = ['-date', '-start_time']
        indexes = [
            models.Index(fields=['program', 'date']),
            models.Index(fields=['program', 'dcc_minutes']),
            models.Index(fields=['program', 'competency_tags']),  # GIN index in PostgreSQL
        ]
    
    def __str__(self):
        return f"{self.date} - {self.duration_minutes}min ({self.dcc_minutes}min DCC) - {self.client_code}"
    
    def clean(self):
        """Validate the practice entry"""
        super().clean()
        
        # Validate duration calculation
        if self.start_time and self.end_time:
            start_datetime = datetime.combine(self.date, self.start_time)
            end_datetime = datetime.combine(self.date, self.end_time)
            
            # Check for cross-midnight entries
            if end_datetime <= start_datetime:
                raise ValidationError("End time must be after start time. Entries cannot span midnight.")
            
            # Calculate expected duration
            calculated_duration = int((end_datetime - start_datetime).total_seconds() / 60)
            
            # Warn if there's a significant mismatch
            if self.duration_minutes and abs(self.duration_minutes - calculated_duration) > 5:
                # Use calculated duration if provided duration differs significantly
                self.duration_minutes = calculated_duration
        
        # Validate duration limits
        if self.duration_minutes <= 0:
            raise ValidationError("Duration must be greater than 0 minutes")
        if self.duration_minutes > 720:  # 12 hours
            raise ValidationError("Duration cannot exceed 720 minutes (12 hours)")
        
        # Validate DCC minutes
        if self.dcc_minutes < 0:
            raise ValidationError("DCC minutes cannot be negative")
        if self.dcc_minutes > self.duration_minutes:
            raise ValidationError("DCC minutes cannot exceed total duration")
        
        # Validate DCC categories when DCC > 0
        if self.dcc_minutes > 0 and not self.dcc_categories:
            raise ValidationError("DCC categories must be specified when DCC minutes > 0")
        
        # Validate client code format - allow flexible anonymous codes
        if not re.match(r'^[A-Z0-9]+(-[A-Z0-9]+)*$', self.client_code):
            raise ValidationError("Client code must contain only letters, numbers, and hyphens (e.g., C-044, BM-1961-M, A123-B456)")
        
        # Validate tasks length
        if len(self.tasks.strip()) < 10:
            raise ValidationError("Tasks description must be at least 10 characters")
        if len(self.tasks.strip()) > 500:
            raise ValidationError("Tasks description cannot exceed 500 characters")
        
        # Check for PII in tasks
        self._validate_no_pii(self.tasks, "tasks")
        if self.presenting_issue:
            self._validate_no_pii(self.presenting_issue, "presenting_issue")
        
        # Validate DCC categories
        valid_categories = [choice[0] for choice in self.DCC_CATEGORIES]
        for category in self.dcc_categories:
            if category not in valid_categories:
                raise ValidationError(f"Invalid DCC category: {category}")
        
        # Validate competency tags (will be validated against framework in serializer)
        if not isinstance(self.competency_tags, list):
            raise ValidationError("Competency tags must be a list")
    
    def _validate_no_pii(self, text, field_name):
        """Check for obvious PII patterns in text"""
        pii_patterns = [
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email
            r'\b\d{4}\s?\d{3}\s?\d{3}\b',  # Phone numbers
            r'\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b',  # Credit card
            r'\b\d{2}/\d{2}/\d{4}\b',  # Date patterns
            r'\b\d{2}-\d{2}-\d{4}\b',  # Date patterns
            r'\b\d{11}\b',  # Medicare number pattern
        ]
        
        for pattern in pii_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                raise ValidationError(f"{field_name} contains potentially identifying information. Please remove any names, emails, phone numbers, or dates.")
    
    @property
    def dcc_ratio(self):
        """Calculate DCC as percentage of total duration"""
        if self.duration_minutes == 0:
            return 0
        return round((self.dcc_minutes / self.duration_minutes) * 100, 1)
    
    @property
    def duration_hours(self):
        """Duration in hours as decimal"""
        return round(self.duration_minutes / 60, 2)
    
    @property
    def dcc_hours(self):
        """DCC duration in hours as decimal"""
        return round(self.dcc_minutes / 60, 2)
