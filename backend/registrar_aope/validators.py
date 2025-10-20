"""
AHPRA validation rules for Registrar AoPE program
"""
from django.core.exceptions import ValidationError
from django.db.models import Sum, Q
from datetime import date, timedelta
from decimal import Decimal
from .models import RegistrarProfile, PracticeLog, CPDActivity, LeaveRecord, ProgressReport
from section_c.models import SupervisionEntry


class RegistrarValidator:
    """Validates registrar compliance with AHPRA requirements"""
    
    @staticmethod
    def validate_track_requirements(registrar_profile):
        """Validate track-specific requirements"""
        track = registrar_profile.program_track
        fte = registrar_profile.fte_fraction
        
        # Track requirements (2 years, 2000 hours total)
        base_weeks = 104  # 2 years
        base_supervision_hours = 200
        base_cpd_hours = 60
        
        # Adjust for FTE
        required_weeks = base_weeks * fte
        required_supervision = base_supervision_hours * fte
        required_cpd = base_cpd_hours * fte
        
        return {
            'required_weeks': required_weeks,
            'required_supervision_hours': required_supervision,
            'required_cpd_hours': required_cpd,
        }
    
    @staticmethod
    def validate_direct_contact_requirement(registrar_profile, year=None):
        """Validate direct client contact requirement (≥176h/year)"""
        if year is None:
            year = date.today().year
        
        # Get direct client contact hours for the year
        direct_contact_hours = PracticeLog.objects.filter(
            registrar=registrar_profile,
            practice_type=PracticeLog.DIRECT_CLIENT,
            date__year=year
        ).aggregate(total=Sum('duration_hours'))['total'] or Decimal('0')
        
        required_hours = registrar_profile.direct_contact_requirement
        
        # Check for board variation
        if registrar_profile.board_variation_enabled:
            # Board variation allows different requirements
            pass
        
        return {
            'actual_hours': float(direct_contact_hours),
            'required_hours': required_hours,
            'compliant': direct_contact_hours >= required_hours,
            'deficit': max(0, required_hours - direct_contact_hours),
        }
    
    @staticmethod
    def validate_aope_alignment(registrar_profile):
        """Validate AoPE alignment across activities"""
        aope = registrar_profile.aope_area
        
        # Check practice logs
        misaligned_practice = PracticeLog.objects.filter(
            registrar=registrar_profile,
            aope_alignment=False
        ).count()
        
        # Check CPD activities
        misaligned_cpd = CPDActivity.objects.filter(
            registrar=registrar_profile,
            aope_alignment=False
        ).count()
        
        return {
            'misaligned_practice_logs': misaligned_practice,
            'misaligned_cpd_activities': misaligned_cpd,
            'total_misaligned': misaligned_practice + misaligned_cpd,
        }
    
    @staticmethod
    def validate_supervision_composition(registrar_profile):
        """Validate supervision composition (Principal ≥50%, Secondary ≤50%/33%)"""
        # Get supervision entries for this registrar
        supervision_entries = SupervisionEntry.objects.filter(
            trainee=registrar_profile.user.profile
        )
        
        total_hours = supervision_entries.aggregate(
            total=Sum('duration_minutes')
        )['total'] or 0
        total_hours = total_hours / 60.0  # Convert to hours
        
        # Principal supervisor hours
        principal_hours = supervision_entries.filter(
            supervisor_type='PRINCIPAL'
        ).aggregate(total=Sum('duration_minutes'))['total'] or 0
        principal_hours = principal_hours / 60.0
        
        # Secondary supervisor hours
        secondary_hours = supervision_entries.filter(
            supervisor_type='SECONDARY'
        ).aggregate(total=Sum('duration_minutes'))['total'] or 0
        secondary_hours = secondary_hours / 60.0
        
        if total_hours > 0:
            principal_percentage = (principal_hours / total_hours) * 100
            secondary_percentage = (secondary_hours / total_hours) * 100
        else:
            principal_percentage = 0
            secondary_percentage = 0
        
        # Check if principal supervisor has same AoPE endorsement
        principal_supervisor = registrar_profile.principal_supervisor
        principal_has_aope = False
        if principal_supervisor and hasattr(principal_supervisor, 'user'):
            supervisor_endorsements = principal_supervisor.user.supervisor_endorsements.filter(
                endorsement=registrar_profile.aope_area,
                is_active=True
            ).exists()
            principal_has_aope = supervisor_endorsements
        
        return {
            'total_hours': total_hours,
            'principal_hours': principal_hours,
            'secondary_hours': secondary_hours,
            'principal_percentage': principal_percentage,
            'secondary_percentage': secondary_percentage,
            'principal_has_aope_endorsement': principal_has_aope,
            'compliant_principal': principal_percentage >= 50.0,
            'compliant_secondary': secondary_percentage <= 50.0,  # Will be adjusted based on AoPE match
        }
    
    @staticmethod
    def validate_supervision_delivery(registrar_profile):
        """Validate supervision delivery (Individual ≥66%, Group ≤33%)"""
        supervision_entries = SupervisionEntry.objects.filter(
            trainee=registrar_profile.user.profile
        )
        
        total_hours = supervision_entries.aggregate(
            total=Sum('duration_minutes')
        )['total'] or 0
        total_hours = total_hours / 60.0
        
        # Individual supervision hours
        individual_hours = supervision_entries.filter(
            supervision_type='INDIVIDUAL'
        ).aggregate(total=Sum('duration_minutes'))['total'] or 0
        individual_hours = individual_hours / 60.0
        
        # Group supervision hours
        group_hours = supervision_entries.filter(
            supervision_type='GROUP'
        ).aggregate(total=Sum('duration_minutes'))['total'] or 0
        group_hours = group_hours / 60.0
        
        if total_hours > 0:
            individual_percentage = (individual_hours / total_hours) * 100
            group_percentage = (group_hours / total_hours) * 100
        else:
            individual_percentage = 0
            group_percentage = 0
        
        return {
            'total_hours': total_hours,
            'individual_hours': individual_hours,
            'group_hours': group_hours,
            'individual_percentage': individual_percentage,
            'group_percentage': group_percentage,
            'compliant_individual': individual_percentage >= 66.0,
            'compliant_group': group_percentage <= 33.0,
        }
    
    @staticmethod
    def validate_short_session_limits(registrar_profile):
        """Validate short session limits (≤25% of total supervision)"""
        supervision_entries = SupervisionEntry.objects.filter(
            trainee=registrar_profile.user.profile
        )
        
        total_hours = supervision_entries.aggregate(
            total=Sum('duration_minutes')
        )['total'] or 0
        total_hours = total_hours / 60.0
        
        # Short sessions (< 60 minutes)
        short_hours = supervision_entries.filter(
            is_short_session=True
        ).aggregate(total=Sum('duration_minutes'))['total'] or 0
        short_hours = short_hours / 60.0
        
        if total_hours > 0:
            short_percentage = (short_hours / total_hours) * 100
        else:
            short_percentage = 0
        
        return {
            'total_hours': total_hours,
            'short_hours': short_hours,
            'short_percentage': short_percentage,
            'compliant': short_percentage <= 25.0,
            'limit_exceeded': short_hours > 10.0,  # Also check 10-hour absolute limit
        }
    
    @staticmethod
    def validate_direct_supervision_hours(registrar_profile):
        """Validate direct supervision hours (≥40h/FTE year, ≥10h on leave year)"""
        year = date.today().year
        fte = registrar_profile.fte_fraction
        
        # Check if registrar is on leave
        current_leave = LeaveRecord.objects.filter(
            registrar=registrar_profile,
            start_date__lte=date.today(),
            end_date__gte=date.today()
        ).exists()
        
        # Get direct supervision hours for the year
        direct_supervision_hours = SupervisionEntry.objects.filter(
            trainee=registrar_profile.user.profile,
            date_of_supervision__year=year,
            supervision_mode='CLINICAL'  # Direct supervision
        ).aggregate(total=Sum('duration_minutes'))['total'] or 0
        direct_supervision_hours = direct_supervision_hours / 60.0
        
        if current_leave:
            required_hours = 10.0  # Minimum on leave
        else:
            required_hours = 40.0 * fte  # 40 hours per FTE year
        
        return {
            'actual_hours': float(direct_supervision_hours),
            'required_hours': required_hours,
            'compliant': direct_supervision_hours >= required_hours,
            'on_leave': current_leave,
        }
    
    @staticmethod
    def validate_observation_requirements(registrar_profile):
        """Validate observation requirements (≥1 every 6 months)"""
        from .models import ObservationRecord
        
        # Get last observation
        last_observation = ObservationRecord.objects.filter(
            registrar=registrar_profile
        ).order_by('-observation_date').first()
        
        if not last_observation:
            return {
                'last_observation_date': None,
                'days_since_observation': None,
                'compliant': False,
                'next_due': None,
            }
        
        days_since = (date.today() - last_observation.observation_date).days
        next_due = last_observation.observation_date + timedelta(days=180)  # 6 months
        
        return {
            'last_observation_date': last_observation.observation_date,
            'days_since_observation': days_since,
            'compliant': days_since <= 180,
            'next_due': next_due,
        }
    
    @staticmethod
    def validate_cpd_active_requirement(registrar_profile):
        """Validate CPD active requirement"""
        year = date.today().year
        
        # Get active CPD hours for the year
        active_cpd_hours = CPDActivity.objects.filter(
            registrar=registrar_profile,
            date__year=year,
            is_active=True
        ).aggregate(total=Sum('duration_hours'))['total'] or Decimal('0')
        
        # Get non-active CPD that needs supervisor task
        non_active_cpd = CPDActivity.objects.filter(
            registrar=registrar_profile,
            date__year=year,
            is_active=False,
            supervisor_set_task__isnull=True
        ).count()
        
        return {
            'active_cpd_hours': float(active_cpd_hours),
            'non_active_without_task': non_active_cpd,
            'compliant': non_active_cpd == 0,
        }
    
    @staticmethod
    def validate_peer_consultation_hours(registrar_profile):
        """Validate peer consultation hours (≥10h/year)"""
        year = date.today().year
        
        peer_consultation_hours = CPDActivity.objects.filter(
            registrar=registrar_profile,
            date__year=year,
            is_peer_consultation=True
        ).aggregate(total=Sum('duration_hours'))['total'] or Decimal('0')
        
        required_hours = 10.0
        
        return {
            'actual_hours': float(peer_consultation_hours),
            'required_hours': required_hours,
            'compliant': peer_consultation_hours >= required_hours,
            'deficit': max(0, required_hours - float(peer_consultation_hours)),
        }
    
    @staticmethod
    def validate_reflection_completion(registrar_profile):
        """Validate reflection completion for direct client contact"""
        # Get direct client contact activities without reflection
        missing_reflections = PracticeLog.objects.filter(
            registrar=registrar_profile,
            practice_type=PracticeLog.DIRECT_CLIENT,
            reflection_text__isnull=True
        ).exclude(reflection_text='').count()
        
        total_direct_client = PracticeLog.objects.filter(
            registrar=registrar_profile,
            practice_type=PracticeLog.DIRECT_CLIENT
        ).count()
        
        completion_rate = 0
        if total_direct_client > 0:
            completion_rate = ((total_direct_client - missing_reflections) / total_direct_client) * 100
        
        return {
            'total_direct_client_activities': total_direct_client,
            'missing_reflections': missing_reflections,
            'completion_rate': completion_rate,
            'compliant': missing_reflections == 0,
        }
    
    @staticmethod
    def validate_competency_attainment(registrar_profile):
        """Validate competency attainment (M3-M4 across C1-C8)"""
        # Get latest progress report
        latest_report = ProgressReport.objects.filter(
            registrar=registrar_profile
        ).order_by('-created_at').first()
        
        if not latest_report:
            return {
                'has_progress_report': False,
                'competency_ratings': {},
                'compliant': False,
            }
        
        competency_ratings = latest_report.competency_ratings
        required_levels = ['M3', 'M4']  # M3 or M4 required for endorsement
        
        compliant_competencies = 0
        total_competencies = 8  # C1-C8
        
        for i in range(1, 9):  # C1 to C8
            competency_key = f'C{i}'
            rating = competency_ratings.get(competency_key, '')
            if rating in required_levels:
                compliant_competencies += 1
        
        return {
            'has_progress_report': True,
            'competency_ratings': competency_ratings,
            'compliant_competencies': compliant_competencies,
            'total_competencies': total_competencies,
            'compliant': compliant_competencies == total_competencies,
        }
    
    @classmethod
    def get_comprehensive_compliance(cls, registrar_profile):
        """Get comprehensive compliance status for a registrar"""
        return {
            'track_requirements': cls.validate_track_requirements(registrar_profile),
            'direct_contact': cls.validate_direct_contact_requirement(registrar_profile),
            'aope_alignment': cls.validate_aope_alignment(registrar_profile),
            'supervision_composition': cls.validate_supervision_composition(registrar_profile),
            'supervision_delivery': cls.validate_supervision_delivery(registrar_profile),
            'short_session_limits': cls.validate_short_session_limits(registrar_profile),
            'direct_supervision_hours': cls.validate_direct_supervision_hours(registrar_profile),
            'observation_requirements': cls.validate_observation_requirements(registrar_profile),
            'cpd_active_requirement': cls.validate_cpd_active_requirement(registrar_profile),
            'peer_consultation_hours': cls.validate_peer_consultation_hours(registrar_profile),
            'reflection_completion': cls.validate_reflection_completion(registrar_profile),
            'competency_attainment': cls.validate_competency_attainment(registrar_profile),
        }


class SupervisorEligibilityValidator:
    """Validates supervisor eligibility for registrar supervision"""
    
    @staticmethod
    def validate_principal_supervisor_eligibility(supervisor_profile, registrar_profile):
        """Validate principal supervisor eligibility (≥2 years endorsement experience)"""
        if not supervisor_profile or not hasattr(supervisor_profile, 'user'):
            return {
                'eligible': False,
                'reason': 'Invalid supervisor profile',
            }
        
        # Check if supervisor has the required AoPE endorsement
        supervisor_endorsements = supervisor_profile.user.supervisor_endorsements.filter(
            endorsement=registrar_profile.aope_area,
            is_active=True
        )
        
        if not supervisor_endorsements.exists():
            return {
                'eligible': False,
                'reason': f'Supervisor does not have {registrar_profile.get_aope_area_display()} endorsement',
            }
        
        # Check years of endorsement experience
        endorsement = supervisor_endorsements.first()
        years_experience = (date.today() - endorsement.endorsement_date).days / 365.25
        
        if years_experience < 2.0:
            return {
                'eligible': False,
                'reason': f'Supervisor has only {years_experience:.1f} years endorsement experience (minimum 2 years required)',
            }
        
        return {
            'eligible': True,
            'years_experience': years_experience,
            'endorsement_date': endorsement.endorsement_date,
        }
    
    @staticmethod
    def validate_secondary_supervisor_eligibility(supervisor_profile, registrar_profile):
        """Validate secondary supervisor eligibility"""
        if not supervisor_profile or not hasattr(supervisor_profile, 'user'):
            return {
                'eligible': False,
                'reason': 'Invalid supervisor profile',
            }
        
        # Secondary supervisor can have different AoPE but must be board-approved
        if not supervisor_profile.is_board_approved_supervisor:
            return {
                'eligible': False,
                'reason': 'Secondary supervisor must be board-approved',
            }
        
        return {
            'eligible': True,
            'reason': 'Eligible as secondary supervisor',
        }
