from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from api.models import UserProfile
from section_a.models import SectionAEntry
from section_b.models import ProfessionalDevelopmentEntry
from section_c.models import SupervisionEntry


class InternshipProgram(models.Model):
    """Defines different internship programs and their requirements"""
    PROGRAM_TYPES = [
        ('5+1', '5+1 Internship Program'),
        ('4+2', '4+2 Internship Program'),
        ('CUSTOM', 'Custom Program'),
    ]
    
    name = models.CharField(max_length=100)
    program_type = models.CharField(max_length=10, choices=PROGRAM_TYPES, unique=True)
    version = models.CharField(max_length=20, default='1.0')
    is_active = models.BooleanField(default=True)
    
    # Core Requirements
    total_hours_required = models.IntegerField(default=1500)
    practice_hours_required = models.IntegerField(default=1360)
    dcc_hours_minimum = models.IntegerField(default=500)
    dcc_simulated_maximum = models.IntegerField(default=60)
    supervision_hours_minimum = models.IntegerField(default=80)
    pd_hours_required = models.IntegerField(default=60)
    
    # Weekly Requirements
    minimum_weeks = models.IntegerField(default=44)
    minimum_weekly_hours = models.FloatField(default=17.5)
    supervision_ratio = models.FloatField(default=17.0)  # 1 hour per 17 hours practice
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.program_type})"


class InternshipProgress(models.Model):
    """Tracks individual intern's progress against program requirements"""
    user_profile = models.OneToOneField(UserProfile, on_delete=models.CASCADE, related_name='internship_progress')
    program = models.ForeignKey(InternshipProgram, on_delete=models.CASCADE)
    target_completion_weeks = models.IntegerField(default=52)  # Supervisor-adjustable target
    
    # Progress tracking
    start_date = models.DateField()
    expected_end_date = models.DateField(null=True, blank=True)
    actual_end_date = models.DateField(null=True, blank=True)
    
    # Weekly tracking
    current_week = models.IntegerField(default=1)
    is_completed = models.BooleanField(default=False)
    
    # Validation flags
    weekly_validation_passed = models.BooleanField(default=True)
    category_validation_passed = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user_profile.user.email} - {self.program.name}"
    
    def calculate_weekly_requirements(self):
        """Calculate minimum hours required for current week"""
        if self.current_week <= self.program.minimum_weeks:
            return self.program.minimum_weekly_hours
        return 0  # No minimum after program completion
    
    def get_weekly_totals(self, week_number):
        """Get total hours for a specific week"""
        week_start = self.start_date + timedelta(weeks=week_number - 1)
        week_end = week_start + timedelta(days=7)
        
        # Get all entries for this week
        dcc_entries = SectionAEntry.objects.filter(
            trainee=self.user_profile.user,
            entry_type='client_contact',
            session_date__gte=week_start,
            session_date__lt=week_end
        )
        
        cra_entries = SectionAEntry.objects.filter(
            trainee=self.user_profile.user,
            entry_type__in=['cra', 'icra'],
            session_date__gte=week_start,
            session_date__lt=week_end
        )
        
        pd_entries = ProfessionalDevelopmentEntry.objects.filter(
            trainee=self.user_profile.user,
            date_of_activity__gte=week_start,
            date_of_activity__lt=week_end
        )
        
        supervision_entries = SupervisionEntry.objects.filter(
            trainee=self.user_profile,
            date_of_supervision__gte=week_start,
            date_of_supervision__lt=week_end
        )
        
        return {
            'dcc_hours': sum(entry.duration_minutes or 0 for entry in dcc_entries) / 60,
            'dcc_simulated_hours': sum(entry.duration_minutes or 0 for entry in dcc_entries.filter(simulated=True)) / 60,
            'cra_hours': sum(entry.duration_minutes or 0 for entry in cra_entries) / 60,
            'pd_hours': sum(entry.duration_minutes or 0 for entry in pd_entries) / 60,
            'supervision_hours': sum(entry.duration_minutes or 0 for entry in supervision_entries) / 60,
        }
    
    def validate_weekly_requirements(self, week_number):
        """Validate if weekly requirements are met"""
        if week_number > self.program.minimum_weeks:
            return True, "Week beyond minimum requirement"
        
        weekly_totals = self.get_weekly_totals(week_number)
        total_hours = sum(weekly_totals.values())
        minimum_required = self.calculate_weekly_requirements()
        
        if total_hours < minimum_required:
            return False, f"Week {week_number}: {total_hours:.1f}h < {minimum_required}h required"
        
        return True, f"Week {week_number}: {total_hours:.1f}h ✓"
    
    def get_cumulative_totals(self):
        """Get cumulative totals across entire internship"""
        end_date = self.actual_end_date or timezone.now().date()
        
        dcc_entries = SectionAEntry.objects.filter(
            trainee=self.user_profile.user,
            entry_type='client_contact',
            session_date__lte=end_date
        )
        
        cra_entries = SectionAEntry.objects.filter(
            trainee=self.user_profile.user,
            entry_type__in=['cra', 'icra'],
            session_date__lte=end_date
        )
        
        pd_entries = ProfessionalDevelopmentEntry.objects.filter(
            trainee=self.user_profile.user,
            date_of_activity__lte=end_date
        )
        
        supervision_entries = SupervisionEntry.objects.filter(
            trainee=self.user_profile,
            date_of_supervision__lte=end_date
        )
        
        return {
            'dcc_hours': sum(entry.duration_minutes or 0 for entry in dcc_entries) / 60,
            'dcc_simulated_hours': sum(entry.duration_minutes or 0 for entry in dcc_entries.filter(simulated=True)) / 60,
            'cra_hours': sum(entry.duration_minutes or 0 for entry in cra_entries) / 60,
            'pd_hours': sum(entry.duration_minutes or 0 for entry in pd_entries) / 60,
            'supervision_hours': sum(entry.duration_minutes or 0 for entry in supervision_entries) / 60,
        }
    
    def validate_category_requirements(self):
        """Validate if category requirements are met"""
        totals = self.get_cumulative_totals()
        errors = []
        
        # DCC minimum
        if totals['dcc_hours'] < self.program.dcc_hours_minimum:
            errors.append(f"DCC: {totals['dcc_hours']:.1f}h < {self.program.dcc_hours_minimum}h required")
        
        # DCC simulated maximum
        if totals['dcc_simulated_hours'] > self.program.dcc_simulated_maximum:
            errors.append(f"Simulated DCC: {totals['dcc_simulated_hours']:.1f}h > {self.program.dcc_simulated_maximum}h maximum")
        
        # Practice hours (DCC + CRA)
        practice_hours = totals['dcc_hours'] + totals['cra_hours']
        if practice_hours < self.program.practice_hours_required:
            errors.append(f"Practice: {practice_hours:.1f}h < {self.program.practice_hours_required}h required")
        
        # Supervision minimum
        if totals['supervision_hours'] < self.program.supervision_hours_minimum:
            errors.append(f"Supervision: {totals['supervision_hours']:.1f}h < {self.program.supervision_hours_minimum}h required")
        
        # Supervision ratio
        if practice_hours > 0:
            supervision_ratio = practice_hours / max(totals['supervision_hours'], 0.1)
            if supervision_ratio > self.program.supervision_ratio:
                errors.append(f"Supervision ratio: 1:{supervision_ratio:.1f} > 1:{self.program.supervision_ratio} required")
        
        # PD minimum
        if totals['pd_hours'] < self.program.pd_hours_required:
            errors.append(f"PD: {totals['pd_hours']:.1f}h < {self.program.pd_hours_required}h required")
        
        return len(errors) == 0, errors


class ValidationAlert(models.Model):
    """Stores validation alerts for users"""
    ALERT_TYPES = [
        ('WEEKLY_MINIMUM', 'Weekly Minimum Not Met'),
        ('CATEGORY_MINIMUM', 'Category Minimum Not Met'),
        ('SIMULATED_EXCEEDED', 'Simulated Hours Exceeded'),
        ('SUPERVISION_RATIO', 'Supervision Ratio Not Met'),
        ('COMPLETION_BLOCKED', 'Completion Blocked'),
    ]
    
    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES)
    message = models.TextField()
    is_active = models.BooleanField(default=True)
    is_dismissed = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    dismissed_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.user_profile.user.email} - {self.alert_type}"


class WeeklySummary(models.Model):
    """Weekly summary for tracking and reporting"""
    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    week_number = models.IntegerField()
    week_start = models.DateField()
    week_end = models.DateField()
    
    # Hours tracked
    dcc_hours = models.FloatField(default=0)
    dcc_simulated_hours = models.FloatField(default=0)
    cra_hours = models.FloatField(default=0)
    pd_hours = models.FloatField(default=0)
    supervision_hours = models.FloatField(default=0)
    
    # Validation status
    meets_weekly_minimum = models.BooleanField(default=False)
    validation_errors = models.JSONField(default=list)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user_profile', 'week_number']
    
    def __str__(self):
        return f"Week {self.week_number} - {self.user_profile.user.email}"