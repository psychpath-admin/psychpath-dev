from django.db import models
from django.conf import settings
from django.utils import timezone
from api.models import UserProfile

class MySupervisionAgenda(models.Model):
    """Container for a trainee's agenda items, grouped by week"""
    trainee = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name="supervision_agendas")
    week_starting = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [models.Index(fields=["trainee", "week_starting"])]
        ordering = ["-week_starting", "-created_at"]
        unique_together = ("trainee", "week_starting")
    
    def __str__(self):
        return f"Agenda for {self.trainee.user.email} - Week {self.week_starting}"


class AgendaItem(models.Model):
    """Individual agenda item - strictly private to trainee"""
    PRIORITY_CHOICES = [("low", "Low"), ("medium", "Medium"), ("high", "High")]
    STATUS_CHOICES = [
        ("open", "Open"),
        ("discussed", "Discussed"),
        ("carried", "Carried forward"),
        ("discarded", "Discarded")
    ]
    SOURCE_CHOICES = [("A", "Section A"), ("B", "Section B"), ("FREE", "Free-typed")]
    
    agenda = models.ForeignKey(MySupervisionAgenda, on_delete=models.CASCADE, related_name="items")
    title = models.CharField(max_length=240)
    detail = models.TextField(blank=True, default="")
    priority = models.CharField(max_length=8, choices=PRIORITY_CHOICES, default="medium")
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="open")
    
    # Optional provenance (private)
    source_type = models.CharField(max_length=8, choices=SOURCE_CHOICES, default="FREE")
    source_entry_id = models.IntegerField(null=True, blank=True)  # SectionA/B entry ID
    source_field = models.CharField(max_length=120, blank=True, default="")
    source_excerpt = models.TextField(blank=True, default="")
    
    # Post-supervision reflection (private)
    my_reflection = models.TextField(blank=True, default="")
    discussed_on = models.DateField(null=True, blank=True)
    imported_to_section_c = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [models.Index(fields=["agenda", "status", "imported_to_section_c"])]
        ordering = ["-priority", "-created_at"]
    
    def __str__(self):
        return f"{self.title} ({self.priority})"


class SectionCImport(models.Model):
    """Immutable record of agenda items imported into Section C"""
    section_c_entry_id = models.IntegerField()  # SupervisionEntry.id - no FK to avoid exposure
    agenda_item = models.ForeignKey(AgendaItem, on_delete=models.CASCADE, related_name="section_c_imports")
    snapshot_title = models.CharField(max_length=240)
    snapshot_detail = models.TextField()
    imported_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        indexes = [models.Index(fields=["section_c_entry_id"])]
    
    def __str__(self):
        return f"Import: {self.snapshot_title} -> Section C #{self.section_c_entry_id}"