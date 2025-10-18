#!/usr/bin/env python3

import json
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.contrib.auth.models import User
from api.models import UserProfile

def restore_users_from_json():
    """Restore users from the JSON backup file"""
    
    # Read the JSON backup file
    backup_file = os.path.join(os.path.dirname(__file__), '..', 'backups', 'database_backup_20251008_133327.json')
    
    print(f"🔄 Reading backup file: {backup_file}")
    
    try:
        with open(backup_file, 'r') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ JSON decode error: {e}")
        return False
    
    # Clear existing users except testuser
    print("🧹 Clearing existing users...")
    User.objects.exclude(username='testuser').delete()
    
    # Extract and restore users
    restored_count = 0
    for item in data:
        if item.get('model') == 'auth.user':
            fields = item.get('fields', {})
            
            username = fields.get('username')
            if not username:
                continue
                
            # Create user
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': fields.get('email', ''),
                    'first_name': fields.get('first_name', ''),
                    'last_name': fields.get('last_name', ''),
                    'is_active': fields.get('is_active', True),
                    'is_staff': fields.get('is_staff', False),
                    'is_superuser': fields.get('is_superuser', False),
                    'date_joined': fields.get('date_joined', '2025-01-01T00:00:00Z')
                }
            )
            
            if created:
                # Set the original password hash
                user.password = fields.get('password', '')
                user.save()
                
                # Set last login if available
                if fields.get('last_login'):
                    user.last_login = fields.get('last_login')
                    user.save()
                
                print(f"✅ Restored user: {username}")
                restored_count += 1
            else:
                print(f"⚠️  User already exists: {username}")
    
    print(f"\n📊 Summary:")
    print(f"   Restored: {restored_count} users")
    print(f"   Total users: {User.objects.count()}")
    
    return True

if __name__ == '__main__':
    print("🔄 Restoring users from JSON backup...")
    success = restore_users_from_json()
    
    if success:
        print("✅ User restoration complete!")
        
        # Show all users
        print("\n📊 All users in database:")
        for user in User.objects.all().order_by('id'):
            print(f"   {user.username} | {user.email} | {user.first_name} {user.last_name}")
    else:
        print("❌ User restoration failed!")
        sys.exit(1)
