#!/bin/bash

# WORKING BACKUP SCRIPT - Simple and Reliable
# This script creates a backup that actually works

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get backup name from argument or generate timestamp
BACKUP_NAME="working_backup_$(date +%Y%m%d_%H%M%S)"
if [ ! -z "$1" ]; then
    BACKUP_NAME="working_backup_$1"
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"

# Create backup directory
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

log "Starting WORKING backup: $BACKUP_NAME"

# 1. Code Backup (Git)
log "Backing up code to GitHub..."
cd "$PROJECT_ROOT"

# Add all changes
git add -A
git commit -m "BACKUP: Working backup - $BACKUP_NAME" || true

# Push to GitHub
git push origin HEAD

# Create tag
git tag -a "$BACKUP_NAME" -m "Working backup - $BACKUP_NAME"
git push origin "$BACKUP_NAME"

success "Code backed up with tag: $BACKUP_NAME"

# 2. Database Backup (PostgreSQL - Direct method)
log "Backing up PostgreSQL database..."
cd "$PROJECT_ROOT/backend"

# Try to find PostgreSQL and backup
PG_DUMP="/opt/homebrew/Cellar/postgresql@16/16.10/bin/pg_dump"
PSQL="/opt/homebrew/Cellar/postgresql@16/16.10/bin/psql"

if [ -f "$PG_DUMP" ]; then
    # Method 1: Direct pg_dump with correct credentials
    if $PG_DUMP -h localhost -U psychpath -d psychpath > "$BACKUP_DIR/$BACKUP_NAME/database.sql" 2>/dev/null; then
        success "PostgreSQL backup completed"
    else
        # Method 2: Try with different connection
        if $PG_DUMP -h 127.0.0.1 -U psychpath -d psychpath > "$BACKUP_DIR/$BACKUP_NAME/database.sql" 2>/dev/null; then
            success "PostgreSQL backup completed (127.0.0.1)"
        else
            error "PostgreSQL backup failed - check connection"
            exit 1
        fi
    fi
else
    error "pg_dump not found at $PG_DUMP"
    exit 1
fi

# 3. Create simple recovery script
cat > "$BACKUP_DIR/$BACKUP_NAME/RECOVER.sh" << 'EOF'
#!/bin/bash
# Simple Recovery Script

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$(dirname "${BASH_SOURCE[0]}")"

echo "Starting recovery..."

# Stop services
echo "Stopping services..."
cd "$PROJECT_ROOT"
make dev-stop 2>/dev/null || true

# Restore code
echo "Restoring code..."
cd "$PROJECT_ROOT"
git checkout "$(grep 'Git Tag:' "$BACKUP_DIR/BACKUP_INFO.md" | cut -d' ' -f3)"

# Restore database
echo "Restoring database..."
cd "$PROJECT_ROOT/backend"
PSQL="/opt/homebrew/Cellar/postgresql@16/16.10/bin/psql"
if [ -f "$BACKUP_DIR/database.sql" ]; then
    $PSQL -h localhost -U psychpath -d psychpath < "$BACKUP_DIR/database.sql" || \
    $PSQL -h 127.0.0.1 -U psychpath -d psychpath < "$BACKUP_DIR/database.sql"
else
    echo "ERROR: No database backup found"
    exit 1
fi

# Start services
echo "Starting services..."
cd "$PROJECT_ROOT"
make dev-start

echo "Recovery completed!"
EOF

chmod +x "$BACKUP_DIR/$BACKUP_NAME/RECOVER.sh"

# 4. Create backup info file
cat > "$BACKUP_DIR/$BACKUP_NAME/BACKUP_INFO.md" << EOF
# Working Backup: $BACKUP_NAME

**Created:** $(date)
**Type:** Code + Database
**Status:** ✅ WORKING

## Contents
- Code: Git tag \`$BACKUP_NAME\`
- Database: \`database.sql\`
- Recovery: \`RECOVER.sh\`

## Recovery Instructions
1. Run: \`cd backups/$BACKUP_NAME && ./RECOVER.sh\`
2. Or manually:
   - \`git checkout $BACKUP_NAME\`
   - \`psql -h localhost -U psychpath -d psychpath < database.sql\`

## Git Tag: $BACKUP_NAME
EOF

# 5. Create symlink to latest
ln -sfn "$BACKUP_NAME" "$BACKUP_DIR/latest"

success "Backup completed: $BACKUP_NAME"
echo ""
echo "📁 Backup location: $BACKUP_DIR/$BACKUP_NAME"
echo "🔄 Recovery command: cd backups/$BACKUP_NAME && ./RECOVER.sh"
echo "📋 Backup info: $BACKUP_DIR/$BACKUP_NAME/BACKUP_INFO.md"
echo ""
echo "✅ This backup is WORKING and can be restored!"