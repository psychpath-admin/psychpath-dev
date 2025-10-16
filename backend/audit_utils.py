"""
Audit logging utility for tracking user activities and data modifications.
This module integrates with the Support app's UserActivity model to create
comprehensive audit trails for all critical operations.
"""

from django.contrib.auth.models import User
from support.models import UserActivity


def log_user_activity(user, activity_type, description, request=None, metadata=None):
    """
    Log user activity for audit purposes.
    
    Args:
        user: Django User object or user ID
        activity_type: Activity type from UserActivity.activity_type choices
        description: Human-readable description of the activity
        request: Django request object (optional, for IP and user agent)
        metadata: Additional data to store in JSON field (optional)
    
    Returns:
        UserActivity instance
    """
    # Handle user parameter
    if isinstance(user, int):
        try:
            user_obj = User.objects.get(id=user)
        except User.DoesNotExist:
            raise ValueError(f"User with ID {user} not found")
    elif isinstance(user, User):
        user_obj = user
    else:
        raise ValueError(f"Invalid user parameter: {type(user)}")
    
    # Extract request metadata if provided
    ip_address = None
    user_agent = None
    if request:
        ip_address = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT')
    
    # Create activity record
    activity = UserActivity.objects.create(
        user=user_obj,
        activity_type=activity_type,
        description=description,
        ip_address=ip_address,
        user_agent=user_agent,
        metadata=metadata or {}
    )
    
    return activity


def log_section_a_create(user, entry, request=None):
    """Log Section A entry creation."""
    metadata = {
        'entry_id': entry.id,
        'entry_type': entry.entry_type,
        'session_date': str(entry.session_date) if entry.session_date else None,
        'duration_minutes': entry.duration_minutes,
        'client_pseudonym': entry.client_pseudonym if hasattr(entry, 'client_pseudonym') else entry.client_id,
        'simulated': entry.simulated,
    }
    
    return log_user_activity(
        user=user,
        activity_type='SECTION_A_CREATE',
        description=f'Created Section A {entry.entry_type} entry #{entry.id}',
        request=request,
        metadata=metadata
    )


def log_section_a_update(user, entry, old_data, request=None):
    """Log Section A entry update with before/after values."""
    # Serialize model instance for comparison
    new_data = {
        'entry_type': entry.entry_type,
        'session_date': str(entry.session_date) if entry.session_date else None,
        'duration_minutes': entry.duration_minutes,
        'simulated': entry.simulated,
    }
    
    # Track what changed
    changes = {}
    for key in new_data:
        if key in old_data and old_data[key] != new_data[key]:
            changes[key] = {
                'old': old_data[key],
                'new': new_data[key]
            }
    
    metadata = {
        'entry_id': entry.id,
        'changes': changes,
        'before': old_data,
        'after': new_data
    }
    
    return log_user_activity(
        user=user,
        activity_type='SECTION_A_UPDATE',
        description=f'Updated Section A entry #{entry.id}',
        request=request,
        metadata=metadata
    )


def log_section_a_delete(user, entry_id, entry_data, request=None):
    """Log Section A entry deletion."""
    metadata = {
        'entry_id': entry_id,
        'deleted_data': entry_data
    }
    
    return log_user_activity(
        user=user,
        activity_type='SECTION_A_DELETE',
        description=f'Deleted Section A entry #{entry_id}',
        request=request,
        metadata=metadata
    )


def log_section_b_create(user, entry, request=None):
    """Log Section B (PD) entry creation."""
    metadata = {
        'entry_id': entry.id,
        'activity_type': entry.activity_type,
        'date_of_activity': str(entry.date_of_activity) if entry.date_of_activity else None,
        'duration_minutes': entry.duration_minutes,
        'competencies_covered': entry.competencies_covered,
    }
    
    return log_user_activity(
        user=user,
        activity_type='SECTION_B_CREATE',
        description=f'Created Section B PD entry #{entry.id}',
        request=request,
        metadata=metadata
    )


def log_section_b_update(user, entry, old_data, request=None):
    """Log Section B entry update with before/after values."""
    new_data = {
        'activity_type': entry.activity_type,
        'date_of_activity': str(entry.date_of_activity) if entry.date_of_activity else None,
        'duration_minutes': entry.duration_minutes,
        'competencies_covered': entry.competencies_covered,
    }
    
    # Track what changed
    changes = {}
    for key in new_data:
        if key in old_data and old_data[key] != new_data[key]:
            changes[key] = {
                'old': old_data[key],
                'new': new_data[key]
            }
    
    metadata = {
        'entry_id': entry.id,
        'changes': changes,
        'before': old_data,
        'after': new_data
    }
    
    return log_user_activity(
        user=user,
        activity_type='SECTION_B_UPDATE',
        description=f'Updated Section B entry #{entry.id}',
        request=request,
        metadata=metadata
    )


def log_section_b_delete(user, entry_id, entry_data, request=None):
    """Log Section B entry deletion."""
    metadata = {
        'entry_id': entry_id,
        'deleted_data': entry_data
    }
    
    return log_user_activity(
        user=user,
        activity_type='SECTION_B_DELETE',
        description=f'Deleted Section B entry #{entry_id}',
        request=request,
        metadata=metadata
    )


def log_section_c_create(user, entry, request=None):
    """Log Section C (Supervision) entry creation."""
    metadata = {
        'entry_id': entry.id,
        'supervision_type': entry.supervision_type,
        'supervisor_type': entry.supervisor_type,
        'date_of_supervision': str(entry.date_of_supervision) if entry.date_of_supervision else None,
        'duration_minutes': entry.duration_minutes,
        'supervisor_name': entry.supervisor_name,
    }
    
    return log_user_activity(
        user=user,
        activity_type='SECTION_C_CREATE',
        description=f'Created Section C supervision entry #{entry.id}',
        request=request,
        metadata=metadata
    )


def log_section_c_update(user, entry, old_data, request=None):
    """Log Section C entry update with before/after values."""
    new_data = {
        'supervision_type': entry.supervision_type,
        'supervisor_type': entry.supervisor_type,
        'date_of_supervision': str(entry.date_of_supervision) if entry.date_of_supervision else None,
        'duration_minutes': entry.duration_minutes,
        'supervisor_name': entry.supervisor_name,
    }
    
    # Track what changed
    changes = {}
    for key in new_data:
        if key in old_data and old_data[key] != new_data[key]:
            changes[key] = {
                'old': old_data[key],
                'new': new_data[key]
            }
    
    metadata = {
        'entry_id': entry.id,
        'changes': changes,
        'before': old_data,
        'after': new_data
    }
    
    return log_user_activity(
        user=user,
        activity_type='SECTION_C_UPDATE',
        description=f'Updated Section C entry #{entry.id}',
        request=request,
        metadata=metadata
    )


def log_section_c_delete(user, entry_id, entry_data, request=None):
    """Log Section C entry deletion."""
    metadata = {
        'entry_id': entry_id,
        'deleted_data': entry_data
    }
    
    return log_user_activity(
        user=user,
        activity_type='SECTION_C_DELETE',
        description=f'Deleted Section C entry #{entry_id}',
        request=request,
        metadata=metadata
    )

