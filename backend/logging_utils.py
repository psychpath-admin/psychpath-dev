import logging
import traceback
from datetime import datetime
from functools import wraps
from django.http import JsonResponse
from django.contrib.auth.models import User

def get_support_logger():
    """Get logger for support team issues"""
    return logging.getLogger('psychpath.support')

def get_audit_logger():
    """Get logger for data access auditing"""
    return logging.getLogger('psychpath.audit')

def get_app_logger():
    """Get logger for general application errors"""
    return logging.getLogger('psychpath.app')

def log_support_error(user_id=None, function_name=None, error=None, additional_context=None):
    """
    Log errors for support team with comprehensive context
    """
    support_logger = get_support_logger()
    audit_logger = get_audit_logger()
    
    user_email = "Anonymous"
    if user_id:
        try:
            user = User.objects.get(id=user_id)
            user_email = user.email
        except User.DoesNotExist:
            user_email = f"User ID {user_id} (not found)"
    
    context = {
        'user': user_email,
        'function': function_name or 'Unknown',
        'error_message': str(error) if error else 'Unknown error',
        'traceback': traceback.format_exc(),
    }
    
    if additional_context:
        context.update(additional_context)
    
    support_logger.error('', extra=context)
    
    # Also log to audit for data access issues
    if 'data_access' in str(function_name).lower() or 'permission' in str(error).lower():
        audit_logger.info('', extra={
            'user': user_email,
            'action': 'ERROR',
            'resource': function_name,
            'result': f'FAILED: {str(error)}'
        })

def log_data_access(user, action, resource, result='SUCCESS', details=None):
    """
    Log all data access attempts for auditing
    """
    audit_logger = get_audit_logger()
    
    user_email = "Anonymous"
    if user and hasattr(user, 'email'):
        user_email = user.email
    elif user and hasattr(user, 'id'):
        try:
            user_obj = User.objects.get(id=user.id)
            user_email = user_obj.email
        except:
            user_email = f"User ID {user.id}"
    
    context = {
        'user': user_email,
        'action': action,
        'resource': resource,
        'result': result,
    }
    
    if details:
        context['details'] = details
    
    audit_logger.info('', extra=context)

def support_error_handler(view_func):
    """
    Decorator to automatically log errors for support team
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        try:
            return view_func(request, *args, **kwargs)
        except Exception as e:
            # Log the error for support team
            log_support_error(
                user_id=getattr(request.user, 'id', None),
                function_name=view_func.__name__,
                error=e,
                additional_context={
                    'url': request.path,
                    'method': request.method,
                    'user_agent': request.META.get('HTTP_USER_AGENT', 'Unknown'),
                    'ip_address': request.META.get('REMOTE_ADDR', 'Unknown'),
                }
            )
            
            # Return user-friendly error response
            return JsonResponse({
                'error': 'An unexpected error occurred. Please try again.',
                'support_reference': f"ERR-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
            }, status=500)
    
    return wrapper

def audit_data_access(action, resource):
    """
    Decorator to audit data access
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            try:
                result = view_func(request, *args, **kwargs)
                
                # Log successful access
                log_data_access(
                    user=request.user,
                    action=action,
                    resource=resource,
                    result='SUCCESS'
                )
                
                return result
            except Exception as e:
                # Log failed access
                log_data_access(
                    user=request.user,
                    action=action,
                    resource=resource,
                    result='FAILED',
                    details=str(e)
                )
                raise
        return wrapper
    return decorator

class DataAccessLogger:
    """
    Context manager for logging data access
    """
    def __init__(self, user, action, resource):
        self.user = user
        self.action = action
        self.resource = resource
        self.start_time = None
    
    def __enter__(self):
        self.start_time = datetime.now()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = (datetime.now() - self.start_time).total_seconds()
        result = 'SUCCESS' if exc_type is None else 'FAILED'
        
        log_data_access(
            user=self.user,
            action=self.action,
            resource=self.resource,
            result=result,
            details={'duration_seconds': duration, 'exception': str(exc_val) if exc_val else None}
        )


def log_logbook_action(user, action, entry_id=None, details=None):
    """
    Log logbook-related actions for audit purposes
    """
    audit_logger = get_audit_logger()
    
    context = {
        'user': user.email if user else 'Anonymous',
        'action': action,
        'resource': 'LOGBOOK',
        'entry_id': entry_id,
        'timestamp': datetime.now().isoformat(),
        'details': details or {}
    }
    
    audit_logger.info(f'Logbook action: {action}', extra=context)


def log_supervision_action(user, action, supervisor_email=None, provisional_email=None, details=None):
    """
    Log supervision-related actions for audit purposes
    """
    audit_logger = get_audit_logger()
    
    context = {
        'user': user.email if user else 'Anonymous',
        'action': action,
        'resource': 'SUPERVISION',
        'supervisor_email': supervisor_email,
        'provisional_email': provisional_email,
        'timestamp': datetime.now().isoformat(),
        'details': details or {}
    }
    
    audit_logger.info(f'Supervision action: {action}', extra=context)


def log_sdcc_violation(user, current_hours, attempted_hours, details=None):
    """
    Log SDCC hour limit violations for audit purposes
    """
    audit_logger = get_audit_logger()
    
    context = {
        'user': user.email if user else 'Anonymous',
        'action': 'SDCC_LIMIT_VIOLATION',
        'resource': 'LOGBOOK_SDCC',
        'current_hours': current_hours,
        'attempted_hours': attempted_hours,
        'timestamp': datetime.now().isoformat(),
        'details': details or {}
    }
    
    audit_logger.warning(f'SDCC limit violation attempted', extra=context)


def validation_error_handler(view_func):
    """
    Decorator to handle AHPRA validation errors with help system integration
    
    This decorator:
    1. Catches AHPRAValidationError and MultipleValidationErrors
    2. Logs validation failures for audit
    3. Returns properly formatted error responses with help text
    
    Usage:
        @validation_error_handler
        @api_view(['POST'])
        def my_view(request):
            # ... validation logic ...
            if not valid:
                raise AHPRAValidationError('INSUFFICIENT_TOTAL_HOURS', details={...})
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        try:
            return view_func(request, *args, **kwargs)
        except Exception as e:
            # Import here to avoid circular imports
            from api.exceptions import AHPRAValidationError, MultipleValidationErrors
            from rest_framework.response import Response
            from rest_framework import status
            
            # Handle AHPRA validation errors
            if isinstance(e, (AHPRAValidationError, MultipleValidationErrors)):
                # Log validation failure for audit
                log_data_access(
                    user=request.user,
                    action='VALIDATION_FAILED',
                    resource=view_func.__name__,
                    result='FAILED',
                    details={
                        'error_code': getattr(e, 'error_code', 'MULTIPLE_ERRORS'),
                        'details': getattr(e, 'details_data', {}),
                    }
                )
                
                # Return properly formatted error response
                return Response(e.detail, status=e.status_code)
            
            # Re-raise other exceptions (let support_error_handler handle them)
            raise
    
    return wrapper


def log_validation_error(user, error_code, details=None):
    """
    Log AHPRA validation errors for audit purposes
    
    Args:
        user: User who triggered the validation error
        error_code: AHPRA error code (e.g., 'INSUFFICIENT_TOTAL_HOURS')
        details: Additional context about the error
    """
    audit_logger = get_audit_logger()
    
    context = {
        'user': user.email if user else 'Anonymous',
        'action': 'VALIDATION_ERROR',
        'resource': 'AHPRA_COMPLIANCE',
        'error_code': error_code,
        'timestamp': datetime.now().isoformat(),
        'details': details or {}
    }
    
    audit_logger.info(f'AHPRA validation error: {error_code}', extra=context)
