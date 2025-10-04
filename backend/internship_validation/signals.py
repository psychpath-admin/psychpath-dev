from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from django.utils import timezone
from .services import InternshipValidationService
from .models import ValidationAlert
from section_a.models import SectionAEntry
from section_b.models import ProfessionalDevelopmentEntry
from section_c.models import SupervisionEntry
from api.models import UserProfile


@receiver(pre_save, sender=SectionAEntry)
def validate_section_a_entry(sender, instance, **kwargs):
    """Validate Section A entries before saving"""
    if not instance.pk:  # New entry
        validation_service = InternshipValidationService()
        
        # Check if user is an intern
        if hasattr(instance, 'trainee') and hasattr(instance.trainee, 'userprofile') and instance.trainee.userprofile.role in ['INTERN', 'PROVISIONAL']:
            entry_data = {
                'entry_type': instance.entry_type,
                'simulated': getattr(instance, 'simulated', False),
                'duration_minutes': instance.duration_minutes,
            }
            
            is_valid, errors = validation_service.validate_entry(instance.trainee, entry_data)
            
            if not is_valid:
                raise ValidationError({
                    'simulated': errors[0] if 'Simulated' in errors[0] else None,
                    'duration_minutes': errors[0] if 'Simulated' not in errors[0] else None,
                })


@receiver(post_save, sender=SectionAEntry)
def update_progress_after_section_a_entry(sender, instance, created, **kwargs):
    """Update progress after Section A entry is saved"""
    if created and hasattr(instance, 'trainee'):
        validation_service = InternshipValidationService()
        
        if hasattr(instance.trainee, 'userprofile') and instance.trainee.userprofile.role in ['INTERN', 'PROVISIONAL']:
            # Update weekly validation
            from datetime import datetime
            from django.utils import timezone
            
            progress = validation_service._get_or_create_progress(instance.trainee)
            current_week = progress.current_week
            
            validation_service.validate_weekly_progress(instance.trainee, current_week)
            validation_service.validate_category_requirements(instance.trainee)


@receiver(post_save, sender=ProfessionalDevelopmentEntry)
def update_progress_after_pd_entry(sender, instance, created, **kwargs):
    """Update progress after PD entry is saved"""
    if created and hasattr(instance, 'trainee'):
        validation_service = InternshipValidationService()
        
        if hasattr(instance.trainee, 'userprofile') and instance.trainee.userprofile.role in ['INTERN', 'PROVISIONAL']:
            progress = validation_service._get_or_create_progress(instance.trainee)
            current_week = progress.current_week
            
            validation_service.validate_weekly_progress(instance.trainee, current_week)
            validation_service.validate_category_requirements(instance.trainee)


@receiver(post_save, sender=SupervisionEntry)
def update_progress_after_supervision_entry(sender, instance, created, **kwargs):
    """Update progress after supervision entry is saved"""
    if created and hasattr(instance, 'trainee'):
        validation_service = InternshipValidationService()
        
        if hasattr(instance.trainee, 'userprofile') and instance.trainee.userprofile.role in ['INTERN', 'PROVISIONAL']:
            progress = validation_service._get_or_create_progress(instance.trainee)
            current_week = progress.current_week
            
            validation_service.validate_weekly_progress(instance.trainee, current_week)
            validation_service.validate_category_requirements(instance.trainee)


@receiver(post_save, sender=UserProfile)
def initialize_internship_progress(sender, instance, created, **kwargs):
    """Initialize internship progress when a new intern profile is created"""
    if created and instance.role in ['INTERN', 'PROVISIONAL']:
        validation_service = InternshipValidationService()
        validation_service.initialize_internship_progress(instance, instance.provisional_start_date or timezone.now().date())
