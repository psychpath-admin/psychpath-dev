#!/bin/bash

# PsychPATH User Data Restoration Script
# This restores user data from SQLite backup to PostgreSQL

echo "🔄 Restoring user data from backup..."

# Extract user data from SQLite backup
echo "📦 Extracting user data from backup..."
gunzip -c backups/psychpath_backup_20251008_212420/database.sql.gz | grep "INSERT INTO auth_user" > /tmp/auth_users.sql

# Convert SQLite format to PostgreSQL format
echo "🔄 Converting SQLite format to PostgreSQL..."
sed -i '' "s/INSERT INTO auth_user VALUES/INSERT INTO auth_user (id, password, last_login, is_superuser, username, last_name, email, is_staff, is_active, date_joined, first_name) VALUES/g" /tmp/auth_users.sql

# Add proper PostgreSQL syntax
sed -i '' "s/datetime/timestamp/g" /tmp/auth_users.sql
sed -i '' "s/bool/boolean/g" /tmp/auth_users.sql

# Clear existing users (except the test user we created)
echo "🧹 Clearing existing users..."
psql -d psychpath -c "DELETE FROM auth_user WHERE username != 'testuser';"

# Restore user data
echo "📥 Restoring user data to PostgreSQL..."
psql -d psychpath -f /tmp/auth_users.sql

# Get user profiles data
echo "📦 Extracting user profile data..."
gunzip -c backups/psychpath_backup_20251008_212420/database.sql.gz | grep "INSERT INTO api_userprofile" > /tmp/user_profiles.sql

# Convert and restore user profiles
if [ -s /tmp/user_profiles.sql ]; then
    echo "🔄 Converting user profile data..."
    sed -i '' "s/INSERT INTO api_userprofile VALUES/INSERT INTO api_userprofile (id, user_id, role, first_name, last_name, ahpra_registration_number, organization, supervisor_emails, signature_url, aope, program_type, provisional_start_date, qualification_level, principal_supervisor_email, secondary_supervisor_email, start_date, state, target_weeks, timezone, weekly_commitment, city, mobile, profile_completed, first_login_completed, supervisor_welcome_seen, supervisor_registration_date, initials_url, prior_hours_processing_completed, prior_hours_approved, prior_hours_approved_at, prior_hours_approved_by_id, prior_hours_notes, identifies_as_indigenous) VALUES/g" /tmp/user_profiles.sql
    
    # Clear existing profiles
    psql -d psychpath -c "DELETE FROM api_userprofile WHERE user_id != (SELECT id FROM auth_user WHERE username = 'testuser');"
    
    # Restore profiles
    echo "📥 Restoring user profiles..."
    psql -d psychpath -f /tmp/user_profiles.sql
fi

# Clean up
rm -f /tmp/auth_users.sql /tmp/user_profiles.sql

echo "✅ User data restoration complete!"
echo "📊 Restored users:"
psql -d psychpath -c "SELECT username, email, first_name, last_name FROM auth_user ORDER BY id;"
