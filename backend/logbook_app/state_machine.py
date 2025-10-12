"""
Logbook State Machine

This module provides a centralized state machine for managing logbook status transitions.
It ensures consistency across all user roles and prevents invalid state changes.
"""

from enum import Enum
from typing import Dict, List, Optional, Set
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import LogbookAuditLog


class LogbookState(Enum):
    """Valid logbook states"""
    DRAFT = 'draft'
    READY = 'ready'
    SUBMITTED = 'submitted'
    RETURNED_FOR_EDITS = 'returned_for_edits'
    APPROVED = 'approved'
    REJECTED = 'rejected'
    UNLOCKED_FOR_EDITS = 'unlocked_for_edits'


class LogbookStateMachine:
    """
    State machine for logbook approval workflow.
    
    This ensures all status transitions are valid and consistently applied
    across all user roles (provisional, registrar, supervisor, org_admin).
    """
    
    # Define valid state transitions
    TRANSITIONS: Dict[LogbookState, Set[LogbookState]] = {
        LogbookState.DRAFT: {LogbookState.READY, LogbookState.SUBMITTED},
        LogbookState.READY: {LogbookState.SUBMITTED, LogbookState.DRAFT},
        LogbookState.SUBMITTED: {
            LogbookState.RETURNED_FOR_EDITS,
            LogbookState.APPROVED,
            LogbookState.REJECTED
        },
        LogbookState.RETURNED_FOR_EDITS: {
            LogbookState.SUBMITTED,
            LogbookState.UNLOCKED_FOR_EDITS
        },
        LogbookState.UNLOCKED_FOR_EDITS: {
            LogbookState.SUBMITTED,
            LogbookState.RETURNED_FOR_EDITS
        },
        LogbookState.APPROVED: set(),  # Terminal state
        LogbookState.REJECTED: {LogbookState.SUBMITTED},  # Can resubmit
    }
    
    # State display names
    STATE_DISPLAY_NAMES = {
        LogbookState.DRAFT: 'Draft',
        LogbookState.READY: 'Ready for Submission',
        LogbookState.SUBMITTED: 'Submitted for Review',
        LogbookState.RETURNED_FOR_EDITS: 'Returned for Edits',
        LogbookState.APPROVED: 'Approved',
        LogbookState.REJECTED: 'Rejected',
        LogbookState.UNLOCKED_FOR_EDITS: 'Unlocked for Editing',
    }
    
    # Role-based permissions for state transitions
    ROLE_PERMISSIONS = {
        'provisional': {
            LogbookState.DRAFT: {LogbookState.READY, LogbookState.SUBMITTED},
            LogbookState.READY: {LogbookState.SUBMITTED, LogbookState.DRAFT},
            LogbookState.SUBMITTED: {LogbookState.RETURNED_FOR_EDITS},  # Can request return for edits
            LogbookState.RETURNED_FOR_EDITS: {LogbookState.SUBMITTED},
            LogbookState.UNLOCKED_FOR_EDITS: {LogbookState.SUBMITTED},
            LogbookState.REJECTED: {LogbookState.SUBMITTED},
        },
        'registrar': {
            LogbookState.DRAFT: {LogbookState.READY, LogbookState.SUBMITTED},
            LogbookState.READY: {LogbookState.SUBMITTED, LogbookState.DRAFT},
            LogbookState.SUBMITTED: {LogbookState.RETURNED_FOR_EDITS},  # Can request return for edits
            LogbookState.RETURNED_FOR_EDITS: {LogbookState.SUBMITTED},
            LogbookState.UNLOCKED_FOR_EDITS: {LogbookState.SUBMITTED},
            LogbookState.REJECTED: {LogbookState.SUBMITTED},
        },
        'supervisor': {
            LogbookState.SUBMITTED: {
                LogbookState.RETURNED_FOR_EDITS,
                LogbookState.APPROVED,
                LogbookState.REJECTED
            },
            LogbookState.RETURNED_FOR_EDITS: {LogbookState.UNLOCKED_FOR_EDITS},
        },
        'org_admin': {
            # Org admins can perform any valid transition
        }
    }
    
    @classmethod
    def get_valid_transitions(cls, current_state: str, user_role: str) -> List[str]:
        """
        Get valid transitions from current state for a given user role.
        
        Args:
            current_state: Current logbook status
            user_role: User's role (provisional, registrar, supervisor, org_admin)
            
        Returns:
            List of valid next states
        """
        try:
            current = LogbookState(current_state)
        except ValueError:
            return []
        
        # Get role-specific permissions
        role_permissions = cls.ROLE_PERMISSIONS.get(user_role, {})
        
        if user_role == 'org_admin':
            # Org admins can perform any valid transition
            valid_states = cls.TRANSITIONS.get(current, set())
        else:
            # Use role-specific permissions
            valid_states = role_permissions.get(current, set())
        
        return [state.value for state in valid_states]
    
    @classmethod
    def can_transition(cls, current_state: str, new_state: str, user_role: str) -> bool:
        """
        Check if a state transition is valid for the given user role.
        
        Args:
            current_state: Current logbook status
            new_state: Desired new status
            user_role: User's role
            
        Returns:
            True if transition is valid, False otherwise
        """
        try:
            current = LogbookState(current_state)
            new = LogbookState(new_state)
        except ValueError:
            return False
        
        # Check if transition is valid in general
        if new not in cls.TRANSITIONS.get(current, set()):
            return False
        
        # Check role-specific permissions
        role_permissions = cls.ROLE_PERMISSIONS.get(user_role, {})
        
        if user_role == 'org_admin':
            # Org admins can perform any valid transition
            return True
        
        # Check if role has permission for this transition
        return new in role_permissions.get(current, set())
    
    @classmethod
    def get_state_display_name(cls, state: str) -> str:
        """Get human-readable display name for a state."""
        try:
            state_enum = LogbookState(state)
            return cls.STATE_DISPLAY_NAMES.get(state_enum, state)
        except ValueError:
            return state
    
    @classmethod
    def validate_transition(cls, current_state: str, new_state: str, user_role: str) -> None:
        """
        Validate a state transition and raise ValidationError if invalid.
        
        Args:
            current_state: Current logbook status
            new_state: Desired new status
            user_role: User's role
            
        Raises:
            ValidationError: If transition is not valid
        """
        if not cls.can_transition(current_state, new_state, user_role):
            current_display = cls.get_state_display_name(current_state)
            new_display = cls.get_state_display_name(new_state)
            
            if current_state == new_state:
                raise ValidationError(f"Logbook is already in '{current_display}' status.")
            
            # Provide user-friendly error messages
            if current_state == 'approved':
                if new_state == 'submitted':
                    raise ValidationError(
                        "This logbook has already been approved and cannot be resubmitted. "
                        "Once approved, logbooks are considered final and cannot be modified. "
                        "If you need to make changes, contact your supervisor to discuss reopening the logbook."
                    )
            
            valid_transitions = cls.get_valid_transitions(current_state, user_role)
            if valid_transitions:
                valid_display_names = [cls.get_state_display_name(t) for t in valid_transitions]
                raise ValidationError(
                    f"Cannot change logbook status from '{current_display}' to '{new_display}'. "
                    f"Available actions from this status: {', '.join(valid_display_names)}."
                )
            else:
                raise ValidationError(
                    f"Cannot change logbook status from '{current_display}'. "
                    f"This logbook is in a final state and no further changes are allowed."
                )


class LogbookStateTransition:
    """
    Handles state transitions with proper validation and audit logging.
    """
    
    @staticmethod
    def transition_to(
        logbook,
        new_state: str,
        user,
        comments: str = '',
        metadata: dict = None,
        **kwargs
    ) -> LogbookAuditLog:
        """
        Transition logbook to new state with validation and audit logging.
        
        Args:
            logbook: WeeklyLogbook instance
            new_state: Target state
            user: User making the transition
            comments: Optional comments
            metadata: Optional metadata
            **kwargs: Additional fields for audit log
            
        Returns:
            LogbookAuditLog instance
            
        Raises:
            ValidationError: If transition is invalid
        """
        # Get user role
        user_role = getattr(user.profile, 'role', 'unknown').lower()
        
        # Import timezone at the top of the function
        from django.utils import timezone
        
        # Check if logbook has an active unlock
        active_unlock = logbook.get_active_unlock()
        
        # If there's an active unlock and we're trying to submit,
        # change status to submitted but note that unlock is still active
        if active_unlock and new_state == LogbookState.SUBMITTED.value:
            # Change status to submitted so supervisor can see it
            previous_state = logbook.status
            logbook.status = LogbookState.SUBMITTED.value
            
            # Set submitted_at timestamp
            logbook.submitted_at = timezone.now()
            logbook.save()
            
            # Create audit log with special note about active unlock
            audit_log = LogbookAuditLog.objects.create(
                logbook=logbook,
                action='submitted',
                user=user,
                user_role=user_role,
                previous_status=previous_state,
                new_status=logbook.status,
                comments=f'{comments} (Submitted while unlocked - entries remain editable until unlock expires)',
                metadata=metadata or {}
            )
            return audit_log
        
        # Validate transition
        LogbookStateMachine.validate_transition(
            logbook.status,
            new_state,
            user_role
        )
        
        # Store previous state
        previous_state = logbook.status
        
        # Update logbook status
        logbook.status = new_state
        
        # Set additional fields based on state
        now = timezone.now()
        if new_state == LogbookState.SUBMITTED.value:
            logbook.submitted_at = now
        elif new_state in [LogbookState.APPROVED.value, LogbookState.REJECTED.value]:
            logbook.reviewed_by = user
            logbook.reviewed_at = now
            if comments:
                logbook.review_comments = comments
        
        # Save logbook
        logbook.save()
        
        # Create audit log
        audit_log = LogbookAuditLog.objects.create(
            logbook=logbook,
            action=new_state,
            user=user,
            user_role=user_role,
            previous_status=previous_state,
            new_status=new_state,
            comments=comments,
            metadata=metadata or {}
        )
        
        return audit_log
    
    @staticmethod
    def get_user_role(user) -> str:
        """Get user role as string."""
        if hasattr(user, 'profile') and hasattr(user.profile, 'role'):
            return user.profile.role.lower()
        return 'unknown'
