from django.db.models.signals import post_save
from django.dispatch import receiver
from section_a.models import SectionAEntry
from section_b.models import ProfessionalDevelopmentEntry
from section_c.models import SupervisionEntry
from .models import CompetencyEvidence, CompetencyDefinition
from .utils import suggest_competencies_for_activity

@receiver(post_save, sender=SectionAEntry)
def link_section_a_to_competencies(sender, instance, created, **kwargs):
    """When a Section A entry is created/updated, suggest competency links based on EPAs"""
    if created and instance.trainee:
        # Get EPA-based competency suggestions
        suggested_competencies = suggest_competencies_for_activity(
            activity_type='SECTION_A',
            description=instance.case_description,
            epa_worked_on=instance.epa_worked_on
        )
        
        # Create evidence entries (as recommendations - not supervisor validated yet)
        for comp_code in suggested_competencies:
            try:
                competency = CompetencyDefinition.objects.get(code=comp_code)
                CompetencyEvidence.objects.create(
                    trainee=instance.trainee,
                    competency=competency,
                    evidence_type='SECTION_A',
                    section_a_entry=instance,
                    date=instance.date_of_contact,
                    description=f"DCC: {instance.case_description[:200]}",
                    milestone_level='M2',  # Default, can be adjusted
                    suggested_by_epa=instance.epa_worked_on,
                    supervisor_validated=False
                )
            except CompetencyDefinition.DoesNotExist:
                pass

@receiver(post_save, sender=ProfessionalDevelopmentEntry)
def link_section_b_to_competencies(sender, instance, created, **kwargs):
    """When a Section B entry is created/updated, suggest competency links"""
    if created and instance.trainee:
        # Get competency suggestions based on activity type
        suggested_competencies = suggest_competencies_for_activity(
            activity_type='SECTION_B',
            description=instance.activity_description,
            activity_type_name=instance.activity_type
        )
        
        for comp_code in suggested_competencies:
            try:
                competency = CompetencyDefinition.objects.get(code=comp_code)
                CompetencyEvidence.objects.create(
                    trainee=instance.trainee,
                    competency=competency,
                    evidence_type='SECTION_B',
                    section_b_entry=instance,
                    date=instance.activity_date,
                    description=f"PD: {instance.activity_description[:200]}",
                    milestone_level='M2',
                    suggested_by_epa=instance.activity_type,
                    supervisor_validated=False
                )
            except CompetencyDefinition.DoesNotExist:
                pass

@receiver(post_save, sender=SupervisionEntry)
def link_section_c_to_competencies(sender, instance, created, **kwargs):
    """When a Section C entry is created/updated, suggest competency links"""
    if created and instance.trainee:
        # Supervision typically relates to C8 (Supervision and Professional Development)
        suggested_competencies = ['C8']
        
        for comp_code in suggested_competencies:
            try:
                competency = CompetencyDefinition.objects.get(code=comp_code)
                CompetencyEvidence.objects.create(
                    trainee=instance.trainee,
                    competency=competency,
                    evidence_type='SECTION_C',
                    section_c_entry=instance,
                    date=instance.date,
                    description=f"Supervision: {instance.supervision_notes[:200] if instance.supervision_notes else 'Supervision session'}",
                    milestone_level='M2',
                    suggested_by_epa='SUPERVISION',
                    supervisor_validated=False
                )
            except CompetencyDefinition.DoesNotExist:
                pass
