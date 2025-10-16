# Generated migration for AHPRA supervision configuration fields

from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('system_config', '0003_add_submission_deadline_days'),
    ]

    operations = [
        # Total Supervision Hours
        migrations.AddField(
            model_name='systemconfiguration',
            name='min_supervision_hours_total',
            field=models.PositiveIntegerField(
                default=80,
                help_text='Minimum total supervision hours required for 5+1 program',
                validators=[MinValueValidator(1), MaxValueValidator(200)]
            ),
        ),
        migrations.AddField(
            model_name='systemconfiguration',
            name='min_practice_hours_per_supervision',
            field=models.PositiveIntegerField(
                default=17,
                help_text='Minimum practice hours for each supervision hour (1:17 ratio)',
                validators=[MinValueValidator(1), MaxValueValidator(50)]
            ),
        ),
        
        # Supervision Type Breakdown
        migrations.AddField(
            model_name='systemconfiguration',
            name='min_individual_supervision_hours',
            field=models.PositiveIntegerField(
                default=50,
                help_text='Minimum individual supervision hours (typically 2/3 of total)',
                validators=[MinValueValidator(1), MaxValueValidator(200)]
            ),
        ),
        migrations.AddField(
            model_name='systemconfiguration',
            name='min_individual_supervision_percentage',
            field=models.DecimalField(
                decimal_places=2,
                default=66.67,
                help_text='Minimum percentage of individual supervision',
                max_digits=5,
                validators=[MinValueValidator(0), MaxValueValidator(100)]
            ),
        ),
        migrations.AddField(
            model_name='systemconfiguration',
            name='max_group_supervision_hours',
            field=models.PositiveIntegerField(
                default=30,
                help_text='Maximum group supervision hours',
                validators=[MinValueValidator(0), MaxValueValidator(100)]
            ),
        ),
        
        # Direct vs Indirect Supervision
        migrations.AddField(
            model_name='systemconfiguration',
            name='min_direct_supervision_hours',
            field=models.PositiveIntegerField(
                default=70,
                help_text='Minimum direct supervision hours (in-person, video, phone)',
                validators=[MinValueValidator(1), MaxValueValidator(200)]
            ),
        ),
        migrations.AddField(
            model_name='systemconfiguration',
            name='max_phone_supervision_hours',
            field=models.PositiveIntegerField(
                default=20,
                help_text='Maximum phone supervision hours',
                validators=[MinValueValidator(0), MaxValueValidator(100)]
            ),
        ),
        migrations.AddField(
            model_name='systemconfiguration',
            name='max_indirect_supervision_hours',
            field=models.PositiveIntegerField(
                default=10,
                help_text='Maximum indirect/asynchronous supervision hours',
                validators=[MinValueValidator(0), MaxValueValidator(100)]
            ),
        ),
        
        # Observational Requirements
        migrations.AddField(
            model_name='systemconfiguration',
            name='required_assessment_observations',
            field=models.PositiveIntegerField(
                default=4,
                help_text='Required number of assessment observations',
                validators=[MinValueValidator(0), MaxValueValidator(20)]
            ),
        ),
        migrations.AddField(
            model_name='systemconfiguration',
            name='required_intervention_observations',
            field=models.PositiveIntegerField(
                default=4,
                help_text='Required number of intervention observations',
                validators=[MinValueValidator(0), MaxValueValidator(20)]
            ),
        ),
        migrations.AddField(
            model_name='systemconfiguration',
            name='total_required_observations',
            field=models.PositiveIntegerField(
                default=8,
                help_text='Total required observations (assessments + interventions)',
                validators=[MinValueValidator(0), MaxValueValidator(40)]
            ),
        ),
        
        # Supervisor Requirements
        migrations.AddField(
            model_name='systemconfiguration',
            name='require_board_approved_supervisor',
            field=models.BooleanField(default=True, help_text='Require supervisor to be Board-approved'),
        ),
        migrations.AddField(
            model_name='systemconfiguration',
            name='allow_secondary_supervisor',
            field=models.BooleanField(default=True, help_text='Allow secondary supervisors'),
        ),
        
        # Cultural Supervision
        migrations.AddField(
            model_name='systemconfiguration',
            name='allow_cultural_supervision',
            field=models.BooleanField(default=True, help_text='Allow culturally-informed supervision for Indigenous trainees'),
        ),
        migrations.AddField(
            model_name='systemconfiguration',
            name='cultural_supervision_counts_toward_minimum',
            field=models.BooleanField(default=True, help_text='Count cultural supervision towards minimum hours requirement'),
        ),
        
        # Timing & Distribution
        migrations.AddField(
            model_name='systemconfiguration',
            name='require_regular_supervision_distribution',
            field=models.BooleanField(default=True, help_text='Require regular distribution of supervision throughout internship'),
        ),
        migrations.AddField(
            model_name='systemconfiguration',
            name='min_weeks_with_supervision',
            field=models.PositiveIntegerField(
                default=48,
                help_text='Minimum number of weeks that must have supervision logged',
                validators=[MinValueValidator(1), MaxValueValidator(104)]
            ),
        ),
        migrations.AddField(
            model_name='systemconfiguration',
            name='supervision_frequency_warning_weeks',
            field=models.PositiveIntegerField(
                default=2,
                help_text='Alert if no supervision logged for this many weeks',
                validators=[MinValueValidator(1), MaxValueValidator(12)]
            ),
        ),
    ]

