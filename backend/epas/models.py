from django.db import models
import uuid


class EPA(models.Model):
    """
    Entrustable Professional Activities (EPAs) for General Registration
    
    EPAs are linked to competency descriptors to show how specific activities
    demonstrate particular aspects of professional competence. Includes milestone
    tracking, M3 behaviours, and reflection prompts for supervision and assessment.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True, help_text="EPA code (e.g., C5-07)")
    title = models.CharField(max_length=500, help_text="EPA title")
    description = models.TextField(help_text="Brief summary of the EPA")
    descriptors = models.JSONField(help_text="List of competency descriptors this EPA demonstrates (e.g., ['5.1', '5.3'])")
    milestones = models.JSONField(default=list, help_text="Milestone levels for this EPA (e.g., ['L1', 'L2', 'L3', 'L4'])")
    tag = models.CharField(max_length=100, help_text="Short logbook label or searchable tag")
    m3_behaviours = models.JSONField(default=list, help_text="Observable competency-aligned behaviours (e.g., ['explain why', 'invite feedback'])")
    prompt = models.TextField(help_text="Reflection prompt for supervisee or self-assessment")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "EPA"
        verbose_name_plural = "EPAs"
        ordering = ['code']

    def __str__(self):
        return f"{self.code}: {self.title}"
