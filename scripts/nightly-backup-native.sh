#!/bin/zsh
set -euo pipefail

# === Configuration ===
PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"
BACKUP_ROOT_PRIMARY="/Users/macdemac/OneDrive - CHANGE YOUR MIND PSYCHOLOGY PTY LTD/PsychPATH-Backups"
BACKUP_ROOT_FALLBACK="$HOME/Documents/PsychPATH-Backups"

# === Commands ===
DATE="/bin/date"
GZIP="/usr/bin/gzip"
CP="/bin/cp"
MKDIR="/bin/mkdir"
PRINTF="/usr/bin/printf"
RSYNC="/usr/bin/rsync"

# === PostgreSQL ===
# Try common locations for pg_dump
for pg in /opt/homebrew/opt/postgresql@15/bin/pg_dump /opt/homebrew/bin/pg_dump /usr/local/bin/pg_dump /usr/bin/pg_dump; do
  if [[ -x "$pg" ]]; then
    PG_DUMP="$pg"
    break
  fi
done

if [[ -z "${PG_DUMP:-}" ]]; then
  echo "ERROR: pg_dump not found. Please install PostgreSQL." >&2
  exit 1
fi

# === Python Environment ===
PYTHON="$PROJECT_ROOT/backend/venv/bin/python"
PIP="$PROJECT_ROOT/backend/venv/bin/pip"

# === Database Configuration ===
# These will be read from environment or use defaults
DB_NAME="${POSTGRES_DB:-psychpath}"
DB_USER="${POSTGRES_USER:-macdemac}"

# === Generate Timestamp ===
TS="$($DATE +"%Y%m%d-%H%M%S")"

# === Determine Backup Location ===
BACKUP_ROOT="$BACKUP_ROOT_PRIMARY"
if ! $MKDIR -p "$BACKUP_ROOT_PRIMARY" 2>/dev/null; then
  BACKUP_ROOT="$BACKUP_ROOT_FALLBACK"
  $MKDIR -p "$BACKUP_ROOT"
fi

# Test write access
TEST_FILE="$BACKUP_ROOT/.write-test-$TS"
if ! /usr/bin/touch "$TEST_FILE" 2>/dev/null; then
  BACKUP_ROOT="$BACKUP_ROOT_FALLBACK"
  $MKDIR -p "$BACKUP_ROOT"
fi
/bin/rm -f "$TEST_FILE" 2>/dev/null || true

BACKUP_DIR="$BACKUP_ROOT/$TS"

# === Create Backup Directory ===
$MKDIR -p "$BACKUP_DIR"

# === Verify Project Directory ===
if [[ ! -d "$PROJECT_ROOT" ]]; then
  echo "ERROR: Project directory not found: $PROJECT_ROOT" >&2
  exit 1
fi

cd "$PROJECT_ROOT"

# === 1. Database Backup ===
echo "Backing up PostgreSQL database..."
$PG_DUMP -U "$DB_USER" "$DB_NAME" | $GZIP > "$BACKUP_DIR/db-$TS.sql.gz"

# === 2. Source Code Backup ===
echo "Backing up source code..."
$RSYNC -a --delete \
  --exclude 'frontend/node_modules' \
  --exclude 'backend/__pycache__' \
  --exclude 'backend/venv' \
  --exclude '.git' \
  --exclude '*.pyc' \
  --exclude '*.pyo' \
  --exclude '__pycache__' \
  --exclude '.DS_Store' \
  --exclude '*.log' \
  --exclude 'logs/' \
  "$PROJECT_ROOT/" "$BACKUP_DIR/source/"

# === 3. Dependency Manifests ===
echo "Backing up dependency manifests..."
$CP "$PROJECT_ROOT/frontend/package.json" "$BACKUP_DIR/frontend-package.json" 2>/dev/null || true
$CP "$PROJECT_ROOT/frontend/package-lock.json" "$BACKUP_DIR/frontend-package-lock.json" 2>/dev/null || true
$CP "$PROJECT_ROOT/backend/requirements.txt" "$BACKUP_DIR/backend-requirements.txt" 2>/dev/null || true

# === 4. Python Environment Snapshot ===
if [[ -x "$PIP" ]]; then
  echo "Saving Python environment..."
  $PIP freeze > "$BACKUP_DIR/backend-freeze-$TS.txt" 2>/dev/null || true
fi

# === 5. Create Backup Manifest ===
cat > "$BACKUP_DIR/BACKUP_INFO.txt" << EOF
PsychPATH Native Backup
=======================
Timestamp: $TS
Date: $($DATE)
Type: Native (Non-Docker)
Database: $DB_NAME
DB User: $DB_USER
Backup Location: $BACKUP_DIR

Contents:
---------
db-$TS.sql.gz              : PostgreSQL database dump (gzipped)
source/                     : Complete source code snapshot
frontend-package.json       : Frontend dependencies
frontend-package-lock.json  : Exact frontend dependencies
backend-requirements.txt    : Backend Python dependencies
backend-freeze-$TS.txt     : Exact Python environment

Restoration:
------------
1. Database: gunzip -c db-$TS.sql.gz | psql -U $DB_USER -d $DB_NAME
2. Source: rsync -av source/ /path/to/restore/
3. Backend: pip install -r backend-freeze-$TS.txt
4. Frontend: cd frontend && npm ci

Notes:
------
- Database backup is compressed with gzip
- Source excludes: node_modules, venv, __pycache__, .git
- Run 'python manage.py migrate' after restoration
EOF

# === Summary ===
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
$PRINTF "\n✅ Backup completed successfully!\n"
$PRINTF "Timestamp: %s\n" "$TS"
$PRINTF "Location: %s\n" "$BACKUP_DIR"
$PRINTF "Size: %s\n" "$BACKUP_SIZE"

exit 0
