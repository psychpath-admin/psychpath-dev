#!/usr/bin/env bash
# Daily Checkpoint Backup Script for PsychPATH
# Backs up code, PostgreSQL database, and syncs to OneDrive

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"
BACKUP_DIR="$PROJECT_ROOT/backups"
ONEDRIVE_DIR="$HOME/OneDrive - CHANGE YOUR MIND PSYCHOLOGY PTY LTD/PsychPATH-Backups"
CHECKPOINT_LOG="$PROJECT_ROOT/checkpoint.md"

# PostgreSQL configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="psychpath"
DB_USER="psychpath"
export PGPASSWORD="psychpath"

# Use PostgreSQL 16 tools (match server version)
PG_BIN="/opt/homebrew/opt/postgresql@16/bin"
export PATH="$PG_BIN:$PATH"

# Timestamp
TS=$(date +%Y%m%d_%H%M%S)
TODAY=$(date +%Y-%m-%d)

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1" >&2
}

# ============================================================================
# MAIN BACKUP PROCESS
# ============================================================================

log "Starting daily checkpoint backup - $TS"

# Create backup directories
mkdir -p "$BACKUP_DIR"
mkdir -p "$ONEDRIVE_DIR"

ONEDRIVE_BACKUP="$ONEDRIVE_DIR/$TS"
mkdir -p "$ONEDRIVE_BACKUP"

# ============================================================================
# 1. FILESYSTEM BACKUP
# ============================================================================

log "Creating filesystem backup..."
FS_BACKUP="$BACKUP_DIR/fs_backup_$TS.tar.gz"

cd "$PROJECT_ROOT"
tar -czf "$FS_BACKUP" \
    --exclude='node_modules' \
    --exclude='frontend/node_modules' \
    --exclude='backend/node_modules' \
    --exclude='venv' \
    --exclude='backend/venv' \
    --exclude='__pycache__' \
    --exclude='**/__pycache__' \
    --exclude='.git' \
    --exclude='backups' \
    --exclude='logs' \
    --exclude='*.log' \
    --exclude='*.tar.gz' \
    --exclude='backend/db.sqlite3' \
    --exclude='*.sqlite3' \
    --exclude='.DS_Store' \
    --exclude='*.pyc' \
    .

if [ -f "$FS_BACKUP" ]; then
    FS_SIZE=$(du -h "$FS_BACKUP" | cut -f1)
    success "Filesystem backup created: $FS_SIZE"
    # Copy to OneDrive
    cp "$FS_BACKUP" "$ONEDRIVE_BACKUP/fs_backup.tar.gz"
else
    error "Filesystem backup failed"
    exit 1
fi

# ============================================================================
# 2. POSTGRESQL DATABASE BACKUP
# ============================================================================

log "Backing up PostgreSQL database..."

# Custom format dump (restorable with pg_restore)
PG_DUMP="$ONEDRIVE_BACKUP/${DB_NAME}.dump"
pg_dump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --format=custom \
    --file="$PG_DUMP" \
    "$DB_NAME"

if [ -f "$PG_DUMP" ]; then
    PG_SIZE=$(du -h "$PG_DUMP" | cut -f1)
    success "PostgreSQL dump created: $PG_SIZE"
else
    error "PostgreSQL dump failed"
    exit 1
fi

# Global objects (roles, permissions, etc.)
# Note: This requires superuser permissions and may fail for non-superuser accounts
log "Backing up PostgreSQL globals..."
PG_GLOBALS="$ONEDRIVE_BACKUP/postgres_globals.sql"

if pg_dumpall \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --globals-only > "$PG_GLOBALS" 2>/dev/null; then
    success "PostgreSQL globals exported"
else
    warning "PostgreSQL globals backup skipped (requires superuser permissions)"
    rm -f "$PG_GLOBALS"
    echo "# PostgreSQL globals backup skipped - requires superuser permissions" > "$PG_GLOBALS"
fi

# ============================================================================
# 3. GIT COMMIT AND PUSH
# ============================================================================

log "Checking git status..."
cd "$PROJECT_ROOT"

GIT_COMMIT=""
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")

if [ -n "$(git status --porcelain)" ]; then
    log "Uncommitted changes detected, committing..."
    git add -A
    
    if [ -n "${1:-}" ]; then
        COMMIT_MSG="Checkpoint $TODAY: $1"
    else
        COMMIT_MSG="Daily checkpoint: $TODAY $TS"
    fi
    
    git commit -m "$COMMIT_MSG" || true
    GIT_COMMIT=$(git rev-parse --short HEAD)
    success "Git commit: $GIT_COMMIT"
    
    # Attempt to push (non-fatal if it fails)
    log "Pushing to remote..."
    if git push 2>/dev/null; then
        success "Changes pushed to remote"
    else
        warning "Push failed (no remote or offline) - continuing anyway"
    fi
else
    GIT_COMMIT=$(git rev-parse --short HEAD)
    log "No uncommitted changes (current: $GIT_COMMIT)"
fi

# ============================================================================
# 4. CREATE MANIFEST
# ============================================================================

log "Creating manifest..."
MANIFEST="$ONEDRIVE_BACKUP/MANIFEST.env"

cat > "$MANIFEST" << EOF
# PsychPATH Checkpoint Backup Manifest
# Generated: $(date)

# Database
DB_NAME=$DB_NAME
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER

# Git
GIT_COMMIT=$GIT_COMMIT
GIT_BRANCH=$GIT_BRANCH

# Timestamps
TIMESTAMP=$TS
BACKUP_DATE=$TODAY

# Files
FS_BACKUP=fs_backup.tar.gz
PG_DUMP=${DB_NAME}.dump
PG_GLOBALS=postgres_globals.sql
EOF

success "Manifest created"

# ============================================================================
# 5. CREATE CHECKSUMS
# ============================================================================

log "Generating checksums..."
cd "$ONEDRIVE_BACKUP"

if command -v shasum >/dev/null 2>&1; then
    shasum -a256 * > SHA256SUMS.txt 2>/dev/null || true
elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum * > SHA256SUMS.txt 2>/dev/null || true
fi

if [ -f SHA256SUMS.txt ]; then
    success "Checksums generated"
fi

# ============================================================================
# 6. CLEANUP OLD BACKUPS (Keep last 15)
# ============================================================================

log "Cleaning up old backups..."
cd "$ONEDRIVE_DIR"

# Count backups
BACKUP_COUNT=$(ls -1dt */ 2>/dev/null | wc -l | tr -d ' ')
if [ "$BACKUP_COUNT" -gt 15 ]; then
    log "Found $BACKUP_COUNT backups, removing old ones..."
    ls -1dt */ | tail -n +16 | xargs -I{} rm -rf "{}" 2>/dev/null || true
    success "Kept 15 most recent backups"
else
    log "Found $BACKUP_COUNT backups (keeping all)"
fi

# Cleanup local backups (keep last 5)
cd "$BACKUP_DIR"
FS_COUNT=$(ls -1t fs_backup_*.tar.gz 2>/dev/null | wc -l | tr -d ' ')
if [ "$FS_COUNT" -gt 5 ]; then
    ls -1t fs_backup_*.tar.gz | tail -n +6 | xargs rm -f 2>/dev/null || true
    success "Kept 5 most recent local backups"
fi

# ============================================================================
# 7. UPDATE CHECKPOINT LOG
# ============================================================================

log "Updating checkpoint log..."

# Create log if it doesn't exist
if [ ! -f "$CHECKPOINT_LOG" ]; then
    cat > "$CHECKPOINT_LOG" << 'EOF'
# PsychPATH Checkpoint Log

This file tracks all daily checkpoint backups.

## Checkpoints

EOF
fi

# Append checkpoint entry
cat >> "$CHECKPOINT_LOG" << EOF

### Checkpoint: $TODAY $TS

- **Date**: $TODAY at $(date +%H:%M:%S)
- **Git Commit**: \`$GIT_COMMIT\` on branch \`$GIT_BRANCH\`
- **Filesystem Backup**: \`$FS_SIZE\` (local: \`backups/fs_backup_$TS.tar.gz\`)
- **Database Backup**: \`$PG_SIZE\` (PostgreSQL custom format + globals)
- **OneDrive Location**: \`~/OneDrive - CHANGE YOUR MIND PSYCHOLOGY PTY LTD/PsychPATH-Backups/$TS/\`
- **Message**: ${1:-Daily automated checkpoint}

**Artifacts:**
- \`fs_backup.tar.gz\` - Full source code (excluding node_modules, venv, etc.)
- \`psychpath.dump\` - PostgreSQL database (custom format)
- \`postgres_globals.sql\` - PostgreSQL roles and permissions
- \`MANIFEST.env\` - Backup metadata
- \`SHA256SUMS.txt\` - File checksums

**Recovery:**
\`\`\`bash
# Restore database
pg_restore --clean --create -h localhost -U psychpath -d postgres \\
  "~/OneDrive - CHANGE YOUR MIND PSYCHOLOGY PTY LTD/PsychPATH-Backups/$TS/psychpath.dump"

# Restore code
tar -xzf "~/OneDrive - CHANGE YOUR MIND PSYCHOLOGY PTY LTD/PsychPATH-Backups/$TS/fs_backup.tar.gz" \\
  -C "/Users/macdemac/Local Sites/PsychPATH"
\`\`\`

EOF

success "Checkpoint log updated"

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
success "Checkpoint backup completed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 Backup Location:"
echo "   $ONEDRIVE_BACKUP"
echo ""
echo "📊 Backup Contents:"
echo "   • Filesystem: $FS_SIZE"
echo "   • Database: $PG_SIZE"
echo "   • Git: $GIT_COMMIT ($GIT_BRANCH)"
echo ""
echo "📝 Checkpoint log updated: checkpoint.md"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

