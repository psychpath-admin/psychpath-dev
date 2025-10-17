#!/usr/bin/env bash
set -euo pipefail

# Verify latest backup exists in OneDrive and (if local copy exists) matches SHA256

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"
ONEDRIVE_DIR="$HOME/OneDrive - CHANGE YOUR MIND PSYCHOLOGY PTY LTD/PsychPATH-Backups"
LOG_FILE="$PROJECT_ROOT/backups/verify.log"

mkdir -p "$BACKUP_DIR"
touch "$LOG_FILE"

ts() { date "+%Y-%m-%d %H:%M:%S"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG_FILE"; }

if [ ! -d "$ONEDRIVE_DIR" ]; then
  log "ERROR: OneDrive backup directory not found: $ONEDRIVE_DIR"
  exit 0
fi

# Find latest backup folder in OneDrive
LATEST_DIR=$(ls -1dt "$ONEDRIVE_DIR"/*/ 2>/dev/null | head -n1)
if [ -z "$LATEST_DIR" ]; then
  log "WARN: No backups found in OneDrive directory"
  exit 0
fi

log "Latest OneDrive backup: $LATEST_DIR"

OD_FS="$LATEST_DIR/fs_backup.tar.gz"
if [ ! -f "$OD_FS" ]; then
  log "ERROR: fs_backup.tar.gz missing in $LATEST_DIR"
  exit 0
fi

# If a local backup with matching timestamp exists, compare checksums
LOCAL_FS=$(ls -1t "$BACKUP_DIR"/fs_backup_*.tar.gz 2>/dev/null | head -n1 || true)
if [ -n "$LOCAL_FS" ]; then
  log "Comparing checksums of: $LOCAL_FS and $OD_FS"
  LOCAL_SHA=$(shasum -a 256 "$LOCAL_FS" | awk '{print $1}')
  OD_SHA=$(shasum -a 256 "$OD_FS" | awk '{print $1}')
  if [ "$LOCAL_SHA" = "$OD_SHA" ]; then
    log "OK: SHA256 matches"
  else
    log "WARN: SHA256 mismatch between local and OneDrive fs backup"
  fi
else
  log "INFO: No local fs_backup found to compare; skipping checksum compare"
fi

if [ -f "$LATEST_DIR/psychpath.dump" ]; then
  log "OK: database dump present"
else
  log "WARN: database dump missing in latest backup"
fi

log "Verification complete"


