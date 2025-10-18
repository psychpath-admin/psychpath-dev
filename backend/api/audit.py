"""
Enhanced audit logging system for PsychPATH
"""
import functools
import json
from django.http import HttpRequest
from django.utils import timezone
from .models import AuditLog


def audit_action(action, resource_type, resource_model=None, include_request_data=False):
    """
    Enhanced decorator for auditing user actions
    
    Args:
        action: The action being performed (e.g., 'CREATE', 'UPDATE', 'DELETE')
        resource_type: The type of resource being acted upon
        resource_model: Optional model class to extract resource_id from response
        include_request_data: Whether to include request data in audit details
    """
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(request: HttpRequest, *args, **kwargs):
            # Extract request metadata
            ip_address = _get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            session_id = getattr(request.session, 'session_key', None)
            
            # Prepare audit details
            audit_details = {
                'url': request.path,
                'method': request.method,
                'view_name': view_func.__name__,
                'args': str(args),
                'kwargs': str(kwargs),
            }
            
            if include_request_data and request.method in ['POST', 'PUT', 'PATCH']:
                try:
                    # Safely extract request data without consuming the stream
                    if hasattr(request, 'data'):
                        audit_details['request_data'] = request.data
                    elif hasattr(request, 'POST'):
                        audit_details['post_data'] = dict(request.POST)
                except Exception:
                    audit_details['request_data'] = '<unable to parse>'
            
            try:
                # Execute the view function
                response = view_func(request, *args, **kwargs)
                
                # Extract resource_id if model is provided and response contains data
                resource_id = None
                if resource_model and hasattr(response, 'data'):
                    try:
                        if isinstance(response.data, dict):
                            resource_id = str(response.data.get('id', ''))
                        elif isinstance(response.data, list) and response.data:
                            resource_id = str(response.data[0].get('id', ''))
                    except Exception:
                        pass
                
                # Determine result based on response status
                if hasattr(response, 'status_code'):
                    if 200 <= response.status_code < 300:
                        result = 'SUCCESS'
                    elif 400 <= response.status_code < 500:
                        result = 'FAILED'
                    else:
                        result = 'PARTIAL'
                else:
                    result = 'SUCCESS'
                
                # Add response info to audit details
                audit_details['response_status'] = getattr(response, 'status_code', None)
                
                # Log successful action
                AuditLog.log_action(
                    user=request.user if request.user.is_authenticated else None,
                    action=action,
                    resource_type=resource_type,
                    result=result,
                    resource_id=resource_id,
                    details=audit_details,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    session_id=session_id
                )
                
                return response
                
            except Exception as e:
                # Log failed action
                audit_details['error'] = str(e)
                audit_details['error_type'] = type(e).__name__
                
                AuditLog.log_action(
                    user=request.user if request.user.is_authenticated else None,
                    action=action,
                    resource_type=resource_type,
                    result='FAILED',
                    details=audit_details,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    session_id=session_id
                )
                
                # Re-raise the exception
                raise
        
        return wrapper
    return decorator


def audit_model_action(action, resource_type):
    """
    Decorator for auditing model-based actions (CRUD operations)
    
    Args:
        action: The CRUD action ('CREATE', 'READ', 'UPDATE', 'DELETE')
        resource_type: The type of resource being acted upon
    """
    return audit_action(action, resource_type, include_request_data=True)


def audit_data_access(resource_type):
    """
    Decorator for auditing data access operations
    Compatible with existing logging_utils.py usage
    """
    return audit_action('READ', resource_type)


def _get_client_ip(request):
    """Extract client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


class AuditContext:
    """
    Context manager for manual audit logging
    """
    
    def __init__(self, user, action, resource_type, resource_id=None, details=None):
        self.user = user
        self.action = action
        self.resource_type = resource_type
        self.resource_id = resource_id
        self.details = details or {}
        self.audit_log = None
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        result = 'FAILED' if exc_type else 'SUCCESS'
        
        if exc_type:
            self.details['error'] = str(exc_val)
            self.details['error_type'] = exc_type.__name__
        
        self.audit_log = AuditLog.log_action(
            user=self.user,
            action=self.action,
            resource_type=self.resource_type,
            result=result,
            resource_id=self.resource_id,
            details=self.details
        )
        
        return False  # Don't suppress exceptions


def log_user_action(user, action, resource_type, result='SUCCESS', resource_id=None, details=None):
    """
    Utility function for manual audit logging
    """
    return AuditLog.log_action(
        user=user,
        action=action,
        resource_type=resource_type,
        result=result,
        resource_id=resource_id,
        details=details or {}
    )
