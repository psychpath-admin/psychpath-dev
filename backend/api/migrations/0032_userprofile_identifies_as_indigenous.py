# Generated migration for AHPRA supervision requirements

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0031_supporterrorlog'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='identifies_as_indigenous',
            field=models.BooleanField(default=False, help_text='Identifies as Aboriginal and/or Torres Strait Islander Australian'),
        ),
    ]

