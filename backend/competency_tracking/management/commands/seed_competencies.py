from django.core.management.base import BaseCommand
from competency_tracking.models import CompetencyDefinition

class Command(BaseCommand):
    help = 'Seed the 8 AHPRA competencies'

    def handle(self, *args, **options):
        competencies = [
            {
                'code': 'C1', 
                'name': 'Knowledge of the Discipline', 
                'description': 'Demonstrates comprehensive knowledge of psychological theory, research, and practice relevant to their area of specialization.',
                'order': 1
            },
            {
                'code': 'C2', 
                'name': 'Ethical, Legal and Professional Matters', 
                'description': 'Demonstrates understanding and application of ethical principles, legal requirements, and professional standards in psychological practice.',
                'order': 2
            },
            {
                'code': 'C3', 
                'name': 'Psychological Assessment and Measurement', 
                'description': 'Demonstrates competence in psychological assessment, including test selection, administration, scoring, interpretation, and report writing.',
                'order': 3
            },
            {
                'code': 'C4', 
                'name': 'Intervention Strategies', 
                'description': 'Demonstrates competence in psychological intervention, including treatment planning, implementation, and evaluation of therapeutic outcomes.',
                'order': 4
            },
            {
                'code': 'C5', 
                'name': 'Research and Evaluation', 
                'description': 'Demonstrates competence in research methods, data analysis, and evaluation of psychological interventions and programs.',
                'order': 5
            },
            {
                'code': 'C6', 
                'name': 'Communication and Interpersonal Skills', 
                'description': 'Demonstrates effective communication and interpersonal skills in professional relationships with clients, colleagues, and other stakeholders.',
                'order': 6
            },
            {
                'code': 'C7', 
                'name': 'Working within a Cross-Cultural Context', 
                'description': 'Demonstrates cultural competence and sensitivity in working with diverse populations and understanding cultural influences on psychological practice.',
                'order': 7
            },
            {
                'code': 'C8', 
                'name': 'Practice Across the Lifespan', 
                'description': 'Demonstrates competence in psychological practice across different developmental stages and life contexts.',
                'order': 8
            },
        ]
        
        created_count = 0
        for comp_data in competencies:
            competency, created = CompetencyDefinition.objects.get_or_create(
                code=comp_data['code'],
                defaults=comp_data
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created competency: {competency.code} - {competency.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Competency already exists: {competency.code} - {competency.name}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully processed {len(competencies)} competencies. Created {created_count} new entries.')
        )
