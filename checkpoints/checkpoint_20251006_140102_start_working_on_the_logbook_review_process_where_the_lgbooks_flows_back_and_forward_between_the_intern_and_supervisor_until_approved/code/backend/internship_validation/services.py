from django.db import transaction
from django.utils import timezone
from datetime import timedelta, date
from typing import Dict, List, Tuple, Optional
from .models import InternshipProgram, InternshipProgress, ValidationAlert, WeeklySummary
from api.models import UserProfile


class InternshipValidationService:
    """Service class for handling 5+1 internship validation logic"""
    
    def __init__(self):
        self.program_5_plus_1 = self._get_or_create_5_plus_1_program()
    
    def _get_or_create_5_plus_1_program(self) -> InternshipProgram:
        """Get or create the 5+1 internship program"""
        program, created = InternshipProgram.objects.get_or_create(
            program_type='5+1',
            defaults={
                'name': '5+1 Internship Program',
                'version': '1.0',
                'total_hours_required': 1500,
                'practice_hours_required': 1360,
                'dcc_hours_minimum': 500,
                'dcc_simulated_maximum': 60,
                'supervision_hours_minimum': 80,
                'pd_hours_required': 60,
                'minimum_weeks': 44,
                'minimum_weekly_hours': 17.5,
                'supervision_ratio': 17.0,
            }
        )
        return program
    
    def initialize_internship_progress(self, user_profile: UserProfile, start_date: date) -> InternshipProgress:
        """Initialize internship progress for a new intern"""
        if user_profile.role not in ['INTERN', 'PROVISIONAL']:
            raise ValueError("User must be an intern or provisional psychologist")
        
        progress, created = InternshipProgress.objects.get_or_create(
            user_profile=user_profile,
            defaults={
                'program': self.program_5_plus_1,
                'start_date': start_date,
                'target_completion_weeks': 52,
                'current_week': 1,
            }
        )
        
        if created:
            self._create_initial_weekly_summaries(progress)
        
        return progress
    
    def _create_initial_weekly_summaries(self, progress: InternshipProgress):
        """Create initial weekly summary records"""
        for week in range(1, progress.target_completion_weeks + 1):
            week_start = progress.start_date + timedelta(weeks=week - 1)
            week_end = week_start + timedelta(days=6)
            
            WeeklySummary.objects.get_or_create(
                user_profile=progress.user_profile,
                week_number=week,
                defaults={
                    'week_start': week_start,
                    'week_end': week_end,
                }
            )
    
    def validate_entry(self, user_profile: UserProfile, entry_data: Dict) -> Tuple[bool, List[str]]:
        """Validate a single logbook entry against internship requirements"""
        errors = []
        
        # Check if user is an intern
        if user_profile.role not in ['INTERN', 'PROVISIONAL']:
            return True, []  # No validation for non-interns
        
        # Get or create progress record
        progress = self._get_or_create_progress(user_profile)
        
        # Validate simulated DCC hours
        if entry_data.get('entry_type') == 'client_contact' and entry_data.get('simulated', False):
            current_simulated = self._get_cumulative_simulated_dcc_hours(user_profile)
            entry_hours = (entry_data.get('duration_minutes', 0) or 0) / 60
            
            if current_simulated + entry_hours > self.program_5_plus_1.dcc_simulated_maximum:
                errors.append(f"You have already logged {current_simulated:.1f} hours of simulated client contact. Adding {entry_hours:.1f} more hours would exceed the maximum of {self.program_5_plus_1.dcc_simulated_maximum} hours allowed for simulated client contact. Please reduce the duration or mark this entry as non-simulated.")
        
        return len(errors) == 0, errors
    
    def validate_weekly_progress(self, user_profile: UserProfile, week_number: int) -> Tuple[bool, List[str]]:
        """Validate weekly progress against requirements"""
        if user_profile.role not in ['INTERN', 'PROVISIONAL']:
            return True, []
        
        progress = self._get_or_create_progress(user_profile)
        is_valid, message = progress.validate_weekly_requirements(week_number)
        
        # Update weekly summary
        self._update_weekly_summary(user_profile, week_number)
        
        # Create alert if validation fails
        if not is_valid:
            self._create_alert(user_profile, 'WEEKLY_MINIMUM', message)
        
        return is_valid, [message] if not is_valid else []
    
    def validate_category_requirements(self, user_profile: UserProfile) -> Tuple[bool, List[str]]:
        """Validate category requirements (DCC, CRA, PD, Supervision)"""
        if user_profile.role not in ['INTERN', 'PROVISIONAL']:
            return True, []
        
        progress = self._get_or_create_progress(user_profile)
        is_valid, errors = progress.validate_category_requirements()
        
        # Create alerts for each validation error
        for error in errors:
            self._create_alert(user_profile, 'CATEGORY_MINIMUM', error)
        
        return is_valid, errors
    
    def can_complete_internship(self, user_profile: UserProfile) -> Tuple[bool, List[str]]:
        """Check if internship can be completed (all requirements met)"""
        if user_profile.role not in ['INTERN', 'PROVISIONAL']:
            return True, []
        
        progress = self._get_or_create_progress(user_profile)
        
        # Check minimum weeks
        weeks_completed = self._calculate_weeks_completed(progress)
        if weeks_completed < self.program_5_plus_1.minimum_weeks:
            return False, [f"Your internship requires a minimum of {self.program_5_plus_1.minimum_weeks} weeks to complete. You have currently completed {weeks_completed} weeks. Please continue logging hours until you reach the minimum requirement."]
        
        # Check category requirements
        category_valid, category_errors = progress.validate_category_requirements()
        if not category_valid:
            return False, category_errors
        
        return True, []
    
    def get_progress_summary(self, user_profile: UserProfile) -> Dict:
        """Get comprehensive progress summary for display"""
        if user_profile.role not in ['INTERN', 'PROVISIONAL']:
            return {
                'error': f'You are registered as a {user_profile.role.lower().replace("_", " ")} and are not enrolled in an internship program. Internship tracking is only available for provisional psychologists and interns.',
                'user_role': user_profile.role
            }
        
        progress = self._get_or_create_progress(user_profile)
        totals = progress.get_cumulative_totals()
        weeks_completed = self._calculate_weeks_completed(progress)
        
        # Calculate practice hours
        practice_hours = totals['dcc_hours'] + totals['cra_hours']
        
        # Calculate supervision ratio
        supervision_ratio = practice_hours / max(totals['supervision_hours'], 0.1) if totals['supervision_hours'] > 0 else 0
        
        return {
            'program': {
                'name': progress.program.name,
                'type': progress.program.program_type,
                'version': progress.program.version,
            },
            'progress': {
                'weeks_completed': weeks_completed,
                'minimum_weeks': progress.program.minimum_weeks,
                'target_weeks': progress.target_completion_weeks,
                'is_completed': progress.is_completed,
            },
            'hours': {
                'dcc': {
                    'current': totals['dcc_hours'],
                    'required': progress.program.dcc_hours_minimum,
                    'simulated': totals['dcc_simulated_hours'],
                    'simulated_max': progress.program.dcc_simulated_maximum,
                },
                'cra': {
                    'current': totals['cra_hours'],
                },
                'practice': {
                    'current': practice_hours,
                    'required': progress.program.practice_hours_required,
                },
                'supervision': {
                    'current': totals['supervision_hours'],
                    'required': progress.program.supervision_hours_minimum,
                    'ratio': supervision_ratio,
                    'required_ratio': progress.program.supervision_ratio,
                },
                'pd': {
                    'current': totals['pd_hours'],
                    'required': progress.program.pd_hours_required,
                },
                'total': {
                    'current': practice_hours + totals['supervision_hours'] + totals['pd_hours'],
                    'required': progress.program.total_hours_required,
                }
            },
            'validation': {
                'weekly_passed': progress.weekly_validation_passed,
                'category_passed': progress.category_validation_passed,
                'can_complete': self.can_complete_internship(user_profile)[0],
            }
        }
    
    def get_weekly_breakdown(self, user_profile: UserProfile, weeks: int = 12) -> List[Dict]:
        """Get weekly breakdown for the last N weeks"""
        if user_profile.role not in ['INTERN', 'PROVISIONAL']:
            return []
        
        progress = self._get_or_create_progress(user_profile)
        current_week = progress.current_week
        
        weekly_data = []
        for week in range(max(1, current_week - weeks + 1), current_week + 1):
            weekly_totals = progress.get_weekly_totals(week)
            is_valid, message = progress.validate_weekly_requirements(week)
            
            weekly_data.append({
                'week_number': week,
                'hours': weekly_totals,
                'total_hours': sum(weekly_totals.values()),
                'meets_minimum': is_valid,
                'validation_message': message,
            })
        
        return weekly_data
    
    def _get_or_create_progress(self, user_profile: UserProfile) -> InternshipProgress:
        """Get or create internship progress record"""
        try:
            return user_profile.internship_progress
        except InternshipProgress.DoesNotExist:
            return self.initialize_internship_progress(user_profile, timezone.now().date())
    
    def _get_cumulative_simulated_dcc_hours(self, user_profile: UserProfile) -> float:
        """Get cumulative simulated DCC hours"""
        from section_a.models import SectionAEntry
        
        entries = SectionAEntry.objects.filter(
            trainee=user_profile.user,
            entry_type='client_contact',
            simulated=True
        )
        
        return sum(entry.duration_minutes or 0 for entry in entries) / 60
    
    def _calculate_weeks_completed(self, progress: InternshipProgress) -> int:
        """Calculate number of weeks completed"""
        today = timezone.now().date()
        weeks_since_start = (today - progress.start_date).days // 7
        return min(weeks_since_start, progress.target_completion_weeks)
    
    def _update_weekly_summary(self, user_profile: UserProfile, week_number: int):
        """Update weekly summary with current data"""
        progress = self._get_or_create_progress(user_profile)
        weekly_totals = progress.get_weekly_totals(week_number)
        is_valid, message = progress.validate_weekly_requirements(week_number)
        
        summary, created = WeeklySummary.objects.get_or_create(
            user_profile=user_profile,
            week_number=week_number,
            defaults={
                'week_start': progress.start_date + timedelta(weeks=week_number - 1),
                'week_end': progress.start_date + timedelta(weeks=week_number - 1, days=6),
            }
        )
        
        summary.dcc_hours = weekly_totals['dcc_hours']
        summary.dcc_simulated_hours = weekly_totals['dcc_simulated_hours']
        summary.cra_hours = weekly_totals['cra_hours']
        summary.pd_hours = weekly_totals['pd_hours']
        summary.supervision_hours = weekly_totals['supervision_hours']
        summary.meets_weekly_minimum = is_valid
        summary.validation_errors = [message] if not is_valid else []
        summary.save()
    
    def _create_alert(self, user_profile: UserProfile, alert_type: str, message: str):
        """Create a validation alert"""
        ValidationAlert.objects.create(
            user_profile=user_profile,
            alert_type=alert_type,
            message=message,
            is_active=True
        )
    
    def dismiss_alert(self, user_profile: UserProfile, alert_id: int):
        """Dismiss a validation alert"""
        try:
            alert = ValidationAlert.objects.get(
                id=alert_id,
                user_profile=user_profile,
                is_active=True
            )
            alert.is_dismissed = True
            alert.dismissed_at = timezone.now()
            alert.save()
        except ValidationAlert.DoesNotExist:
            pass
    
    def get_active_alerts(self, user_profile: UserProfile) -> List[Dict]:
        """Get active validation alerts for user"""
        alerts = ValidationAlert.objects.filter(
            user_profile=user_profile,
            is_active=True,
            is_dismissed=False
        ).order_by('-created_at')
        
        return [
            {
                'id': alert.id,
                'type': alert.alert_type,
                'message': alert.message,
                'created_at': alert.created_at,
            }
            for alert in alerts
        ]
