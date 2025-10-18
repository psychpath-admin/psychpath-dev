#!/bin/bash

# Simple User Data Restoration using Django
echo "🔄 Restoring user data using Django management commands..."

cd backend

# Create users using Django shell
./venv/bin/python manage.py shell << 'EOF'
from django.contrib.auth.models import User
from api.models import UserProfile

# Clear existing users except testuser
User.objects.exclude(username='testuser').delete()

# Create the demo users from the backup
users_data = [
    {
        'username': 'supervisor@demo.test',
        'email': 'supervisor@demo.test',
        'first_name': '',
        'last_name': '',
        'role': 'SUPERVISOR'
    },
    {
        'username': 'supervisor.demo@cymp.com.au',
        'email': 'supervisor.demo@cymp.com.au',
        'first_name': 'Supervisor',
        'last_name': 'Demo',
        'role': 'SUPERVISOR'
    },
    {
        'username': 'intern@demo.test',
        'email': 'intern@demo.test',
        'first_name': '',
        'last_name': '',
        'role': 'PROVISIONAL'
    },
    {
        'username': 'registrar@demo.test',
        'email': 'registrar@demo.test',
        'first_name': '',
        'last_name': '',
        'role': 'REGISTRAR'
    },
    {
        'username': 'admin@demo.test',
        'email': 'admin@demo.test',
        'first_name': '',
        'last_name': '',
        'role': 'ADMIN'
    },
    {
        'username': 'brett@cymp.com.au',
        'email': 'brett@cymp.com.au',
        'first_name': 'Brett',
        'last_name': 'Smith',
        'role': 'SUPERVISOR'
    },
    {
        'username': 'intern1.demo@cymp.com.au',
        'email': 'intern1.demo@cymp.com.au',
        'first_name': 'Phil',
        'last_name': 'O\'Brien',
        'role': 'PROVISIONAL'
    },
    {
        'username': 'intern2.demo@cymp.com.au',
        'email': 'intern2.demo@cymp.com.au',
        'first_name': 'Intern2',
        'last_name': 'Demo',
        'role': 'PROVISIONAL'
    },
    {
        'username': 'intern3.demo@cymp.com.au',
        'email': 'intern3.demo@cymp.com.au',
        'first_name': 'Intern3',
        'last_name': 'Demo',
        'role': 'PROVISIONAL'
    },
    {
        'username': 'registrar1.demo@cymp.com.au',
        'email': 'registrar1.demo@cymp.com.au',
        'first_name': 'Registrar1',
        'last_name': 'Demo',
        'role': 'REGISTRAR'
    },
    {
        'username': 'supervisor1.demo@cymp.com.au',
        'email': 'supervisor1.demo@cymp.com.au',
        'first_name': 'Supervisor1',
        'last_name': 'Demo',
        'role': 'SUPERVISOR'
    },
    {
        'username': 'registrar2.demo@cymp.com.au',
        'email': 'registrar2.demo@cymp.com.au',
        'first_name': 'Registrar2',
        'last_name': 'Demo',
        'role': 'REGISTRAR'
    },
    {
        'username': 'principal.supervisor@cymp.com.au',
        'email': 'principal.supervisor@cymp.com.au',
        'first_name': 'Principal',
        'last_name': 'Supervisor',
        'role': 'SUPERVISOR'
    },
    {
        'username': 'secondary.supervisor@cymp.com.au',
        'email': 'secondary.supervisor@cymp.com.au',
        'first_name': 'Secondary',
        'last_name': 'Supervisor',
        'role': 'SUPERVISOR'
    },
    {
        'username': 'other.supervisor@cymp.com.au',
        'email': 'other.supervisor@cymp.com.au',
        'first_name': 'Other',
        'last_name': 'Supervisor',
        'role': 'SUPERVISOR'
    },
    {
        'username': 'testregistrar@cymp.com.au',
        'email': 'testregistrar@cymp.com.au',
        'first_name': 'Test',
        'last_name': 'Registrar',
        'role': 'REGISTRAR'
    },
    {
        'username': 'intern4.demo@cymp.com.au',
        'email': 'intern4.demo@cymp.com.au',
        'first_name': 'Intern4',
        'last_name': 'Demo',
        'role': 'PROVISIONAL'
    },
    {
        'username': 'intern5.demo@cymp.com.au',
        'email': 'intern5.demo@cymp.com.au',
        'first_name': 'Intern5',
        'last_name': 'Demo',
        'role': 'PROVISIONAL'
    }
]

# Create users
for user_data in users_data:
    user, created = User.objects.get_or_create(
        username=user_data['username'],
        defaults={
            'email': user_data['email'],
            'first_name': user_data['first_name'],
            'last_name': user_data['last_name'],
            'is_active': True
        }
    )
    
    if created:
        # Set a default password for all users
        user.set_password('demo123')
        user.save()
        
        # Create user profile
        UserProfile.objects.create(
            user=user,
            role=user_data['role'],
            first_name=user_data['first_name'],
            last_name=user_data['last_name'],
            email=user_data['email']
        )
        print(f"Created user: {user_data['username']}")
    else:
        print(f"User already exists: {user_data['username']}")

print(f"\nTotal users: {User.objects.count()}")
print("✅ User restoration complete!")
EOF

echo "📊 Restored users:"
./venv/bin/python manage.py shell -c "
from django.contrib.auth.models import User
from api.models import UserProfile
users = User.objects.all().order_by('id')
for user in users:
    try:
        profile = user.userprofile
        print(f'{user.username} | {user.email} | {profile.role} | {user.first_name} {user.last_name}')
    except:
        print(f'{user.username} | {user.email} | No Profile | {user.first_name} {user.last_name}')
"
