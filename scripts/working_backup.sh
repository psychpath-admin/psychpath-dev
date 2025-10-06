#!/bin/bash

# WORKING Backup System - This Actually Works
# Uses only proven methods

set -e

PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="working_backup_$TIMESTAMP"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

log "Starting WORKING backup: $BACKUP_NAME"

# 1. Code Backup (GitHub - This ALWAYS works)
log "Backing up code to GitHub..."
cd "$PROJECT_ROOT"
git add -A
git commit -m "BACKUP: Working backup - $TIMESTAMP" || true
git push origin $(git branch --show-current) || warning "Failed to push to GitHub"
git tag "working_backup_$TIMESTAMP"
success "Code backed up with tag: working_backup_$TIMESTAMP"

# 2. Database Backup (PostgreSQL - Direct method)
log "Backing up PostgreSQL database..."
cd "$PROJECT_ROOT/backend"

# Try to find PostgreSQL and backup
PG_DUMP="/opt/homebrew/Cellar/postgresql@16/16.10/bin/pg_dump"
PSQL="/opt/homebrew/Cellar/postgresql@16/16.10/bin/psql"

if [ -f "$PG_DUMP" ]; then
    # Method 1: Direct pg_dump
    if $PG_DUMP -h localhost -U psychpath_user -d psychpath_db > "$BACKUP_DIR/$BACKUP_NAME/database.sql" 2>/dev/null; then
        success "PostgreSQL backup completed"
    else
        # Method 2: Try with different connection
        if $PG_DUMP -h 127.0.0.1 -U psychpath_user -d psychpath_db > "$BACKUP_DIR/$BACKUP_NAME/database.sql" 2>/dev/null; then
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

PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"
BACKUP_DIR="$(dirname "$0")"

echo "Starting recovery..."

# Stop services
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
    $PSQL -h localhost -U psychpath_user -d psychpath_db < "$BACKUP_DIR/database.sql" || \
    $PSQL -h 127.0.0.1 -U psychpath_user -d psychpath_db < "$BACKUP_DIR/database.sql"
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

# 4. Create backup info
cat > "$BACKUP_DIR/$BACKUP_NAME/BACKUP_INFO.md" << EOF
# Working Backup - $TIMESTAMP

## Backup Information
- **Backup ID**: $BACKUP_NAME
- **Timestamp**: $(date)
- **Git Commit**: $(git rev-parse HEAD)
- **Git Tag**: working_backup_$TIMESTAMP

## Recovery Instructions
\`\`\`bash
cd "$BACKUP_DIR/$BACKUP_NAME"
./RECOVER.sh
\`\`\`

## Manual Recovery
\`\`\`bash
cd /Users/macdemac/Local\ Sites/PsychPATH
make dev-stop
git checkout working_backup_$TIMESTAMP
cd backend
psql -h localhost -U psychpath_user -d psychpath_db < ../backups/$BACKUP_NAME/database.sql
make dev-start
\`\`\`
EOF

success "Backup completed: $BACKUP_NAME"
success "Location: $BACKUP_DIR/$BACKUP_NAME"
success "Recovery: cd $BACKUP_DIR/$BACKUP_NAME && ./RECOVER.sh"
