from typing import Iterable
from django.contrib.auth.models import User
from .models import UserProfile, UserRole, Supervision


def is_org_admin(user: User) -> bool:
    try:
        return hasattr(user, 'profile') and user.profile.role == UserRole.ORG_ADMIN
    except Exception:
        return False


def is_supervisor(user: User) -> bool:
    try:
        return hasattr(user, 'profile') and user.profile.role == UserRole.SUPERVISOR
    except Exception:
        return False


def accepted_supervisees(supervisor: User) -> Iterable[User]:
    """Return queryset of Users who have an ACCEPTED supervision with this supervisor."""
    supervisee_ids = Supervision.objects.filter(
        supervisor=supervisor,
        status='ACCEPTED'
    ).values_list('supervisee_id', flat=True)
    return User.objects.filter(id__in=supervisee_ids)


def get_user_scope_queryset(user: User, base_qs, user_field: str = 'user'):
    """
    Scope a queryset according to role.
    - PROVISIONAL/REGISTRAR: own records via user_field
    - SUPERVISOR: records where user_field in accepted supervisees
    - ORG_ADMIN: no clinical data -> empty queryset
    """
    try:
        role = getattr(getattr(user, 'profile', None), 'role', None)
    except Exception:
        role = None

    if role in (UserRole.PROVISIONAL, UserRole.REGISTRAR):
        return base_qs.filter(**{user_field: user})
    if role == UserRole.SUPERVISOR:
        return base_qs.filter(**{f"{user_field}__in": accepted_supervisees(user)})
    if role == UserRole.ORG_ADMIN:
        return base_qs.none()
    # Default deny
    return base_qs.none()


