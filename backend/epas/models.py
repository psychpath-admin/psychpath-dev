from django.db import models
import uuid


class EPA(models.Model):
    """
    Entrustable Professional Activities (EPAs) for General Registration
    
    EPAs are linked to competency descriptors to show how specific activities
    demonstrate particular aspects of professional competence.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True, help_text="EPA code (e.g., EPA-001)")
    title = models.CharField(max_length=500, help_text="EPA title")
    description = models.TextField(help_text="Detailed description of the EPA")
    descriptors = models.JSONField(help_text="List of competency descriptors this EPA demonstrates (e.g., ['1.2', '4.5'])")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "EPA"
        verbose_name_plural = "EPAs"
        ordering = ['code']

    def __str__(self):
        return f"{self.code}: {self.title}"
