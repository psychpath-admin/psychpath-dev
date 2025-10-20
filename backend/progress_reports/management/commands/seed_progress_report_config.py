from django.core.management.base import BaseCommand
from progress_reports.models import ProgressReportConfig


class Command(BaseCommand):
    help = 'Seed initial progress report configurations for PROVISIONAL and REGISTRAR programs'

    def handle(self, *args, **options):
        # Provisional Psychologist Reports
        provisional_configs = [
            {
                'program_type': 'PROVISIONAL',
                'report_type': 'MIDPOINT',
                'report_label': 'Midpoint Progress Report (3 months)',
                'trigger_condition': {'type': 'months', 'value': 3},
                'due_offset_days': 14,
                'is_required': True,
                'allows_draft': True,
                'requires_all_competencies': True,
                'supervisor_approval_required': True,
                'can_request_revision': True,
                'instructions': 'Complete this midpoint progress report to assess your development across all AHPRA competencies. Rate your current milestone level for each competency and provide reflective commentary on your progress, achievements, and areas for development.'
            },
            {
                'program_type': 'PROVISIONAL',
                'report_type': 'FINAL',
                'report_label': 'Final Progress Report (6 months)',
                'trigger_condition': {'type': 'months', 'value': 6},
                'due_offset_days': 14,
                'is_required': True,
                'allows_draft': True,
                'requires_all_competencies': True,
                'supervisor_approval_required': True,
                'can_request_revision': True,
                'instructions': 'Complete this final progress report to demonstrate your readiness for general registration. Provide comprehensive self-assessment across all competencies and reflect on your overall development during the provisional program.'
            }
        ]

        # Registrar Reports
        registrar_configs = [
            {
                'program_type': 'REGISTRAR',
                'report_type': 'MIDPOINT',
                'report_label': 'Midpoint Progress Report',
                'trigger_condition': {'type': 'percentage', 'value': 50},
                'due_offset_days': 30,
                'is_required': True,
                'allows_draft': True,
                'requires_all_competencies': True,
                'supervisor_approval_required': True,
                'can_request_revision': True,
                'instructions': 'Complete this midpoint progress report to assess your development toward Area of Practice Endorsement. Rate your current milestone level for each competency and provide reflective commentary on your progress toward endorsement requirements.'
            },
            {
                'program_type': 'REGISTRAR',
                'report_type': 'FINAL',
                'report_label': 'Final Progress Report',
                'trigger_condition': {'type': 'percentage', 'value': 100},
                'due_offset_days': 30,
                'is_required': True,
                'allows_draft': True,
                'requires_all_competencies': True,
                'supervisor_approval_required': True,
                'can_request_revision': True,
                'instructions': 'Complete this final progress report to demonstrate your readiness for Area of Practice Endorsement. Provide comprehensive self-assessment across all competencies and reflect on your overall development during the registrar program.'
            }
        ]

        all_configs = provisional_configs + registrar_configs

        created_count = 0
        updated_count = 0

        for config_data in all_configs:
            config, created = ProgressReportConfig.objects.get_or_create(
                program_type=config_data['program_type'],
                report_type=config_data['report_type'],
                defaults=config_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Created config: {config.program_type} - {config.report_label}'
                    )
                )
            else:
                # Update existing config
                for key, value in config_data.items():
                    setattr(config, key, value)
                config.save()
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(
                        f'Updated config: {config.program_type} - {config.report_label}'
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully processed {len(all_configs)} configurations: '
                f'{created_count} created, {updated_count} updated'
            )
        )
