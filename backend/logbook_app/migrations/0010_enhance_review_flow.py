# Generated manually for enhanced review flow

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('logbook_app', '0009_remove_commentthread_logbook_and_more'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
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
        
        # Add enhanced review fields
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
        
        # Create LogbookReviewRequest model
        migrations.CreateModel(
            name='LogbookReviewRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('request_type', models.CharField(choices=[
                    ('entry_modification', 'Entry Modification'),
                    ('additional_info', 'Additional Information'),
                    ('clarification', 'Clarification Needed'),
                    ('format_issue', 'Format Issue'),
                    ('completeness', 'Completeness Check'),
                    ('other', 'Other'),
                ], max_length=20)),
                ('title', models.CharField(help_text='Brief title of the change request', max_length=200)),
                ('description', models.TextField(help_text='Detailed description of what needs to be changed')),
                ('target_section', models.CharField(choices=[
                    ('section_a', 'Section A'),
                    ('section_b', 'Section B'),
                    ('section_c', 'Section C'),
                    ('general', 'General'),
                ], default='general', max_length=20)),
                ('target_entry_id', models.CharField(blank=True, help_text='ID of specific entry if applicable', max_length=50)),
                ('status', models.CharField(choices=[
                    ('pending', 'Pending'),
                    ('in_progress', 'In Progress'),
                    ('completed', 'Completed'),
                    ('dismissed', 'Dismissed'),
                ], default='pending', max_length=20)),
                ('priority', models.CharField(choices=[
                    ('low', 'Low'),
                    ('medium', 'Medium'),
                    ('high', 'High'),
                    ('critical', 'Critical'),
                ], default='medium', max_length=10)),
                ('trainee_response', models.TextField(blank=True, help_text="Trainee's response to the change request")),
                ('supervisor_notes', models.TextField(blank=True, help_text='Additional supervisor notes')),
                ('requested_at', models.DateTimeField(auto_now_add=True)),
                ('responded_at', models.DateTimeField(blank=True, null=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('logbook', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='review_requests', to='logbook_app.weeklylogbook')),
                ('requested_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='change_requests_made', to='auth.user')),
            ],
            options={
                'verbose_name': 'Logbook Review Request',
                'verbose_name_plural': 'Logbook Review Requests',
                'ordering': ['-requested_at'],
            },
        ),
        
        # Create Notification model
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('message', models.TextField()),
                ('link', models.URLField(blank=True, help_text='Direct link to related page', null=True)),
                ('read', models.BooleanField(default=False)),
                ('type', models.CharField(choices=[
                    ('logbook_submission', 'Logbook Submission'),
                    ('logbook_approved', 'Logbook Approved'),
                    ('logbook_rejected', 'Logbook Rejected'),
                    ('logbook_returned', 'Logbook Returned for Edits'),
                    ('logbook_changes_requested', 'Logbook Changes Requested'),
                    ('supervision_invite', 'Supervision Invitation'),
                    ('supervision_accepted', 'Supervision Accepted'),
                    ('supervision_rejected', 'Supervision Rejected'),
                    ('system_alert', 'System Alert'),
                ], max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='auth.user')),
            ],
            options={
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['recipient', 'read', '-created_at'], name='logbook_app_recipient_idx'),
                    models.Index(fields=['type'], name='logbook_app_type_idx'),
                ],
            },
        ),
        
        # Add new audit log actions
        migrations.AlterField(
            model_name='logbookauditlog',
            name='action',
            field=models.CharField(choices=[
                ('created', 'Created'),
                ('updated', 'Updated'),
                ('submitted', 'Submitted'),
                ('approved', 'Approved'),
                ('rejected', 'Rejected'),
                ('unlocked', 'Unlocked'),
                ('locked', 'Locked'),
                ('resubmitted', 'Resubmitted'),
                ('review_started', 'Review Started'),
                ('changes_requested', 'Changes Requested'),
                ('message_sent', 'Message Sent'),
                ('entry_edited', 'Entry Edited'),
                ('comment_added', 'Comment Added'),
                ('comment_replied', 'Comment Replied'),
                ('comment_edited', 'Comment Edited'),
                ('comment_deleted', 'Comment Deleted'),
                ('comment_viewed', 'Comment Viewed'),
                ('response_added', 'Response Added'),
                ('unlock_requested', 'Unlock Requested'),
                ('unlock_approved', 'Unlock Approved'),
                ('unlock_denied', 'Unlock Denied'),
                ('unlock_activated', 'Unlock Activated'),
                ('unlock_expired', 'Unlock Expired'),
                ('unlock_force_relocked', 'Unlock Force Re-locked'),
                ('notification_sent', 'Notification Sent'),
            ], max_length=25),
        ),
    ]
