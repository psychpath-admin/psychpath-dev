# Generated manually for enhanced review flow - add new fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('logbook_app', '0010_enhance_review_flow'),
    ]

    operations = [
        # Add enhanced review fields to WeeklyLogbook
        migrations.AddField(
            model_name='weeklylogbook',
            name='review_started_at',
            field=models.DateTimeField(blank=True, help_text='When supervisor started reviewing', null=True),
        ),
        migrations.AddField(
            model_name='weeklylogbook',
            name='change_requests_count',
            field=models.PositiveIntegerField(default=0, help_text='Number of change requests made'),
        ),
        migrations.AddField(
            model_name='weeklylogbook',
            name='resubmission_count',
            field=models.PositiveIntegerField(default=0, help_text='Number of times resubmitted'),
        ),
        migrations.AddField(
            model_name='weeklylogbook',
            name='pending_change_requests',
            field=models.JSONField(default=list, help_text='List of pending change request IDs'),
        ),
        
        # Add new status choice
        migrations.AlterField(
            model_name='weeklylogbook',
            name='status',
            field=models.CharField(choices=[
                ('draft', 'Draft'),
                ('submitted', 'Submitted'),
                ('under_review', 'Under Review'),
                ('returned_for_edits', 'Returned for Edits'),
                ('approved', 'Approved'),
                ('rejected', 'Rejected'),
                ('locked', 'Locked'),
            ], default='draft', max_length=20),
        ),
    ]
