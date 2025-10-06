#!/bin/bash

# Production Deployment Script for PsychPATH
# This script sets up the production environment with PostgreSQL

set -e  # Exit on any error

echo "🚀 Starting PsychPATH Production Deployment..."

# Check if required environment variables are set
required_vars=("DB_NAME" "DB_USER" "DB_PASSWORD" "DB_HOST" "DB_PORT")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: Environment variable $var is not set"
        echo "Please set the following environment variables:"
        echo "  export DB_NAME=psychpath_prod"
        echo "  export DB_USER=psychpath_user"
        echo "  export DB_PASSWORD=secure_password"
        echo "  export DB_HOST=your-postgres-host"
        echo "  export DB_PORT=5432"
        exit 1
    fi
done

# Ensure we're using PostgreSQL (not SQLite)
unset USE_SQLITE

echo "📋 Environment Configuration:"
echo "  Database: PostgreSQL"
echo "  Host: $DB_HOST:$DB_PORT"
echo "  Database Name: $DB_NAME"
echo "  User: $DB_USER"

# Change to backend directory
cd backend

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Run database migrations
echo "🗄️  Running database migrations..."
python manage.py migrate

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

# Verify database connection and schema
echo "✅ Verifying database setup..."
python manage.py shell -c "
from django.conf import settings
from django.db import connection
print(f'Database engine: {settings.DATABASES[\"default\"][\"ENGINE\"]}')
print(f'Database name: {settings.DATABASES[\"default\"][\"NAME\"]}')

# Test Section C model
from section_c.models import SupervisionEntry
print(f'Section C entries count: {SupervisionEntry.objects.count()}')

# Verify week_starting field exists
cursor = connection.cursor()
cursor.execute(\"SELECT column_name FROM information_schema.columns WHERE table_name = 'section_c_supervisionentry' AND column_name = 'week_starting'\")
result = cursor.fetchone()
if result:
    print('✅ week_starting field exists in Section C table')
else:
    print('❌ week_starting field missing in Section C table')
"

# Create superuser (optional)
echo "👤 Do you want to create a superuser? (y/n)"
read -r create_superuser
if [ "$create_superuser" = "y" ] || [ "$create_superuser" = "Y" ]; then
    python manage.py createsuperuser
fi

echo "🎉 Production deployment completed successfully!"
echo ""
echo "Next steps:"
echo "1. Start the production server: python manage.py runserver 0.0.0.0:8000"
echo "2. Or use a production WSGI server like Gunicorn"
echo "3. Configure your web server (nginx/apache) to proxy to the Django app"
echo "4. Test the API endpoints to ensure everything works correctly"
