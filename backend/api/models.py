from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class UserRole(models.TextChoices):
    PROVISIONAL = 'PROVISIONAL', 'Provisional Psychologist'
    REGISTRAR = 'REGISTRAR', 'Psychology Registrar'
    SUPERVISOR = 'SUPERVISOR', 'Board-Approved Supervisor'


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=32, choices=UserRole.choices, default=UserRole.PROVISIONAL)

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


class Reflection(models.Model):
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reflections')
    epa = models.ForeignKey(EPA, on_delete=models.SET_NULL, null=True, blank=True, related_name='reflections')
    milestone = models.ForeignKey(Milestone, on_delete=models.SET_NULL, null=True, blank=True, related_name='reflections')
    title = models.CharField(max_length=255)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.title} by {self.author.get_username()}"


# Create your models here.
