#!/bin/bash

# PsychPATH Database Setup Script
# This ensures the database is properly configured and persistent

echo "🔧 Setting up PsychPATH database..."

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL is not running. Starting it..."
    brew services start postgresql@15
    sleep 5
    # Verify it's running
    if ! pg_isready -q; then
        echo "❌ Failed to start PostgreSQL. Please check your installation."
        exit 1
    fi
fi

# Check if psychpath role exists
if ! psql -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='psychpath';" | grep -q 1; then
    echo "📝 Creating psychpath database role..."
    psql -d postgres -c "CREATE ROLE psychpath WITH LOGIN PASSWORD 'psychpath';"
    if [ $? -eq 0 ]; then
        echo "✅ psychpath role created successfully"
    else
        echo "❌ Failed to create psychpath role"
        exit 1
    fi
else
    echo "✅ psychpath role already exists"
fi

# Check if psychpath database exists
if ! psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='psychpath';" | grep -q 1; then
    echo "📝 Creating psychpath database..."
    psql -d postgres -c "CREATE DATABASE psychpath OWNER psychpath;"
    if [ $? -eq 0 ]; then
        echo "✅ psychpath database created successfully"
    else
        echo "❌ Failed to create psychpath database"
        exit 1
    fi
else
    echo "✅ psychpath database already exists"
fi

# Verify database connection
echo "🔍 Verifying database connection..."
if psql -d psychpath -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database connection verified"
else
    echo "❌ Cannot connect to psychpath database"
    exit 1
fi

# Run migrations
echo "🔄 Running database migrations..."
cd "$(dirname "$0")/../backend"
./venv/bin/python manage.py migrate

if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully"
else
    echo "❌ Migration failed"
    exit 1
fi

# Check if we have users
USER_COUNT=$(psql -d psychpath -tAc "SELECT COUNT(*) FROM auth_user;")
echo "📊 Current users in database: $USER_COUNT"

echo "✅ Database setup complete!"
echo "🎉 Your data will persist across restarts"
echo "💾 Database location: /opt/homebrew/var/postgresql@15/"
echo "🔧 To manually run this setup: make db-setup"
