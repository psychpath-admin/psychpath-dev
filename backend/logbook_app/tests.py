from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from api.models import UserProfile, Organization
from logbook_app.models import WeeklyLogbook
from api.models import Supervision


User = get_user_model()


class LogbookStateTransitionTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create users
        self.org = Organization.objects.create(name="Test Org")

        self.trainee = User.objects.create_user(
            username="trainee@example.com",
            email="trainee@example.com",
            password="pass1234",
            first_name="Terry",
            last_name="Trainee",
        )
        UserProfile.objects.create(
            user=self.trainee,
            role="PROVISIONAL",
            organization=self.org,
            principal_supervisor="Sam Supervisor",
            principal_supervisor_email="supervisor@example.com",
        )

        self.supervisor = User.objects.create_user(
            username="supervisor@example.com",
            email="supervisor@example.com",
            password="pass1234",
            first_name="Sam",
            last_name="Supervisor",
        )
        UserProfile.objects.create(
            user=self.supervisor,
            role="SUPERVISOR",
            organization=self.org,
            is_board_approved_supervisor=True,
            can_supervise_provisionals=True,
        )

        # Establish accepted supervision relationship
        Supervision.objects.create(
            supervisor=self.supervisor,
            supervisee=self.trainee,
            role="PRIMARY",
            status="ACCEPTED",
        )

        # Create a draft logbook for a specific week
        self.week_start = date(2025, 1, 13)
        self.week_end = self.week_start + timedelta(days=6)
        self.logbook = WeeklyLogbook.objects.create(
            trainee=self.trainee,
            role_type="Provisional",
            week_start_date=self.week_start,
            week_end_date=self.week_end,
            status="draft",
            section_a_entry_ids=[],
            section_b_entry_ids=[],
            section_c_entry_ids=[],
        )

    def test_draft_to_submitted_to_approved(self):
        # Authenticate as trainee and submit logbook
        self.client.force_authenticate(user=self.trainee)
        submit_response = self.client.post(
            "/api/logbook/submit/",
            {"week_start": self.week_start.isoformat()},
            format="json",
        )
        self.assertEqual(submit_response.status_code, 200, submit_response.content)
        self.logbook.refresh_from_db()
        self.assertEqual(self.logbook.status, "submitted")

        # Approve as supervisor
        self.client.force_authenticate(user=self.supervisor)
        approve_response = self.client.post(
            f"/api/logbook/{self.logbook.id}/approve/",
            {},
            format="json",
        )
        self.assertEqual(approve_response.status_code, 200, approve_response.content)
        self.logbook.refresh_from_db()
        self.assertEqual(self.logbook.status, "approved")

from django.test import TestCase

# Create your tests here.
