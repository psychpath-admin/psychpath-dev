from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from datetime import date, time
from api.models import UserProfile
from registrar_logbook.models import (
    RegistrarProgram, RegistrarPracticeEntry, CompetencyFramework
)


class RegistrarPracticeEntryModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testregistrar',
            email='registrar@test.com',
            password='testpass123'
        )
        
        self.profile = UserProfile.objects.create(
            user=self.user,
            role='REGISTRAR',
            first_name='Test',
            last_name='Registrar'
        )
        
        self.program = RegistrarProgram.objects.create(
            user=self.user,
            aope='CLINICAL',
            qualification_tier='masters',
            fte_fraction=1.0,
            start_date=date(2024, 1, 1),
            expected_end_date=date(2025, 1, 1),
            targets_practice_hrs=3000,
            targets_supervision_hrs=80,
            targets_cpd_hrs=80
        )

    def test_practice_entry_creation(self):
        """Test creating a practice entry with valid data"""
        entry = RegistrarPracticeEntry.objects.create(
            program=self.program,
            date=date(2024, 1, 15),
            start_time=time(9, 0),
            end_time=time(15, 0),
            duration_minutes=360,
            dcc_minutes=240,
            dcc_categories=['assessment', 'intervention'],
            setting='outpatient',
            modality='in_person',
            client_code='C-001',
            client_age_band='26-44',
            presenting_issue='anxiety and depression',
            tasks='Initial assessment using MINI, PHQ-9, and GAD-7. Developed treatment plan.',
            competency_tags=['Assessment', 'Intervention strategies'],
            observed=True,
            supervisor_followup_date=date(2024, 1, 16),
            created_by=self.user
        )
        
        self.assertEqual(entry.program, self.program)
        self.assertEqual(entry.duration_minutes, 360)
        self.assertEqual(entry.dcc_minutes, 240)
        self.assertEqual(entry.dcc_ratio, 66.7)
        self.assertEqual(entry.duration_hours, 6.0)
        self.assertEqual(entry.dcc_hours, 4.0)

    def test_practice_entry_validation_dcc_exceeds_duration(self):
        """Test that DCC minutes cannot exceed total duration"""
        with self.assertRaises(Exception):
            entry = RegistrarPracticeEntry(
                program=self.program,
                date=date(2024, 1, 15),
                duration_minutes=60,
                dcc_minutes=90,  # This should fail
                dcc_categories=['assessment'],
                setting='outpatient',
                modality='in_person',
                client_code='C-001',
                client_age_band='26-44',
                tasks='Test tasks description that is long enough',
                created_by=self.user
            )
            entry.full_clean()  # This will trigger validation

    def test_practice_entry_validation_client_code_format(self):
        """Test client code format validation"""
        with self.assertRaises(Exception):
            entry = RegistrarPracticeEntry(
                program=self.program,
                date=date(2024, 1, 15),
                duration_minutes=60,
                dcc_minutes=30,
                dcc_categories=['assessment'],
                setting='outpatient',
                modality='in_person',
                client_code='invalid-code',  # This should fail
                client_age_band='26-44',
                tasks='Test tasks description that is long enough',
                created_by=self.user
            )
            entry.full_clean()  # This will trigger validation


class RegistrarPracticeEntryAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testregistrar',
            email='registrar@test.com',
            password='testpass123'
        )
        
        self.profile = UserProfile.objects.create(
            user=self.user,
            role='REGISTRAR',
            first_name='Test',
            last_name='Registrar'
        )
        
        self.program = RegistrarProgram.objects.create(
            user=self.user,
            aope='CLINICAL',
            qualification_tier='masters',
            fte_fraction=1.0,
            start_date=date(2024, 1, 1),
            expected_end_date=date(2025, 1, 1),
            targets_practice_hrs=3000,
            targets_supervision_hrs=80,
            targets_cpd_hrs=80
        )
        
        # Create competency framework entries
        CompetencyFramework.objects.create(
            aope='CLINICAL',
            category_code='ASSESSMENT',
            label='Assessment',
            description='Psychological assessment competencies'
        )
        
        self.client.force_authenticate(user=self.user)

    def test_create_practice_entry(self):
        """Test creating a practice entry via API"""
        data = {
            'program': self.program.id,
            'date': '2024-01-15',
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
            'tasks': 'Initial assessment using MINI, PHQ-9, and GAD-7. Developed treatment plan including CBT techniques.',
            'competency_tags': ['Assessment'],
            'observed': True,
            'supervisor_followup_date': '2024-01-16'
        }
        
        response = self.client.post('/api/registrar/practice-entries/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify the entry was created
        entry = RegistrarPracticeEntry.objects.get(client_code='C-001')
        self.assertEqual(entry.program, self.program)
        self.assertEqual(entry.dcc_minutes, 240)
        self.assertEqual(entry.duration_minutes, 360)

    def test_create_practice_entry_invalid_dcc_minutes(self):
        """Test creating a practice entry with invalid DCC minutes"""
        data = {
            'program': self.program.id,
            'date': '2024-01-15',
            'duration_minutes': 60,
            'dcc_minutes': 90,  # This exceeds duration
            'dcc_categories': ['assessment'],
            'setting': 'outpatient',
            'modality': 'in_person',
            'client_code': 'C-001',
            'client_age_band': '26-44',
            'tasks': 'Initial assessment using MINI, PHQ-9, and GAD-7. Developed treatment plan including CBT techniques.'
        }
        
        response = self.client.post('/api/registrar/practice-entries/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('DCC minutes cannot exceed total duration', str(response.data))

    def test_list_practice_entries(self):
        """Test listing practice entries"""
        # Create a test entry
        RegistrarPracticeEntry.objects.create(
            program=self.program,
            date=date(2024, 1, 15),
            duration_minutes=60,
            dcc_minutes=30,
            dcc_categories=['assessment'],
            setting='outpatient',
            modality='in_person',
            client_code='C-001',
            client_age_band='26-44',
            tasks='Initial assessment using MINI, PHQ-9, and GAD-7. Developed treatment plan including CBT techniques.',
            created_by=self.user
        )
        
        response = self.client.get('/api/registrar/practice-entries/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['client_code'], 'C-001')
