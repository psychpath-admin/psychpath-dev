#!/usr/bin/env python
"""
Setup script to ensure consistent test user for development
PostgreSQL ONLY - No SQLite fallback
Run this after any database changes or server restarts
"""

import os
import sys
import django

# Force PostgreSQL usage
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
os.environ['DB_ENGINE'] = 'django.db.backends.postgresql'
os.environ['DB_NAME'] = 'psychpath'
os.environ['DB_USER'] = 'macdemac'
os.environ['DB_PASSWORD'] = ''
os.environ['DB_HOST'] = 'localhost'
os.environ['DB_PORT'] = '5432'

django.setup()

from django.contrib.auth.models import User
from api.models import UserProfile

def setup_test_user():
    """Create or update the test user with consistent credentials"""
    
    # Test user credentials
    email = 'intern4.demo@cymp.com.au'
    password = 'testpass123'
    username = email
    
    # Create or update user
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': username,
            'first_name': 'Charlotte',
            'last_name': 'Gorham Mackie',
            'is_active': True,
            'is_staff': False,
            'is_superuser': False
        }
    )
    
    # Always update password to ensure consistency
    user.set_password(password)
    user.save()
    
    # Create or update profile
    profile, profile_created = UserProfile.objects.get_or_create(
        user=user,
        defaults={
            'role': 'PROVISIONAL',
            'first_name': 'Charlotte',
            'last_name': 'Gorham Mackie',
            'ahpra_registration_number': 'PSY0000000004'
        }
    )
    
    # Update principal supervisor info
    profile.principal_supervisor = 'Brett Mackie'
    profile.principal_supervisor_email = 'supervisor.demo@cymp.com.au'
    profile.save()
    
    print(f"✅ Test user setup complete:")
    print(f"   Email: {email}")
    print(f"   Password: {password}")
    print(f"   Role: {profile.role}")
    print(f"   AHPRA: {profile.ahpra_registration_number}")
    print(f"   Supervisor: {profile.principal_supervisor}")
    
    return user, profile

if __name__ == '__main__':
    setup_test_user()
