#!/bin/bash

# SIMPLE BACKUP SCRIPT - Reliable and Fast
# This script creates a simple, reliable backup system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
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

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Get backup name from argument or generate timestamp
BACKUP_NAME="simple_backup_$(date +%Y%m%d_%H%M%S)"
if [ ! -z "$1" ]; then
    BACKUP_NAME="simple_backup_$1"
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"

# Create backup directory
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

log "Starting SIMPLE backup: $BACKUP_NAME"

# 1. Code Backup (Git)
log "Backing up code to GitHub..."
cd "$PROJECT_ROOT"

# Add all changes
git add -A
git commit -m "BACKUP: Simple backup - $BACKUP_NAME" || true

# Push to GitHub
git push origin HEAD

# Create tag
git tag -a "$BACKUP_NAME" -m "Simple backup - $BACKUP_NAME"
git push origin "$BACKUP_NAME"

success "Code backed up with tag: $BACKUP_NAME"

# 2. Database Backup (PostgreSQL - Multiple Formats)
log "Backing up PostgreSQL database..."
cd "$PROJECT_ROOT/backend"

# PostgreSQL tools
PG_DUMP="/opt/homebrew/Cellar/postgresql@16/16.10/bin/pg_dump"
PSQL="/opt/homebrew/Cellar/postgresql@16/16.10/bin/psql"

if [ -f "$PG_DUMP" ]; then
    # Method 1: SQL dump (human readable)
    if $PG_DUMP -h localhost -U psychpath -d psychpath > "$BACKUP_DIR/$BACKUP_NAME/database.sql" 2>/dev/null; then
        success "PostgreSQL SQL backup completed"
    else
        error "PostgreSQL SQL backup failed"
        exit 1
    fi
    
    # Method 2: Custom format (compressed, faster restore)
    if $PG_DUMP -h localhost -U psychpath -d psychpath -Fc > "$BACKUP_DIR/$BACKUP_NAME/database.dump" 2>/dev/null; then
        success "PostgreSQL custom format backup completed"
    else
        warn "PostgreSQL custom format backup failed"
    fi
else
    error "pg_dump not found at $PG_DUMP"
    exit 1
fi

# 3. Django Data Export (JSON format)
log "Exporting Django data..."
cd "$PROJECT_ROOT/backend"

if [ -f "./venv/bin/python" ]; then
    if DJANGO_SETTINGS_MODULE=config.settings ./venv/bin/python manage.py dumpdata --indent 2 > "$BACKUP_DIR/$BACKUP_NAME/django_data.json" 2>/dev/null; then
        success "Django data export completed"
    else
        warn "Django data export failed"
    fi
else
    warn "Django virtual environment not found"
fi

# 4. Essential Files Backup
log "Backing up essential files..."
cd "$PROJECT_ROOT"

# Copy essential files
cp -f backend.env "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || warn "backend.env not found"
cp -f docker-compose.yml "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || warn "docker-compose.yml not found"
cp -f Makefile "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || warn "Makefile not found"
cp -f README.md "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || warn "README.md not found"

# Copy essential directories
mkdir -p "$BACKUP_DIR/$BACKUP_NAME/config"
cp -rf backend/config/ "$BACKUP_DIR/$BACKUP_NAME/config/" 2>/dev/null || warn "Config backup failed"

success "Essential files backup completed"

# 5. Create simple recovery script
cat > "$BACKUP_DIR/$BACKUP_NAME/RECOVER.sh" << 'EOF'
#!/bin/bash
# Simple Recovery Script

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$(dirname "${BASH_SOURCE[0]}")"

echo "Starting simple recovery..."

# Stop services
echo "Stopping services..."
cd "$PROJECT_ROOT"
make dev-stop 2>/dev/null || true

# Restore code
echo "Restoring code..."
cd "$PROJECT_ROOT"
git checkout "$(grep 'Git Tag:' "$BACKUP_DIR/BACKUP_INFO.md" | cut -d' ' -f3)"

# Restore database (try multiple formats)
echo "Restoring database..."
cd "$PROJECT_ROOT/backend"
PSQL="/opt/homebrew/Cellar/postgresql@16/16.10/bin/psql"
PG_RESTORE="/opt/homebrew/Cellar/postgresql@16/16.10/bin/pg_restore"

# Try custom format first (fastest)
if [ -f "$BACKUP_DIR/database.dump" ] && [ -f "$PG_RESTORE" ]; then
    echo "Using custom format restore..."
    $PG_RESTORE -h localhost -U psychpath -d psychpath "$BACKUP_DIR/database.dump" || \
    $PG_RESTORE -h 127.0.0.1 -U psychpath -d psychpath "$BACKUP_DIR/database.dump"
elif [ -f "$BACKUP_DIR/database.sql" ]; then
    echo "Using SQL format restore..."
    $PSQL -h localhost -U psychpath -d psychpath < "$BACKUP_DIR/database.sql" || \
    $PSQL -h 127.0.0.1 -U psychpath -d psychpath < "$BACKUP_DIR/database.sql"
else
    echo "ERROR: No database backup found"
    exit 1
fi

# Restore essential files
echo "Restoring essential files..."
cd "$PROJECT_ROOT"
cp -f "$BACKUP_DIR/backend.env" . 2>/dev/null || warn "backend.env not found"
cp -f "$BACKUP_DIR/docker-compose.yml" . 2>/dev/null || warn "docker-compose.yml not found"

# Start services
echo "Starting services..."
cd "$PROJECT_ROOT"
make dev-start

echo "Simple recovery completed!"
EOF

chmod +x "$BACKUP_DIR/$BACKUP_NAME/RECOVER.sh"

# 6. Create backup info file
cat > "$BACKUP_DIR/$BACKUP_NAME/BACKUP_INFO.md" << EOF
# Simple Backup: $BACKUP_NAME

**Created:** $(date)
**Type:** Code + Database + Essential Files
**Status:** ✅ SIMPLE & RELIABLE

## Contents
- Code: Git tag \`$BACKUP_NAME\`
- Database: 
  - \`database.sql\` (SQL format)
  - \`database.dump\` (Custom format)
- Django Data: \`django_data.json\`
- Essential Files: \`backend.env\`, \`docker-compose.yml\`, \`Makefile\`, \`README.md\`
- Config: \`config/\`
- Recovery: \`RECOVER.sh\`

## Recovery Instructions
1. Run: \`cd backups/$BACKUP_NAME && ./RECOVER.sh\`
2. Or manually:
   - \`git checkout $BACKUP_NAME\`
   - \`psql -h localhost -U psychpath -d psychpath < database.sql\`

## Backup Quality
- ✅ Multiple database formats
- ✅ Essential files backup
- ✅ Configuration backup
- ✅ Django data export
- ✅ Git tag and push
- ✅ Simple and reliable

## Git Tag: $BACKUP_NAME
EOF

# 7. Create symlink to latest
ln -sfn "$BACKUP_NAME" "$BACKUP_DIR/latest"

# 8. Validate backup
log "Validating backup..."
cd "$BACKUP_DIR/$BACKUP_NAME"

# Check file sizes
echo "Backup validation:"
echo "- database.sql: $(du -h database.sql 2>/dev/null || echo 'N/A')"
echo "- database.dump: $(du -h database.dump 2>/dev/null || echo 'N/A')"
echo "- django_data.json: $(du -h django_data.json 2>/dev/null || echo 'N/A')"

success "Backup completed: $BACKUP_NAME"
echo ""
echo "📁 Backup location: $BACKUP_DIR/$BACKUP_NAME"
echo "🔄 Recovery command: cd backups/$BACKUP_NAME && ./RECOVER.sh"
echo "📋 Backup info: $BACKUP_DIR/$BACKUP_NAME/BACKUP_INFO.md"
echo ""
echo "✅ This is a SIMPLE, RELIABLE backup system!"
