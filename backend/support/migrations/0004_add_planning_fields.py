# Generated manually for planning fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('support', '0003_add_ticket_type_and_metadata'),
    ]

    operations = [
        migrations.AddField(
            model_name='supportticket',
            name='stage',
            field=models.CharField(choices=[('IDEA', 'Idea'), ('PLANNED', 'Planned'), ('IN_DEVELOPMENT', 'In Development'), ('TESTING', 'Testing'), ('DEPLOYED', 'Deployed'), ('ARCHIVED', 'Archived')], default='IDEA', max_length=20, blank=True),
        ),
        migrations.AddField(
            model_name='supportticket',
            name='effort_estimate',
            field=models.CharField(blank=True, choices=[('XS', 'Extra Small (1-2 hours)'), ('S', 'Small (3-8 hours)'), ('M', 'Medium (1-3 days)'), ('L', 'Large (1-2 weeks)'), ('XL', 'Extra Large (2+ weeks)')], max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='supportticket',
            name='business_value',
            field=models.CharField(choices=[('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'), ('CRITICAL', 'Critical')], default='MEDIUM', max_length=20, blank=True),
        ),
        migrations.AddField(
            model_name='supportticket',
            name='implementation_notes',
            field=models.TextField(blank=True, help_text='Technical approach, considerations, dependencies'),
        ),
        migrations.AddField(
            model_name='supportticket',
            name='user_story',
            field=models.TextField(blank=True, help_text='As a [user], I want [goal], so that [benefit]'),
        ),
        migrations.AddField(
            model_name='supportticket',
            name='acceptance_criteria',
            field=models.JSONField(blank=True, default=list, help_text='List of acceptance criteria'),
        ),
        migrations.AddField(
            model_name='supportticket',
            name='test_plan',
            field=models.JSONField(blank=True, default=dict, help_text='{\n  "preconditions": "",\n  "test_cases": [\n    {\n      "description": "",\n      "steps": [],\n      "expected_result": "",\n      "actual_result": "",\n      "status": "NOT_TESTED|PASSED|FAILED"\n    }\n  ]\n}'),
        ),
        migrations.AddField(
            model_name='supportticket',
            name='target_milestone',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='supportticket',
            name='completed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='supportticket',
            name='related_tickets',
            field=models.ManyToManyField(blank=True, related_name='related_supporttickets', to='support.supportticket'),
        ),
        migrations.AddIndex(
            model_name='supportticket',
            index=models.Index(fields=['stage', 'business_value'], name='support_sup_stage_1d2e9f_idx'),
        ),
        migrations.AddIndex(
            model_name='supportticket',
            index=models.Index(fields=['ticket_type', 'stage'], name='support_sup_ticket__2b5a0a_idx'),
        ),
        migrations.AddIndex(
            model_name='supportticket',
            index=models.Index(fields=['target_milestone'], name='support_sup_target__d9b61b_idx'),
        ),
    ]
