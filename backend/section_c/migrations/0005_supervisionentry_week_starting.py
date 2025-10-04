# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('section_c', '0004_remove_supervisionentry_locked_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='supervisionentry',
            name='week_starting',
            field=models.DateField(help_text='Week starting date for grouping', null=True, blank=True),
        ),
    ]
