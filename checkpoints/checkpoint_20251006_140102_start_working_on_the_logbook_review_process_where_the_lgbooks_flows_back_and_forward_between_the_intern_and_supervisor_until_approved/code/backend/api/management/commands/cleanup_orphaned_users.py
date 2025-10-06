from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import UserProfile, EmailVerificationCode
from django.db import connection
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Clean up orphaned users (users without profiles) from failed verification attempts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Find orphaned users (users without profiles)
        orphaned_users = []
        for user in User.objects.all():
            try:
                profile = user.profile
            except:
                orphaned_users.append(user)

        if not orphaned_users:
            self.stdout.write(
                self.style.SUCCESS('No orphaned users found.')
            )
            return

        self.stdout.write(f'Found {len(orphaned_users)} orphaned users:')
        
        for user in orphaned_users:
            self.stdout.write(f'  - {user.email} (ID: {user.id})')
            
            if not dry_run:
                # Log the cleanup for audit purposes
                logger.warning(f'CLEANUP_ORPHANED_USER: Deleting user {user.email} (ID: {user.id}) - no profile found')
                
                # Delete using raw SQL to avoid cascade issues
                cursor = connection.cursor()
                cursor.execute('DELETE FROM auth_user WHERE id = %s', [user.id])
                
                # Also clean up any unused verification codes for this email
                unused_codes = EmailVerificationCode.objects.filter(email=user.email, is_used=False)
                if unused_codes.exists():
                    self.stdout.write(f'    - Also deleting {unused_codes.count()} unused verification codes')
                    unused_codes.delete()
                
                self.stdout.write(f'    ✅ Deleted {user.email}')

        if dry_run:
            self.stdout.write(
                self.style.WARNING('Dry run completed. Use --dry-run=false to actually delete these users.')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'Cleanup completed. Deleted {len(orphaned_users)} orphaned users.')
            )
