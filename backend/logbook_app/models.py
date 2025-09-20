from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class WeeklyLogbook(models.Model):
    """Weekly logbook for a trainee"""
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted to Supervisor'),
        ('approved', 'Approved by Supervisor'),
        ('rejected', 'Rejected by Supervisor'),
        ('locked', 'Locked (Final)'),
    ]
    
    trainee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='weekly_logbooks')
    week_start_date = models.DateField()
    week_end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Calculated totals (cached for performance)
    total_dcc_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_cra_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_pd_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_sup_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_weekly_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # Cumulative totals (updated when approved)
    cumulative_dcc_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    cumulative_cra_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    cumulative_pd_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    cumulative_sup_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    cumulative_total_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    
    # Supervisor fields
    supervisor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='supervised_logbooks')
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_logbooks')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    supervisor_comments = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['trainee', 'week_start_date']
        ordering = ['-week_start_date']
    
    def __str__(self):
        return f"{self.trainee.email} - Week of {self.week_start_date}"
    
    def calculate_totals(self):
        """Calculate and update weekly totals from entries"""
        # Section A: DCC + CRA
        dcc_entries = self.dccentry_entries.all()
        cra_entries = self.craentry_entries.all()
        
        self.total_dcc_hours = sum(entry.duration_hours for entry in dcc_entries)
        self.total_cra_hours = sum(entry.duration_hours for entry in cra_entries)
        
        # Section B: PD
        pd_entries = self.pdentry_entries.all()
        self.total_pd_hours = sum(entry.duration_hours for entry in pd_entries)
        
        # Section C: SUP
        sup_entries = self.supentry_entries.all()
        self.total_sup_hours = sum(entry.duration_hours for entry in sup_entries)
        
        # Total weekly hours
        self.total_weekly_hours = (
            self.total_dcc_hours + 
            self.total_cra_hours + 
            self.total_pd_hours + 
            self.total_sup_hours
        )
        
        self.save(update_fields=[
            'total_dcc_hours', 'total_cra_hours', 'total_pd_hours', 
            'total_sup_hours', 'total_weekly_hours'
        ])
    
    def update_cumulative_totals(self):
        """Update cumulative totals when approved"""
        if self.status != 'approved':
            return
            
        # Get previous approved logbooks for this trainee
        previous_logbooks = WeeklyLogbook.objects.filter(
            trainee=self.trainee,
            status='approved',
            week_start_date__lt=self.week_start_date
        ).order_by('week_start_date')
        
        if previous_logbooks.exists():
            last_logbook = previous_logbooks.last()
            self.cumulative_dcc_hours = last_logbook.cumulative_dcc_hours + self.total_dcc_hours
            self.cumulative_cra_hours = last_logbook.cumulative_cra_hours + self.total_cra_hours
            self.cumulative_pd_hours = last_logbook.cumulative_pd_hours + self.total_pd_hours
            self.cumulative_sup_hours = last_logbook.cumulative_sup_hours + self.total_sup_hours
            self.cumulative_total_hours = last_logbook.cumulative_total_hours + self.total_weekly_hours
        else:
            # First approved logbook
            self.cumulative_dcc_hours = self.total_dcc_hours
            self.cumulative_cra_hours = self.total_cra_hours
            self.cumulative_pd_hours = self.total_pd_hours
            self.cumulative_sup_hours = self.total_sup_hours
            self.cumulative_total_hours = self.total_weekly_hours
        
        self.save(update_fields=[
            'cumulative_dcc_hours', 'cumulative_cra_hours', 'cumulative_pd_hours',
            'cumulative_sup_hours', 'cumulative_total_hours'
        ])


class LogbookEntry(models.Model):
    """Base class for logbook entries"""
    
    logbook = models.ForeignKey(WeeklyLogbook, on_delete=models.CASCADE, related_name='%(class)s_entries')
    date = models.DateField()
    client_age = models.PositiveIntegerField(validators=[MinValueValidator(0), MaxValueValidator(120)])
    client_issue = models.CharField(max_length=200)
    activity_description = models.TextField()
    duration_hours = models.DecimalField(max_digits=4, decimal_places=2, validators=[MinValueValidator(0.1)])
    reflection = models.TextField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True


class DCCEntry(LogbookEntry):
    """Direct Client Contact entry"""
    pass


class CRAEntry(LogbookEntry):
    """Clinical Related Activity entry"""
    pass


class PDEntry(LogbookEntry):
    """Professional Development entry"""
    pass


class SUPEntry(LogbookEntry):
    """Supervision entry"""
    pass


class LogbookAuditLog(models.Model):
    """Audit log for logbook state changes"""
    
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('unlocked', 'Unlocked'),
        ('locked', 'Locked'),
    ]
    
    logbook = models.ForeignKey(WeeklyLogbook, on_delete=models.CASCADE, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    comments = models.TextField(blank=True)
    previous_status = models.CharField(max_length=20, blank=True)
    new_status = models.CharField(max_length=20, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.logbook} - {self.action} by {self.user} at {self.timestamp}"