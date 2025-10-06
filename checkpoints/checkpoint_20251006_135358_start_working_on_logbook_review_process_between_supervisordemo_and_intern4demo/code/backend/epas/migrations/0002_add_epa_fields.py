# Generated manually for EPA field additions

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('epas', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='epa',
            name='milestones',
            field=models.JSONField(default=list, help_text="Milestone levels for this EPA (e.g., ['L1', 'L2', 'L3', 'L4'])"),
        ),
        migrations.AddField(
            model_name='epa',
            name='tag',
            field=models.CharField(max_length=100, help_text="Short logbook label or searchable tag"),
        ),
        migrations.AddField(
            model_name='epa',
            name='m3_behaviours',
            field=models.JSONField(default=list, help_text="Observable competency-aligned behaviours (e.g., ['explain why', 'invite feedback'])"),
        ),
        migrations.AddField(
            model_name='epa',
            name='prompt',
            field=models.TextField(help_text="Reflection prompt for supervisee or self-assessment"),
        ),
    ]
