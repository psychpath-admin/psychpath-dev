from django.db import models
from api.models import UserProfile
from django.db.models import Sum
from datetime import timedelta, datetime

class SupervisionEntry(models.Model):
    SUPERVISOR_TYPE_CHOICES = [
        ('PRINCIPAL', 'Principal'),
        ('SECONDARY', 'Secondary'),
    ]
    
    SUPERVISION_TYPE_CHOICES = [
        ('INDIVIDUAL', 'Individual'),
        ('GROUP', 'Group'),
        ('OTHER', 'Other'),
    ]
    
    # Supervision mode (AHPRA compliance)
    SUPERVISION_MODE_CHOICES = [
        ('DIRECT_PERSON', 'Direct - In Person'),
        ('DIRECT_VIDEO', 'Direct - Video Conference'),
        ('DIRECT_PHONE', 'Direct - Phone'),
        ('INDIRECT', 'Indirect (Written/Asynchronous)'),
    ]

    trainee = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='supervision_entries')
    date_of_supervision = models.DateField()
    week_starting = models.DateField(help_text="Week starting date for grouping")
    supervisor_name = models.CharField(max_length=255)
    supervisor_type = models.CharField(max_length=20, choices=SUPERVISOR_TYPE_CHOICES)
    supervision_type = models.CharField(max_length=20, choices=SUPERVISION_TYPE_CHOICES)
    duration_minutes = models.IntegerField(help_text="Duration in minutes")
    summary = models.TextField(help_text="Supervision summary and key points discussed")
    
    # AHPRA supervision requirements
    supervision_mode = models.CharField(
        max_length=20, 
        choices=SUPERVISION_MODE_CHOICES,
        default='DIRECT_PERSON',
        help_text="Mode of supervision delivery (AHPRA requirement)"
    )
    is_cultural_supervision = models.BooleanField(
        default=False,
        help_text="Is this culturally-informed or mentoring supervision?"
    )
    supervisor_is_board_approved = models.BooleanField(
        default=True,
        help_text="Is the supervisor Board-approved (BAS)?"
    )
    
    # Logbook integration
    locked = models.BooleanField(default=False, help_text="True if this entry is part of a submitted logbook")
    supervisor_comment = models.TextField(blank=True, default="", help_text="Supervisor comment for this entry when reviewing a logbook")
    trainee_response = models.TextField(blank=True, default="", help_text="Trainee response to supervisor comment when resubmitting")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Supervision Entry"
        verbose_name_plural = "Supervision Entries"
        ordering = ['-date_of_supervision', '-created_at']

    def __str__(self):
        return f"{self.trainee.user.email} - {self.supervisor_name} on {self.date_of_supervision}"


    @property
    def duration_display(self):
        hours = self.duration_minutes // 60
        minutes = self.duration_minutes % 60
        return f"{hours}:{minutes:02d}"

    @property
    def duration_hours_minutes(self):
        hours = self.duration_minutes // 60
        minutes = self.duration_minutes % 60
        return f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"

class SupervisionWeeklySummary(models.Model):
    trainee = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='supervision_weekly_summaries')
    week_starting = models.DateField()
    week_total_minutes = models.IntegerField(default=0)
    cumulative_total_minutes = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Supervision Weekly Summary"
        verbose_name_plural = "Supervision Weekly Summaries"
        ordering = ['-week_starting']
        unique_together = ('trainee', 'week_starting')

    def __str__(self):
        return f"{self.trainee.user.email} - Week {self.week_starting} - {self.week_total_minutes} min"

    @property
    def week_total_display(self):
        hours = self.week_total_minutes // 60
        minutes = self.week_total_minutes % 60
        return f"{hours:02d}:{minutes:02d}"

    @property
    def cumulative_total_display(self):
        hours = self.cumulative_total_minutes // 60
        minutes = self.cumulative_total_minutes % 60
        return f"{hours:02d}:{minutes:02d}"

    def update_totals(self):
        # Calculate week total
        week_entries = SupervisionEntry.objects.filter(
            trainee=self.trainee,
            date_of_supervision__gte=self.week_starting,
            date_of_supervision__lt=self.week_starting + timedelta(days=7)
        )
        self.week_total_minutes = week_entries.aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0

        # Calculate cumulative total up to the end of this week
        all_entries_up_to_week = SupervisionEntry.objects.filter(
            trainee=self.trainee,
            date_of_supervision__lt=self.week_starting + timedelta(days=7)
        )
        self.cumulative_total_minutes = all_entries_up_to_week.aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
        self.save()


class SupervisionObservation(models.Model):
    """Tracks supervisor observations of trainee sessions (AHPRA requirement)"""
    OBSERVATION_TYPE_CHOICES = [
        ('ASSESSMENT', 'Psychological Assessment'),
        ('INTERVENTION', 'Psychological Intervention'),
    ]
    
    OBSERVATION_METHOD_CHOICES = [
        ('IN_PERSON', 'In Person'),
        ('VIDEO_LIVE', 'Live Video'),
        ('VIDEO_RECORDING', 'Video Recording'),
        ('AUDIO_RECORDING', 'Audio Recording'),
    ]
    
    trainee = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='supervision_observations')
    supervisor = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='conducted_observations')
    observation_date = models.DateField()
    observation_type = models.CharField(max_length=20, choices=OBSERVATION_TYPE_CHOICES)
    observation_method = models.CharField(max_length=20, choices=OBSERVATION_METHOD_CHOICES)
    client_pseudonym = models.CharField(max_length=100, blank=True)
    session_duration_minutes = models.IntegerField()
    
    # Feedback
    supervisor_feedback = models.TextField(help_text="Supervisor's observations and feedback")
    trainee_reflection = models.TextField(blank=True, help_text="Trainee's reflection on the observation")
    
    # Linked to supervision session
    related_supervision_entry = models.ForeignKey(
        SupervisionEntry, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        help_text="Link to the supervision session where this was discussed"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-observation_date']
        verbose_name = "Supervision Observation"
        verbose_name_plural = "Supervision Observations"
    
    def __str__(self):
        return f"{self.trainee.user.email} - {self.observation_type} observed by {self.supervisor.user.email} on {self.observation_date}"


class SupervisionComplianceReport(models.Model):
    """Tracks AHPRA supervision compliance status"""
    trainee = models.OneToOneField(UserProfile, on_delete=models.CASCADE, related_name='supervision_compliance')
    
    # Total hours tracking
    total_supervision_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    individual_supervision_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    group_supervision_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    
    # Mode tracking
    direct_inperson_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    direct_video_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    direct_phone_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    indirect_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    
    # Cultural supervision
    cultural_supervision_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    
    # Observations
    assessment_observations_count = models.IntegerField(default=0)
    intervention_observations_count = models.IntegerField(default=0)
    
    # Compliance flags
    meets_total_hours = models.BooleanField(default=False)
    meets_individual_requirement = models.BooleanField(default=False)
    meets_direct_requirement = models.BooleanField(default=False)
    meets_observation_requirement = models.BooleanField(default=False)
    meets_distribution_requirement = models.BooleanField(default=False)
    is_compliant = models.BooleanField(default=False)
    
    # Warnings
    warnings = models.JSONField(default=list, help_text="List of compliance warnings")
    
    last_calculated = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Supervision Compliance Report"
        verbose_name_plural = "Supervision Compliance Reports"
    
    def __str__(self):
        return f"Compliance Report for {self.trainee.user.email}"
