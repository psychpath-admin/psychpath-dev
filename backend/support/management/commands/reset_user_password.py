from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist

class Command(BaseCommand):
    help = 'Reset a user password'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, required=True, help='User email')
        parser.add_argument('--password', type=str, required=True, help='New password')

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']

        try:
            user = User.objects.get(email=email)
            user.set_password(password)
            user.save()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully reset password for user: {email}'
                )
            )
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User with email {email} not found')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error resetting password: {str(e)}')
            )
