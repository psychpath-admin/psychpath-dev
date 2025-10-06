# Generated manually to fix database schema issues

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('logbook_app', '0012_add_review_request_model'),
    ]

    operations = [
        migrations.AddField(
            model_name='weeklylogbook',
            name='review_started_at',
            field=models.DateTimeField(null=True, blank=True, help_text="When supervisor started reviewing"),
        ),
        migrations.AddField(
            model_name='weeklylogbook',
            name='change_requests_count',
            field=models.PositiveIntegerField(default=0, help_text="Number of change requests made"),
        ),
        migrations.AddField(
            model_name='weeklylogbook',
            name='resubmission_count',
            field=models.PositiveIntegerField(default=0, help_text="Number of times resubmitted"),
        ),
        migrations.AddField(
            model_name='weeklylogbook',
            name='pending_change_requests',
            field=models.JSONField(default=list, help_text="List of pending change request IDs"),
        ),
    ]
