from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import Supervision
from api.email_service import send_supervision_expired_email


class Command(BaseCommand):
    help = 'Clean up expired supervision invitations and send notifications'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()
        
        # Find expired invitations that are still pending
        expired_supervisions = Supervision.objects.filter(
            status='PENDING',
            expires_at__lt=now
        )
        
        count = expired_supervisions.count()
        
        if count == 0:
            self.stdout.write(
                self.style.SUCCESS('No expired supervision invitations found.')
            )
            return
        
        self.stdout.write(f'Found {count} expired supervision invitation(s)')
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN - No changes will be made')
            )
            for supervision in expired_supervisions:
                self.stdout.write(
                    f'  - {supervision.supervisor.profile.first_name} {supervision.supervisor.profile.last_name} → '
                    f'{supervision.supervisee_email} (expired {supervision.expires_at})'
                )
            return
        
        # Update expired invitations
        updated_count = 0
        for supervision in expired_supervisions:
            # Update status to expired
            supervision.status = 'EXPIRED'
            supervision.save()
            
            # Create notification record
            from api.models import SupervisionNotification
            SupervisionNotification.objects.create(
                supervision=supervision,
                notification_type='EXPIRED',
                email_sent=False,  # We'll send email below
                in_app_sent=True
            )
            
            # Send expiration email
            try:
                send_supervision_expired_email(supervision)
                # Update notification to mark email as sent
                supervision.notifications.filter(
                    notification_type='EXPIRED'
                ).update(email_sent=True)
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Failed to send expiration email for supervision {supervision.id}: {e}')
                )
            
            updated_count += 1
            
            self.stdout.write(
                f'  ✓ Marked as expired: {supervision.supervisor.profile.first_name} {supervision.supervisor.profile.last_name} → '
                f'{supervision.supervisee_email}'
            )
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully updated {updated_count} expired supervision invitation(s)')
        )

