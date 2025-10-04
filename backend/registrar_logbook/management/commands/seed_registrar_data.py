from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal
from api.models import UserProfile
from registrar_logbook.models import (
    RegistrarProgram, RegistrarPracticeEntry, RegistrarSupervisionEntry,
    RegistrarCpdEntry, SupervisorProfile, CompetencyFramework
)


class Command(BaseCommand):
    help = 'Seed registrar test data'

    def handle(self, *args, **options):
        self.stdout.write('Creating registrar test data...')
        
        # Create test users
        registrar_user, created = User.objects.get_or_create(
            email='registrar@example.com',
            defaults={
                'username': 'registrar',
                'first_name': 'Sarah',
                'last_name': 'Johnson',
                'is_active': True
            }
        )
        
        if created:
            registrar_user.set_password('password123')
            registrar_user.save()
        
        # Create registrar profile
        registrar_profile, created = UserProfile.objects.get_or_create(
            user=registrar_user,
            defaults={
                'role': 'REGISTRAR',
                'first_name': 'Sarah',
                'last_name': 'Johnson',
                'ahpra_registration_number': 'PSY000123456',
                'city': 'Melbourne',
                'state': 'VIC',
                'timezone': 'Australia/Melbourne'
            }
        )
        
        # Create supervisor users
        principal_supervisor, created = User.objects.get_or_create(
            email='principal.supervisor@example.com',
            defaults={
                'username': 'principal_supervisor',
                'first_name': 'Dr. Michael',
                'last_name': 'Chen',
                'is_active': True
            }
        )
        
        if created:
            principal_supervisor.set_password('password123')
            principal_supervisor.save()
        
        # Create principal supervisor profile
        principal_profile, created = UserProfile.objects.get_or_create(
            user=principal_supervisor,
            defaults={
                'role': 'SUPERVISOR',
                'first_name': 'Dr. Michael',
                'last_name': 'Chen',
                'ahpra_registration_number': 'PSY000789012',
                'city': 'Melbourne',
                'state': 'VIC',
                'is_board_approved_supervisor': True,
                'can_supervise_registrars': True
            }
        )
        
        # Create secondary supervisor (same AoPE)
        secondary_supervisor, created = User.objects.get_or_create(
            email='secondary.supervisor@example.com',
            defaults={
                'username': 'secondary_supervisor',
                'first_name': 'Dr. Emma',
                'last_name': 'Williams',
                'is_active': True
            }
        )
        
        if created:
            secondary_supervisor.set_password('password123')
            secondary_supervisor.save()
        
        secondary_profile, created = UserProfile.objects.get_or_create(
            user=secondary_supervisor,
            defaults={
                'role': 'SUPERVISOR',
                'first_name': 'Dr. Emma',
                'last_name': 'Williams',
                'ahpra_registration_number': 'PSY000345678',
                'city': 'Melbourne',
                'state': 'VIC',
                'is_board_approved_supervisor': True,
                'can_supervise_registrars': True
            }
        )
        
        # Create secondary supervisor (different AoPE)
        other_supervisor, created = User.objects.get_or_create(
            email='other.supervisor@example.com',
            defaults={
                'username': 'other_supervisor',
                'first_name': 'Dr. James',
                'last_name': 'Brown',
                'is_active': True
            }
        )
        
        if created:
            other_supervisor.set_password('password123')
            other_supervisor.save()
        
        other_profile, created = UserProfile.objects.get_or_create(
            user=other_supervisor,
            defaults={
                'role': 'SUPERVISOR',
                'first_name': 'Dr. James',
                'last_name': 'Brown',
                'ahpra_registration_number': 'PSY000901234',
                'city': 'Melbourne',
                'state': 'VIC',
                'is_board_approved_supervisor': True,
                'can_supervise_registrars': True
            }
        )
        
        # Create supervisor profiles for registrar supervision
        principal_sp, created = SupervisorProfile.objects.get_or_create(
            user=principal_supervisor,
            defaults={
                'is_BAS': True,
                'aope_endorsements': ['CLINICAL'],
                'years_endorsed': {'CLINICAL': 5},
                'is_registrar_principal_approved': True
            }
        )
        
        secondary_sp, created = SupervisorProfile.objects.get_or_create(
            user=secondary_supervisor,
            defaults={
                'is_BAS': True,
                'aope_endorsements': ['CLINICAL'],
                'years_endorsed': {'CLINICAL': 3},
                'is_registrar_principal_approved': False
            }
        )
        
        other_sp, created = SupervisorProfile.objects.get_or_create(
            user=other_supervisor,
            defaults={
                'is_BAS': True,
                'aope_endorsements': ['FORENSIC'],
                'years_endorsed': {'FORENSIC': 4},
                'is_registrar_principal_approved': False
            }
        )
        
        # Create registrar program
        program, created = RegistrarProgram.objects.get_or_create(
            user=registrar_user,
            aope='CLINICAL',
            start_date=date(2024, 1, 1),
            defaults={
                'qualification_tier': 'masters',
                'fte_fraction': Decimal('1.00'),
                'expected_end_date': date(2025, 12, 31),
                'status': 'active'
            }
        )
        
        self.stdout.write(f'Created registrar program: {program}')
        
        # Create practice entries with new model structure
        practice_entries_data = [
            {
                'date': date(2024, 1, 15),
                'start_time': '09:00',
                'end_time': '15:00',
                'duration_minutes': 360,
                'dcc_minutes': 240,
                'dcc_categories': ['assessment', 'intervention'],
                'setting': 'outpatient',
                'modality': 'in_person',
                'client_code': 'C-001',
                'client_age_band': '26-44',
                'presenting_issue': 'anxiety and depression',
                'tasks': 'Initial assessment using MINI, PHQ-9, and GAD-7. Developed treatment plan including CBT techniques. Conducted individual therapy session focusing on cognitive restructuring.',
                'competency_tags': ['Assessment', 'Intervention strategies', 'Communication'],
                'observed': True,
                'supervisor_followup_date': date(2024, 1, 16),
                'created_by': registrar_user
            },
            {
                'date': date(2024, 1, 16),
                'duration_minutes': 180,
                'dcc_minutes': 0,
                'dcc_categories': [],
                'setting': 'outpatient',
                'modality': 'in_person',
                'client_code': 'C-002',
                'client_age_band': '18-25',
                'presenting_issue': '',
                'tasks': 'Case documentation and progress notes. Treatment plan review and updates. Report writing for GP referral. Case formulation documentation.',
                'competency_tags': ['Professional practice', 'Communication'],
                'observed': False,
                'created_by': registrar_user
            },
            {
                'date': date(2024, 1, 18),
                'start_time': '10:00',
                'end_time': '17:00',
                'duration_minutes': 420,
                'dcc_minutes': 300,
                'dcc_categories': ['assessment', 'consultation'],
                'setting': 'inpatient',
                'modality': 'in_person',
                'client_code': 'C-003',
                'client_age_band': '45-64',
                'presenting_issue': 'psychotic symptoms',
                'tasks': 'Comprehensive psychological assessment including WAIS-IV and MMPI-2. Consultation with multidisciplinary team. Risk assessment and safety planning.',
                'competency_tags': ['Assessment', 'Intervention strategies', 'Professional practice'],
                'observed': True,
                'supervisor_followup_date': date(2024, 1, 19),
                'created_by': registrar_user
            },
            {
                'date': date(2024, 1, 19),
                'start_time': '14:00',
                'end_time': '15:30',
                'duration_minutes': 90,
                'dcc_minutes': 90,
                'dcc_categories': ['intervention'],
                'setting': 'outpatient',
                'modality': 'video',
                'client_code': 'C-004',
                'client_age_band': '13-17',
                'presenting_issue': 'behavioral concerns',
                'tasks': 'Family therapy session using systemic approach. Parent training and behavior management strategies. Development of home behavior plan.',
                'competency_tags': ['Intervention strategies', 'Communication', 'Professional practice'],
                'observed': False,
                'created_by': registrar_user
            },
            {
                'date': date(2024, 1, 22),
                'duration_minutes': 240,
                'dcc_minutes': 180,
                'dcc_categories': ['assessment', 'management_planning'],
                'setting': 'community',
                'modality': 'in_person',
                'client_code': 'C-005',
                'client_age_band': '65+',
                'presenting_issue': 'cognitive decline concerns',
                'tasks': 'Cognitive assessment using MoCA and MMSE. Family consultation regarding care planning. Development of cognitive stimulation program.',
                'competency_tags': ['Assessment', 'Intervention strategies', 'Communication'],
                'observed': True,
                'supervisor_followup_date': date(2024, 1, 23),
                'created_by': registrar_user
            }
        ]
        
        for entry_data in practice_entries_data:
            entry, created = RegistrarPracticeEntry.objects.get_or_create(
                program=program,
                date=entry_data['date'],
                client_code=entry_data['client_code'],
                defaults=entry_data
            )
            if created:
                self.stdout.write(f'Created practice entry: {entry}')
        
        # Create supervision entries
        supervision_entries_data = [
            {
                'date': date(2024, 1, 15),
                'duration_minutes': 60,
                'mode': 'in_person',
                'type': 'individual',
                'supervisor': principal_supervisor,
                'supervisor_category': 'principal',
                'topics': 'Case discussion and treatment planning',
                'observed': True
            },
            {
                'date': date(2024, 1, 22),
                'duration_minutes': 90,
                'mode': 'video',
                'type': 'individual',
                'supervisor': principal_supervisor,
                'supervisor_category': 'principal',
                'topics': 'Clinical supervision and skill development',
                'observed': False
            },
            {
                'date': date(2024, 1, 29),
                'duration_minutes': 60,
                'mode': 'in_person',
                'type': 'individual',
                'supervisor': secondary_supervisor,
                'supervisor_category': 'secondary_same_aope',
                'topics': 'Specialized intervention techniques',
                'observed': True
            },
            {
                'date': date(2024, 2, 5),
                'duration_minutes': 45,
                'mode': 'phone',
                'type': 'individual',
                'supervisor': principal_supervisor,
                'supervisor_category': 'principal',
                'topics': 'Crisis intervention discussion',
                'observed': False
            },
            {
                'date': date(2024, 2, 12),
                'duration_minutes': 120,
                'mode': 'in_person',
                'type': 'group',
                'supervisor': principal_supervisor,
                'supervisor_category': 'principal',
                'topics': 'Group supervision with other registrars',
                'observed': False
            }
        ]
        
        for entry_data in supervision_entries_data:
            entry, created = RegistrarSupervisionEntry.objects.get_or_create(
                program=program,
                date=entry_data['date'],
                supervisor=entry_data['supervisor'],
                defaults=entry_data
            )
            if created:
                self.stdout.write(f'Created supervision entry: {entry}')
        
        # Create CPD entries
        cpd_entries_data = [
            {
                'date': date(2024, 1, 20),
                'provider': 'Australian Psychological Society',
                'title': 'Trauma-Informed Practice Workshop',
                'hours': Decimal('6.0'),
                'is_active_cpd': True,
                'learning_goal': 'Develop skills in trauma-informed assessment and intervention',
                'reflection': 'Excellent workshop providing practical tools for working with trauma survivors.'
            },
            {
                'date': date(2024, 2, 10),
                'provider': 'Clinical Psychology Interest Group',
                'title': 'Cognitive Behavioral Therapy Updates',
                'hours': Decimal('3.0'),
                'is_active_cpd': True,
                'learning_goal': 'Stay current with CBT research and techniques',
                'reflection': 'Informative session on recent developments in CBT protocols.'
            },
            {
                'date': date(2024, 2, 15),
                'provider': 'Internal Training',
                'title': 'Ethics and Professional Practice',
                'hours': Decimal('2.0'),
                'is_active_cpd': False,
                'learning_goal': 'Review ethical guidelines and professional standards',
                'reflection': 'Important refresher on ethical decision-making frameworks.'
            }
        ]
        
        for entry_data in cpd_entries_data:
            entry, created = RegistrarCpdEntry.objects.get_or_create(
                program=program,
                date=entry_data['date'],
                title=entry_data['title'],
                defaults=entry_data
            )
            if created:
                self.stdout.write(f'Created CPD entry: {entry}')
        
        # Create competency framework entries
        competency_data = [
            {
                'aope': 'CLINICAL',
                'category_code': 'ASSESSMENT',
                'label': 'Psychological Assessment',
                'description': 'Conduct comprehensive psychological assessments including cognitive, personality, and diagnostic evaluations.'
            },
            {
                'aope': 'CLINICAL',
                'category_code': 'INTERVENTION',
                'label': 'Psychological Intervention',
                'description': 'Deliver evidence-based psychological interventions for various mental health conditions.'
            },
            {
                'aope': 'CLINICAL',
                'category_code': 'CONSULTATION',
                'label': 'Consultation and Communication',
                'description': 'Provide consultation to other professionals and communicate effectively with stakeholders.'
            },
            {
                'aope': 'CLINICAL',
                'category_code': 'RESEARCH',
                'label': 'Research and Evaluation',
                'description': 'Apply research skills to evaluate practice and contribute to knowledge base.'
            }
        ]
        
        for comp_data in competency_data:
            comp, created = CompetencyFramework.objects.get_or_create(
                aope=comp_data['aope'],
                category_code=comp_data['category_code'],
                defaults=comp_data
            )
            if created:
                self.stdout.write(f'Created competency: {comp}')
        
        self.stdout.write(
            self.style.SUCCESS('Successfully created registrar test data!')
        )
        self.stdout.write('Test users created:')
        self.stdout.write('- Registrar: registrar@example.com (password: password123)')
        self.stdout.write('- Principal Supervisor: principal.supervisor@example.com (password: password123)')
        self.stdout.write('- Secondary Supervisor (Same AoPE): secondary.supervisor@example.com (password: password123)')
        self.stdout.write('- Secondary Supervisor (Different AoPE): other.supervisor@example.com (password: password123)')
