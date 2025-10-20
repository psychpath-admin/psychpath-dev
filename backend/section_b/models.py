from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator


class ProfessionalDevelopmentEntry(models.Model):
    """Professional Development Activity Entry"""
    
    ACTIVITY_TYPES = [
        ('WORKSHOP', 'Workshop'),
        ('WEBINAR', 'Webinar'),
        ('LECTURE', 'Lecture'),
        ('PRESENTATION', 'Presentation'),
        ('READING', 'Reading'),
        ('COURSE', 'Course'),
        ('CONFERENCE', 'Conference'),
        ('TRAINING', 'Training'),
        ('OTHER', 'Other'),
    ]
    
    trainee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pd_entries')
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    date_of_activity = models.DateField()
    duration_minutes = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(1440)]  # Max 24 hours
    )
    is_active_activity = models.BooleanField(default=True)
    activity_details = models.TextField(help_text="E.g. name of course, presenter, institution etc")
    topics_covered = models.TextField(help_text="E.g. behavioural interventions for ADHD in adolescents")
    competencies_covered = models.JSONField(default=list, help_text="List of selected competencies")
    reflection = models.TextField(blank=True, default="", help_text="Reflection on learning and application")
    week_starting = models.DateField(help_text="Week starting date for grouping")
    
    # Logbook integration
    locked = models.BooleanField(default=False, help_text="True if this entry is part of a submitted logbook")
    supervisor_comment = models.TextField(blank=True, default="", help_text="Supervisor comment for this entry when reviewing a logbook")
    trainee_response = models.TextField(blank=True, default="", help_text="Trainee response to supervisor comment when resubmitting")
    
    # AHPRA Compliance - Supervisor Initials (separate from reviewed status)
    supervisor_initials = models.CharField(
        max_length=10,
        blank=True,
        help_text="Supervisor initials confirming review and discussion"
    )
    
    reviewed_in_supervision = models.BooleanField(
        default=False,
        help_text="Whether this PD activity has been reviewed and discussed in supervision"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date_of_activity', '-created_at']
        verbose_name = "Professional Development Entry"
        verbose_name_plural = "Professional Development Entries"
    
    def __str__(self):
        return f"{self.activity_type} - {self.activity_details[:50]} ({self.date_of_activity})"
    
    @property
    def duration_hours_minutes(self):
        """Convert duration to hours:minutes format"""
        hours = self.duration_minutes // 60
        minutes = self.duration_minutes % 60
        return f"{hours}:{minutes:02d}"
    
    @property
    def duration_display(self):
        """Display duration in a readable format"""
        if self.duration_minutes < 60:
            return f"{self.duration_minutes} minutes"
        else:
            hours = self.duration_minutes // 60
            minutes = self.duration_minutes % 60
            if minutes == 0:
                return f"{hours} hour{'s' if hours != 1 else ''}"
            else:
                return f"{hours}h {minutes}m"


class PDCompetency(models.Model):
    """Available competencies for PD activities"""
    
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = "PD Competency"
        verbose_name_plural = "PD Competencies"
    
    def __str__(self):
        return self.name


class PDWeeklySummary(models.Model):
    """Weekly summary of PD hours for a trainee"""
    
    trainee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pd_weekly_summaries')
    week_starting = models.DateField()
    week_total_minutes = models.PositiveIntegerField(default=0)
    cumulative_total_minutes = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['trainee', 'week_starting']
        ordering = ['-week_starting']
        verbose_name = "PD Weekly Summary"
        verbose_name_plural = "PD Weekly Summaries"
    
    def __str__(self):
        return f"PD Week {self.week_starting} - {self.trainee.username}"
    
    @property
    def week_total_display(self):
        """Display week total in hours:minutes format"""
        hours = self.week_total_minutes // 60
        minutes = self.week_total_minutes % 60
        return f"{hours}:{minutes:02d}"
    
    @property
    def cumulative_total_display(self):
        """Display cumulative total in hours:minutes format"""
        hours = self.cumulative_total_minutes // 60
        minutes = self.cumulative_total_minutes % 60
        return f"{hours}:{minutes:02d}"
