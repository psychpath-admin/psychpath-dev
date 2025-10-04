import logging
import os
from datetime import datetime
from django.conf import settings

# Create logs directory if it doesn't exist
LOGS_DIR = os.path.join(settings.BASE_DIR, 'logs')
os.makedirs(LOGS_DIR, exist_ok=True)

# Configure comprehensive logging
LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'detailed': {
            'format': '{levelname} {asctime} {name} {process:d} {thread:d} {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
        'support': {
            'format': '[{asctime}] {levelname} - User: {user} - Function: {function} - Error: {message} - Traceback: {traceback}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
        'audit': {
            'format': '[{asctime}] AUDIT - User: {user} - Action: {action} - Resource: {resource} - Result: {result}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
    },
    'handlers': {
        # Support team error log
        'support_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(LOGS_DIR, 'support_errors.log'),
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
            'formatter': 'support',
        },
        # General application errors
        'app_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(LOGS_DIR, 'application_errors.log'),
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
            'formatter': 'detailed',
        },
        # Data access audit log
        'audit_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(LOGS_DIR, 'data_access_audit.log'),
            'maxBytes': 10485760,  # 10MB
            'backupCount': 10,
            'formatter': 'audit',
        },
        # Console output for development
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'detailed',
        },
    },
    'loggers': {
        'psychpath.support': {
            'handlers': ['support_file', 'console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'psychpath.audit': {
            'handlers': ['audit_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'psychpath.app': {
            'handlers': ['app_file', 'console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django': {
            'handlers': ['app_file', 'console'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}

def get_support_logger():
    """Get logger for support team issues"""
    return logging.getLogger('psychpath.support')

def get_audit_logger():
    """Get logger for data access auditing"""
    return logging.getLogger('psychpath.audit')

def get_app_logger():
    """Get logger for general application errors"""
    return logging.getLogger('psychpath.app')




