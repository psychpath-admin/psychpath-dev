#!/bin/bash

# Setup automatic daily backups for PsychPATH development structure

echo "🔧 Setting up automatic daily backups for PsychPATH..."

# Get the current directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="${PROJECT_ROOT}/backup_dev_structure.sh"

# Check if backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo "❌ Backup script not found at: $BACKUP_SCRIPT"
    exit 1
fi

# Create a temporary cron file
TEMP_CRON=$(mktemp)

# Add the backup job to run daily at 6 PM
echo "0 18 * * * cd '$PROJECT_ROOT' && '$BACKUP_SCRIPT' >> '$PROJECT_ROOT/backup.log' 2>&1" >> "$TEMP_CRON"

# Install the cron job
crontab "$TEMP_CRON"

# Clean up
rm "$TEMP_CRON"

echo "✅ Automatic backup configured successfully!"
echo ""
echo "📅 Scheduled backup: Daily at 6:00 PM"
echo "📁 Backup location: /Users/macdemac/Local Sites/PsychPATH-backups/"
echo "📝 Log file: $PROJECT_ROOT/backup.log"
echo ""
echo "To view current cron jobs: crontab -l"
echo "To remove cron jobs: crontab -r"
echo "To view backup logs: tail -f $PROJECT_ROOT/backup.log"
