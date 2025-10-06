from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('registrar_logbook', '0002_auto_20250930_1526'),
    ]

    operations = [
        migrations.CreateModel(
            name='RegistrarPracticeEntry',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('date', models.DateField(help_text='Date of practice activity')),
                ('start_time', models.TimeField(blank=True, help_text='Start time (optional)', null=True)),
                ('end_time', models.TimeField(blank=True, help_text='End time (optional)', null=True)),
                ('duration_minutes', models.PositiveIntegerField(help_text='Total practice minutes')),
                ('dcc_minutes', models.PositiveIntegerField(default=0, help_text='Direct client contact minutes')),
                ('dcc_categories', models.JSONField(default=list, help_text='DCC categories for this entry')),
                ('setting', models.CharField(choices=[('outpatient', 'Outpatient'), ('inpatient', 'Inpatient'), ('community', 'Community'), ('education', 'Education'), ('research', 'Research'), ('management', 'Management'), ('telehealth', 'Telehealth'), ('other', 'Other')], help_text='Practice setting', max_length=20)),
                ('modality', models.CharField(choices=[('in_person', 'In Person'), ('video', 'Video'), ('phone', 'Phone'), ('asynchronous', 'Asynchronous')], help_text='Service modality', max_length=20)),
                ('client_code', models.CharField(help_text='Non-identifying client code (e.g., C-044)', max_length=10)),
                ('client_age_band', models.CharField(choices=[('0-12', '0-12 years'), ('13-17', '13-17 years'), ('18-25', '18-25 years'), ('26-44', '26-44 years'), ('45-64', '45-64 years'), ('65+', '65+ years')], help_text='Client age band', max_length=10)),
                ('presenting_issue', models.CharField(blank=True, help_text='Brief presenting issue (no PII)', max_length=120, null=True)),
                ('tasks', models.TextField(help_text='What was done (no PII)')),
                ('competency_tags', models.JSONField(default=list, help_text='Competency framework tags')),
                ('observed', models.BooleanField(default=False, help_text='Was any portion observed by supervisor')),
                ('supervisor_followup_date', models.DateField(blank=True, help_text='Scheduled supervisor follow-up', null=True)),
                ('evidence_files', models.JSONField(default=list, help_text='Evidence files metadata')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='created_practice_entries', to='auth.user')),
                ('program', models.ForeignKey(db_index=True, on_delete=django.db.models.deletion.CASCADE, related_name='practice_entries', to='registrar_logbook.registrarprogram')),
            ],
            options={
                'db_table': 'registrar_logbook_registrarpracticeentry',
                'ordering': ['-date', '-start_time'],
                'indexes': [
                    models.Index(fields=['program', 'date'], name='idx_rpe_program_date'),
                    models.Index(fields=['program', 'dcc_minutes'], name='idx_rpe_program_dcc'),
                ],
            },
        ),
    ]
