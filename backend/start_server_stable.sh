#!/bin/bash

# PsychPATH Stable Backend Server
# This script starts the Django server with proper error handling and no model reloading issues

echo "🚀 Starting PsychPATH Backend Server (Stable Mode)..."

# Kill any existing processes
pkill -f "manage.py runserver" 2>/dev/null || true
sleep 2

# Set environment variables for stability
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
export DJANGO_SETTINGS_MODULE="config.settings"
export PYTHONDONTWRITEBYTECODE=1
export PYTHONUNBUFFERED=1

# Activate virtual environment
source venv/bin/activate

# Check for any pending migrations
echo "📋 Checking for pending migrations..."
python manage.py migrate --check > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  Running pending migrations..."
    python manage.py migrate
fi

# Clear any cached files
echo "🧹 Clearing cache..."
python manage.py clear_cache 2>/dev/null || true

# Start the server with proper settings
echo "🎯 Starting Django server..."
python manage.py runserver 0.0.0.0:8000 \
    --verbosity=1 \
    --noreload \
    --insecure \
    > runserver_stable.log 2>&1 &

SERVER_PID=$!
echo "✅ Server started with PID: $SERVER_PID"

# Wait for server to start
sleep 3

# Test server health
echo "🔍 Testing server health..."
if curl -s http://localhost:8000/api/me/ > /dev/null 2>&1; then
    echo "✅ Server is responding correctly"
    echo "📊 Server logs: tail -f runserver_stable.log"
    echo "🛑 To stop: kill $SERVER_PID"
else
    echo "❌ Server failed to start properly"
    echo "📋 Check logs: tail -f runserver_stable.log"
    exit 1
fi

echo "🎉 PsychPATH Backend Server is ready!"
echo "🌐 API available at: http://localhost:8000/api/"
