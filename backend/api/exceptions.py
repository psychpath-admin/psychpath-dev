"""
Custom Exceptions for AHPRA Validation

Provides ValidationError with integrated help system support.
"""

from rest_framework.exceptions import APIException
from rest_framework import status as http_status
from api.validation_messages import ValidationMessages


class AHPRAValidationError(APIException):
    """
    Custom validation error for AHPRA compliance
    
    This exception automatically generates user-friendly error messages
    with help text from the ValidationMessages system.
    
    Usage:
        raise AHPRAValidationError(
            error_code='INSUFFICIENT_TOTAL_HOURS',
            details={'current_hours': 1200, 'required_hours': 1500}
        )
    """
    
    status_code = http_status.HTTP_400_BAD_REQUEST
    default_detail = 'Validation error'
    default_code = 'validation_error'
    
    def __init__(self, error_code, details=None, status_code=None):
        """
        Initialize validation error with help system integration
        
        Args:
            error_code: Error code from AHPRA requirements (e.g., 'INSUFFICIENT_TOTAL_HOURS')
            details: Optional dict with additional context
            status_code: Optional HTTP status code (default: 400)
        """
        self.error_code = error_code
        self.details_data = details or {}
        
        if status_code:
            self.status_code = status_code
        
        # Get formatted message with help from ValidationMessages
        message_config = ValidationMessages.get_message(error_code, details)
        
        # Set detail for DRF
        self.detail = {
            'error': error_code,
            'title': message_config['title'],
            'message': message_config['message'],
            'severity': message_config['severity'],
            'help': {
                'text': message_config['help_text'],
                'category': message_config.get('help_category', 'general'),
                'section': message_config.get('help_section', 'general'),
            },
            'details': message_config['details'],
        }
        
        super().__init__(detail=self.detail, code=error_code)


class MultipleValidationErrors(APIException):
    """
    Exception for multiple validation errors
    
    Use when multiple validations fail and you want to return all errors at once.
    
    Usage:
        errors = [
            AHPRAValidationError('INSUFFICIENT_TOTAL_HOURS', {...}),
            AHPRAValidationError('INSUFFICIENT_SUPERVISION', {...}),
        ]
        raise MultipleValidationErrors(errors)
    """
    
    status_code = http_status.HTTP_400_BAD_REQUEST
    default_detail = 'Multiple validation errors'
    default_code = 'multiple_validation_errors'
    
    def __init__(self, errors, status_code=None):
        """
        Initialize with list of validation errors
        
        Args:
            errors: List of AHPRAValidationError instances or dicts
            status_code: Optional HTTP status code (default: 400)
        """
        if status_code:
            self.status_code = status_code
        
        # Format errors
        formatted_errors = []
        for error in errors:
            if isinstance(error, AHPRAValidationError):
                formatted_errors.append(error.detail)
            elif isinstance(error, dict):
                formatted_errors.append(error)
            else:
                formatted_errors.append({
                    'error': 'UNKNOWN_ERROR',
                    'message': str(error),
                })
        
        self.detail = {
            'error': 'MULTIPLE_VALIDATION_ERRORS',
            'message': f'{len(formatted_errors)} validation error(s) found',
            'errors': formatted_errors,
        }
        
        super().__init__(detail=self.detail, code='multiple_validation_errors')

