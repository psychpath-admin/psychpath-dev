# Generated migration for AHPRA supervision requirements

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('section_c', '0007_supervisionentry_locked_and_more'),
        ('api', '0032_userprofile_identifies_as_indigenous'),
    ]

    operations = [
        # Add new fields to SupervisionEntry
        migrations.AddField(
            model_name='supervisionentry',
            name='supervision_mode',
            field=models.CharField(
                choices=[('DIRECT_PERSON', 'Direct - In Person'), ('DIRECT_VIDEO', 'Direct - Video Conference'), ('DIRECT_PHONE', 'Direct - Phone'), ('INDIRECT', 'Indirect (Written/Asynchronous)')],
                default='DIRECT_PERSON',
                help_text='Mode of supervision delivery (AHPRA requirement)',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='supervisionentry',
            name='is_cultural_supervision',
            field=models.BooleanField(default=False, help_text='Is this culturally-informed or mentoring supervision?'),
        ),
        migrations.AddField(
            model_name='supervisionentry',
            name='supervisor_is_board_approved',
            field=models.BooleanField(default=True, help_text='Is the supervisor Board-approved (BAS)?'),
        ),
        
        # Create SupervisionObservation model
        migrations.CreateModel(
            name='SupervisionObservation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('observation_date', models.DateField()),
                ('observation_type', models.CharField(choices=[('ASSESSMENT', 'Psychological Assessment'), ('INTERVENTION', 'Psychological Intervention')], max_length=20)),
                ('observation_method', models.CharField(choices=[('IN_PERSON', 'In Person'), ('VIDEO_LIVE', 'Live Video'), ('VIDEO_RECORDING', 'Video Recording'), ('AUDIO_RECORDING', 'Audio Recording')], max_length=20)),
                ('client_pseudonym', models.CharField(blank=True, max_length=100)),
                ('session_duration_minutes', models.IntegerField()),
                ('supervisor_feedback', models.TextField(help_text="Supervisor's observations and feedback")),
                ('trainee_reflection', models.TextField(blank=True, help_text="Trainee's reflection on the observation")),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('related_supervision_entry', models.ForeignKey(blank=True, help_text='Link to the supervision session where this was discussed', null=True, on_delete=django.db.models.deletion.SET_NULL, to='section_c.supervisionentry')),
                ('supervisor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='conducted_observations', to='api.userprofile')),
                ('trainee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='supervision_observations', to='api.userprofile')),
            ],
            options={
                'verbose_name': 'Supervision Observation',
                'verbose_name_plural': 'Supervision Observations',
                'ordering': ['-observation_date'],
            },
        ),
        
        # Create SupervisionComplianceReport model
        migrations.CreateModel(
            name='SupervisionComplianceReport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('total_supervision_hours', models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ('individual_supervision_hours', models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ('group_supervision_hours', models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ('direct_inperson_hours', models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ('direct_video_hours', models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ('direct_phone_hours', models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ('indirect_hours', models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ('cultural_supervision_hours', models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ('assessment_observations_count', models.IntegerField(default=0)),
                ('intervention_observations_count', models.IntegerField(default=0)),
                ('meets_total_hours', models.BooleanField(default=False)),
                ('meets_individual_requirement', models.BooleanField(default=False)),
                ('meets_direct_requirement', models.BooleanField(default=False)),
                ('meets_observation_requirement', models.BooleanField(default=False)),
                ('meets_distribution_requirement', models.BooleanField(default=False)),
                ('is_compliant', models.BooleanField(default=False)),
                ('warnings', models.JSONField(default=list, help_text='List of compliance warnings')),
                ('last_calculated', models.DateTimeField(auto_now=True)),
                ('trainee', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='supervision_compliance', to='api.userprofile')),
            ],
            options={
                'verbose_name': 'Supervision Compliance Report',
                'verbose_name_plural': 'Supervision Compliance Reports',
            },
        ),
    ]

