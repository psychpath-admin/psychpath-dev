#!/bin/bash

# Setup cron job for PsychPATH maintenance tasks
# This script sets up automatic cleanup of expired supervision invitations

# Get the current directory (should be the PsychPATH backend directory)
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PATH="$BACKEND_DIR/.venv/bin/activate"

# Create a temporary cron file
TEMP_CRON=$(mktemp)

# Add the cleanup job to run daily at 2 AM
echo "0 2 * * * source $VENV_PATH && cd $BACKEND_DIR && python manage.py cleanup_expired_supervisions" >> "$TEMP_CRON"

# Add the backup job to run daily at 3 AM (if backup script exists)
if [ -f "$BACKEND_DIR/backup.sh" ]; then
    echo "0 3 * * * cd $BACKEND_DIR && ./backup.sh" >> "$TEMP_CRON"
fi

# Install the cron jobs
crontab "$TEMP_CRON"

# Clean up
rm "$TEMP_CRON"

echo "✅ Cron jobs installed successfully!"
echo ""
echo "Scheduled tasks:"
echo "  - Daily at 2:00 AM: Cleanup expired supervision invitations"
if [ -f "$BACKEND_DIR/backup.sh" ]; then
    echo "  - Daily at 3:00 AM: System backup"
fi
echo ""
echo "To view current cron jobs: crontab -l"
echo "To remove cron jobs: crontab -r"

