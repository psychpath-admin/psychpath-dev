from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('registrar_logbook', '0002_auto_20250930_1526'),
    ]

    operations = [
        # RegistrarPracticeEntry table already exists (created via SQL script)
        # This migration is a no-op to avoid duplicate table creation
    ]
