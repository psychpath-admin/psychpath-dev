#!/bin/bash

# PsychPATH Backend Server Startup Script
# This script ensures the Django server stays running and restarts automatically if it crashes

echo "Starting PsychPATH Backend Server..."

# Kill any existing Django processes
pkill -f "manage.py runserver" 2>/dev/null || true
sleep 2

# Set environment variables
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
export DJANGO_SETTINGS_MODULE="config.settings"

# Function to start the server
start_server() {
    echo "Starting Django server on 0.0.0.0:8000..."
    python manage.py runserver 0.0.0.0:8000 --verbosity=1 > runserver.log 2>&1 &
    SERVER_PID=$!
    echo "Server started with PID: $SERVER_PID"
    return $SERVER_PID
}

# Function to check if server is running
check_server() {
    curl -s http://localhost:8000/api/me/ > /dev/null 2>&1
    return $?
}

# Function to monitor and restart server
monitor_server() {
    while true; do
        sleep 10
        
        if ! check_server; then
            echo "$(date): Server appears to be down, restarting..."
            pkill -f "manage.py runserver" 2>/dev/null || true
            sleep 2
            start_server
        else
            echo "$(date): Server is running normally"
        fi
    done
}

# Start the server
start_server

# Start monitoring in background
monitor_server &
MONITOR_PID=$!

echo "Server monitoring started with PID: $MONITOR_PID"
echo "Server logs: tail -f runserver.log"
echo "To stop: kill $SERVER_PID $MONITOR_PID"

# Keep script running
wait
