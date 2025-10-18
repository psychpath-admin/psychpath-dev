#!/bin/bash

# Simple script to keep the backend running
# This will restart the server if it crashes

echo "🚀 Starting PsychPATH Backend Server..."

while true; do
    echo "$(date): Starting Django server..."
    python manage.py runserver 0.0.0.0:8000
    
    echo "$(date): Server crashed, restarting in 2 seconds..."
    sleep 2
done
