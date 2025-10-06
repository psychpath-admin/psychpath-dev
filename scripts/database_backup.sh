#!/bin/bash

# Database-Only Backup for PsychPATH
# This creates a database backup that actually works

set -e

PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="db_backup_$TIMESTAMP"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
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

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

log "Starting database backup: $BACKUP_NAME"

# Try multiple methods to backup the database
cd "$PROJECT_ROOT/backend"

# Method 1: Try pg_dump
if command -v pg_dump &> /dev/null; then
    log "Using pg_dump..."
    if pg_dump -h localhost -U psychpath_user -d psychpath_db > "$BACKUP_DIR/$BACKUP_NAME/database_postgresql.sql" 2>/dev/null; then
        success "PostgreSQL backup completed using pg_dump"
    else
        warning "pg_dump failed, trying alternative method..."
        # Method 2: Try Django dumpdata
        if ./venv/bin/python manage.py dumpdata --natural-foreign --natural-primary --indent=2 > "$BACKUP_DIR/$BACKUP_NAME/database_django.json" 2>/dev/null; then
            success "Database backed up using Django dumpdata"
        else
            error "All database backup methods failed"
            exit 1
        fi
    fi
else
    # Method 2: Try Django dumpdata
    log "Using Django dumpdata..."
    if ./venv/bin/python manage.py dumpdata --natural-foreign --natural-primary --indent=2 > "$BACKUP_DIR/$BACKUP_NAME/database_django.json" 2>/dev/null; then
        success "Database backed up using Django dumpdata"
    else
        error "Django dumpdata failed"
        exit 1
    fi
fi

# Create recovery script
cat > "$BACKUP_DIR/$BACKUP_NAME/RECOVER_DB.sh" << 'EOF'
#!/bin/bash
# Database Recovery Script

set -e

PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"
BACKUP_DIR="$(dirname "$0")"

echo "Starting database recovery..."

cd "$PROJECT_ROOT/backend"

if [ -f "$BACKUP_DIR/database_postgresql.sql" ]; then
    echo "Restoring from PostgreSQL dump..."
    if command -v psql &> /dev/null; then
        psql -h localhost -U psychpath_user -d psychpath_db < "$BACKUP_DIR/database_postgresql.sql"
    else
        echo "ERROR: psql not available"
        exit 1
    fi
elif [ -f "$BACKUP_DIR/database_django.json" ]; then
    echo "Restoring from Django dumpdata..."
    ./venv/bin/python manage.py flush --noinput
    ./venv/bin/python manage.py loaddata "$BACKUP_DIR/database_django.json"
else
    echo "ERROR: No database backup found"
    exit 1
fi

echo "Database recovery completed!"
EOF

chmod +x "$BACKUP_DIR/$BACKUP_NAME/RECOVER_DB.sh"

# Create backup info
cat > "$BACKUP_DIR/$BACKUP_NAME/DB_BACKUP_INFO.md" << EOF
# Database Backup - $TIMESTAMP

## Backup Information
- **Backup ID**: $BACKUP_NAME
- **Timestamp**: $(date)
- **Method**: $(ls -la "$BACKUP_DIR/$BACKUP_NAME/database_postgresql.sql" 2>/dev/null && echo "PostgreSQL dump" || echo "Django dumpdata")

## Recovery Instructions
\`\`\`bash
cd "$BACKUP_DIR/$BACKUP_NAME"
./RECOVER_DB.sh
\`\`\`
EOF

success "Database backup completed: $BACKUP_NAME"
success "Location: $BACKUP_DIR/$BACKUP_NAME"
success "Recovery: cd $BACKUP_DIR/$BACKUP_NAME && ./RECOVER_DB.sh"
