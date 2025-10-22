from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from api.models import UserProfile


class IsAgendaOwner(permissions.BasePermission):
    """
    Custom permission to only allow trainee owners to access their agenda data.
    Supervisors and org admins get 403/404 responses.
    """
    
    def has_permission(self, request, view):
        # Must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Get user profile
        try:
            user_profile = UserProfile.objects.get(user=request.user)
        except UserProfile.DoesNotExist:
            return False
        
        # Only trainees can access agenda data
        if user_profile.role not in ['PROVISIONAL', 'INTERN', 'REGISTRAR']:
            # Supervisors and org admins get 403
            raise PermissionDenied("Only trainees can access supervision agenda data")
        
        return True
    
    def has_object_permission(self, request, view, obj):
        # Must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Get user profile
        try:
            user_profile = UserProfile.objects.get(user=request.user)
        except UserProfile.DoesNotExist:
            return False
        
        # Only trainees can access agenda data
        if user_profile.role not in ['PROVISIONAL', 'INTERN', 'REGISTRAR']:
            # Supervisors and org admins get 403
            raise PermissionDenied("Only trainees can access supervision agenda data")
        
        # Check if user owns the agenda
        if hasattr(obj, 'trainee'):
            return obj.trainee == user_profile
        elif hasattr(obj, 'agenda') and hasattr(obj.agenda, 'trainee'):
            return obj.agenda.trainee == user_profile
        
        return False
