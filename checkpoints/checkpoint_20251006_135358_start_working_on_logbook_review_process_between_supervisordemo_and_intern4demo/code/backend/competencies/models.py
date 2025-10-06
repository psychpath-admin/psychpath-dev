from django.db import models
import uuid


class Competency(models.Model):
    """
    AHPRA 8 Core Competencies for General Registration (post-Dec 1, 2025)
    
    Purpose: Reference table for competency-based assessment, EPA linking, 
    reflection tagging, and supervisor reporting.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=10, unique=True, help_text="Competency code (e.g., C1, C2)")
    title = models.CharField(max_length=500, help_text="Competency title")
    description = models.TextField(help_text="Core summary description")
    descriptors = models.JSONField(help_text="List of competency descriptors")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "competencies"
        ordering = ['code']

    def __str__(self):
        return f"{self.code}: {self.title}"
