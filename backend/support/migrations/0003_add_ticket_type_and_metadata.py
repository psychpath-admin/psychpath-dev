# Generated manually for ticket type and metadata fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('support', '0002_add_chat_models'),
    ]

    operations = [
        migrations.AddField(
            model_name='supportticket',
            name='ticket_type',
            field=models.CharField(choices=[('BUG', 'Bug'), ('FEATURE', 'Feature'), ('TASK', 'Task'), ('QUESTION', 'Question')], default='QUESTION', max_length=10),
        ),
        migrations.AddField(
            model_name='supportticket',
            name='current_url',
            field=models.URLField(blank=True, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='supportticket',
            name='browser_info',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AddField(
            model_name='supportticket',
            name='user_agent',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='supportticket',
            name='app_version',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AlterField(
            model_name='supportticket',
            name='priority',
            field=models.CharField(choices=[('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'), ('CRITICAL', 'Critical')], default='MEDIUM', max_length=10),
        ),
    ]
