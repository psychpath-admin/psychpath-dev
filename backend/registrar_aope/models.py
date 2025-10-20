from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from api.models import UserProfile
from registrar_logbook.models import SupervisorProfile
from section_c.models import SupervisionEntry
import json


class RegistrarProgramConfig(models.Model):
    """Configurable AHPRA requirements for registrar programs"""
    TRACK_CHOICES = [
        ('TRACK_1', 'Track 1: 2 years FTE'),
        ('TRACK_2', 'Track 2: 3 years FTE'),
        ('TRACK_3', 'Track 3: 4 years FTE'),
    ]
    
    track = models.CharField(max_length=10, choices=TRACK_CHOICES, unique=True)
    version = models.CharField(max_length=20, default='1.0')
    is_active = models.BooleanField(default=True)
    
    # Core Requirements (metadata, not hardcoded)
    duration_years = models.IntegerField()
    total_hours_required = models.IntegerField(default=2000)
    direct_contact_annual_hours = models.IntegerField(default=176)
    supervision_hours_required = models.IntegerField()
    cpd_hours_required = models.IntegerField()
    active_cpd_percentage = models.FloatField(default=0.5)
    peer_consultation_hours = models.IntegerField(default=10)
    
    # Supervision Rules (metadata)
    principal_supervisor_min_percentage = models.FloatField(default=50.0)
    individual_supervision_min_percentage = models.FloatField(default=66.6)
    short_session_max_hours = models.IntegerField(default=10)
    short_session_threshold_minutes = models.IntegerField(default=60)
    direct_supervision_hours_per_fte = models.IntegerField(default=40)
    
    # Observation Requirements (metadata)
    observation_frequency_days = models.IntegerField(default=180)
    observation_warning_days = models.IntegerField(default=150)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.get_track_display()} (v{self.version})"
    
    class Meta:
        verbose_name = "Registrar Program Configuration"
        verbose_name_plural = "Registrar Program Configurations"


class RegistrarProfile(models.Model):
    """Registrar profile for Area of Practice Endorsement program"""
    
    # Program Tracks
    TRACK_1 = 'TRACK_1'
    TRACK_2 = 'TRACK_2' 
    TRACK_3 = 'TRACK_3'
    TRACK_CHOICES = [
        (TRACK_1, 'Track 1 (2 years, 2000 hours)'),
        (TRACK_2, 'Track 2 (2 years, 2000 hours)'),
        (TRACK_3, 'Track 3 (2 years, 2000 hours)'),
    ]
    
    # AoPE Areas
    CLINICAL = 'CLINICAL'
    COUNSELLING = 'COUNSELLING'
    EDUCATIONAL = 'EDUCATIONAL'
    FORENSIC = 'FORENSIC'
    HEALTH = 'HEALTH'
    NEUROPSYCHOLOGY = 'NEUROPSYCHOLOGY'
    ORGANISATIONAL = 'ORGANISATIONAL'
    SPORT = 'SPORT'
    COMMUNITY = 'COMMUNITY'
    AOPE_CHOICES = [
        (CLINICAL, 'Clinical Psychology'),
        (COUNSELLING, 'Counselling Psychology'),
        (EDUCATIONAL, 'Educational Psychology'),
        (FORENSIC, 'Forensic Psychology'),
        (HEALTH, 'Health Psychology'),
        (NEUROPSYCHOLOGY, 'Neuropsychology'),
        (ORGANISATIONAL, 'Organisational Psychology'),
        (SPORT, 'Sport Psychology'),
        (COMMUNITY, 'Community Psychology'),
    ]
    
    # Status
    ENROLLED = 'ENROLLED'
    ACTIVE = 'ACTIVE'
    ON_LEAVE = 'ON_LEAVE'
    COMPLETED = 'COMPLETED'
    WITHDRAWN = 'WITHDRAWN'
    STATUS_CHOICES = [
        (ENROLLED, 'Enrolled'),
        (ACTIVE, 'Active'),
        (ON_LEAVE, 'On Leave'),
        (COMPLETED, 'Completed'),
        (WITHDRAWN, 'Withdrawn'),
    ]
    
    # Core fields
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='registrar_profile')
    aope_area = models.CharField(max_length=20, choices=AOPE_CHOICES)
    program_track = models.CharField(max_length=10, choices=TRACK_CHOICES)
    enrollment_date = models.DateField()
    expected_completion_date = models.DateField()
    fte_fraction = models.FloatField(default=1.0, validators=[MinValueValidator(0.1), MaxValueValidator(1.0)])
    
    # Supervisors
    principal_supervisor = models.ForeignKey(SupervisorProfile, on_delete=models.PROTECT, related_name='principal_registrars')
    secondary_supervisor = models.ForeignKey(SupervisorProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='secondary_registrars')
    
    # Requirements (calculated based on track and FTE)
    direct_contact_requirement = models.IntegerField(default=176)  # hours per year
    board_variation_enabled = models.BooleanField(default=False)
    board_variation_doc = models.FileField(upload_to='registrar/variations/', null=True, blank=True)
    
    # Program requirements (set by track)
    total_weeks_required = models.IntegerField(default=104)  # 2 years
    supervision_hours_required = models.IntegerField(default=200)  # 200 hours over 2 years
    cpd_hours_required = models.IntegerField(default=60)  # 60 hours over 2 years
    
    # Status
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default=ENROLLED)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Registrar Profile"
        verbose_name_plural = "Registrar Profiles"
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.get_aope_area_display()} ({self.get_program_track_display()})"
    
    @property
    def years_since_enrollment(self):
        """Calculate years since enrollment"""
        return (timezone.now().date() - self.enrollment_date).days / 365.25
    
    @property
    def is_on_track(self):
        """Check if registrar is on track for completion"""
        return self.status in [self.ACTIVE, self.ENROLLED]
    
    def get_effective_fte(self):
        """Calculate effective FTE accounting for leave periods"""
        # This will be implemented with leave management
        return self.fte_fraction


class PracticeLog(models.Model):
    """Practice activity logging for registrars"""
    
    # Practice types
    DIRECT_CLIENT = 'DIRECT_CLIENT'
    CLIENT_RELATED = 'CLIENT_RELATED'
    NONCLINICAL_PROFESSIONAL = 'NONCLINICAL_PROFESSIONAL'
    PRACTICE_TYPE_CHOICES = [
        (DIRECT_CLIENT, 'Direct Client Contact'),
        (CLIENT_RELATED, 'Client-Related Activity'),
        (NONCLINICAL_PROFESSIONAL, 'Non-clinical Professional Activity'),
    ]
    
    # Competency areas (C1-C8)
    C1 = 'C1'
    C2 = 'C2'
    C3 = 'C3'
    C4 = 'C4'
    C5 = 'C5'
    C6 = 'C6'
    C7 = 'C7'
    C8 = 'C8'
    COMPETENCY_CHOICES = [
        (C1, 'C1: Knowledge of the discipline'),
        (C2, 'C2: Ethical, legal and professional matters'),
        (C3, 'C3: Psychological assessment and measurement'),
        (C4, 'C4: Intervention strategies'),
        (C5, 'C5: Research and evaluation'),
        (C6, 'C6: Communication and interpersonal relationships'),
        (C7, 'C7: Working within a cross-cultural context'),
        (C8, 'C8: Practice across the lifespan'),
    ]
    
    registrar = models.ForeignKey(RegistrarProfile, on_delete=models.CASCADE, related_name='practice_logs')
    date = models.DateField()
    duration_hours = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(0.1)])
    practice_type = models.CharField(max_length=25, choices=PRACTICE_TYPE_CHOICES)
    aope_alignment = models.BooleanField(default=True, help_text="Activity aligns with AoPE area")
    
    # Activity details
    activity_description = models.TextField()
    setting = models.CharField(max_length=200, help_text="Setting/context of activity")
    competencies = models.JSONField(default=list, help_text="List of competencies addressed (C1-C8)")
    
    # Reflection (required for direct client contact)
    reflection_text = models.TextField(blank=True, help_text="Required for direct client contact")
    
    # Supervisor review
    supervisor_reviewed = models.BooleanField(default=False)
    supervisor_feedback = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(SupervisorProfile, on_delete=models.SET_NULL, null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Practice Log Entry"
        verbose_name_plural = "Practice Log Entries"
        ordering = ['-date', '-created_at']
    
    def __str__(self):
        return f"{self.registrar.user.get_full_name()} - {self.get_practice_type_display()} ({self.date})"
    
    def clean(self):
        """Validate that reflection is provided for direct client contact"""
        from django.core.exceptions import ValidationError
        if self.practice_type == self.DIRECT_CLIENT and not self.reflection_text:
            raise ValidationError("Reflection is required for direct client contact activities.")


class CPDActivity(models.Model):
    """Continuing Professional Development activities for registrars"""
    
    # Activity types
    WORKSHOP = 'WORKSHOP'
    CONFERENCE = 'CONFERENCE'
    COURSE = 'COURSE'
    SUPERVISION = 'SUPERVISION'
    PEER_CONSULTATION = 'PEER_CONSULTATION'
    RESEARCH = 'RESEARCH'
    OTHER = 'OTHER'
    ACTIVITY_TYPE_CHOICES = [
        (WORKSHOP, 'Workshop'),
        (CONFERENCE, 'Conference'),
        (COURSE, 'Course'),
        (SUPERVISION, 'Supervision'),
        (PEER_CONSULTATION, 'Peer Consultation'),
        (RESEARCH, 'Research'),
        (OTHER, 'Other'),
    ]
    
    registrar = models.ForeignKey(RegistrarProfile, on_delete=models.CASCADE, related_name='cpd_activities')
    title = models.CharField(max_length=200)
    provider = models.CharField(max_length=200)
    date = models.DateField()
    duration_hours = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(0.1)])
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPE_CHOICES)
    
    # AHPRA requirements
    is_active = models.BooleanField(default=True, help_text="Meets AHPRA active CPD requirements")
    supervisor_set_task = models.TextField(blank=True, help_text="Task to make non-active CPD active")
    aope_alignment = models.BooleanField(default=True, help_text="Activity aligns with AoPE area")
    is_peer_consultation = models.BooleanField(default=False, help_text="Counts toward peer consultation hours")
    
    # Learning details
    learning_objectives = models.TextField(blank=True)
    competencies = models.JSONField(default=list, help_text="List of competencies addressed (C1-C8)")
    reflection = models.TextField(blank=True)
    evidence_file = models.FileField(upload_to='registrar/cpd_evidence/', null=True, blank=True)
    
    # Supervisor approval
    supervisor_approval = models.BooleanField(default=False)
    approved_by = models.ForeignKey(SupervisorProfile, on_delete=models.SET_NULL, null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    supervisor_notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "CPD Activity"
        verbose_name_plural = "CPD Activities"
        ordering = ['-date', '-created_at']
    
    def __str__(self):
        return f"{self.registrar.user.get_full_name()} - {self.title} ({self.date})"


class LeaveRecord(models.Model):
    """Leave tracking for registrars"""
    
    # Leave types
    PARENTAL = 'PARENTAL'
    SICK = 'SICK'
    CARER = 'CARER'
    LIFESTYLE = 'LIFESTYLE'
    OTHER = 'OTHER'
    LEAVE_TYPE_CHOICES = [
        (PARENTAL, 'Parental Leave'),
        (SICK, 'Sick Leave'),
        (CARER, 'Carer Leave'),
        (LIFESTYLE, 'Lifestyle Leave'),
        (OTHER, 'Other'),
    ]
    
    registrar = models.ForeignKey(RegistrarProfile, on_delete=models.CASCADE, related_name='leave_records')
    leave_type = models.CharField(max_length=15, choices=LEAVE_TYPE_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    approved_by_supervisor = models.BooleanField(default=False)
    approved_by = models.ForeignKey(SupervisorProfile, on_delete=models.SET_NULL, null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Leave Record"
        verbose_name_plural = "Leave Records"
        ordering = ['-start_date']
    
    def __str__(self):
        return f"{self.registrar.user.get_full_name()} - {self.get_leave_type_display()} ({self.start_date} to {self.end_date})"
    
    @property
    def duration_days(self):
        """Calculate leave duration in days"""
        return (self.end_date - self.start_date).days + 1


class ProgressReport(models.Model):
    """Progress reports for registrars (midpoint and final)"""
    
    # Report types
    MIDPOINT = 'MIDPOINT'
    FINAL = 'FINAL'
    REPORT_TYPE_CHOICES = [
        (MIDPOINT, 'Midpoint Report'),
        (FINAL, 'Final Report'),
    ]
    
    # Competency levels (M1-M4)
    M1 = 'M1'
    M2 = 'M2'
    M3 = 'M3'
    M4 = 'M4'
    COMPETENCY_LEVEL_CHOICES = [
        (M1, 'M1: Novice'),
        (M2, 'M2: Advanced Beginner'),
        (M3, 'M3: Competent'),
        (M4, 'M4: Proficient'),
    ]
    
    registrar = models.ForeignKey(RegistrarProfile, on_delete=models.CASCADE, related_name='progress_reports')
    report_type = models.CharField(max_length=10, choices=REPORT_TYPE_CHOICES)
    
    # Competency ratings (JSON: C1-C8 with M1-M4 levels)
    competency_ratings = models.JSONField(default=dict, help_text="Competency ratings: {C1: M3, C2: M2, ...}")
    
    # Supervisor feedback
    supervisor_feedback = models.TextField()
    action_plan = models.TextField(blank=True, help_text="Action plan for midpoint reports")
    
    # Signatures
    registrar_signature = models.TextField(blank=True)
    supervisor_signature = models.TextField(blank=True)
    signed_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Progress Report"
        verbose_name_plural = "Progress Reports"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.registrar.user.get_full_name()} - {self.get_report_type_display()} ({self.created_at.date()})"


class EndorsementApplication(models.Model):
    """Endorsement application for AoPE"""
    
    # Status
    DRAFT = 'DRAFT'
    SUBMITTED = 'SUBMITTED'
    APPROVED = 'APPROVED'
    REJECTED = 'REJECTED'
    STATUS_CHOICES = [
        (DRAFT, 'Draft'),
        (SUBMITTED, 'Submitted'),
        (APPROVED, 'Approved'),
        (REJECTED, 'Rejected'),
    ]
    
    registrar = models.ForeignKey(RegistrarProfile, on_delete=models.CASCADE, related_name='endorsement_applications')
    submission_date = models.DateTimeField(null=True, blank=True)
    completion_date = models.DateField(null=True, blank=True)
    
    # Summary data
    total_hours = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    supervision_summary = models.JSONField(default=dict, help_text="Supervision hours breakdown")
    cpd_summary = models.JSONField(default=dict, help_text="CPD hours breakdown")
    competency_attestation = models.JSONField(default=dict, help_text="Competency attainment summary")
    
    # Declarations
    supervisor_declaration = models.TextField(blank=True)
    registrar_declaration = models.TextField(blank=True)
    
    # Export
    exported_pdf_path = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default=DRAFT)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Endorsement Application"
        verbose_name_plural = "Endorsement Applications"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.registrar.user.get_full_name()} - Endorsement Application ({self.get_status_display()})"


class ObservationRecord(models.Model):
    """Observation records for supervision"""
    
    # Observation methods
    LIVE = 'LIVE'
    RECORDED = 'RECORDED'
    METHOD_CHOICES = [
        (LIVE, 'Live Observation'),
        (RECORDED, 'Recorded Observation'),
    ]
    
    registrar = models.ForeignKey(RegistrarProfile, on_delete=models.CASCADE, related_name='observation_records')
    supervision_session = models.ForeignKey(SupervisionEntry, on_delete=models.CASCADE, related_name='observation_records')
    observation_date = models.DateField()
    method = models.CharField(max_length=10, choices=METHOD_CHOICES)
    
    # Consent and privacy
    consent_confirmed = models.BooleanField(default=False)
    privacy_confirmed = models.BooleanField(default=False)
    
    # Feedback
    feedback_text = models.TextField()
    supervisor = models.ForeignKey(SupervisorProfile, on_delete=models.CASCADE)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Observation Record"
        verbose_name_plural = "Observation Records"
        ordering = ['-observation_date']
    
    def __str__(self):
        return f"{self.registrar.user.get_full_name()} - Observation ({self.observation_date})"