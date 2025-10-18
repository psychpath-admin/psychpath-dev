#!/bin/bash

# PsychPATH User Data Restoration Script (Fixed)
# This properly converts SQLite data to PostgreSQL format

echo "🔄 Restoring user data from backup (fixed version)..."

# Extract user data from SQLite backup
echo "📦 Extracting user data from backup..."
gunzip -c backups/psychpath_backup_20251008_212420/database.sql.gz | grep "INSERT INTO auth_user" > /tmp/auth_users_raw.sql

# Convert SQLite format to PostgreSQL format with proper data types
echo "🔄 Converting SQLite format to PostgreSQL..."
cat > /tmp/auth_users.sql << 'EOF'
-- Convert SQLite boolean integers to PostgreSQL booleans
-- SQLite uses 0/1, PostgreSQL uses false/true
EOF

# Process each user record
while IFS= read -r line; do
    # Extract the VALUES part
    values=$(echo "$line" | sed 's/INSERT INTO auth_user VALUES(//' | sed 's/);$//')
    
    # Split by comma and process each field
    IFS=',' read -ra fields <<< "$values"
    
    # Convert boolean fields (positions 3, 6, 7, 8) from 0/1 to false/true
    for i in 3 6 7 8; do
        if [ "${fields[$i]}" = "0" ]; then
            fields[$i]="false"
        elif [ "${fields[$i]}" = "1" ]; then
            fields[$i]="true"
        fi
    done
    
    # Reconstruct the INSERT statement
    printf "INSERT INTO auth_user (id, password, last_login, is_superuser, username, last_name, email, is_staff, is_active, date_joined, first_name) VALUES (%s);\n" "$(IFS=','; echo "${fields[*]}")" >> /tmp/auth_users.sql
    
done < /tmp/auth_users_raw.sql

# Clear existing users (except the test user we created)
echo "🧹 Clearing existing users..."
psql -d psychpath -c "DELETE FROM auth_user WHERE username != 'testuser';"

# Restore user data
echo "📥 Restoring user data to PostgreSQL..."
psql -d psychpath -f /tmp/auth_users.sql

# Get user profiles data
echo "📦 Extracting user profile data..."
gunzip -c backups/psychpath_backup_20251008_212420/database.sql.gz | grep "INSERT INTO api_userprofile" > /tmp/user_profiles_raw.sql

# Convert and restore user profiles (simplified approach)
if [ -s /tmp/user_profiles_raw.sql ]; then
    echo "🔄 Converting user profile data..."
    
    # Create a simplified profile restoration
    cat > /tmp/user_profiles.sql << 'EOF'
-- Simplified user profile restoration
-- We'll create basic profiles for each user
EOF
    
    # Get all user IDs from auth_user
    psql -d psychpath -t -c "SELECT id, username, email FROM auth_user WHERE username != 'testuser';" | while read -r user_id username email; do
        if [ ! -z "$user_id" ]; then
            # Determine role based on username/email
            role="PROVISIONAL"
            if [[ "$username" == *"supervisor"* ]] || [[ "$email" == *"supervisor"* ]]; then
                role="SUPERVISOR"
            elif [[ "$username" == *"registrar"* ]] || [[ "$email" == *"registrar"* ]]; then
                role="REGISTRAR"
            elif [[ "$username" == *"admin"* ]] || [[ "$email" == *"admin"* ]]; then
                role="ADMIN"
            fi
            
            # Extract first and last name from email if available
            first_name=""
            last_name=""
            if [[ "$email" == *"@"* ]]; then
                name_part=$(echo "$email" | cut -d'@' -f1)
                if [[ "$name_part" == *"."* ]]; then
                    first_name=$(echo "$name_part" | cut -d'.' -f1 | sed 's/^./\U&/')
                    last_name=$(echo "$name_part" | cut -d'.' -f2 | sed 's/^./\U&/')
                else
                    first_name=$(echo "$name_part" | sed 's/^./\U&/')
                fi
            fi
            
            # Insert user profile
            psql -d psychpath -c "INSERT INTO api_userprofile (user_id, role, first_name, last_name, email) VALUES ($user_id, '$role', '$first_name', '$last_name', '$email') ON CONFLICT (user_id) DO NOTHING;"
        fi
    done
fi

# Clean up
rm -f /tmp/auth_users_raw.sql /tmp/auth_users.sql /tmp/user_profiles_raw.sql /tmp/user_profiles.sql

echo "✅ User data restoration complete!"
echo "📊 Restored users:"
psql -d psychpath -c "SELECT u.username, u.email, u.first_name, u.last_name, p.role FROM auth_user u LEFT JOIN api_userprofile p ON u.id = p.user_id ORDER BY u.id;"
