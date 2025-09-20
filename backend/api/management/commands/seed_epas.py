from django.core.management.base import BaseCommand
from api.models import EPA, Milestone


EPAS = [
    {
        "code": "EPA 1.1",
        "title": "Therapeutic Engagement",
        "description": "Build rapport and sustain therapeutic alliance across diverse presentations.",
        "milestones": ["1.1", "2.1", "3.2"],
    },
    {
        "code": "EPA 2.3",
        "title": "Assessment and Formulation",
        "description": "Conduct assessments and develop formulations integrating biopsychosocial factors.",
        "milestones": ["2.1", "3.1", "3.3"],
    },
]


class Command(BaseCommand):
    help = "Seed EPAs and Milestones"

    def handle(self, *args, **options):
        created_epas = 0
        created_milestones = 0
        for e in EPAS:
            epa, epa_created = EPA.objects.get_or_create(
                code=e["code"],
                defaults={"title": e["title"], "description": e["description"]},
            )
            if epa_created:
                created_epas += 1
            for m_code in e["milestones"]:
                _, m_created = Milestone.objects.get_or_create(
                    epa=epa, code=m_code, defaults={"description": ""}
                )
                if m_created:
                    created_milestones += 1
        self.stdout.write(self.style.SUCCESS(
            f"Seed complete. EPAs created: {created_epas}, Milestones created: {created_milestones}"
        ))


