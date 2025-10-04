# Generated manually for registrar logbook models

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='RegistrarProgram',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('aope', models.CharField(choices=[('CLINICAL', 'Clinical Psychology'), ('FORENSIC', 'Forensic Psychology'), ('ORGANISATIONAL', 'Organisational Psychology'), ('SPORT_EXERCISE', 'Sport and Exercise Psychology'), ('COMMUNITY', 'Community Psychology'), ('COUNSELLING', 'Counselling Psychology'), ('EDUCATIONAL_DEVELOPMENTAL', 'Educational and Developmental Psychology'), ('HEALTH', 'Health Psychology'), ('NEUROPSYCHOLOGY', 'Neuropsychology')], max_length=50)),
                ('qualification_tier', models.CharField(choices=[('masters', 'Masters (6th-year) or APAC bridging (first AoPE)'), ('masters_phd', 'Combined Masters/PhD (6th-year w/ doctoral thesis) or bridging (subsequent AoPE)'), ('doctoral', 'Doctoral (7th-year+)')], max_length=30)),
                ('fte_fraction', models.DecimalField(decimal_places=2, default=1.0, help_text='Full-time equivalent fraction', max_digits=3, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(1)])),
                ('start_date', models.DateField()),
                ('expected_end_date', models.DateField()),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('active', 'Active'), ('midpoint_submitted', 'Midpoint Submitted'), ('final_submitted', 'Final Submitted'), ('endorsed', 'Endorsed')], default='draft', max_length=30)),
                ('targets_practice_hrs', models.IntegerField(help_text='Target practice hours for this program')),
                ('targets_supervision_hrs', models.IntegerField(help_text='Target supervision hours for this program')),
                ('targets_cpd_hrs', models.IntegerField(help_text='Target CPD hours for this program')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='registrar_programs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
                'unique_together': {('user', 'aope', 'start_date')},
            },
        ),
        migrations.CreateModel(
            name='RegistrarPracticeEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('start_time', models.TimeField(blank=True, null=True)),
                ('end_time', models.TimeField(blank=True, null=True)),
                ('hours', models.DecimalField(decimal_places=2, help_text='Hours worked', max_digits=4)),
                ('is_dcc', models.BooleanField(default=False, help_text='Direct Client Contact')),
                ('setting', models.CharField(choices=[('clinic', 'Clinic'), ('inpatient', 'Inpatient'), ('community', 'Community'), ('edu', 'Educational'), ('research', 'Research'), ('mgmt', 'Management'), ('other', 'Other')], default='clinic', max_length=20)),
                ('client_group', models.CharField(choices=[('adult', 'Adult'), ('child', 'Child'), ('family', 'Family'), ('org', 'Organisation'), ('other', 'Other')], default='adult', max_length=20)),
                ('description', models.TextField()),
                ('competency_tags', models.JSONField(blank=True, default=list, help_text='Array of competency tags')),
                ('evidence_files', models.JSONField(blank=True, default=dict, help_text='Evidence file references')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('program', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='practice_entries', to='registrar_logbook.registrarprogram')),
            ],
            options={
                'ordering': ['-date', '-created_at'],
            },
        ),
        migrations.CreateModel(
            name='RegistrarSupervisionEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('duration_minutes', models.PositiveIntegerField(help_text='Duration in minutes')),
                ('mode', models.CharField(choices=[('in_person', 'In Person'), ('video', 'Video'), ('phone', 'Phone')], default='in_person', max_length=20)),
                ('type', models.CharField(choices=[('individual', 'Individual (1:1)'), ('group', 'Group')], default='individual', max_length=20)),
                ('supervisor_category', models.CharField(choices=[('principal', 'Principal Supervisor'), ('secondary_same_aope', 'Secondary Supervisor (Same AoPE)'), ('secondary_other_or_not_endorsed', 'Secondary Supervisor (Different AoPE or Not Endorsed)')], max_length=50)),
                ('topics', models.TextField(blank=True)),
                ('observed', models.BooleanField(default=False, help_text='Was this session observed?')),
                ('shorter_than_60min', models.BooleanField(default=False, help_text='Session shorter than 60 minutes')),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('program', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='supervision_entries', to='registrar_logbook.registrarprogram')),
                ('supervisor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='supervision_sessions_given', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-date', '-created_at'],
            },
        ),
        migrations.CreateModel(
            name='RegistrarCpdEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('provider', models.CharField(max_length=255)),
                ('title', models.CharField(max_length=255)),
                ('hours', models.DecimalField(decimal_places=2, max_digits=4)),
                ('is_active_cpd', models.BooleanField(default=True, help_text='Active CPD vs other learning')),
                ('learning_goal', models.TextField(blank=True)),
                ('reflection', models.TextField(blank=True)),
                ('evidence_files', models.JSONField(blank=True, default=dict, help_text='Evidence file references')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('program', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cpd_entries', to='registrar_logbook.registrarprogram')),
            ],
            options={
                'ordering': ['-date', '-created_at'],
            },
        ),
        migrations.CreateModel(
            name='SupervisorProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_BAS', models.BooleanField(default=False, help_text='Board-Approved Supervisor')),
                ('aope_endorsements', models.JSONField(blank=True, default=list, help_text='List of AoPE endorsements')),
                ('years_endorsed', models.JSONField(blank=True, default=dict, help_text='Years endorsed per AoPE')),
                ('is_registrar_principal_approved', models.BooleanField(default=False, help_text='Approved as Principal Supervisor for Registrars')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='supervisor_profile', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='CompetencyFramework',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('aope', models.CharField(choices=[('CLINICAL', 'Clinical Psychology'), ('FORENSIC', 'Forensic Psychology'), ('ORGANISATIONAL', 'Organisational Psychology'), ('SPORT_EXERCISE', 'Sport and Exercise Psychology'), ('COMMUNITY', 'Community Psychology'), ('COUNSELLING', 'Counselling Psychology'), ('EDUCATIONAL_DEVELOPMENTAL', 'Educational and Developmental Psychology'), ('HEALTH', 'Health Psychology'), ('NEUROPSYCHOLOGY', 'Neuropsychology')], max_length=50)),
                ('category_code', models.CharField(max_length=20)),
                ('label', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
            ],
            options={
                'ordering': ['aope', 'category_code'],
                'unique_together': {('aope', 'category_code')},
            },
        ),
        migrations.CreateModel(
            name='ProgressSnapshot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(choices=[('midpoint', 'Midpoint (PREA-76)'), ('final', 'Final (AECR-76)')], max_length=20)),
                ('snapshot_json', models.JSONField(help_text='Complete snapshot of program state')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('program', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='progress_snapshots', to='registrar_logbook.registrarprogram')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('entity_type', models.CharField(choices=[('program', 'Program'), ('practice_entry', 'Practice Entry'), ('supervision_entry', 'Supervision Entry'), ('cpd_entry', 'CPD Entry'), ('progress_snapshot', 'Progress Snapshot')], max_length=30)),
                ('entity_id', models.PositiveIntegerField(blank=True, null=True)),
                ('action', models.CharField(choices=[('create', 'Create'), ('update', 'Update'), ('delete', 'Delete'), ('submit', 'Submit'), ('approve', 'Approve'), ('export', 'Export')], max_length=20)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('metadata', models.JSONField(blank=True, default=dict, help_text='Additional action metadata')),
                ('actor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='audit_actions', to=settings.AUTH_USER_MODEL)),
                ('program', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='audit_logs', to='registrar_logbook.registrarprogram')),
            ],
            options={
                'ordering': ['-timestamp'],
                'indexes': [
                    models.Index(fields=['program', 'timestamp'], name='registrar_au_program_8c4b7d_idx'),
                    models.Index(fields=['actor', 'timestamp'], name='registrar_au_actor_i_5b8f8e_idx'),
                ],
            },
        ),
    ]
