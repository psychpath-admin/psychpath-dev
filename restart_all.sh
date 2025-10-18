#!/bin/bash

# PsychPATH Complete System Restart Script
# This script restarts both backend and frontend servers

echo "🔄 Restarting PsychPATH Development Environment..."

# Kill all existing processes
echo "📋 Stopping existing servers..."
pkill -f "manage.py runserver" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "start_server.sh" 2>/dev/null || true
sleep 3

# Start backend with monitoring
echo "🚀 Starting backend server with monitoring..."
cd backend
./start_server.sh &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for servers to start
echo "⏳ Waiting for servers to start..."
sleep 5

# Check status
echo ""
echo "📊 System Status:"
echo "=================="

# Check backend
if curl -s http://localhost:8000/api/me/ > /dev/null 2>&1; then
    echo "✅ Backend: RUNNING (http://localhost:8000)"
else
    echo "❌ Backend: FAILED"
fi

# Check frontend
if curl -s http://localhost:5173/ > /dev/null 2>&1; then
    echo "✅ Frontend: RUNNING (http://localhost:5173)"
else
    echo "❌ Frontend: FAILED"
fi

echo ""
echo "🎯 Access URLs:"
echo "Frontend: http://localhost:5173"
echo "Backend API: http://localhost:8000/api/"
echo ""
echo "📝 Logs:"
echo "Backend: tail -f backend/runserver.log"
echo "Frontend: Check terminal output"
echo ""
echo "🛑 To stop: kill $BACKEND_PID $FRONTEND_PID"
echo ""

echo "✅ PsychPATH development environment is ready!"
