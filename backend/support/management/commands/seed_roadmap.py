from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from support.models import SupportTicket


User = get_user_model()


class Command(BaseCommand):
    help = "Seed sample roadmap items (SupportTicket entries) for development/testing"

    def handle(self, *args, **options):
        user = User.objects.filter(is_staff=True).first() or User.objects.first()
        if not user:
            self.stdout.write(self.style.ERROR("No users found. Create a user first."))
            return

        samples = [
            {
                "ticket_type": "FEATURE",
                "subject": "Improve logbook submission reliability",
                "description": "Handle transient errors and add retry UI.",
                "priority": "HIGH",
                "stage": "IN_DEVELOPMENT",
                "business_value": "CRITICAL",
                "effort_estimate": "M",
                "target_milestone": "2025-Q4",
            },
            {
                "ticket_type": "TASK",
                "subject": "Add supervisor review history to logbook",
                "description": "Expose audit trail in UI and API.",
                "priority": "MEDIUM",
                "stage": "PLANNED",
                "business_value": "HIGH",
                "effort_estimate": "S",
                "target_milestone": "2025-Q4",
            },
            {
                "ticket_type": "FEATURE",
                "subject": "Roadmap timeline visualization",
                "description": "Support fishbone-style timeline in frontend.",
                "priority": "LOW",
                "stage": "TESTING",
                "business_value": "MEDIUM",
                "effort_estimate": "S",
                "target_milestone": "2025-Q4",
            },
        ]

        created = 0
        for data in samples:
            ticket, was_created = SupportTicket.objects.get_or_create(
                user=user,
                subject=data["subject"],
                defaults=data,
            )
            if was_created:
                created += 1

        self.stdout.write(
            self.style.SUCCESS(f"Seeded {created} roadmap items (existing preserved)")
        )


