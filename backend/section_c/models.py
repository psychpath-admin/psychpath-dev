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

    trainee = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='supervision_entries')
    date_of_supervision = models.DateField()
    supervisor_name = models.CharField(max_length=255)
    supervisor_type = models.CharField(max_length=20, choices=SUPERVISOR_TYPE_CHOICES)
    supervision_type = models.CharField(max_length=20, choices=SUPERVISION_TYPE_CHOICES)
    duration_minutes = models.IntegerField(help_text="Duration in minutes")
    summary = models.TextField(help_text="Supervision summary and key points discussed")
    
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
    def week_starting(self):
        # Calculate the Monday of the week for the given date_of_supervision
        # Monday is 0, Sunday is 6
        days_since_monday = self.date_of_supervision.weekday()
        return self.date_of_supervision - timedelta(days=days_since_monday)

    @property
    def duration_display(self):
        hours = self.duration_minutes // 60
        minutes = self.duration_minutes % 60
        return f"{hours:02d}:{minutes:02d}"

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
