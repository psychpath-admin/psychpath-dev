# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('section_c', '0005_supervisionentry_week_starting'),
    ]

    operations = [
        migrations.AlterField(
            model_name='supervisionentry',
            name='week_starting',
            field=models.DateField(help_text='Week starting date for grouping'),
        ),
    ]
