# Generated manually for enhanced review flow - add LogbookReviewRequest model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('logbook_app', '0011_add_review_fields'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
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
    ]
