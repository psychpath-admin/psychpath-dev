from django.core.management.base import BaseCommand
from epas.models import EPA


class Command(BaseCommand):
    help = 'Seed the database with sample Entrustable Professional Activities (EPAs) for competency mapping'

    def handle(self, *args, **options):
        epas_data = [
            {
                'code': 'EPA-001',
                'title': 'Conduct initial psychological assessment',
                'description': 'Perform comprehensive psychological assessment including clinical interview, standardized testing, and case formulation to inform treatment planning.',
                'descriptors': ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '6.1', '6.3']
            },
            {
                'code': 'EPA-002',
                'title': 'Deliver evidence-based psychological intervention',
                'description': 'Implement culturally appropriate, evidence-based psychological interventions with clients across diverse populations and settings.',
                'descriptors': ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '7.1', '7.6', '7.7']
            },
            {
                'code': 'EPA-003',
                'title': 'Provide clinical supervision to psychology trainees',
                'description': 'Supervise psychology trainees in clinical practice, providing feedback, guidance, and professional development support.',
                'descriptors': ['6.1', '6.6', '6.7', '6.8', '3.1', '3.2', '3.3', '2.1', '2.2']
            },
            {
                'code': 'EPA-004',
                'title': 'Conduct risk assessment and crisis intervention',
                'description': 'Assess and manage psychological risk factors, implement crisis intervention strategies, and ensure client safety.',
                'descriptors': ['4.9', '5.5', '2.10', '6.1', '6.3', '7.7', '8.4']
            },
            {
                'code': 'EPA-005',
                'title': 'Engage in professional development and research',
                'description': 'Participate in ongoing professional development, conduct research, and contribute to the psychological knowledge base.',
                'descriptors': ['1.1', '1.2', '1.3', '1.4', '1.5', '2.8', '3.1', '3.3', '3.6']
            },
            {
                'code': 'EPA-006',
                'title': 'Work collaboratively with multidisciplinary teams',
                'description': 'Collaborate effectively with other healthcare professionals, community services, and stakeholders in client care.',
                'descriptors': ['6.7', '6.8', '7.8', '8.7', '2.2', '2.3', '6.1', '6.6']
            },
            {
                'code': 'EPA-007',
                'title': 'Provide culturally responsive psychological services',
                'description': 'Deliver psychological services that are culturally appropriate, trauma-informed, and responsive to diverse client needs.',
                'descriptors': ['7.1', '7.2', '7.3', '7.4', '7.5', '7.6', '7.7', '7.8', '7.9', '8.1', '8.2', '8.3', '8.4', '8.5', '8.6']
            },
            {
                'code': 'EPA-008',
                'title': 'Maintain professional and ethical standards',
                'description': 'Adhere to professional ethics, legal requirements, and maintain appropriate boundaries and documentation standards.',
                'descriptors': ['2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.9', '2.10', '3.4', '3.5']
            },
            {
                'code': 'EPA-009',
                'title': 'Conduct psychological assessment with Aboriginal and Torres Strait Islander clients',
                'description': 'Perform culturally safe psychological assessments with Aboriginal and Torres Strait Islander clients, families, and communities.',
                'descriptors': ['8.1', '8.2', '8.3', '8.4', '8.5', '8.6', '8.7', '4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '4.8']
            },
            {
                'code': 'EPA-010',
                'title': 'Engage in reflective practice and self-care',
                'description': 'Demonstrate ongoing reflective practice, self-assessment, and maintain professional wellbeing through appropriate self-care strategies.',
                'descriptors': ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '2.8', '2.9']
            }
        ]

        created_count = 0
        updated_count = 0

        for epa_data in epas_data:
            epa, created = EPA.objects.get_or_create(
                code=epa_data['code'],
                defaults={
                    'title': epa_data['title'],
                    'description': epa_data['description'],
                    'descriptors': epa_data['descriptors']
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created EPA: {epa.code} - {epa.title}')
                )
            else:
                # Update existing EPA if data has changed
                if (epa.title != epa_data['title'] or 
                    epa.description != epa_data['description'] or
                    epa.descriptors != epa_data['descriptors']):
                    
                    epa.title = epa_data['title']
                    epa.description = epa_data['description']
                    epa.descriptors = epa_data['descriptors']
                    epa.save()
                    updated_count += 1
                    self.stdout.write(
                        self.style.WARNING(f'Updated EPA: {epa.code} - {epa.title}')
                    )
                else:
                    self.stdout.write(
                        self.style.SUCCESS(f'EPA already exists: {epa.code} - {epa.title}')
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nSeeding complete! Created: {created_count}, Updated: {updated_count}, Total: {EPA.objects.count()}'
            )
        )
