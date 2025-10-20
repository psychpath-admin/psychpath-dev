#!/bin/zsh
set -euo pipefail

# Paths (adjust docker paths if needed)
PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"
BACKUP_ROOT_PRIMARY="/Users/macdemac/OneDrive - CHANGE YOUR MIND PSYCHOLOGY PTY LTD/PsychPATH-Backups"
BACKUP_ROOT_FALLBACK="$HOME/Documents/PsychPATH-Backups"
GIT="/usr/bin/git"
RSYNC="/usr/bin/rsync"
DATE="/bin/date"
GZIP="/usr/bin/gzip"
CP="/bin/cp"
MKDIR="/bin/mkdir"
PRINTF="/usr/bin/printf"
PUSH_TAGS="${PUSH_TAGS:-0}"  # default: do not push tags in scheduled runs

# Resolve docker binary robustly (launchd has minimal PATH)
DOCKER="$(command -v docker || true)"
if [[ -z "$DOCKER" ]]; then
  for p in /opt/homebrew/bin/docker /usr/local/bin/docker /usr/bin/docker; do
    if [[ -x "$p" ]]; then DOCKER="$p"; break; fi
  done
fi
if [[ -z "$DOCKER" ]]; then
  echo "docker binary not found. Ensure Docker Desktop is installed and available in PATH." >&2
  exit 1
fi

TS="$($DATE +"%Y%m%d-%H%M%S")"
# Resolve writable backup root (OneDrive preferred)
BACKUP_ROOT="$BACKUP_ROOT_PRIMARY"
if ! $MKDIR -p "$BACKUP_ROOT_PRIMARY" 2>/dev/null; then
  BACKUP_ROOT="$BACKUP_ROOT_FALLBACK"
  $MKDIR -p "$BACKUP_ROOT"
fi
TEST_FILE="$BACKUP_ROOT/.write-test-$TS"
if ! /usr/bin/touch "$TEST_FILE" 2>/dev/null; then
  BACKUP_ROOT="$BACKUP_ROOT_FALLBACK"
  $MKDIR -p "$BACKUP_ROOT"
fi
/bin/rm -f "$TEST_FILE" 2>/dev/null || true

BACKUP_DIR="$BACKUP_ROOT/$TS"

# Ensure backup dir exists
$MKDIR -p "$BACKUP_DIR"

# DB dump (from db container env)
if [[ ! -d "$PROJECT_ROOT" ]]; then
  echo "Project directory not found: $PROJECT_ROOT" >&2
  exit 1
fi
cd "$PROJECT_ROOT"
$DOCKER compose exec -T postgres sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' | $GZIP > "$BACKUP_DIR/db-$TS.sql.gz"

# Snapshot source (exclude bulky/transient dirs)
$RSYNC -a --delete \
  --exclude 'frontend/node_modules' \
  --exclude 'backend/__pycache__' \
  --exclude '.git' \
  "$PROJECT_ROOT/" "$BACKUP_DIR/source/"

# Save dependency manifests
$CP "$PROJECT_ROOT/frontend/package.json" "$BACKUP_DIR/frontend-package.json"
$CP "$PROJECT_ROOT/frontend/package-lock.json" "$BACKUP_DIR/frontend-package-lock.json"

# Backend pip freeze (best-effort)
$DOCKER compose exec backend pip freeze > "$BACKUP_DIR/backend-freeze-$TS.txt" || true

# Create and push git tag (best-effort)
if [[ "$PUSH_TAGS" = "1" ]]; then
  $GIT -C "$PROJECT_ROOT" tag -a "backup-$TS" -m "Backup snapshot $TS" && \
  $GIT -C "$PROJECT_ROOT" push origin "backup-$TS" || true
fi

$PRINTF "Nightly backup complete at %s\nLocation: %s\n" "$TS" "$BACKUP_DIR"