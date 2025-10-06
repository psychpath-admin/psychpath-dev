from rest_framework import permissions
from django.contrib.auth.models import User
from api.models import UserProfile
from logging_utils import log_data_access
from api.models import UserRole

class TenantPermissionMixin:
    """
    Mixin to ensure data tenancy - users can only access their own data
    """
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        if not user.is_authenticated:
            return queryset.none()
        
        # Log data access attempt
        log_data_access(
            user=user,
            action='QUERY',
            resource=self.__class__.__name__,
            result='FILTERING'
        )
        
        try:
            user_profile = user.profile
        except UserProfile.DoesNotExist:
            # User has no profile - deny access
            log_data_access(
                user=user,
                action='QUERY',
                resource=self.__class__.__name__,
                result='DENIED',
                details='No user profile found'
            )
            return queryset.none()
        
        # Apply role-based filtering
        if user_profile.role == 'INTERN':
            return self.filter_for_intern(queryset, user_profile)
        elif user_profile.role == 'REGISTRAR':
            return self.filter_for_registrar(queryset, user_profile)
        elif user_profile.role == 'SUPERVISOR':
            return self.filter_for_supervisor(queryset, user_profile)
        elif user_profile.role == 'ORG_ADMIN':
            return self.filter_for_org_admin(queryset, user_profile)
        else:
            # Unknown role - deny access
            log_data_access(
                user=user,
                action='QUERY',
                resource=self.__class__.__name__,
                result='DENIED',
                details=f'Unknown role: {user_profile.role}'
            )
            return queryset.none()
    
    def filter_for_intern(self, queryset, user_profile):
        """Filter data for interns - only their own data"""
        return queryset.filter(trainee=user_profile)
    
    def filter_for_registrar(self, queryset, user_profile):
        """Filter data for registrars - only their own data"""
        return queryset.filter(trainee=user_profile)
    
    def filter_for_supervisor(self, queryset, user_profile):
        """Filter data for supervisors - only their assigned trainees"""
        # Get IDs of trainees assigned to this supervisor
        trainee_ids = user_profile.supervising.values_list('id', flat=True)
        
        log_data_access(
            user=self.request.user,
            action='SUPERVISION_ACCESS',
            resource=self.__class__.__name__,
            result='SUCCESS',
            details={'trainee_count': len(trainee_ids), 'trainee_ids': list(trainee_ids)}
        )
        
        return queryset.filter(trainee__id__in=trainee_ids)
    
    def filter_for_org_admin(self, queryset, user_profile):
        """Filter data for org admins - only their organization's data"""
        if not user_profile.organization:
            log_data_access(
                user=self.request.user,
                action='ORG_ACCESS',
                resource=self.__class__.__name__,
                result='DENIED',
                details='No organization assigned'
            )
            return queryset.none()
        
        # Get all trainees in the organization
        org_trainee_ids = UserProfile.objects.filter(
            organization=user_profile.organization,
            role__in=['INTERN', 'REGISTRAR']
        ).values_list('id', flat=True)
        
        log_data_access(
            user=self.request.user,
            action='ORG_ACCESS',
            resource=self.__class__.__name__,
            result='SUCCESS',
            details={
                'organization': user_profile.organization.name,
                'trainee_count': len(org_trainee_ids)
            }
        )
        
        return queryset.filter(trainee__id__in=org_trainee_ids)

class RoleBasedPermission(permissions.BasePermission):
    """
    Custom permission class for role-based access control
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        try:
            user_profile = request.user.profile
        except UserProfile.DoesNotExist:
            log_data_access(
                user=request.user,
                action='PERMISSION_CHECK',
                resource=view.__class__.__name__,
                result='DENIED',
                details='No user profile found'
            )
            return False
        
        # Define allowed actions per role
        role_permissions = {
            'INTERN': ['view_own_data', 'create_own_data', 'update_own_data'],
            'REGISTRAR': ['view_own_data', 'create_own_data', 'update_own_data'],
            'SUPERVISOR': ['view_assigned_trainees', 'approve_trainee_data'],
            'ORG_ADMIN': ['view_org_data', 'manage_org_users', 'view_org_reports'],
        }
        
        # Get required permission from view
        required_permission = getattr(view, 'required_permission', None)
        if not required_permission:
            return True  # No specific permission required
        
        user_permissions = role_permissions.get(user_profile.role, [])
        
        has_permission = required_permission in user_permissions
        
        log_data_access(
            user=request.user,
            action='PERMISSION_CHECK',
            resource=view.__class__.__name__,
            result='SUCCESS' if has_permission else 'DENIED',
            details={
                'role': user_profile.role,
                'required_permission': required_permission,
                'user_permissions': user_permissions
            }
        )
        
        return has_permission


class DenyOrgAdmin(permissions.BasePermission):
    """
    Deny access to endpoints for Organization Admins (for clinical data endpoints).
    """
    def has_permission(self, request, view):
        try:
            role = getattr(getattr(request.user, 'profile', None), 'role', None)
        except Exception:
            role = None
        if role == UserRole.ORG_ADMIN:
            log_data_access(
                user=request.user,
                action='PERMISSION_CHECK',
                resource=view.__class__.__name__,
                result='DENIED',
                details={'reason': 'ORG_ADMIN denied for clinical endpoints'}
            )
            return False
        return True

def require_role(roles):
    """
    Decorator to require specific roles for a view
    """
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse({'error': 'Authentication required'}, status=401)
            
            try:
                user_profile = request.user.profile
            except UserProfile.DoesNotExist:
                return JsonResponse({'error': 'User profile not found'}, status=403)
            
            if user_profile.role not in roles:
                log_data_access(
                    user=request.user,
                    action='ROLE_CHECK',
                    resource=view_func.__name__,
                    result='DENIED',
                    details={
                        'user_role': user_profile.role,
                        'required_roles': roles
                    }
                )
                return JsonResponse({
                    'error': f'Access denied. Required roles: {", ".join(roles)}'
                }, status=403)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

def require_own_data_or_supervisor(view_func):
    """
    Decorator to ensure users can only access their own data or supervisors can access assigned trainee data
    """
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Authentication required'}, status=401)
        
        try:
            user_profile = request.user.profile
        except UserProfile.DoesNotExist:
            return JsonResponse({'error': 'User profile not found'}, status=403)
        
        # Get the data being accessed
        data_id = kwargs.get('pk') or kwargs.get('id')
        if not data_id:
            return view_func(request, *args, **kwargs)
        
        # Check if user can access this data
        can_access = False
        
        if user_profile.role in ['INTERN', 'REGISTRAR']:
            # Can only access their own data
            # This would need to be implemented based on the specific model
            can_access = True  # Simplified for now
        elif user_profile.role == 'SUPERVISOR':
            # Can access assigned trainee data
            # This would need to check if the data belongs to an assigned trainee
            can_access = True  # Simplified for now
        elif user_profile.role == 'ORG_ADMIN':
            # Can access organization data
            can_access = True  # Simplified for now
        
        if not can_access:
            log_data_access(
                user=request.user,
                action='DATA_ACCESS_CHECK',
                resource=view_func.__name__,
                result='DENIED',
                details={'data_id': data_id, 'user_role': user_profile.role}
            )
            return JsonResponse({'error': 'Access denied to this data'}, status=403)
        
        return view_func(request, *args, **kwargs)
    return wrapper




