"""
Management command to process supervision invitations
- Mark expired invitations as expired
- Send reminder emails for invitations approaching expiry
- Send expired notification emails to supervisors
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from api.models import Supervision, SupervisionNotification
from api.email_service import send_supervision_reminder_email, send_supervision_expired_email
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Process supervision invitations - handle expiry and send reminders'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without actually doing it',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        # Process expired invitations
        self.process_expired_invitations(now, dry_run)
        
        # Send reminder emails for invitations approaching expiry
        self.send_reminder_emails(now, dry_run)
        
        self.stdout.write(self.style.SUCCESS('Supervision invitation processing completed'))

    def process_expired_invitations(self, now, dry_run):
        """Mark expired invitations as expired and notify supervisors"""
        expired_invitations = Supervision.objects.filter(
            status='PENDING',
            expires_at__lt=now
        )
        
        count = expired_invitations.count()
        self.stdout.write(f'Found {count} expired invitations')
        
        for invitation in expired_invitations:
            if not dry_run:
                # Mark as expired
                invitation.status = 'EXPIRED'
                invitation.save()
                
                # Create notification record
                SupervisionNotification.objects.create(
                    supervision=invitation,
                    notification_type='EXPIRED',
                    email_sent=True,
                    in_app_sent=True
                )
                
                # Send expired email to supervisor
                send_supervision_expired_email(invitation)
                
                self.stdout.write(f'Marked invitation {invitation.id} as expired')
            else:
                self.stdout.write(f'Would mark invitation {invitation.id} as expired')

    def send_reminder_emails(self, now, dry_run):
        """Send reminder emails for invitations approaching expiry (3 days before)"""
        reminder_date = now + timedelta(days=3)
        
        # Find invitations that expire in 3 days and haven't had a reminder sent
        invitations_needing_reminder = Supervision.objects.filter(
            status='PENDING',
            expires_at__date=reminder_date.date(),
            notifications__notification_type='REMINDER_SENT'
        ).exclude(
            id__in=SupervisionNotification.objects.filter(
                notification_type='REMINDER_SENT'
            ).values_list('supervision_id', flat=True)
        )
        
        count = invitations_needing_reminder.count()
        self.stdout.write(f'Found {count} invitations needing reminder emails')
        
        for invitation in invitations_needing_reminder:
            if not dry_run:
                # Send reminder email
                send_supervision_reminder_email(invitation)
                
                # Create notification record
                SupervisionNotification.objects.create(
                    supervision=invitation,
                    notification_type='REMINDER_SENT',
                    email_sent=True,
                    in_app_sent=True
                )
                
                self.stdout.write(f'Sent reminder for invitation {invitation.id}')
            else:
                self.stdout.write(f'Would send reminder for invitation {invitation.id}')

