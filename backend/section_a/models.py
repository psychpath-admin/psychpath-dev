from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from datetime import datetime, timedelta


class CustomSessionActivityType(models.Model):
    """Custom session activity types created by individual trainees"""
    trainee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='custom_activity_types')
    name = models.CharField(max_length=100, help_text="Custom activity type name")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['trainee', 'name']
        ordering = ['name']
    
    def __str__(self):
        return f"{self.trainee.username}: {self.name}"

class SectionAEntry(models.Model):
    """Standalone Section A entries for Direct Client Contact and Client Related Activities"""
    
    ENTRY_TYPE_CHOICES = [
        ('client_contact', 'Client Contact'),
        ('simulated_contact', 'Simulated Client Contact'),
        ('independent_activity', 'Independent Client Related Activity'),
        ('cra', 'Client Related Activity'),
    ]
    
    SESSION_ACTIVITY_CHOICES = [
        ('evaluation', 'Evaluation'),
        ('intervention', 'Intervention'),
        ('assessment', 'Assessment'),
        ('consultation', 'Consultation'),
        ('supervision', 'Supervision'),
        ('other', 'Other'),
    ]
    
    # Entry details
    trainee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='section_a_entries')
    entry_type = models.CharField(max_length=20, choices=ENTRY_TYPE_CHOICES, default='client_contact')
    
    # Simulated flag for SDCC (Simulated Direct Client Contact)
    simulated = models.BooleanField(default=False, help_text="True if this is a simulated client contact (SDCC)")
    
    # Link CRA entries to their parent DCC entry
    parent_dcc_entry = models.ForeignKey(
        'self', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='cra_entries',
        help_text="Parent DCC entry for CRA entries"
    )
    
    # Client and session details
    client_id = models.CharField(max_length=50, blank=True, help_text="Client pseudonym e.g., LN-1985-M")
    session_date = models.DateField(null=True, blank=True)
    week_starting = models.DateField(null=True, blank=True, help_text="Week starting date for this session")
    place_of_practice = models.CharField(max_length=200, blank=True)
    
    # Client demographics
    client_age = models.PositiveIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(120)],
        null=True, blank=True
    )
    
    # Session details
    presenting_issues = models.TextField(blank=True, help_text="Detailed description of presenting issues")
    session_activity_types = models.JSONField(
        default=list,
        help_text="List of selected activity types (standard and custom)"
    )
    # Legacy field for backward compatibility
    session_activity_type = models.CharField(
        max_length=20, 
        choices=SESSION_ACTIVITY_CHOICES, 
        default='evaluation',
        blank=True
    )
    duration_minutes = models.PositiveIntegerField(null=True, blank=True, help_text="Duration in minutes")
    reflections_on_experience = models.TextField(blank=True, help_text="Reflections on the experience")
    
    # Legacy fields for backward compatibility
    client_pseudonym = models.CharField(max_length=50, blank=True, help_text="Legacy field")
    activity_description = models.TextField(blank=True, help_text="Legacy field")
    duration_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Legacy field")
    reflection = models.TextField(blank=True, help_text="Legacy field")
    
    # CRA-specific fields
    activity_type = models.CharField(max_length=100, blank=True, help_text="CRA activity type")
    custom_activity_type = models.CharField(max_length=100, blank=True, help_text="Custom CRA activity type")
    
    # Logbook integration
    locked = models.BooleanField(default=False, help_text="True if this entry is part of a submitted logbook")
    supervisor_comment = models.TextField(blank=True, default="", help_text="Supervisor comment for this entry when reviewing a logbook")
    trainee_response = models.TextField(blank=True, default="", help_text="Trainee response to supervisor comment when resubmitting")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-session_date', '-created_at']
        verbose_name = 'Section A Entry'
        verbose_name_plural = 'Section A Entries'
    
    def __str__(self):
        return f"{self.client_id} - {self.get_entry_type_display()} ({self.session_date})"
    
    @staticmethod
    def calculate_week_starting(session_date):
        """
        Calculate week starting date based on session date.
        Week starting = Monday of the week containing the session date.
        Sunday belongs to the following week (not the previous week).
        """
        if isinstance(session_date, str):
            session_date = datetime.strptime(session_date, '%Y-%m-%d').date()
        
        # Get the day of the week (0=Monday, 6=Sunday)
        days_since_monday = session_date.weekday()
        
        # For Sunday (weekday=6), we want the NEXT Monday
        if days_since_monday == 6:  # Sunday
            week_starting = session_date + timedelta(days=1)  # Next Monday
        else:
            # Calculate the Monday of the current week
            week_starting = session_date - timedelta(days=days_since_monday)
        
        return week_starting
    
    @classmethod
    def get_simulated_hours_total(cls, trainee):
        """
        Calculate total simulated hours for a trainee.
        Returns the total hours and whether the 60-hour limit has been reached.
        """
        simulated_entries = cls.objects.filter(
            trainee=trainee,
            entry_type__in=['client_contact', 'simulated_contact'],
            simulated=True
        )
        
        total_minutes = 0
        for entry in simulated_entries:
            if entry.duration_minutes:
                total_minutes += entry.duration_minutes
            elif entry.duration_hours:
                total_minutes += int(entry.duration_hours * 60)
        
        total_hours = total_minutes / 60
        limit_reached = total_hours >= 60
        
        return {
            'total_hours': total_hours,
            'total_minutes': total_minutes,
            'limit_reached': limit_reached,
            'remaining_hours': max(0, 60 - total_hours)
        }
    
    def save(self, *args, **kwargs):
        """Auto-calculate week_starting if not provided and handle CRA/ICRA logic"""
        if self.session_date and not self.week_starting:
            self.week_starting = self.calculate_week_starting(self.session_date)
        
        # Smart CRA/ICRA logic: Convert CRA to ICRA if it's in a different week than parent DCC
        if (self.entry_type == 'cra' and self.parent_dcc_entry and 
            self.session_date):
            
            # Get the parent entry instance (handle both ID and instance)
            try:
                if isinstance(self.parent_dcc_entry, int):
                    parent_entry = SectionAEntry.objects.get(id=self.parent_dcc_entry)
                else:
                    parent_entry = self.parent_dcc_entry
                
                if parent_entry.session_date:
                    parent_week = self.calculate_week_starting(parent_entry.session_date)
                    cra_week = self.calculate_week_starting(self.session_date)
                    
                    # If CRA is in a different week than parent DCC, convert to ICRA
                    if parent_week != cra_week:
                        self.entry_type = 'independent_activity'
                        self.parent_dcc_entry = None  # Remove parent link for ICRA
            except (SectionAEntry.DoesNotExist, AttributeError):
                # If parent entry doesn't exist or has issues, skip conversion
                pass
        
        super().save(*args, **kwargs)
    
    @classmethod
    def can_submit_logbook(cls, trainee):
        """
        Check if a trainee can submit their logbook based on supervision assignments
        and entry requirements
        """
        from api.models import SupervisionAssignment
        
        # Check if supervision assignments exist
        assignments = SupervisionAssignment.objects.filter(
            provisional=trainee,
            status='ACCEPTED'
        )
        
        if assignments.count() < 2:
            return {
                'can_submit': False,
                'reason': 'Missing supervisor assignments',
                'details': 'You must have both Primary and Secondary supervisors assigned and accepted before submitting your logbook.'
            }
        
        # Check if all required sections have entries
        section_a_count = cls.objects.filter(trainee=trainee).count()
        if section_a_count == 0:
            return {
                'can_submit': False,
                'reason': 'No Section A entries',
                'details': 'You must complete at least one Section A entry before submitting your logbook.'
            }
        
        # Check Section B entries
        from section_b.models import SectionBEntry
        section_b_count = SectionBEntry.objects.filter(trainee=trainee).count()
        if section_b_count == 0:
            return {
                'can_submit': False,
                'reason': 'No Section B entries',
                'details': 'You must complete at least one Section B (Professional Development) entry before submitting your logbook.'
            }
        
        # Check Section C entries
        from section_c.models import SectionCEntry
        section_c_count = SectionCEntry.objects.filter(trainee=trainee).count()
        if section_c_count == 0:
            return {
                'can_submit': False,
                'reason': 'No Section C entries',
                'details': 'You must complete at least one Section C (Supervision) entry before submitting your logbook.'
            }
        
        # Check if logbook is already locked/submitted
        from logbook_app.models import LogbookEntry
        existing_logbook = LogbookEntry.objects.filter(user=trainee, locked=True).exists()
        if existing_logbook:
            return {
                'can_submit': False,
                'reason': 'Logbook already submitted',
                'details': 'Your logbook has already been submitted and is locked. Contact your supervisor if you need to make changes.'
            }
        
        return {
            'can_submit': True,
            'reason': 'All requirements met',
            'details': 'You can proceed with logbook submission.'
        }