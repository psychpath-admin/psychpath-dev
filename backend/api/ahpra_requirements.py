"""
AHPRA Requirements Metadata Database

Source documents:
- Provisional (5+1): /assets/documents/provisional/
- Registrar: /assets/documents/registrar/

This metadata defines all validation rules, calculations, and requirements
for provisional (5+1) and registrar programs according to AHPRA guidelines.

Last updated: October 2025
"""

from decimal import Decimal
from datetime import datetime


class AHPRARequirements:
    """
    Comprehensive metadata database for AHPRA program requirements
    """
    
    # ════════════════════════════════════════════════════════════════
    # PROVISIONAL (5+1 INTERNSHIP) REQUIREMENTS
    # ════════════════════════════════════════════════════════════════
    PROVISIONAL_5PLUS1 = {
        'program_code': '5+1',
        'program_name': '5+1 Internship Program',
        'source_documents': [
            'Psychology-Board---Guidelines---Guidelines-for-the-5-1-internship-program.PDF',
            'Psychology-Board---Fact-sheet---5-1-internship---Implementing-the-revised-general-and-provisional-registration-standards.PDF',
        ],
        
        # ────────────────────────────────────────────────────────────
        # HOURS REQUIREMENTS
        # ────────────────────────────────────────────────────────────
        'hours': {
            'total_practice': {
                'minimum': 1500,
                'description': 'Total psychological practice hours required',
                'validation_message': 'You need at least 1,500 hours of psychological practice for the 5+1 program',
                'error_code': 'INSUFFICIENT_TOTAL_HOURS',
            },
            'client_contact': {
                'minimum': 500,
                'description': 'Direct client contact hours (direct service)',
                'validation_message': 'You need at least 500 hours of direct client contact',
                'error_code': 'INSUFFICIENT_CLIENT_CONTACT',
                'includes_simulated': True,
            },
            'simulated_skills': {
                'maximum': 60,
                'description': 'Maximum simulated skills training hours (included in client contact)',
                'validation_message': 'AHPRA limits simulated skills training to 60 hours maximum',
                'error_code': 'SIMULATED_LIMIT_EXCEEDED',
                'requires_supervisor_approval': True,
                'examples': ['Role-plays', 'Peer actors', 'VR clients', 'Simulated testing', 'Shadowing'],
            },
            'client_related': {
                'approximate': 1000,
                'description': 'Client-related activities (approximate)',
                'validation_message': 'Approximately 1,000 hours of client-related work expected',
                'error_code': 'CLIENT_RELATED_LOW',
                'warning_only': True,
            },
            'supervision_total': {
                'minimum': 80,
                'description': 'Total supervision hours required',
                'validation_message': 'You need at least 80 hours of supervision',
                'error_code': 'INSUFFICIENT_SUPERVISION',
                'frequency': 'Weekly recommended (≤14 days between sessions)',
                'breakdown': {
                    'principal_individual': {
                        'minimum': 50,
                        'description': 'Individual supervision with Principal Supervisor',
                        'validation_message': 'You need at least 50 hours of individual supervision with your Principal Supervisor',
                        'error_code': 'INSUFFICIENT_PRINCIPAL_SUPERVISION',
                    },
                    'other_supervision': {
                        'maximum': 30,
                        'description': 'Group or secondary supervision',
                        'validation_message': 'Group or secondary supervision cannot exceed 30 hours',
                        'error_code': 'EXCESS_OTHER_SUPERVISION',
                    },
                },
            },
        },
        
        # ────────────────────────────────────────────────────────────
        # PRACTICE TYPES & REFLECTION REQUIREMENTS
        # ────────────────────────────────────────────────────────────
        'practice_types': {
            'direct_real': {
                'name': 'Direct Real Client Contact',
                'code': 'DIRECT_REAL',
                'counts_toward': ['total_practice', 'client_contact'],
                'reflection_required': True,
                'competencies_required': True,
                'supervisor_approval_required': True,
                'description': 'Direct face-to-face or video client contact (assessment, intervention)',
            },
            'direct_simulated': {
                'name': 'Direct Simulated Client Contact',
                'code': 'DIRECT_SIMULATED',
                'counts_toward': ['total_practice', 'client_contact', 'simulated_skills'],
                'reflection_required': True,
                'competencies_required': True,
                'supervisor_approval_required': True,
                'description': 'Simulated client contact for skills acquisition',
                'examples': [
                    'Role-plays with peers',
                    'Peer actors',
                    'VR/simulated clients',
                    'Simulated psychological testing',
                    'Shadowing experienced psychologists',
                ],
            },
            'client_related': {
                'name': 'Client-Related Activities',
                'code': 'CLIENT_RELATED',
                'counts_toward': ['total_practice', 'client_related'],
                'reflection_required': False,
                'reflection_available': True,
                'competencies_required': True,
                'supervisor_approval_required': True,
                'description': 'Indirect client work (report writing, case planning, consultation)',
            },
            'independent_client_related': {
                'name': 'Independent Client-Related Activities',
                'code': 'INDEPENDENT_CLIENT_RELATED',
                'counts_toward': ['total_practice'],
                'reflection_required': False,
                'reflection_available': True,
                'competencies_required': True,
                'supervisor_approval_required': True,
                'description': 'Independent professional activities (research, policy work, admin)',
            },
        },
        
        # ────────────────────────────────────────────────────────────
        # DURATION & TIMEFRAMES
        # ────────────────────────────────────────────────────────────
        'duration': {
            'minimum_weeks': 44,
            'minimum_weeks_fte': 44,  # Full-time equivalent
            'recommended_weeks': 52,
            'description': 'Program must be completed over at least 44 weeks FTE (approximately 1 year full-time)',
            'validation_message': 'The 5+1 program requires at least 44 weeks FTE. Your program cannot be completed before this time.',
            'error_code': 'INSUFFICIENT_DURATION',
            'part_time_allowed': True,
            'part_time_note': 'Part-time allowed; duration scales with FTE percentage',
        },
        
        # ────────────────────────────────────────────────────────────
        # LEAVE TRACKING
        # ────────────────────────────────────────────────────────────
        'leave': {
            'types': ['parental', 'sick', 'carer', 'lifestyle'],
            'tracking_required': True,
            'encouraged': True,
            'description': 'Leave is encouraged and must be recorded. No maximum timeframe but Recency of Practice applies.',
        },
        
        # ────────────────────────────────────────────────────────────
        # RECENCY OF PRACTICE
        # ────────────────────────────────────────────────────────────
        'recency': {
            'required_hours': 750,
            'timeframe_years': 5,
            'description': 'At least 750 hours of practice within the preceding 5 years upon completion',
            'validation_message': 'You must have at least 750 hours of practice within the last 5 years to complete the program',
            'error_code': 'RECENCY_NOT_MET',
        },
        
        # ────────────────────────────────────────────────────────────
        # COMPETENCIES
        # ────────────────────────────────────────────────────────────
        'competencies': {
            'total': 8,
            'required_for_all_entries': True,
            'description': 'All practice, education, and supervision activities must reference relevant competencies',
            'competency_list': [
                {'code': 'C1', 'name': 'Professional Communication'},
                {'code': 'C2', 'name': 'Assessment and Measurement'},
                {'code': 'C3', 'name': 'Intervention'},
                {'code': 'C4', 'name': 'Research and Evaluation'},
                {'code': 'C5', 'name': 'Cross-Cultural Competence'},
                {'code': 'C6', 'name': 'Ethical and Legal Practice'},
                {'code': 'C7', 'name': 'Self-Care and Professional Development'},
                {'code': 'C8', 'name': 'Digital Competence'},
            ],
        },
        
        # ────────────────────────────────────────────────────────────
        # DIRECT OBSERVATIONS
        # ────────────────────────────────────────────────────────────
        'observations': {
            'total_required': 8,
            'assessment_required': 4,
            'intervention_required': 4,
            'description': 'Supervisor must observe at least 8 sessions (4 assessment + 4 intervention)',
            'validation_message': 'You need 4 assessment observations and 4 intervention observations',
            'error_code': 'INSUFFICIENT_OBSERVATIONS',
            'observation_types': ['live', 'recorded'],
            'secondary_supervisor_allowed': True,
            'secondary_supervisor_note': 'Secondary supervisor may perform observations with approval',
        },
        
        # ────────────────────────────────────────────────────────────
        # PROGRESS REVIEWS
        # ────────────────────────────────────────────────────────────
        'progress_reviews': {
            'initial_review_max_months': 2,
            'formal_review_max_months': 6,
            'formal_review_recommended_months': 2,
            'description': 'Initial review within 2 months; formal review every ≤6 months (recommended every 2 months)',
            'validation_message': 'Progress reviews are required at least every 6 months',
            'error_code': 'OVERDUE_PROGRESS_REVIEW',
            'assessment_scale': ['M1', 'M2', 'M3', 'M4'],
            'components_required': ['competency_assessment', 'narrative_feedback', 'action_plan', 'dual_signature'],
        },
        
        # ────────────────────────────────────────────────────────────
        # CULTURAL SUPERVISION
        # ────────────────────────────────────────────────────────────
        'cultural_supervision': {
            'eligibility': ['Aboriginal', 'Torres Strait Islander', 'Both'],
            'counts_toward_supervision': True,
            'relevant_competencies': ['C2', 'C6', 'C7', 'C8'],
            'description': 'Aboriginal and Torres Strait Islander provisionals may access cultural supervision',
            'validation_message': 'Cultural supervision sessions count toward your 80 hour supervision requirement',
        },
        
        # ────────────────────────────────────────────────────────────
        # LOGBOOK STRUCTURE (Sections A, B, C)
        # ────────────────────────────────────────────────────────────
        'logbook_sections': {
            'section_a': {
                'name': 'Practice Log',
                'description': 'Daily activities, competencies, reflection (mandatory/optional by type)',
                'reflection_rules': 'Mandatory for direct_real and direct_simulated; Optional for client_related and independent_client_related',
                'unsigned_entries_invalid': True,
            },
            'section_b': {
                'name': 'Education & Training',
                'description': 'Evidence + mandatory reflection',
                'reflection_rules': 'Mandatory for all education and training activities',
                'supervisor_approval_required': True,
                'evidence_upload_required': True,
                'unsigned_entries_invalid': True,
            },
            'section_c': {
                'name': 'Supervision',
                'description': 'Session summary + mandatory reflection + supervisor feedback',
                'reflection_rules': 'Mandatory for all supervision sessions',
                'supervisee_reflection_required': True,
                'supervisor_feedback_required': True,
                'digital_signature_required': True,
                'unsigned_entries_invalid': True,
            },
        },
    }
    
    # ════════════════════════════════════════════════════════════════
    # REGISTRAR (AREA OF PRACTICE ENDORSEMENT) REQUIREMENTS
    # ════════════════════════════════════════════════════════════════
    REGISTRAR_TRACKS = {
        'SIXTH_YEAR': {
            'track_code': 'SIXTH_YEAR',
            'track_name': 'Track 1 - Sixth-year (MPsych/bridging)',
            'duration_weeks': 88,
            'total_hours': 3000,
            'supervision_hours': 80,
            'cpd_hours': 80,
            'direct_contact_annual': 176,
            'description': 'For psychologists with Masters qualification',
        },
        'SIXTH_PHD': {
            'track_code': 'SIXTH_PHD',
            'track_name': 'Track 2 - Sixth + Doctoral (MPsych/PhD)',
            'duration_weeks': 66,
            'total_hours': 2250,
            'supervision_hours': 60,
            'cpd_hours': 60,
            'direct_contact_annual': 176,
            'description': 'For psychologists with combined Masters/PhD',
        },
        'SEVENTH_YEAR': {
            'track_code': 'SEVENTH_YEAR',
            'track_name': 'Track 3 - Seventh-year (DPsych/PsyD or higher)',
            'duration_weeks': 44,
            'total_hours': 1500,
            'supervision_hours': 40,
            'cpd_hours': 40,
            'direct_contact_annual': 176,
            'description': 'For psychologists with Doctorate qualification',
        },
    }
    
    REGISTRAR_SUPERVISION = {
        'composition': {
            'principal_min': 0.50,
            'principal_max': 1.00,
            'secondary_same_aope_max': 0.50,
            'secondary_diff_aope_max': 0.33,
            'individual_min': 0.66,
            'group_max': 0.33,
        },
        'frequency': 'Usually fortnightly while practising',
        'session_duration': {
            'predominant_minimum': 1.0,  # hours
            'short_session_max_percentage': 0.25,  # ≤25% may be shorter
        },
        'direct_supervision_per_fte_year': 40,
        'direct_supervision_leave_year': 10,
        'board_variations_allowed': True,
    }
    
    REGISTRAR_CPD = {
        'active_required': True,
        'active_description': 'CPD must involve written or oral activities that engage and test learning',
        'supervisor_task_for_non_active': True,
        'peer_consultation_annual': 10,
        'aope_alignment_required': True,
        'learning_objectives_required': True,
    }
    
    # ════════════════════════════════════════════════════════════════
    # VALIDATION RULES
    # ════════════════════════════════════════════════════════════════
    @classmethod
    def get_program_requirements(cls, program_type, registrar_track=None):
        """
        Get requirements for a specific program
        
        Args:
            program_type: '5+1' or 'REGISTRAR'
            registrar_track: For registrar - 'SIXTH_YEAR', 'SIXTH_PHD', 'SEVENTH_YEAR'
        
        Returns:
            Dict with program requirements
        """
        if program_type == '5+1':
            return cls.PROVISIONAL_5PLUS1
        elif program_type == 'REGISTRAR':
            if registrar_track and registrar_track in cls.REGISTRAR_TRACKS:
                return cls.REGISTRAR_TRACKS[registrar_track]
            return None
        return None
    
    @classmethod
    def validate_provisional_reflection(cls, practice_type):
        """
        Check if reflection is required for a given practice type
        
        Args:
            practice_type: 'DIRECT_REAL', 'DIRECT_SIMULATED', 'CLIENT_RELATED', 'INDEPENDENT_CLIENT_RELATED'
        
        Returns:
            bool: True if reflection is required
        """
        practice_types = cls.PROVISIONAL_5PLUS1['practice_types']
        for key, config in practice_types.items():
            if config['code'] == practice_type:
                return config.get('reflection_required', False)
        return False
    
    @classmethod
    def get_competency_list(cls):
        """Get list of all competencies (C1-C8)"""
        return cls.PROVISIONAL_5PLUS1['competencies']['competency_list']
    
    @classmethod
    def validate_simulated_limit(cls, current_simulated_hours, new_simulated_hours):
        """
        Validate that simulated hours don't exceed AHPRA limit
        
        Args:
            current_simulated_hours: Current cumulative simulated hours
            new_simulated_hours: New hours being added
        
        Returns:
            (is_valid, error_code, message, details)
        """
        limit = cls.PROVISIONAL_5PLUS1['hours']['simulated_skills']['maximum']
        total = current_simulated_hours + new_simulated_hours
        
        if total > limit:
            return (
                False, 
                cls.PROVISIONAL_5PLUS1['hours']['simulated_skills']['error_code'],
                cls.PROVISIONAL_5PLUS1['hours']['simulated_skills']['validation_message'],
                {
                    'current_hours': current_simulated_hours,
                    'new_hours': new_simulated_hours,
                    'total_would_be': total,
                    'maximum_allowed': limit,
                    'excess': total - limit,
                }
            )
        
        return (
            True, 
            None, 
            None, 
            {
                'current_hours': total,
                'maximum_allowed': limit,
            }
        )

