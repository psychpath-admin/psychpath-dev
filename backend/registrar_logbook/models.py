from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.exceptions import ValidationError
from datetime import timedelta


class WeeklyLogbook(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('returned', 'Returned for revision'),
    ]

    trainee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='registrar_weeks')
    week_starting = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    submitted_at = models.DateTimeField(null=True, blank=True)
    returned_reason = models.TextField(blank=True)

    # Cached weekly totals in minutes
    dcc_minutes = models.IntegerField(default=0)
    cra_minutes = models.IntegerField(default=0)
    pd_minutes = models.IntegerField(default=0)

    class Meta:
        unique_together = ('trainee', 'week_starting')
        ordering = ['-week_starting']

    def __str__(self):
        return f"{self.trainee.email} - {self.week_starting} ({self.status})"

    def clean(self):
        if self.status == 'submitted' and self.submitted_at is None:
            self.submitted_at = timezone.now()

    def recalculate_totals(self):
        qs = self.entries.all()
        self.dcc_minutes = sum(e.duration_minutes for e in qs.filter(category='direct_client_contact'))
        self.cra_minutes = sum(e.duration_minutes for e in qs.filter(category='client_related_activity'))
        self.pd_minutes = sum(e.duration_minutes for e in qs.filter(category='professional_development'))
        self.save(update_fields=['dcc_minutes', 'cra_minutes', 'pd_minutes'])


class RegistrarLogEntry(models.Model):
    CATEGORY_CHOICES = [
        ('direct_client_contact', 'Direct Client Contact'),
        ('client_related_activity', 'Client Related Activity'),
        ('professional_development', 'Professional Development'),
    ]

    trainee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='registrar_entries')
    week = models.ForeignKey(WeeklyLogbook, on_delete=models.CASCADE, related_name='entries')
    date = models.DateField()
    duration_minutes = models.PositiveIntegerField(help_text='Store duration in minutes')
    category = models.CharField(max_length=40, choices=CATEGORY_CHOICES)
    short_description = models.CharField(max_length=255)
    reflection = models.TextField()
    aope = models.CharField(max_length=100, blank=True, help_text='Optional AoPE alignment tag')
    program_type = models.CharField(max_length=20, default='registrar')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.trainee.email} {self.date} {self.category} {self.duration_minutes}m"

    def clean(self):
        # Reflection must be non-empty
        if not self.reflection or not self.reflection.strip():
            raise ValidationError({'reflection': 'Reflection is required for registrar entries.'})

        # Week boundary: date must be within week.week_starting .. +6 days
        if self.week:
            end = self.week.week_starting + timedelta(days=6)
            if not (self.week.week_starting <= self.date <= end):
                raise ValidationError({'date': 'Date must fall within the selected week.'})

        # Lock editing when week submitted
        if self.pk and self.week and self.week.status == 'submitted':
            raise ValidationError('This week has been submitted and cannot be edited.')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        # Update cached weekly totals
        if self.week_id:
            self.week.recalculate_totals()
from django.db import models

# Create your models here.
