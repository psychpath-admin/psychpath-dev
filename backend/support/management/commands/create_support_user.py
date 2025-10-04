from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from support.models import SupportUser

class Command(BaseCommand):
    help = 'Create a support user account'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, required=True, help='Support user email')
        parser.add_argument('--password', type=str, required=True, help='Support user password')
        parser.add_argument('--first-name', type=str, default='Support', help='First name')
        parser.add_argument('--last-name', type=str, default='User', help='Last name')
        parser.add_argument('--level', type=str, choices=['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'ADMIN'], 
                          default='LEVEL_2', help='Support level')
        parser.add_argument('--admin', action='store_true', help='Make user a Django admin')

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        first_name = options['first_name']
        last_name = options['last_name']
        level = options['level']
        is_admin = options['admin']

        # Create or get user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'first_name': first_name,
                'last_name': last_name,
                'is_active': True,
                'is_staff': is_admin,
                'is_superuser': is_admin
            }
        )

        if not created:
            self.stdout.write(f"User {email} already exists. Updating...")
            user.first_name = first_name
            user.last_name = last_name
            user.is_staff = is_admin
            user.is_superuser = is_admin
            user.save()

        # Set password
        user.set_password(password)
        user.save()

        # Create support profile
        support_user, created = SupportUser.objects.get_or_create(
            user=user,
            defaults={
                'support_level': level,
                'can_view_logs': True,
                'can_view_user_data': True,
                'can_manage_users': level in ['LEVEL_3', 'ADMIN'],
                'can_access_chat': True,
                'is_active': True
            }
        )

        if not created:
            support_user.support_level = level
            support_user.can_manage_users = level in ['LEVEL_3', 'ADMIN']
            support_user.save()

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created support user: {email} (Level: {level})'
            )
        )
        self.stdout.write(f'Login at: http://localhost:8000/support/')
        self.stdout.write(f'Email: {email}')
        self.stdout.write(f'Password: {password}')




