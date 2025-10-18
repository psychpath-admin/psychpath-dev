#!/bin/zsh
set -euo pipefail

# === Configuration ===
PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/nightly-backup-$(date +%Y%m%d).log"

# === Load Environment Configuration ===
if [[ -f "$PROJECT_ROOT/.backup-env" ]]; then
    source "$PROJECT_ROOT/.backup-env"
fi

# === Setup Logging ===
mkdir -p "$LOG_DIR"
exec 1>>"$LOG_FILE"
exec 2>&1

echo "================================================================="
echo "=== Nightly Backup Started at $(date) ==="
echo "================================================================="

# === Check PostgreSQL ===
echo "Checking PostgreSQL..."
if ! pgrep -x "postgres" > /dev/null 2>&1; then
    echo "⚠️  WARNING: PostgreSQL process not detected"
    echo "Attempting backup anyway..."
fi

# === Test Database Connection ===
echo "Testing database connection..."
DB_NAME="${POSTGRES_DB:-psychpath}"
DB_USER="${POSTGRES_USER:-macdemac}"

if ! psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo "❌ ERROR: Cannot connect to database '$DB_NAME' as user '$DB_USER'"
    osascript -e 'display notification "Cannot connect to database" with title "PsychPATH Backup Failed"' 2>/dev/null || true
    exit 1
fi

echo "✅ Database connection successful"

# === Run Backup Script ===
echo "Starting backup..."
if "$PROJECT_ROOT/scripts/nightly-backup-native.sh"; then
    echo ""
    echo "================================================================="
    echo "=== Backup Completed Successfully at $(date) ==="
    echo "================================================================="
    
    # === Cleanup Old Backups (keep 30 days) ===
    echo ""
    echo "Cleaning up old backups (keeping last 30 days)..."
    BACKUP_ROOT="/Users/macdemac/OneDrive - CHANGE YOUR MIND PSYCHOLOGY PTY LTD/PsychPATH-Backups"
    if [[ -d "$BACKUP_ROOT" ]]; then
        DELETED_COUNT=$(find "$BACKUP_ROOT" -type d -mtime +30 -name "20*" -maxdepth 1 2>/dev/null | wc -l | tr -d ' ')
        find "$BACKUP_ROOT" -type d -mtime +30 -name "20*" -maxdepth 1 -exec rm -rf {} \; 2>/dev/null || true
        echo "Removed $DELETED_COUNT old backup(s)"
    fi
    
    # === Optional Success Notification ===
    # Uncomment to get notifications on every successful backup
    # osascript -e 'display notification "Backup completed successfully" with title "PsychPATH Backup"' 2>/dev/null || true
    
    exit 0
else
    EXIT_CODE=$?
    echo ""
    echo "================================================================="
    echo "=== ❌ Backup Failed at $(date) with exit code $EXIT_CODE ==="
    echo "================================================================="
    
    # === Failure Notification ===
    osascript -e 'display notification "Backup failed - check logs" with title "PsychPATH Backup Failed"' 2>/dev/null || true
    
    exit $EXIT_CODE
fi
