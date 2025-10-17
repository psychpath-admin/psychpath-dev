#!/usr/bin/env bash
set -euo pipefail

# Sends a concise status email with latest backup, disk usage and service health

TO_EMAIL=${1:-"hello@psychpath.com.au"}
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ONEDRIVE_DIR="$HOME/OneDrive - CHANGE YOUR MIND PSYCHOLOGY PTY LTD/PsychPATH-Backups"
HEALTH_LOG="$PROJECT_ROOT/backups/health.log"
VERIFY_LOG="$PROJECT_ROOT/backups/verify.log"
CRON_LOG="$PROJECT_ROOT/backups/cron.log"
DB_MAINT_LOG="$PROJECT_ROOT/backups/db_maint.log"

ts() { date "+%Y-%m-%d %H:%M:%S"; }

LATEST_BACKUP_DIR=$(ls -1dt "$ONEDRIVE_DIR"/*/ 2>/dev/null | head -n1)
LATEST_BACKUP_NAME=${LATEST_BACKUP_DIR##*/}

DISK=$(df -h / | awk 'NR==2{print $5" used of "$2" (avail "$4")"}')

BACKUP_SUMMARY="None"
if [ -n "$LATEST_BACKUP_DIR" ]; then
  SIZE=$(du -sh "$LATEST_BACKUP_DIR" 2>/dev/null | awk '{print $1}')
  BACKUP_SUMMARY="$LATEST_BACKUP_NAME, total $SIZE"
fi

HEALTH_TAIL=$(tail -n 20 "$HEALTH_LOG" 2>/dev/null || true)
VERIFY_TAIL=$(tail -n 20 "$VERIFY_LOG" 2>/dev/null || true)
CRON_TAIL=$(tail -n 20 "$CRON_LOG" 2>/dev/null || true)
DB_TAIL=$(tail -n 20 "$DB_MAINT_LOG" 2>/dev/null || true)

BODY=$(cat <<EOF
PsychPATH Daily Status - $(ts)

Disk usage: $DISK
Latest OneDrive backup: $BACKUP_SUMMARY

--- Last verify_last_backup output ---
$VERIFY_TAIL

--- Last health checks ---
$HEALTH_TAIL

--- Last db maintenance ---
$DB_TAIL

--- Last checkpoint run ---
$CRON_TAIL
EOF
)

# macOS mail sending (requires Mail.app configured) or use sendmail if available
if command -v mail >/dev/null 2>&1; then
  echo "$BODY" | mail -s "PsychPATH Daily Status" "$TO_EMAIL"
elif command -v sendmail >/dev/null 2>&1; then
  {
    echo "Subject: PsychPATH Daily Status"
    echo "To: $TO_EMAIL"
    echo
    echo "$BODY"
  } | sendmail -t
else
  # Fallback: write to status file
  echo "$BODY" > "$PROJECT_ROOT/backups/daily_status_$(date +%Y%m%d).txt"
fi


