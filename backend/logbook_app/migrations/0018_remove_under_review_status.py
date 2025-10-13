# Generated manually to remove under_review status

from django.db import migrations


def migrate_under_review_to_submitted(apps, schema_editor):
    """Convert any existing 'under_review' logbooks to 'submitted'"""
    WeeklyLogbook = apps.get_model('logbook_app', 'WeeklyLogbook')
    updated_count = WeeklyLogbook.objects.filter(status='under_review').update(status='submitted')
    if updated_count > 0:
        print(f"Migrated {updated_count} logbooks from 'under_review' to 'submitted' status")


def reverse_migration(apps, schema_editor):
    """Reverse migration - this is not reversible as we don't know which logbooks were under_review"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('logbook_app', '0017_add_unlocked_for_edits_status'),
    ]

    operations = [
        migrations.RunPython(
            migrate_under_review_to_submitted,
            reverse_migration,
        ),
    ]
