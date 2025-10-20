from django.db import transaction
from django.utils import timezone
from datetime import timedelta, date
from typing import Dict, List, Tuple, Optional
from .models import RegistrarProgramConfig, RegistrarProfile, PracticeLog, CPDActivity, LeaveRecord, ProgressReport, EndorsementApplication, ObservationRecord
from api.models import UserProfile


class RegistrarValidationService:
    """Service to retrieve and apply configurable AHPRA rules"""
    
    def get_track_requirements(self, track: str) -> RegistrarProgramConfig:
        """Fetch requirements from DB, not hardcoded"""
        config, _ = RegistrarProgramConfig.objects.get_or_create(
            track=track,
            defaults=self._get_defaults_for_track(track)
        )
        return config
    
    def _get_defaults_for_track(self, track: str) -> dict:
        """Initial seeding values - can be modified via admin"""
        defaults = {
            'TRACK_1': {
                'duration_years': 2, 
                'supervision_hours_required': 80, 
                'cpd_hours_required': 30,
                'total_hours_required': 2000,
                'direct_contact_annual_hours': 176,
                'active_cpd_percentage': 0.5,
                'peer_consultation_hours': 10,
                'principal_supervisor_min_percentage': 50.0,
                'individual_supervision_min_percentage': 66.6,
                'short_session_max_hours': 10,
                'short_session_threshold_minutes': 60,
                'direct_supervision_hours_per_fte': 40,
                'observation_frequency_days': 180,
                'observation_warning_days': 150,
            },
            'TRACK_2': {
                'duration_years': 3, 
                'supervision_hours_required': 120, 
                'cpd_hours_required': 45,
                'total_hours_required': 3000,
                'direct_contact_annual_hours': 176,
                'active_cpd_percentage': 0.5,
                'peer_consultation_hours': 10,
                'principal_supervisor_min_percentage': 50.0,
                'individual_supervision_min_percentage': 66.6,
                'short_session_max_hours': 10,
                'short_session_threshold_minutes': 60,
                'direct_supervision_hours_per_fte': 40,
                'observation_frequency_days': 180,
                'observation_warning_days': 150,
            },
            'TRACK_3': {
                'duration_years': 4, 
                'supervision_hours_required': 160, 
                'cpd_hours_required': 60,
                'total_hours_required': 4000,
                'direct_contact_annual_hours': 176,
                'active_cpd_percentage': 0.5,
                'peer_consultation_hours': 10,
                'principal_supervisor_min_percentage': 50.0,
                'individual_supervision_min_percentage': 66.6,
                'short_session_max_hours': 10,
                'short_session_threshold_minutes': 60,
                'direct_supervision_hours_per_fte': 40,
                'observation_frequency_days': 180,
                'observation_warning_days': 150,
            },
        }
        return defaults.get(track, defaults['TRACK_1'])
    
    def validate_supervisor_eligibility(self, supervisor_profile: 'SupervisorProfile', aope_area: str) -> Tuple[bool, str]:
        """Validate if supervisor meets eligibility requirements for AoPE area"""
        if not supervisor_profile.can_supervise_registrars:
            return False, "Supervisor is not approved to supervise registrars"
        
        # Check if supervisor has 2+ years endorsement experience in the AoPE area
        if not hasattr(supervisor_profile, 'aope_endorsements') or not supervisor_profile.aope_endorsements:
            return False, "Supervisor has no AoPE endorsements"
        
        # This would need to be implemented based on how supervisor endorsements are stored
        # For now, return True as a placeholder
        return True, "Supervisor is eligible"
    
    def calculate_program_requirements(self, track: str, fte_fraction: float) -> Dict:
        """Calculate adjusted requirements based on FTE"""
        config = self.get_track_requirements(track)
        
        # Adjust hours based on FTE
        adjusted_supervision = int(config.supervision_hours_required * fte_fraction)
        adjusted_cpd = int(config.cpd_hours_required * fte_fraction)
        adjusted_total = int(config.total_hours_required * fte_fraction)
        
        # Calculate expected completion date
        weeks_required = int(config.duration_years * 52 * fte_fraction)
        
        return {
            'track': track,
            'duration_years': config.duration_years,
            'fte_fraction': fte_fraction,
            'weeks_required': weeks_required,
            'supervision_hours_required': adjusted_supervision,
            'cpd_hours_required': adjusted_cpd,
            'total_hours_required': adjusted_total,
            'direct_contact_annual_hours': config.direct_contact_annual_hours,
            'short_session_rules': {
                'max_hours': config.short_session_max_hours,
                'threshold_minutes': config.short_session_threshold_minutes,
            },
            'supervision_rules': {
                'principal_min_percentage': config.principal_supervisor_min_percentage,
                'individual_min_percentage': config.individual_supervision_min_percentage,
                'direct_supervision_hours_per_fte': config.direct_supervision_hours_per_fte,
            },
            'observation_rules': {
                'frequency_days': config.observation_frequency_days,
                'warning_days': config.observation_warning_days,
            }
        }
    
    def get_dashboard_stats(self, registrar_profile: RegistrarProfile) -> Dict:
        """Calculate comprehensive dashboard statistics for a registrar"""
        # This would be implemented to calculate all the dashboard metrics
        # For now, return a placeholder structure
        return {
            'total_hours': 0,
            'supervision_hours': 0,
            'cpd_hours': 0,
            'direct_contact_hours_this_year': 0,
            'weeks_elapsed': 0,
            'supervision_composition': {'principal_percent': 0, 'secondary_percent': 0},
            'supervision_delivery': {'individual_percent': 0, 'group_percent': 0},
            'short_session_stats': {'hours': 0, 'max_hours': 10, 'percentage': 0},
            'last_observation_date': None,
            'days_since_observation': 0,
            'reflection_completion_rate': 0,
            'traffic_lights': {
                'overall': 'green',
                'direct_contact': 'green',
                'supervision': 'green',
                'observation': 'green',
                'cpd': 'green'
            }
        }
