from django.core.management.base import BaseCommand
from epas.models import EPA
import uuid


class Command(BaseCommand):
    help = 'Seed the database with comprehensive EPA data for all competency descriptors'

    def handle(self, *args, **options):
        epas_data = [
            {
                'code': 'C1-101',
                'title': 'Real-World Task Demonstrating Descriptor 1.1',
                'description': 'Perform a practical activity that demonstrates the competency defined in descriptor 1.1 under C1.',
                'descriptors': ['1.1'],
                'milestones': ['L1', 'L2', 'L3', 'L4'],
                'tag': 'EPA C1-101 M3—descriptor 1.1',
                'm3_behaviours': [
                    'white exploit distributed bandwidth',
                    'half facilitate efficient portals',
                    'continue embrace 24/365 paradigms'
                ],
                'prompt': 'How did you demonstrate descriptor 1.1 in this scenario?'
            },
            {
                'code': 'C1-102',
                'title': 'Real-World Task Demonstrating Descriptor 1.2',
                'description': 'Perform a practical activity that demonstrates the competency defined in descriptor 1.2 under C1.',
                'descriptors': ['1.2'],
                'milestones': ['L1', 'L2', 'L3', 'L4'],
                'tag': 'EPA C1-102 M3—descriptor 1.2',
                'm3_behaviours': [
                    'sport generate dynamic channels',
                    'draw enable plug-and-play markets',
                    'collection architect cross-media infrastructures'
                ],
                'prompt': 'How did you demonstrate descriptor 1.2 in this scenario?'
            },
            {
                'code': 'C1-103',
                'title': 'Real-World Task Demonstrating Descriptor 1.3',
                'description': 'Perform a practical activity that demonstrates the competency defined in descriptor 1.3 under C1.',
                'descriptors': ['1.3'],
                'milestones': ['L1', 'L2', 'L3', 'L4'],
                'tag': 'EPA C1-103 M3—descriptor 1.3',
                'm3_behaviours': [
                    'why mesh mission-critical e-commerce',
                    'good engage value-added niches',
                    'off harness out-of-the-box e-markets'
                ],
                'prompt': 'How did you demonstrate descriptor 1.3 in this scenario?'
            },
            {
                'code': 'C1-104',
                'title': 'Real-World Task Demonstrating Descriptor 1.4',
                'description': 'Perform a practical activity that demonstrates the competency defined in descriptor 1.4 under C1.',
                'descriptors': ['1.4'],
                'milestones': ['L1', 'L2', 'L3', 'L4'],
                'tag': 'EPA C1-104 M3—descriptor 1.4',
                'm3_behaviours': [
                    'agency utilize clicks-and-mortar communities',
                    'few morph magnetic models',
                    'police scale real-time networks'
                ],
                'prompt': 'How did you demonstrate descriptor 1.4 in this scenario?'
            },
            {
                'code': 'C1-105',
                'title': 'Real-World Task Demonstrating Descriptor 1.5',
                'description': 'Perform a practical activity that demonstrates the competency defined in descriptor 1.5 under C1.',
                'descriptors': ['1.5'],
                'milestones': ['L1', 'L2', 'L3', 'L4'],
                'tag': 'EPA C1-105 M3—descriptor 1.5',
                'm3_behaviours': [
                    'better streamline transparent paradigms',
                    'total mesh plug-and-play functionalities',
                    'western innovate impactful e-commerce'
                ],
                'prompt': 'How did you demonstrate descriptor 1.5 in this scenario?'
            }
        ]

        created_count = 0
        updated_count = 0

        for epa_data in epas_data:
            epa, created = EPA.objects.get_or_create(
                code=epa_data['code'],
                defaults={
                    'id': str(uuid.uuid4()),
                    'title': epa_data['title'],
                    'description': epa_data['description'],
                    'descriptors': epa_data['descriptors'],
                    'milestones': epa_data['milestones'],
                    'tag': epa_data['tag'],
                    'm3_behaviours': epa_data['m3_behaviours'],
                    'prompt': epa_data['prompt']
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
                    epa.descriptors != epa_data['descriptors'] or
                    epa.milestones != epa_data.get('milestones', []) or
                    epa.tag != epa_data.get('tag', '') or
                    epa.m3_behaviours != epa_data.get('m3_behaviours', []) or
                    epa.prompt != epa_data.get('prompt', '')):
                    
                    epa.title = epa_data['title']
                    epa.description = epa_data['description']
                    epa.descriptors = epa_data['descriptors']
                    epa.milestones = epa_data.get('milestones', [])
                    epa.tag = epa_data.get('tag', '')
                    epa.m3_behaviours = epa_data.get('m3_behaviours', [])
                    epa.prompt = epa_data.get('prompt', '')
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
