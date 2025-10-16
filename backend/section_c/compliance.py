"""
AHPRA Supervision Compliance Service

Calculates and validates supervision compliance for the 5+1 internship program
according to AHPRA requirements.
"""

from django.db.models import Sum, Q, Count
from datetime import timedelta
from decimal import Decimal
from typing import Dict, List, Tuple

from .models import SupervisionEntry, SupervisionObservation, SupervisionComplianceReport
from api.models import UserProfile
from system_config.models import SystemConfiguration


class SupervisionComplianceService:
    """Service for calculating AHPRA supervision compliance"""
    
    def __init__(self, trainee_profile: UserProfile):
        self.trainee = trainee_profile
        self.config = SystemConfiguration.get_config()
    
    def calculate_compliance(self) -> SupervisionComplianceReport:
        """
        Calculate complete AHPRA supervision compliance for a trainee.
        Updates or creates a SupervisionComplianceReport.
        """
        # Get or create compliance report
        report, created = SupervisionComplianceReport.objects.get_or_create(
            trainee=self.trainee
        )
        
        # Calculate all metrics
        hours_breakdown = self.get_supervision_hours_breakdown()
        observations = self.get_observation_counts()
        warnings = self.get_compliance_warnings()
        
        # Update report with calculated values
        report.total_supervision_hours = hours_breakdown['total_hours']
        report.individual_supervision_hours = hours_breakdown['individual_hours']
        report.group_supervision_hours = hours_breakdown['group_hours']
        report.direct_inperson_hours = hours_breakdown['direct_inperson_hours']
        report.direct_video_hours = hours_breakdown['direct_video_hours']
        report.direct_phone_hours = hours_breakdown['direct_phone_hours']
        report.indirect_hours = hours_breakdown['indirect_hours']
        report.cultural_supervision_hours = hours_breakdown['cultural_hours']
        
        report.assessment_observations_count = observations['assessments']
        report.intervention_observations_count = observations['interventions']
        
        # Check compliance flags
        report.meets_total_hours = self._check_total_hours(hours_breakdown)
        report.meets_individual_requirement = self._check_individual_requirement(hours_breakdown)
        report.meets_direct_requirement = self._check_direct_requirement(hours_breakdown)
        report.meets_observation_requirement = self._check_observation_requirement(observations)
        report.meets_distribution_requirement = self._check_distribution_requirement()
        
        # Overall compliance
        report.is_compliant = all([
            report.meets_total_hours,
            report.meets_individual_requirement,
            report.meets_direct_requirement,
            report.meets_observation_requirement,
            report.meets_distribution_requirement
        ])
        
        report.warnings = warnings
        report.save()
        
        return report
    
    def get_supervision_hours_breakdown(self) -> Dict[str, Decimal]:
        """Get detailed breakdown of supervision hours by type and mode"""
        entries = SupervisionEntry.objects.filter(trainee=self.trainee)
        
        # Calculate total hours
        total_minutes = entries.aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
        total_hours = Decimal(total_minutes) / Decimal(60)
        
        # By supervision type
        individual_minutes = entries.filter(
            supervision_type='INDIVIDUAL'
        ).aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
        
        group_minutes = entries.filter(
            supervision_type='GROUP'
        ).aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
        
        # By supervision mode
        direct_inperson_minutes = entries.filter(
            supervision_mode='DIRECT_PERSON'
        ).aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
        
        direct_video_minutes = entries.filter(
            supervision_mode='DIRECT_VIDEO'
        ).aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
        
        direct_phone_minutes = entries.filter(
            supervision_mode='DIRECT_PHONE'
        ).aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
        
        indirect_minutes = entries.filter(
            supervision_mode='INDIRECT'
        ).aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
        
        # Cultural supervision
        cultural_minutes = entries.filter(
            is_cultural_supervision=True
        ).aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
        
        return {
            'total_hours': total_hours,
            'individual_hours': Decimal(individual_minutes) / Decimal(60),
            'group_hours': Decimal(group_minutes) / Decimal(60),
            'direct_inperson_hours': Decimal(direct_inperson_minutes) / Decimal(60),
            'direct_video_hours': Decimal(direct_video_minutes) / Decimal(60),
            'direct_phone_hours': Decimal(direct_phone_minutes) / Decimal(60),
            'indirect_hours': Decimal(indirect_minutes) / Decimal(60),
            'cultural_hours': Decimal(cultural_minutes) / Decimal(60),
        }
    
    def get_observation_counts(self) -> Dict[str, int]:
        """Get count of observations by type"""
        observations = SupervisionObservation.objects.filter(trainee=self.trainee)
        
        assessments = observations.filter(observation_type='ASSESSMENT').count()
        interventions = observations.filter(observation_type='INTERVENTION').count()
        
        return {
            'assessments': assessments,
            'interventions': interventions,
            'total': assessments + interventions
        }
    
    def get_supervision_summary(self) -> Dict:
        """Get comprehensive supervision summary with progress percentages"""
        hours = self.get_supervision_hours_breakdown()
        observations = self.get_observation_counts()
        
        # Calculate progress percentages
        total_progress = min(
            float(hours['total_hours']) / float(self.config.min_supervision_hours_total) * 100,
            100
        )
        
        individual_progress = min(
            float(hours['individual_hours']) / float(self.config.min_individual_supervision_hours) * 100,
            100
        )
        
        direct_hours = hours['direct_inperson_hours'] + hours['direct_video_hours'] + hours['direct_phone_hours']
        direct_progress = min(
            float(direct_hours) / float(self.config.min_direct_supervision_hours) * 100,
            100
        )
        
        observation_progress = min(
            float(observations['total']) / float(self.config.total_required_observations) * 100,
            100
        )
        
        return {
            'hours': hours,
            'observations': observations,
            'progress': {
                'total': round(total_progress, 1),
                'individual': round(individual_progress, 1),
                'direct': round(direct_progress, 1),
                'observations': round(observation_progress, 1)
            },
            'targets': {
                'total_hours': self.config.min_supervision_hours_total,
                'individual_hours': self.config.min_individual_supervision_hours,
                'direct_hours': self.config.min_direct_supervision_hours,
                'phone_hours_max': self.config.max_phone_supervision_hours,
                'indirect_hours_max': self.config.max_indirect_supervision_hours,
                'assessment_observations': self.config.required_assessment_observations,
                'intervention_observations': self.config.required_intervention_observations,
                'total_observations': self.config.total_required_observations
            }
        }
    
    def get_compliance_warnings(self) -> List[Dict]:
        """Get list of compliance warnings and recommendations"""
        warnings = []
        hours = self.get_supervision_hours_breakdown()
        observations = self.get_observation_counts()
        
        # Total hours warning
        if hours['total_hours'] < self.config.min_supervision_hours_total:
            warnings.append({
                'level': 'error' if hours['total_hours'] < self.config.min_supervision_hours_total * 0.5 else 'warning',
                'category': 'total_hours',
                'message': f"Need {self.config.min_supervision_hours_total - hours['total_hours']:.1f} more supervision hours to meet minimum requirement"
            })
        
        # Individual supervision warning
        if hours['individual_hours'] < self.config.min_individual_supervision_hours:
            warnings.append({
                'level': 'warning',
                'category': 'individual_hours',
                'message': f"Need {self.config.min_individual_supervision_hours - hours['individual_hours']:.1f} more individual supervision hours"
            })
        
        # Direct supervision warning
        direct_hours = hours['direct_inperson_hours'] + hours['direct_video_hours'] + hours['direct_phone_hours']
        if direct_hours < self.config.min_direct_supervision_hours:
            warnings.append({
                'level': 'warning',
                'category': 'direct_hours',
                'message': f"Need {self.config.min_direct_supervision_hours - direct_hours:.1f} more direct supervision hours"
            })
        
        # Phone supervision exceeding limit
        if hours['direct_phone_hours'] > self.config.max_phone_supervision_hours:
            warnings.append({
                'level': 'error',
                'category': 'phone_hours',
                'message': f"Phone supervision hours ({hours['direct_phone_hours']:.1f}h) exceed maximum of {self.config.max_phone_supervision_hours}h"
            })
        
        # Indirect supervision exceeding limit
        if hours['indirect_hours'] > self.config.max_indirect_supervision_hours:
            warnings.append({
                'level': 'error',
                'category': 'indirect_hours',
                'message': f"Indirect supervision hours ({hours['indirect_hours']:.1f}h) exceed maximum of {self.config.max_indirect_supervision_hours}h"
            })
        
        # Assessment observations
        if observations['assessments'] < self.config.required_assessment_observations:
            warnings.append({
                'level': 'warning',
                'category': 'assessment_observations',
                'message': f"Need {self.config.required_assessment_observations - observations['assessments']} more assessment observations"
            })
        
        # Intervention observations
        if observations['interventions'] < self.config.required_intervention_observations:
            warnings.append({
                'level': 'warning',
                'category': 'intervention_observations',
                'message': f"Need {self.config.required_intervention_observations - observations['interventions']} more intervention observations"
            })
        
        # Check supervision frequency
        last_supervision = SupervisionEntry.objects.filter(
            trainee=self.trainee
        ).order_by('-date_of_supervision').first()
        
        if last_supervision:
            from django.utils import timezone
            weeks_since = (timezone.now().date() - last_supervision.date_of_supervision).days // 7
            if weeks_since >= self.config.supervision_frequency_warning_weeks:
                warnings.append({
                    'level': 'warning',
                    'category': 'supervision_frequency',
                    'message': f"No supervision logged for {weeks_since} weeks. AHPRA requires regular supervision throughout internship."
                })
        
        return warnings
    
    def meets_requirements(self) -> Tuple[bool, List[str]]:
        """
        Check if trainee meets all AHPRA supervision requirements.
        Returns (is_compliant, list_of_issues)
        """
        issues = []
        hours = self.get_supervision_hours_breakdown()
        observations = self.get_observation_counts()
        
        # Check total hours
        if not self._check_total_hours(hours):
            issues.append(f"Total supervision hours ({hours['total_hours']:.1f}h) below minimum ({self.config.min_supervision_hours_total}h)")
        
        # Check individual requirement
        if not self._check_individual_requirement(hours):
            issues.append(f"Individual supervision hours ({hours['individual_hours']:.1f}h) below minimum ({self.config.min_individual_supervision_hours}h)")
        
        # Check direct requirement
        if not self._check_direct_requirement(hours):
            direct_hours = hours['direct_inperson_hours'] + hours['direct_video_hours'] + hours['direct_phone_hours']
            issues.append(f"Direct supervision hours ({direct_hours:.1f}h) below minimum ({self.config.min_direct_supervision_hours}h)")
        
        # Check observations
        if not self._check_observation_requirement(observations):
            issues.append(f"Observations ({observations['total']}) below minimum ({self.config.total_required_observations})")
        
        # Check distribution
        if not self._check_distribution_requirement():
            issues.append("Supervision not regularly distributed throughout internship period")
        
        return len(issues) == 0, issues
    
    # Private helper methods
    
    def _check_total_hours(self, hours: Dict) -> bool:
        """Check if total supervision hours meet minimum"""
        return hours['total_hours'] >= self.config.min_supervision_hours_total
    
    def _check_individual_requirement(self, hours: Dict) -> bool:
        """Check if individual supervision meets minimum"""
        return hours['individual_hours'] >= self.config.min_individual_supervision_hours
    
    def _check_direct_requirement(self, hours: Dict) -> bool:
        """Check if direct supervision meets minimum"""
        direct_hours = hours['direct_inperson_hours'] + hours['direct_video_hours'] + hours['direct_phone_hours']
        return direct_hours >= self.config.min_direct_supervision_hours
    
    def _check_observation_requirement(self, observations: Dict) -> bool:
        """Check if observations meet minimum requirements"""
        return (
            observations['assessments'] >= self.config.required_assessment_observations and
            observations['interventions'] >= self.config.required_intervention_observations
        )
    
    def _check_distribution_requirement(self) -> bool:
        """Check if supervision is regularly distributed"""
        if not self.config.require_regular_supervision_distribution:
            return True
        
        # Count distinct weeks with supervision
        entries = SupervisionEntry.objects.filter(trainee=self.trainee)
        distinct_weeks = entries.values('week_starting').distinct().count()
        
        return distinct_weeks >= self.config.min_weeks_with_supervision
    
    @staticmethod
    def recalculate_all_compliance():
        """Recalculate compliance for all trainees (batch operation)"""
        from api.models import UserRole
        
        trainees = UserProfile.objects.filter(
            Q(role=UserRole.PROVISIONAL) | Q(role=UserRole.REGISTRAR)
        )
        
        results = []
        for trainee in trainees:
            service = SupervisionComplianceService(trainee)
            report = service.calculate_compliance()
            results.append({
                'trainee': trainee.user.email,
                'compliant': report.is_compliant,
                'warnings_count': len(report.warnings)
            })
        
        return results

