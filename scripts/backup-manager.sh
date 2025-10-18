#!/bin/zsh
# PsychPATH Backup Management Script

set -euo pipefail

PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"
BACKUP_ROOT="/Users/macdemac/OneDrive - CHANGE YOUR MIND PSYCHOLOGY PTY LTD/PsychPATH-Backups"

case "${1:-help}" in
    "status")
        echo "=== PsychPATH Backup System Status ==="
        echo ""
        echo "Scheduled Job Status:"
        launchctl list | grep psychpath || echo "No scheduled backup job found"
        echo ""
        echo "Recent Backups:"
        ls -lth "$BACKUP_ROOT/" 2>/dev/null | head -10 || echo "No backups found"
        echo ""
        echo "Latest Backup Log:"
        LATEST_LOG=$(ls -t "$PROJECT_ROOT/logs/nightly-backup-"*.log 2>/dev/null | head -1)
        if [[ -n "$LATEST_LOG" ]]; then
            echo "Log file: $LATEST_LOG"
            tail -20 "$LATEST_LOG"
        else
            echo "No backup logs found"
        fi
        ;;
    
    "test")
        echo "=== Testing Backup System ==="
        echo "Running backup manually..."
        "$PROJECT_ROOT/scripts/nightly-backup-wrapper.sh"
        echo ""
        echo "Backup completed. Check logs for details."
        ;;
    
    "enable")
        echo "=== Enabling Scheduled Backups ==="
        launchctl load ~/Library/LaunchAgents/com.psychpath.nightly-backup.plist
        echo "Scheduled backup enabled for 2:30 AM daily"
        launchctl list | grep psychpath
        ;;
    
    "disable")
        echo "=== Disabling Scheduled Backups ==="
        launchctl unload ~/Library/LaunchAgents/com.psychpath.nightly-backup.plist
        echo "Scheduled backup disabled"
        ;;
    
    "cleanup")
        echo "=== Cleaning Old Backups ==="
        if [[ -d "$BACKUP_ROOT" ]]; then
            DELETED_COUNT=$(find "$BACKUP_ROOT" -type d -mtime +30 -name "20*" -maxdepth 1 2>/dev/null | wc -l | tr -d ' ')
            find "$BACKUP_ROOT" -type d -mtime +30 -name "20*" -maxdepth 1 -exec rm -rf {} \; 2>/dev/null || true
            echo "Removed $DELETED_COUNT old backup(s) (older than 30 days)"
        else
            echo "No backup directory found"
        fi
        ;;
    
    "restore")
        if [[ -z "${2:-}" ]]; then
            echo "Usage: $0 restore <backup-timestamp>"
            echo "Available backups:"
            ls -lt "$BACKUP_ROOT/" 2>/dev/null | head -10 || echo "No backups found"
            exit 1
        fi
        
        BACKUP_DIR="$BACKUP_ROOT/$2"
        if [[ ! -d "$BACKUP_DIR" ]]; then
            echo "Backup directory not found: $BACKUP_DIR"
            exit 1
        fi
        
        echo "=== Restoring from Backup: $2 ==="
        echo "WARNING: This will overwrite your current database and source code!"
        echo "Backup location: $BACKUP_DIR"
        echo ""
        read "REPLY?Are you sure you want to continue? (y/N): "
        if [[ "$REPLY" != "y" && "$REPLY" != "Y" ]]; then
            echo "Restore cancelled"
            exit 0
        fi
        
        echo "Stopping services..."
        pkill -f "manage.py runserver" 2>/dev/null || true
        pkill -f "npm run dev" 2>/dev/null || true
        
        echo "Restoring database..."
        gunzip -c "$BACKUP_DIR"/db-*.sql.gz | psql -U macdemac -d psychpath
        
        echo "Restoring source code..."
        rsync -av "$BACKUP_DIR/source/" "$PROJECT_ROOT/"
        
        echo "Running migrations..."
        cd "$PROJECT_ROOT/backend"
        python manage.py migrate
        
        echo "Restore completed. You may need to restart services with 'make dev-start'"
        ;;
    
    "logs")
        echo "=== Recent Backup Logs ==="
        ls -lt "$PROJECT_ROOT/logs/nightly-backup-"*.log 2>/dev/null | head -5
        echo ""
        echo "Latest log content:"
        LATEST_LOG=$(ls -t "$PROJECT_ROOT/logs/nightly-backup-"*.log 2>/dev/null | head -1)
        if [[ -n "$LATEST_LOG" ]]; then
            cat "$LATEST_LOG"
        else
            echo "No backup logs found"
        fi
        ;;
    
    "help"|*)
        echo "PsychPATH Backup Manager"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  status     - Show backup system status and recent backups"
        echo "  test       - Run backup manually for testing"
        echo "  enable     - Enable scheduled backups (2:30 AM daily)"
        echo "  disable    - Disable scheduled backups"
        echo "  cleanup    - Remove backups older than 30 days"
        echo "  restore    - Restore from a specific backup"
        echo "  logs       - Show recent backup logs"
        echo "  help       - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 status"
        echo "  $0 test"
        echo "  $0 restore 20251018-232738"
        ;;
esac
