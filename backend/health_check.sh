#!/bin/bash

# PsychPATH Backend Health Check Script
# This script checks the health of various system components

echo "=== PsychPATH Backend Health Check ==="
echo "Date: $(date)"
echo ""

# Check if virtual environment is activated
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo "❌ Virtual environment not activated"
    echo "Run: source venv/bin/activate"
    exit 1
else
    echo "✅ Virtual environment: $VIRTUAL_ENV"
fi

# Check Python version
PYTHON_VERSION=$(python --version 2>&1)
echo "✅ Python version: $PYTHON_VERSION"

# Check if Django is installed
if python -c "import django" 2>/dev/null; then
    DJANGO_VERSION=$(python -c "import django; print(django.get_version())")
    echo "✅ Django version: $Django_VERSION"
else
    echo "❌ Django not installed"
    exit 1
fi

# Check database connection
echo ""
echo "=== Database Health ==="
if python manage.py shell -c "from django.db import connection; connection.ensure_connection(); print('OK')" 2>/dev/null; then
    echo "✅ Database connection: OK"
else
    echo "❌ Database connection: FAILED"
    echo "Check PostgreSQL is running and database exists"
fi

# Check if server is running
echo ""
echo "=== Server Health ==="
if curl -s http://localhost:8000/api/me/ > /dev/null 2>&1; then
    echo "✅ Backend server: RUNNING"
    RESPONSE=$(curl -s http://localhost:8000/api/me/ | head -c 50)
    echo "   Response: $RESPONSE"
else
    echo "❌ Backend server: NOT RUNNING"
    echo "   Start server: python manage.py runserver 0.0.0.0:8000"
fi

# Check system resources
echo ""
echo "=== System Resources ==="
echo "Memory usage:"
ps aux | grep "manage.py runserver" | grep -v grep || echo "No Django processes found"
echo ""

echo "Disk space:"
df -h . | tail -1
echo ""

# Check for common issues
echo "=== Common Issues Check ==="

# Check for port conflicts
if lsof -i :8000 > /dev/null 2>&1; then
    echo "✅ Port 8000: IN USE"
    lsof -i :8000 | grep -v grep
else
    echo "❌ Port 8000: FREE (server not running)"
fi

# Check for Python path issues
echo ""
echo "=== Python Path ==="
echo "PYTHONPATH: $PYTHONPATH"
echo "Current directory: $(pwd)"

echo ""
echo "=== Health Check Complete ==="
