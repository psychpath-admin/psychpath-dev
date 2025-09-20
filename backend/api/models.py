from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import secrets
import string

User = get_user_model()


class UserRole(models.TextChoices):
    PROVISIONAL = 'PROVISIONAL', 'Provisional Psychologist'
    REGISTRAR = 'REGISTRAR', 'Psychology Registrar'
    SUPERVISOR = 'SUPERVISOR', 'Board-Approved Supervisor'
    ORG_ADMIN = 'ORG_ADMIN', 'Organisation Admin'


class Organization(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=32, choices=UserRole.choices, default=UserRole.PROVISIONAL)
    organization = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    
    # Personal Information
    first_name = models.CharField(max_length=100, blank=True)
    middle_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    ahpra_registration_number = models.CharField(max_length=50, blank=True, unique=True)
    
    # Training Information
    intern_start_date = models.DateField(null=True, blank=True)
    report_start_day = models.CharField(max_length=20, default='Monday', choices=[
        ('Monday', 'Monday'),
        ('Tuesday', 'Tuesday'),
        ('Wednesday', 'Wednesday'),
        ('Thursday', 'Thursday'),
        ('Friday', 'Friday'),
        ('Saturday', 'Saturday'),
        ('Sunday', 'Sunday'),
    ])
    
    # Supervisor Information
    principal_supervisor = models.CharField(max_length=255, blank=True)
    secondary_supervisor = models.CharField(max_length=255, blank=True)
    supervisor_emails = models.TextField(blank=True, help_text="Supervisor email addresses, one per line")
    
    # Signature (store data URL or relative path)
    signature_url = models.TextField(blank=True, help_text="Signature image (data URL or path)")
    
    # Prior Hours (for interns/registrars who started logging elsewhere)
    prior_hours = models.JSONField(default=dict, blank=True, help_text="Prior hours completed before using CAPE")
    
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.user.get_username()} ({self.role})"


class EPA(models.Model):
    code = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['code']

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.code} - {self.title}"


class Milestone(models.Model):
    epa = models.ForeignKey(EPA, on_delete=models.CASCADE, related_name='milestones')
    code = models.CharField(max_length=20)
    description = models.TextField(blank=True)

    class Meta:
        unique_together = ('epa', 'code')
        ordering = ['epa__code', 'code']

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.epa.code} - {self.code}"


class Supervision(models.Model):
    supervisor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='supervisees_links')
    supervisee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='supervisors_links')
    active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('supervisor', 'supervisee')

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.supervisor} -> {self.supervisee}"


class MilestoneProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='milestone_progress')
    milestone = models.ForeignKey(Milestone, on_delete=models.CASCADE, related_name='progress')
    is_completed = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'milestone')


class Reflection(models.Model):
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reflections')
    epa = models.ForeignKey(EPA, on_delete=models.SET_NULL, null=True, blank=True, related_name='reflections')
    milestone = models.ForeignKey(Milestone, on_delete=models.SET_NULL, null=True, blank=True, related_name='reflections')
    title = models.CharField(max_length=255)
    content = models.TextField()
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_reflections')
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.title} by {self.author.get_username()}"


class EmailVerificationCode(models.Model):
    """Model to store email verification codes for registration"""
    email = models.EmailField()
    code = models.CharField(max_length=6)
    psy_number = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    
    class Meta:
        indexes = [
            models.Index(fields=['email', 'code']),
            models.Index(fields=['expires_at']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self.generate_code()
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(minutes=30)
        super().save(*args, **kwargs)
    
    @staticmethod
    def generate_code():
        """Generate a 6-digit verification code"""
        return ''.join(secrets.choice(string.digits) for _ in range(6))
    
    def is_expired(self):
        """Check if the code has expired"""
        return timezone.now() > self.expires_at
    
    def is_valid(self):
        """Check if the code is valid (not used and not expired)"""
        return not self.is_used and not self.is_expired()


# Create your models here.
