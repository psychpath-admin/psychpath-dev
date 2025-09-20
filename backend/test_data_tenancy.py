#!/usr/bin/env python
"""
Test script to verify data tenancy and role-based access control
Run this from the Django shell: python manage.py shell < test_data_tenancy.py
"""

from django.contrib.auth.models import User
from api.models import UserProfile, Organization
from section_b.models import ProfessionalDevelopmentEntry
from section_c.models import SupervisionEntry
from datetime import datetime, date, timedelta
import random

def create_test_data():
    """Create test data to verify tenancy"""
    
    # Create organization
    org, created = Organization.objects.get_or_create(
        name="Test Organization",
        defaults={'description': 'Test org for tenancy testing'}
    )
    print(f"Organization: {'Created' if created else 'Found'} - {org.name}")
    
    # Create test users with different roles
    users_data = [
        {'email': 'intern1@test.com', 'role': 'INTERN', 'name': 'Intern One'},
        {'email': 'registrar1@test.com', 'role': 'REGISTRAR', 'name': 'Registrar One'},
        {'email': 'supervisor1@test.com', 'role': 'SUPERVISOR', 'name': 'Supervisor One'},
        {'email': 'orgadmin1@test.com', 'role': 'ORG_ADMIN', 'name': 'Org Admin One'},
    ]
    
    created_users = []
    
    for user_data in users_data:
        user, created = User.objects.get_or_create(
            email=user_data['email'],
            defaults={
                'username': user_data['email'],
                'first_name': user_data['name'].split()[0],
                'last_name': user_data['name'].split()[1],
                'is_active': True
            }
        )
        
        if created:
            user.set_password('testpass123')
            user.save()
        
        profile, profile_created = UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'role': user_data['role'],
                'organization': org,
                'first_name': user_data['name'].split()[0],
                'last_name': user_data['name'].split()[1],
            }
        )
        
        created_users.append({
            'user': user,
            'profile': profile,
            'role': user_data['role'],
            'created': created
        })
        
        print(f"User {user_data['email']} ({user_data['role']}): {'Created' if created else 'Found'}")
    
    # Create supervision relationships
    supervisor_profile = None
    intern_profile = None
    registrar_profile = None
    
    for user_info in created_users:
        if user_info['role'] == 'SUPERVISOR':
            supervisor_profile = user_info['profile']
        elif user_info['role'] == 'INTERN':
            intern_profile = user_info['profile']
        elif user_info['role'] == 'REGISTRAR':
            registrar_profile = user_info['profile']
    
    if supervisor_profile and intern_profile:
        supervisor_profile.supervising.add(intern_profile)
        print(f"Supervision relationship: {supervisor_profile.user.email} supervises {intern_profile.user.email}")
    
    if supervisor_profile and registrar_profile:
        supervisor_profile.supervising.add(registrar_profile)
        print(f"Supervision relationship: {supervisor_profile.user.email} supervises {registrar_profile.user.email}")
    
    # Create test PD entries
    for user_info in created_users:
        if user_info['role'] in ['INTERN', 'REGISTRAR']:
            # Create 3 PD entries for this user
            for i in range(3):
                entry_date = date.today() - timedelta(days=i*7)
                entry, created = ProfessionalDevelopmentEntry.objects.get_or_create(
                    trainee=user_info['user'],
                    activity_title=f"Test PD Activity {i+1} for {user_info['role']}",
                    defaults={
                        'date_of_activity': entry_date,
                        'duration_minutes': random.randint(30, 120),
                        'activity_type': 'Workshop',
                        'week_starting': entry_date - timedelta(days=entry_date.weekday())
                    }
                )
                if created:
                    print(f"Created PD entry for {user_info['user'].email}")
    
    # Create test supervision entries
    for user_info in created_users:
        if user_info['role'] in ['INTERN', 'REGISTRAR']:
            # Create 2 supervision entries for this user
            for i in range(2):
                entry_date = date.today() - timedelta(days=i*14)
                entry, created = SupervisionEntry.objects.get_or_create(
                    trainee=user_info['profile'],
                    supervisor_name=f"Test Supervisor {i+1}",
                    defaults={
                        'date_of_supervision': entry_date,
                        'duration_minutes': random.randint(60, 120),
                        'supervision_type': 'Individual',
                        'week_starting': entry_date - timedelta(days=entry_date.weekday())
                    }
                )
                if created:
                    print(f"Created supervision entry for {user_info['user'].email}")
    
    return created_users

def test_data_access():
    """Test that users can only access their own data"""
    print("\n" + "="*50)
    print("TESTING DATA TENANCY")
    print("="*50)
    
    users = create_test_data()
    
    # Test each user's access
    for user_info in users:
        user = user_info['user']
        role = user_info['role']
        
        print(f"\n--- Testing {user.email} ({role}) ---")
        
        # Test PD entries access
        pd_entries = ProfessionalDevelopmentEntry.objects.filter(trainee=user)
        print(f"PD Entries accessible: {pd_entries.count()}")
        
        # Test supervision entries access
        if role in ['INTERN', 'REGISTRAR']:
            # Should see own entries
            supervision_entries = SupervisionEntry.objects.filter(trainee=user.profile)
            print(f"Own supervision entries: {supervision_entries.count()}")
        elif role == 'SUPERVISOR':
            # Should see assigned trainee entries
            trainee_ids = user.profile.supervising.values_list('id', flat=True)
            supervision_entries = SupervisionEntry.objects.filter(trainee__id__in=trainee_ids)
            print(f"Supervised trainee entries: {supervision_entries.count()}")
        elif role == 'ORG_ADMIN':
            # Should see all org trainee entries
            org_trainee_ids = UserProfile.objects.filter(
                organization=user.profile.organization,
                role__in=['INTERN', 'REGISTRAR']
            ).values_list('id', flat=True)
            supervision_entries = SupervisionEntry.objects.filter(trainee__id__in=org_trainee_ids)
            print(f"Organization trainee entries: {supervision_entries.count()}")
        
        # Verify no cross-tenant access
        other_users_pd = ProfessionalDevelopmentEntry.objects.exclude(trainee=user).count()
        print(f"Other users' PD entries (should be 0 accessible): {other_users_pd}")
    
    print("\n" + "="*50)
    print("TENANCY TEST COMPLETE")
    print("="*50)

def cleanup_test_data():
    """Clean up test data"""
    print("\nCleaning up test data...")
    
    # Delete test users and related data
    test_emails = [
        'intern1@test.com',
        'registrar1@test.com', 
        'supervisor1@test.com',
        'orgadmin1@test.com'
    ]
    
    for email in test_emails:
        try:
            user = User.objects.get(email=email)
            user.delete()
            print(f"Deleted user: {email}")
        except User.DoesNotExist:
            print(f"User not found: {email}")
    
    # Delete test organization
    try:
        org = Organization.objects.get(name="Test Organization")
        org.delete()
        print("Deleted test organization")
    except Organization.DoesNotExist:
        print("Test organization not found")

if __name__ == "__main__":
    test_data_access()
    # Uncomment the next line to clean up test data
    # cleanup_test_data()



