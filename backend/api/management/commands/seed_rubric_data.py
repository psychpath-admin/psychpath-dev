from django.core.management.base import BaseCommand
from api.models import Competency, EPA, Milestone, Rubric


class Command(BaseCommand):
    help = "Seed AHPRA competencies, sample EPAs, milestones, and rubrics"

    def handle(self, *args, **options):
        created_competencies = 0
        created_epas = 0
        created_milestones = 0
        created_rubrics = 0

        # Create AHPRA Core Competencies (C1-C8)
        competencies_data = [
            {
                "code": "C1",
                "title": "Knowledge of the Discipline",
                "description": "Demonstrates comprehensive knowledge of psychological theory, research, and practice.",
                "descriptors": {
                    "1.1": "Knowledge of psychological theories and models",
                    "1.2": "Understanding of research methods and evidence-based practice",
                    "1.3": "Knowledge of psychological assessment and intervention techniques"
                },
                "order": 1
            },
            {
                "code": "C2",
                "title": "Ethical, Legal and Professional Matters",
                "description": "Applies ethical principles and professional standards in psychological practice.",
                "descriptors": {
                    "2.1": "Understanding of ethical principles and codes of conduct",
                    "2.2": "Knowledge of legal frameworks and professional standards",
                    "2.3": "Application of ethical decision-making processes"
                },
                "order": 2
            },
            {
                "code": "C3",
                "title": "Psychological Assessment and Measurement",
                "description": "Conducts psychological assessments using appropriate tools and methods.",
                "descriptors": {
                    "3.1": "Selection and administration of assessment tools",
                    "3.2": "Interpretation of assessment results",
                    "3.3": "Communication of assessment findings"
                },
                "order": 3
            },
            {
                "code": "C4",
                "title": "Intervention Strategies",
                "description": "Implements evidence-based psychological interventions.",
                "descriptors": {
                    "4.1": "Selection of appropriate intervention strategies",
                    "4.2": "Implementation of psychological interventions",
                    "4.3": "Evaluation of intervention effectiveness"
                },
                "order": 4
            },
            {
                "code": "C5",
                "title": "Communication and Interpersonal Relationships",
                "description": "Establishes effective therapeutic relationships and communicates professionally.",
                "descriptors": {
                    "5.1": "Building therapeutic rapport",
                    "5.2": "Professional communication skills",
                    "5.3": "Cultural sensitivity and diversity awareness"
                },
                "order": 5
            },
            {
                "code": "C6",
                "title": "Working within a Cross-Cultural Context",
                "description": "Demonstrates cultural competence and works effectively with diverse populations.",
                "descriptors": {
                    "6.1": "Cultural awareness and sensitivity",
                    "6.2": "Adaptation of practice for diverse populations",
                    "6.3": "Understanding of cultural influences on psychological processes"
                },
                "order": 6
            },
            {
                "code": "C7",
                "title": "Practice Across the Lifespan",
                "description": "Applies psychological knowledge across different developmental stages.",
                "descriptors": {
                    "7.1": "Understanding of developmental psychology",
                    "7.2": "Age-appropriate assessment and intervention",
                    "7.3": "Working with families and systems"
                },
                "order": 7
            },
            {
                "code": "C8",
                "title": "Research and Evaluation",
                "description": "Conducts research and evaluates psychological practice.",
                "descriptors": {
                    "8.1": "Research design and methodology",
                    "8.2": "Data analysis and interpretation",
                    "8.3": "Evaluation of practice outcomes"
                },
                "order": 8
            }
        ]

        for comp_data in competencies_data:
            competency, created = Competency.objects.get_or_create(
                code=comp_data["code"],
                defaults={
                    "title": comp_data["title"],
                    "description": comp_data["description"],
                    "descriptors": comp_data["descriptors"],
                    "order": comp_data["order"]
                }
            )
            if created:
                created_competencies += 1

        # Create sample EPAs
        epas_data = [
            {
                "code": "C2-01",
                "title": "Ethical Practice and Professional Conduct",
                "description": "Demonstrates ethical decision-making and professional conduct in psychological practice.",
                "competency_code": "C2",
                "descriptors": ["2.1", "2.2", "2.3"],
                "order": 1
            },
            {
                "code": "C2-02",
                "title": "Confidentiality and Privacy Management",
                "description": "Manages client confidentiality and privacy in accordance with legal and ethical requirements.",
                "competency_code": "C2",
                "descriptors": ["2.1", "2.2"],
                "order": 2
            },
            {
                "code": "C5-01",
                "title": "Therapeutic Communication",
                "description": "Establishes and maintains effective therapeutic communication with clients.",
                "competency_code": "C5",
                "descriptors": ["5.1", "5.2"],
                "order": 1
            },
            {
                "code": "C3-01",
                "title": "Psychological Assessment Administration",
                "description": "Administers psychological assessments using appropriate tools and methods.",
                "competency_code": "C3",
                "descriptors": ["3.1", "3.2"],
                "order": 1
            }
        ]

        for epa_data in epas_data:
            competency = Competency.objects.get(code=epa_data["competency_code"])
            epa, created = EPA.objects.get_or_create(
                code=epa_data["code"],
                defaults={
                    "title": epa_data["title"],
                    "description": epa_data["description"],
                    "competency": competency,
                    "descriptors": epa_data["descriptors"],
                    "order": epa_data["order"]
                }
            )
            if created:
                created_epas += 1

        # Create milestones for each EPA
        milestone_labels = {
            1: "Novice",
            2: "Advanced Beginner", 
            3: "Competent",
            4: "Proficient"
        }

        for epa in EPA.objects.all():
            for level in range(1, 5):
                milestone, created = Milestone.objects.get_or_create(
                    epa=epa,
                    code=f"L{level}",
                    defaults={
                        "level": level,
                        "label": milestone_labels[level],
                        "description": f"Level {level} milestone for {epa.title}"
                    }
                )
                if created:
                    created_milestones += 1

        # Create sample rubrics
        sample_rubrics = [
            {
                "epa_code": "C2-01",
                "milestone_code": "L3",
                "criteria": [
                    {
                        "criterion_id": "ethic_1",
                        "criterion_label": "Identifies and manages ethical dilemmas",
                        "descriptor_L1": "Recognises ethical issues only when prompted",
                        "descriptor_L2": "Can describe ethical principles but needs guidance to apply them",
                        "descriptor_L3": "Independently recognises ethical dilemmas and applies ethical reasoning",
                        "descriptor_L4": "Anticipates ethical risks and acts proactively with clear documentation"
                    },
                    {
                        "criterion_id": "ethic_2",
                        "criterion_label": "Applies professional codes and legislation",
                        "descriptor_L1": "Requires instruction to identify relevant codes",
                        "descriptor_L2": "Understands codes but inconsistently applies them",
                        "descriptor_L3": "Consistently integrates legal and ethical frameworks",
                        "descriptor_L4": "Uses ethical frameworks proactively and mentors peers"
                    }
                ],
                "weightings": {"ethic_1": 0.6, "ethic_2": 0.4},
                "guidance_notes": "Focus on practical application of ethical principles in real-world scenarios."
            },
            {
                "epa_code": "C5-01",
                "milestone_code": "L2",
                "criteria": [
                    {
                        "criterion_id": "comm_1",
                        "criterion_label": "Establishes therapeutic rapport",
                        "descriptor_L1": "Struggles to build basic rapport with clients",
                        "descriptor_L2": "Can establish rapport with guidance and support",
                        "descriptor_L3": "Consistently builds effective therapeutic relationships",
                        "descriptor_L4": "Adapts communication style to diverse client needs"
                    },
                    {
                        "criterion_id": "comm_2",
                        "criterion_label": "Uses active listening skills",
                        "descriptor_L1": "Demonstrates basic listening but misses key information",
                        "descriptor_L2": "Shows good listening skills with occasional gaps",
                        "descriptor_L3": "Demonstrates excellent active listening consistently",
                        "descriptor_L4": "Uses advanced listening techniques and provides insightful responses"
                    }
                ],
                "weightings": {"comm_1": 0.5, "comm_2": 0.5},
                "guidance_notes": "Observe client interactions and communication effectiveness."
            }
        ]

        for rubric_data in sample_rubrics:
            try:
                epa = EPA.objects.get(code=rubric_data["epa_code"])
                milestone = Milestone.objects.get(epa=epa, code=rubric_data["milestone_code"])
                competency = epa.competency
                
                rubric, created = Rubric.objects.get_or_create(
                    epa=epa,
                    milestone=milestone,
                    competency=competency,
                    defaults={
                        "criteria": rubric_data["criteria"],
                        "weightings": rubric_data["weightings"],
                        "guidance_notes": rubric_data["guidance_notes"]
                    }
                )
                if created:
                    created_rubrics += 1
            except (EPA.DoesNotExist, Milestone.DoesNotExist):
                self.stdout.write(
                    self.style.WARNING(f"Could not create rubric for {rubric_data['epa_code']} - EPA or Milestone not found")
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed complete. Created: {created_competencies} competencies, "
                f"{created_epas} EPAs, {created_milestones} milestones, "
                f"{created_rubrics} rubrics"
            )
        )
