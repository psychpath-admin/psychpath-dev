from django.core.management.base import BaseCommand
from section_b.models import PDCompetency, ProfessionalDevelopmentEntry
from django.contrib.auth.models import User
from datetime import datetime, timedelta


class Command(BaseCommand):
    help = 'Seed PD competencies and demo entries'

    def handle(self, *args, **options):
        # Create PD competencies
        competencies = [
            'Communication and Interpersonal Relationships',
            'Ethical, Legal and Professional Matters',
            'Intervention Strategies',
            'Knowledge of the Discipline',
            'Practice Across the Lifespan',
            'Psychological Measurement and Assessment',
            'Research and Evaluation',
            'Working within a Cross Cultural Context'
        ]

        for comp_name in competencies:
            PDCompetency.objects.get_or_create(
                name=comp_name,
                defaults={'description': f'Competency area: {comp_name}', 'is_active': True}
            )

        self.stdout.write(
            self.style.SUCCESS(f'Created {len(competencies)} PD competencies')
        )

        # Create demo PD entries if user exists
        try:
            user = User.objects.get(email='intern@demo.test')
            
            # Clear existing demo entries
            ProfessionalDevelopmentEntry.objects.filter(trainee=user).delete()
            
            # Create demo entries
            demo_entries = [
                {
                    'activity_type': 'WORKSHOP',
                    'date_of_activity': '2025-08-07',
                    'duration_minutes': 130,
                    'is_active_activity': True,
                    'activity_details': 'IFS Introduction',
                    'topics_covered': 'Parts language and mapping',
                    'competencies_covered': ['Intervention Strategies', 'Knowledge of the Discipline']
                },
                {
                    'activity_type': 'WEBINAR',
                    'date_of_activity': '2025-08-10',
                    'duration_minutes': 90,
                    'is_active_activity': True,
                    'activity_details': 'EMDR Resourcing Skills',
                    'topics_covered': 'Safe place imagery',
                    'competencies_covered': ['Intervention Strategies', 'Psychological Measurement and Assessment']
                },
                {
                    'activity_type': 'WEBINAR',
                    'date_of_activity': '2025-08-05',
                    'duration_minutes': 90,
                    'is_active_activity': True,
                    'activity_details': 'Trauma-Informed Practice',
                    'topics_covered': 'Grounding; safety planning',
                    'competencies_covered': ['Ethical, Legal and Professional Matters', 'Intervention Strategies']
                },
                {
                    'activity_type': 'READING',
                    'date_of_activity': '2025-08-09',
                    'duration_minutes': 60,
                    'is_active_activity': False,
                    'activity_details': 'ACT and Chronic Pain',
                    'topics_covered': 'Acceptance strategies',
                    'competencies_covered': ['Intervention Strategies', 'Research and Evaluation']
                }
            ]

            for entry_data in demo_entries:
                # Calculate week starting date
                date_of_activity = datetime.strptime(entry_data['date_of_activity'], '%Y-%m-%d').date()
                week_starting = date_of_activity - timedelta(days=date_of_activity.weekday())
                
                ProfessionalDevelopmentEntry.objects.create(
                    trainee=user,
                    week_starting=week_starting,
                    **entry_data
                )

            self.stdout.write(
                self.style.SUCCESS(f'Created {len(demo_entries)} demo PD entries for {user.email}')
            )

        except User.DoesNotExist:
            self.stdout.write(
                self.style.WARNING('Demo user not found. Run seed_demo.py first.')
            )

        self.stdout.write(
            self.style.SUCCESS('PD data seeding completed!')
        )
