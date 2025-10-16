# Generated manually for context_data field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('support', '0004_add_planning_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='supportticket',
            name='context_data',
            field=models.JSONField(blank=True, default=dict, help_text='Technical context, form data, console errors, etc.'),
        ),
    ]
