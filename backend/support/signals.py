from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth.models import User
from django.utils import timezone
from .models import UserActivity, WeeklyStats
from api.models import UserProfile
from section_b.models import ProfessionalDevelopmentEntry
from section_c.models import SupervisionEntry
from section_a.models import SectionAEntry
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=User)
def track_user_registration(sender, instance, created, **kwargs):
    """Track user registration"""
    if created:
        UserActivity.objects.create(
            user=instance,
            activity_type='REGISTER',
            description=f'User registered: {instance.email}',
            metadata={'is_new_user': True}
        )

@receiver(post_save, sender=UserProfile)
def track_profile_update(sender, instance, created, **kwargs):
    """Track profile updates"""
    activity_type = 'PROFILE_UPDATE'
    description = f'Profile updated for {instance.user.email}'
    
    if created:
        activity_type = 'PROFILE_CREATE'
        description = f'Profile created for {instance.user.email}'
    
    UserActivity.objects.create(
        user=instance.user,
        activity_type=activity_type,
        description=description,
        metadata={'profile_id': instance.id, 'role': instance.role}
    )

@receiver(post_save, sender=ProfessionalDevelopmentEntry)
def track_pd_entry(sender, instance, created, **kwargs):
    """Track PD entry creation/updates"""
    activity_type = 'PD_ENTRY_UPDATE'
    description = f'PD entry updated: {instance.activity_title}'
    
    if created:
        activity_type = 'PD_ENTRY'
        description = f'PD entry created: {instance.activity_title}'
    
    UserActivity.objects.create(
        user=instance.trainee,
        activity_type=activity_type,
        description=description,
        metadata={
            'entry_id': instance.id,
            'activity_title': instance.activity_title,
            'duration_minutes': instance.duration_minutes
        }
    )

@receiver(post_save, sender=SupervisionEntry)
def track_supervision_entry(sender, instance, created, **kwargs):
    """Track supervision entry creation/updates"""
    activity_type = 'SUPERVISION_ENTRY_UPDATE'
    description = f'Supervision entry updated: {instance.supervisor_name}'
    
    if created:
        activity_type = 'SUPERVISION_ENTRY'
        description = f'Supervision entry created: {instance.supervisor_name}'
    
    UserActivity.objects.create(
        user=instance.trainee.user,
        activity_type=activity_type,
        description=description,
        metadata={
            'entry_id': instance.id,
            'supervisor_name': instance.supervisor_name,
            'duration_minutes': instance.duration_minutes
        }
    )

@receiver(post_save, sender=SectionAEntry)
def track_section_a_entry(sender, instance, created, **kwargs):
    """Track Section A entry creation/updates"""
    activity_type = 'SECTION_A_ENTRY_UPDATE'
    description = f'Section A entry updated: {instance.activity_title}'
    
    if created:
        activity_type = 'SECTION_A_ENTRY'
        description = f'Section A entry created: {instance.activity_title}'
    
    UserActivity.objects.create(
        user=instance.trainee,
        activity_type=activity_type,
        description=description,
        metadata={
            'entry_id': instance.id,
            'activity_title': instance.activity_title,
            'duration_minutes': instance.duration_minutes
        }
    )

def log_user_activity(user, activity_type, description, request=None, metadata=None):
    """Helper function to log user activities"""
    activity_data = {
        'user': user,
        'activity_type': activity_type,
        'description': description,
        'metadata': metadata or {}
    }
    
    if request:
        activity_data['ip_address'] = request.META.get('REMOTE_ADDR')
        activity_data['user_agent'] = request.META.get('HTTP_USER_AGENT')
    
    UserActivity.objects.create(**activity_data)



