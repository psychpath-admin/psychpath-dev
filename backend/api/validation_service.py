"""
AHPRA Validation Service

Provides validation logic for both Provisional (5+1) and Registrar programs
according to AHPRA requirements.

This service enforces all validation rules defined in ahpra_requirements.py
"""

from decimal import Decimal
from datetime import datetime, date, timedelta
from django.contrib.auth import get_user_model
from api.ahpra_requirements import AHPRARequirements

User = get_user_model()


class ProvisionalValidationService:
    """
    Validation service for Provisional (5+1) program
    
    Validates:
    - Total hours (≥1500)
    - Client contact hours (≥500)
    - Simulated hours (≤60)
    - Supervision hours (≥80, with 50 principal / 30 other split)
    - Duration (≥44 weeks FTE)
    - Reflection requirements
    - Competency referencing
    - Observations (8 total: 4 assessment + 4 intervention)
    - Progress reviews
    """
    
    @classmethod
    def validate_total_hours(cls, user):
        """
        Validate total practice hours meet AHPRA minimum (1500 hours)
        
        Returns:
            (is_valid, error_code, message, details)
        """
        from logbook_app.models import WeeklyLogbook
        
        requirements = AHPRARequirements.PROVISIONAL_5PLUS1['hours']
        required_total = requirements['total_practice']['minimum']
        
        # Calculate total hours from all logbooks
        logbooks = WeeklyLogbook.objects.filter(trainee=user, status='approved')
        total_hours = sum(lb.cumulative_total_hours or 0 for lb in logbooks)
        
        # Add prior hours if any
        prior_hours = 0
        if hasattr(user, 'profile') and user.profile.prior_hours:
            prior_hours = user.profile.prior_hours.get('total_practice', 0)
        
        total_with_prior = float(total_hours) + float(prior_hours)
        
        if total_with_prior < required_total:
            return (
                False,
                requirements['total_practice']['error_code'],
                requirements['total_practice']['validation_message'],
                {
                    'current_hours': total_with_prior,
                    'required_hours': required_total,
                    'shortfall': required_total - total_with_prior,
                    'approved_hours': float(total_hours),
                    'prior_hours': float(prior_hours),
                }
            )
        
        return (True, None, None, {'current_hours': total_with_prior, 'required_hours': required_total})
    
    @classmethod
    def validate_client_contact_hours(cls, user):
        """
        Validate client contact hours meet AHPRA minimum (500 hours)
        Includes both direct real and direct simulated contact
        
        Returns:
            (is_valid, error_code, message, details)
        """
        from logbook_app.models import WeeklyLogbook
        
        requirements = AHPRARequirements.PROVISIONAL_5PLUS1['hours']
        required_client_contact = requirements['client_contact']['minimum']
        
        # Calculate client contact hours (DCC hours in current system)
        logbooks = WeeklyLogbook.objects.filter(trainee=user, status='approved')
        client_contact_hours = sum(lb.cumulative_dcc_hours or 0 for lb in logbooks)
        
        # Add prior hours if any
        prior_hours = 0
        if hasattr(user, 'profile') and user.profile.prior_hours:
            prior_hours = user.profile.prior_hours.get('client_contact', 0)
        
        total_with_prior = float(client_contact_hours) + float(prior_hours)
        
        if total_with_prior < required_client_contact:
            return (
                False,
                requirements['client_contact']['error_code'],
                requirements['client_contact']['validation_message'],
                {
                    'current_hours': total_with_prior,
                    'required_hours': required_client_contact,
                    'shortfall': required_client_contact - total_with_prior,
                    'approved_hours': float(client_contact_hours),
                    'prior_hours': float(prior_hours),
                }
            )
        
        return (True, None, None, {'current_hours': total_with_prior, 'required_hours': required_client_contact})
    
    @classmethod
    def validate_simulated_hours(cls, user, new_simulated_hours=0):
        """
        Validate simulated skills training hours don't exceed AHPRA limit (60 hours)
        
        Args:
            user: User object
            new_simulated_hours: New simulated hours being added (for pre-save validation)
        
        Returns:
            (is_valid, error_code, message, details)
        """
        from logbook_app.models import WeeklyLogbook
        
        requirements = AHPRARequirements.PROVISIONAL_5PLUS1['hours']
        maximum_simulated = requirements['simulated_skills']['maximum']
        
        # Calculate current simulated hours
        logbooks = WeeklyLogbook.objects.filter(trainee=user)
        current_simulated = sum(lb.cumulative_simulated_hours or 0 for lb in logbooks)
        
        # Add prior hours if any
        prior_hours = 0
        if hasattr(user, 'profile') and user.profile.prior_hours:
            prior_hours = user.profile.prior_hours.get('simulated', 0)
        
        total_simulated = float(current_simulated) + float(prior_hours) + float(new_simulated_hours)
        
        if total_simulated > maximum_simulated:
            return (
                False,
                requirements['simulated_skills']['error_code'],
                requirements['simulated_skills']['validation_message'],
                {
                    'current_hours': float(current_simulated) + float(prior_hours),
                    'new_hours': float(new_simulated_hours),
                    'total_would_be': total_simulated,
                    'maximum_allowed': maximum_simulated,
                    'excess': total_simulated - maximum_simulated,
                }
            )
        
        return (True, None, None, {'current_hours': total_simulated, 'maximum_allowed': maximum_simulated})
    
    @classmethod
    def validate_supervision_hours(cls, user):
        """
        Validate supervision hours meet AHPRA requirements:
        - Total ≥80 hours
        - Principal individual ≥50 hours
        - Other (group/secondary) ≤30 hours
        
        Returns:
            (is_valid, error_code, message, details)
        """
        from section_c.models import SupervisionEntry
        
        requirements = AHPRARequirements.PROVISIONAL_5PLUS1['hours']['supervision_total']
        required_total = requirements['minimum']
        required_principal = requirements['breakdown']['principal_individual']['minimum']
        max_other = requirements['breakdown']['other_supervision']['maximum']
        
        # Calculate supervision hours
        supervision_entries = SupervisionEntry.objects.filter(trainee=user, supervisor_approved=True)
        
        # Separate principal and other supervision
        principal_hours = sum(
            entry.duration_hours or 0 
            for entry in supervision_entries 
            if entry.is_principal and entry.is_individual
        )
        other_hours = sum(
            entry.duration_hours or 0 
            for entry in supervision_entries 
            if not (entry.is_principal and entry.is_individual)
        )
        total_hours = principal_hours + other_hours
        
        # Add prior hours if any
        prior_principal = 0
        prior_other = 0
        if hasattr(user, 'profile') and user.profile.prior_hours:
            prior_principal = user.profile.prior_hours.get('supervision_principal', 0)
            prior_other = user.profile.prior_hours.get('supervision_other', 0)
        
        total_principal = float(principal_hours) + float(prior_principal)
        total_other = float(other_hours) + float(prior_other)
        total_with_prior = total_principal + total_other
        
        # Check total supervision hours
        if total_with_prior < required_total:
            return (
                False,
                requirements['error_code'],
                requirements['validation_message'],
                {
                    'current_hours': total_with_prior,
                    'required_hours': required_total,
                    'shortfall': required_total - total_with_prior,
                    'principal_hours': total_principal,
                    'other_hours': total_other,
                }
            )
        
        # Check principal supervision hours
        if total_principal < required_principal:
            return (
                False,
                requirements['breakdown']['principal_individual']['error_code'],
                requirements['breakdown']['principal_individual']['validation_message'],
                {
                    'current_principal_hours': total_principal,
                    'required_principal_hours': required_principal,
                    'shortfall': required_principal - total_principal,
                    'total_supervision_hours': total_with_prior,
                }
            )
        
        # Check other supervision doesn't exceed maximum
        if total_other > max_other:
            return (
                False,
                requirements['breakdown']['other_supervision']['error_code'],
                requirements['breakdown']['other_supervision']['validation_message'],
                {
                    'current_other_hours': total_other,
                    'maximum_other_hours': max_other,
                    'excess': total_other - max_other,
                    'total_supervision_hours': total_with_prior,
                }
            )
        
        return (
            True, 
            None, 
            None, 
            {
                'total_hours': total_with_prior,
                'principal_hours': total_principal,
                'other_hours': total_other,
                'required_total': required_total,
                'required_principal': required_principal,
                'max_other': max_other,
            }
        )
    
    @classmethod
    def validate_duration(cls, user):
        """
        Validate program duration meets AHPRA minimum (44 weeks FTE)
        
        Returns:
            (is_valid, error_code, message, details)
        """
        requirements = AHPRARequirements.PROVISIONAL_5PLUS1['duration']
        minimum_weeks_fte = requirements['minimum_weeks_fte']
        
        if not hasattr(user, 'profile') or not user.profile.weeks_fte_adjusted:
            return (
                False,
                requirements['error_code'],
                'Program start date not set. Please complete your profile to track program duration.',
                {'weeks_fte': 0, 'minimum_weeks': minimum_weeks_fte}
            )
        
        weeks_fte = user.profile.weeks_fte_adjusted
        
        if weeks_fte < minimum_weeks_fte:
            return (
                False,
                requirements['error_code'],
                requirements['validation_message'],
                {
                    'current_weeks_fte': weeks_fte,
                    'minimum_weeks_fte': minimum_weeks_fte,
                    'shortfall_weeks': minimum_weeks_fte - weeks_fte,
                    'fte_percentage': float(user.profile.fte_percentage),
                    'leave_weeks': float(user.profile.total_leave_weeks),
                }
            )
        
        return (
            True, 
            None, 
            None, 
            {
                'current_weeks_fte': weeks_fte,
                'minimum_weeks_fte': minimum_weeks_fte,
                'fte_percentage': float(user.profile.fte_percentage),
            }
        )
    
    @classmethod
    def validate_reflection_requirement(cls, logbook):
        """
        Validate reflection is provided when required by practice type
        
        Args:
            logbook: WeeklyLogbook instance
        
        Returns:
            (is_valid, error_code, message, details)
        """
        if not logbook.practice_type:
            return (True, None, None, {})  # No practice type set yet
        
        reflection_required = AHPRARequirements.validate_provisional_reflection(logbook.practice_type)
        
        if reflection_required and not logbook.reflection_text:
            practice_types = AHPRARequirements.PROVISIONAL_5PLUS1['practice_types']
            practice_config = None
            for key, config in practice_types.items():
                if config['code'] == logbook.practice_type:
                    practice_config = config
                    break
            
            return (
                False,
                'REFLECTION_REQUIRED',
                f"Reflection is mandatory for {practice_config['name']} activities. Please provide a reflection on this week's practice before submitting.",
                {
                    'practice_type': logbook.practice_type,
                    'practice_name': practice_config['name'] if practice_config else logbook.practice_type,
                    'has_reflection': bool(logbook.reflection_text),
                }
            )
        
        return (True, None, None, {'practice_type': logbook.practice_type, 'reflection_required': reflection_required})
    
    @classmethod
    def validate_competencies(cls, logbook):
        """
        Validate competencies are referenced in logbook entries
        
        Args:
            logbook: WeeklyLogbook instance
        
        Returns:
            (is_valid, error_code, message, details)
        """
        if not logbook.competencies_referenced or len(logbook.competencies_referenced) == 0:
            return (
                False,
                'COMPETENCIES_MISSING',
                'You must reference at least one competency (C1-C8) for this week\'s activities. All practice must demonstrate development of AHPRA core competencies.',
                {
                    'has_competencies': False,
                    'competencies_count': 0,
                }
            )
        
        # Validate competency codes are valid (C1-C8)
        valid_codes = [c['code'] for c in AHPRARequirements.get_competency_list()]
        invalid_codes = [c for c in logbook.competencies_referenced if c not in valid_codes]
        
        if invalid_codes:
            return (
                False,
                'INVALID_COMPETENCIES',
                f'Invalid competency codes: {", ".join(invalid_codes)}. Valid codes are C1-C8.',
                {
                    'invalid_codes': invalid_codes,
                    'valid_codes': valid_codes,
                }
            )
        
        return (
            True, 
            None, 
            None, 
            {
                'has_competencies': True,
                'competencies_count': len(logbook.competencies_referenced),
                'competencies': logbook.competencies_referenced,
            }
        )
    
    @classmethod
    def validate_observations(cls, user):
        """
        Validate direct observations meet AHPRA requirements:
        - Total 8 observations
        - 4 assessment observations
        - 4 intervention observations
        
        Returns:
            (is_valid, error_code, message, details)
        """
        from section_c.models import SupervisionEntry
        
        requirements = AHPRARequirements.PROVISIONAL_5PLUS1['observations']
        required_total = requirements['total_required']
        required_assessment = requirements['assessment_required']
        required_intervention = requirements['intervention_required']
        
        # Get all supervision entries that include observations
        supervision_entries = SupervisionEntry.objects.filter(
            trainee=user,
            supervisor_approved=True,
            is_observation=True
        )
        
        # Count by type
        assessment_count = supervision_entries.filter(observation_type='assessment').count()
        intervention_count = supervision_entries.filter(observation_type='intervention').count()
        total_count = assessment_count + intervention_count
        
        if total_count < required_total:
            return (
                False,
                requirements['error_code'],
                requirements['validation_message'],
                {
                    'total_observations': total_count,
                    'required_total': required_total,
                    'assessment_count': assessment_count,
                    'required_assessment': required_assessment,
                    'intervention_count': intervention_count,
                    'required_intervention': required_intervention,
                    'shortfall': required_total - total_count,
                }
            )
        
        if assessment_count < required_assessment:
            return (
                False,
                requirements['error_code'],
                f'You need {required_assessment} assessment observations. You currently have {assessment_count}.',
                {
                    'assessment_count': assessment_count,
                    'required_assessment': required_assessment,
                    'shortfall': required_assessment - assessment_count,
                }
            )
        
        if intervention_count < required_intervention:
            return (
                False,
                requirements['error_code'],
                f'You need {required_intervention} intervention observations. You currently have {intervention_count}.',
                {
                    'intervention_count': intervention_count,
                    'required_intervention': required_intervention,
                    'shortfall': required_intervention - intervention_count,
                }
            )
        
        return (
            True,
            None,
            None,
            {
                'total_observations': total_count,
                'assessment_count': assessment_count,
                'intervention_count': intervention_count,
                'required_total': required_total,
                'required_assessment': required_assessment,
                'required_intervention': required_intervention,
            }
        )
    
    @classmethod
    def validate_all(cls, user):
        """
        Run all validations for provisional user
        
        Returns:
            {
                'is_valid': bool,
                'validations': {
                    'total_hours': {...},
                    'client_contact': {...},
                    'simulated_hours': {...},
                    'supervision': {...},
                    'duration': {...},
                    'observations': {...},
                },
                'errors': [...],
                'warnings': [...],
            }
        """
        results = {
            'is_valid': True,
            'validations': {},
            'errors': [],
            'warnings': [],
        }
        
        # Run all validations
        validations = [
            ('total_hours', cls.validate_total_hours(user)),
            ('client_contact', cls.validate_client_contact_hours(user)),
            ('simulated_hours', cls.validate_simulated_hours(user)),
            ('supervision', cls.validate_supervision_hours(user)),
            ('duration', cls.validate_duration(user)),
            ('observations', cls.validate_observations(user)),
        ]
        
        for validation_name, (is_valid, error_code, message, details) in validations:
            results['validations'][validation_name] = {
                'is_valid': is_valid,
                'error_code': error_code,
                'message': message,
                'details': details,
            }
            
            if not is_valid:
                results['is_valid'] = False
                results['errors'].append({
                    'validation': validation_name,
                    'error_code': error_code,
                    'message': message,
                    'details': details,
                })
        
        return results


class RegistrarValidationService:
    """
    Validation service for Registrar (Area of Practice Endorsement) program
    
    Validates:
    - Track-specific requirements (SIXTH_YEAR, SIXTH_PHD, SEVENTH_YEAR)
    - Direct client contact (≥176h/year)
    - Supervision composition (Principal%, Individual/Group%, AoPE match)
    - CPD requirements (active, peer consultation, AoPE alignment)
    - Observations (≥1 every 6 months)
    """
    
    # TODO: Implement Registrar validations in Phase 3
    pass

