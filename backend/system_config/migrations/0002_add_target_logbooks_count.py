# Generated manually to add target_logbooks_count field

from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('system_config', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='systemconfiguration',
            name='target_logbooks_count',
            field=models.PositiveIntegerField(
                default=52,
                help_text='Target number of logbooks for trainees to complete',
                validators=[
                    django.core.validators.MinValueValidator(1),
                    django.core.validators.MaxValueValidator(104)
                ]
            ),
        ),
    ]
