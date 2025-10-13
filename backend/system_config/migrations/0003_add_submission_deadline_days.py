# Generated manually to add submission_deadline_days field

from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('system_config', '0002_add_target_logbooks_count'),
    ]

    operations = [
        migrations.AddField(
            model_name='systemconfiguration',
            name='submission_deadline_days',
            field=models.PositiveIntegerField(
                default=14,
                help_text='Number of days after week start date when logbook submission becomes overdue',
                validators=[
                    django.core.validators.MinValueValidator(1),
                    django.core.validators.MaxValueValidator(30)
                ]
            ),
        ),
    ]
