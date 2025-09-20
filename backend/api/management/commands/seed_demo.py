from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import UserProfile, UserRole, Organization, Supervision


class Command(BaseCommand):
    help = "Seed demo users, org, and supervision links"

    def handle(self, *args, **options):
        User = get_user_model()
        org, _ = Organization.objects.get_or_create(name="Demo Clinic")

        def mk(email, role):
            u, created = User.objects.get_or_create(username=email, defaults={"email": email})
            if created:
                u.set_password("password123")
                u.save()
            prof, _ = UserProfile.objects.get_or_create(user=u)
            prof.role = role
            prof.organization = org
            prof.save()
            return u

        supervisor = mk("supervisor@demo.test", UserRole.SUPERVISOR)
        intern = mk("intern@demo.test", UserRole.PROVISIONAL)
        registrar = mk("registrar@demo.test", UserRole.REGISTRAR)
        org_admin = mk("admin@demo.test", UserRole.ORG_ADMIN)

        self.stdout.write(self.style.SUCCESS("Demo users created successfully."))


