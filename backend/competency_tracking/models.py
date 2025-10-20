from django.db import models
from api.models import UserProfile
from section_a.models import SectionAEntry
from section_b.models import ProfessionalDevelopmentEntry  
from section_c.models import SupervisionEntry

class CompetencyDefinition(models.Model):
    """The 8 AHPRA competencies - metadata configurable"""
    code = models.CharField(max_length=10, unique=True)  # C1-C8
    name = models.CharField(max_length=200)
    description = models.TextField()
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['order', 'code']
    
    def __str__(self):
        return f"{self.code}: {self.name}"
    
class CompetencyEvidence(models.Model):
    """Evidence entries for competency demonstration"""
    EVIDENCE_TYPE_CHOICES = [
        ('SECTION_A', 'Direct Client Contact (Section A)'),
        ('SECTION_B', 'Professional Development (Section B)'),
        ('SECTION_C', 'Supervision Session (Section C)'),
        ('PRACTICE_LOG', 'Practice Log (Registrar)'),
        ('MANUAL', 'Manual Entry'),
    ]
    
    MILESTONE_CHOICES = [
        ('M1', 'M1 - Novice'),
        ('M2', 'M2 - Developing'),
        ('M3', 'M3 - Proficient'),
        ('M4', 'M4 - Advanced'),
    ]
    
    trainee = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='competency_evidence')
    competency = models.ForeignKey(CompetencyDefinition, on_delete=models.CASCADE)
    
    # Evidence source (link to original activity)
    evidence_type = models.CharField(max_length=20, choices=EVIDENCE_TYPE_CHOICES)
    section_a_entry = models.ForeignKey(SectionAEntry, null=True, blank=True, on_delete=models.SET_NULL)
    section_b_entry = models.ForeignKey(ProfessionalDevelopmentEntry, null=True, blank=True, on_delete=models.SET_NULL)
    section_c_entry = models.ForeignKey(SupervisionEntry, null=True, blank=True, on_delete=models.SET_NULL)
    
    # Manual entry fields
    date = models.DateField()
    description = models.TextField()
    milestone_level = models.CharField(max_length=2, choices=MILESTONE_CHOICES, default='M2')
    reflection = models.TextField(blank=True)
    
    # Supervisor validation
    supervisor_validated = models.BooleanField(default=False)
    supervisor_comment = models.TextField(blank=True)
    validated_by = models.ForeignKey(UserProfile, null=True, blank=True, on_delete=models.SET_NULL, related_name='validated_evidence')
    validated_at = models.DateTimeField(null=True, blank=True)
    
    # EPA recommendation (populated via AI/logic later)
    suggested_by_epa = models.CharField(max_length=50, blank=True, help_text="EPA code that suggested this link")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date', '-created_at']
    
    def __str__(self):
        return f"{self.competency.code} - {self.trainee.user.get_full_name()} ({self.milestone_level})"

class CompetencyRating(models.Model):
    """Current competency level for a trainee"""
    trainee = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    competency = models.ForeignKey(CompetencyDefinition, on_delete=models.CASCADE)
    current_milestone = models.CharField(max_length=2, choices=CompetencyEvidence.MILESTONE_CHOICES)
    evidence_count = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('trainee', 'competency')
        ordering = ['competency__order', 'competency__code']
    
    def __str__(self):
        return f"{self.trainee.user.get_full_name()} - {self.competency.code} ({self.current_milestone})"