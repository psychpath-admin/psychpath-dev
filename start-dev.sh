#!/bin/bash

# PsychPATH Development Server Startup Script
# This script ensures clean startup on consistent ports

echo "🧹 Cleaning up any existing processes..."

# Kill any existing Vite processes
pkill -9 -f vite 2>/dev/null || true

# Kill any processes on ports 5173, 8000
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

sleep 2

echo "🚀 Starting backend server on port 8000..."
cd "/Users/macdemac/Local Sites/PsychPATH/backend"
python manage.py runserver > /tmp/psychpath-backend.log 2>&1 &
BACKEND_PID=$!

sleep 3

echo "🚀 Starting frontend server on port 5173..."
cd "/Users/macdemac/Local Sites/PsychPATH/frontend"
npm run dev > /tmp/psychpath-frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 3

echo ""
echo "✅ PsychPATH Development Servers Started!"
echo ""
echo "📍 Frontend: http://localhost:5173"
echo "📍 Backend:  http://localhost:8000"
echo ""
echo "🔐 Test Users (all use password: testpass123):"
echo "   • brett@cymp.com.au"
echo "   • intern1.demo@cymp.com.au"
echo "   • intern2.demo@cymp.com.au"
echo "   • supervisor.demo@cymp.com.au"
echo "   • registrar1.demo@cymp.com.au"
echo ""
echo "📋 Process IDs:"
echo "   Backend PID:  $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "🛑 To stop servers:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "📊 To view logs:"
echo "   tail -f /tmp/psychpath-backend.log"
echo "   tail -f /tmp/psychpath-frontend.log"
echo ""

