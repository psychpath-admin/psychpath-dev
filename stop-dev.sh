#!/bin/bash

# PsychPATH Development Server Stop Script

echo "🛑 Stopping PsychPATH development servers..."

# Kill Vite processes
pkill -9 -f vite 2>/dev/null && echo "✓ Stopped frontend (Vite)" || echo "  (No Vite processes found)"

# Kill Django runserver
pkill -9 -f "manage.py runserver" 2>/dev/null && echo "✓ Stopped backend (Django)" || echo "  (No Django processes found)"

# Kill processes on specific ports as backup
lsof -ti:5173 | xargs kill -9 2>/dev/null && echo "✓ Freed port 5173" || true
lsof -ti:8000 | xargs kill -9 2>/dev/null && echo "✓ Freed port 8000" || true

echo ""
echo "✅ All development servers stopped!"
echo ""

