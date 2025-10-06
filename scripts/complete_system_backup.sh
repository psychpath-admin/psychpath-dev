#!/bin/bash

# Complete System Backup for PsychPATH
# This creates a comprehensive backup including code, database, and system state

set -e

PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="complete_backup_$TIMESTAMP"

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

log "Starting complete system backup: $BACKUP_NAME"

# 1. Code Backup (Git)
log "Backing up code to GitHub..."
cd "$PROJECT_ROOT"
git add -A
git commit -m "BACKUP: Complete system backup - $TIMESTAMP" || true
git push origin $(git branch --show-current) || warning "Failed to push to GitHub"
git tag "complete_backup_$TIMESTAMP"
success "Code backed up with tag: complete_backup_$TIMESTAMP"

# 2. Database Backup (PostgreSQL)
log "Backing up PostgreSQL database..."
cd "$PROJECT_ROOT/backend"

# Try different methods to backup PostgreSQL
if command -v pg_dump &> /dev/null; then
    pg_dump -h localhost -U psychpath_user -d psychpath_db > "$BACKUP_DIR/$BACKUP_NAME/database_postgresql.sql"
    success "PostgreSQL backup completed using pg_dump"
elif command -v docker &> /dev/null && docker ps | grep -q postgres; then
    docker exec $(docker ps | grep postgres | awk '{print $1}') pg_dump -U psychpath_user psychpath_db > "$BACKUP_DIR/$BACKUP_NAME/database_postgresql.sql"
    success "PostgreSQL backup completed using Docker"
else
    # Fallback to Django dumpdata
    warning "pg_dump not available, using Django dumpdata..."
    ./venv/bin/python manage.py dumpdata --natural-foreign --natural-primary --indent=2 > "$BACKUP_DIR/$BACKUP_NAME/database_django.json"
    success "Database backed up using Django dumpdata"
fi

# 3. System Configuration Backup
log "Backing up system configuration..."
cp "$PROJECT_ROOT/backend.env" "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || true
cp "$PROJECT_ROOT/docker-compose.yml" "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || true
cp "$PROJECT_ROOT/docker-compose.prod.yml" "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || true
cp "$PROJECT_ROOT/Makefile" "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || true
cp "$PROJECT_ROOT/nginx/nginx.conf" "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || true
success "System configuration backed up"

# 4. Dependencies Backup
log "Backing up dependencies..."
cp "$PROJECT_ROOT/backend/requirements.txt" "$BACKUP_DIR/$BACKUP_NAME/"
cp "$PROJECT_ROOT/frontend/package.json" "$BACKUP_DIR/$BACKUP_NAME/"
cp "$PROJECT_ROOT/frontend/package-lock.json" "$BACKUP_DIR/$BACKUP_NAME/"
success "Dependencies backed up"

# 5. Log Files Backup
log "Backing up log files..."
mkdir -p "$BACKUP_DIR/$BACKUP_NAME/logs"
cp "$PROJECT_ROOT/logs/backend.log" "$BACKUP_DIR/$BACKUP_NAME/logs/" 2>/dev/null || true
cp "$PROJECT_ROOT/logs/frontend.log" "$BACKUP_DIR/$BACKUP_NAME/logs/" 2>/dev/null || true
cp "$PROJECT_ROOT/logs/support_errors.log" "$BACKUP_DIR/$BACKUP_NAME/logs/" 2>/dev/null || true
success "Log files backed up"

# 6. Create comprehensive recovery script
log "Creating comprehensive recovery script..."
cat > "$BACKUP_DIR/$BACKUP_NAME/RECOVER.sh" << 'EOF'
#!/bin/bash
# Complete System Recovery Script

set -e

PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"
BACKUP_DIR="$(dirname "$0")"

echo "Starting complete system recovery..."

# Stop all services
echo "Stopping all services..."
cd "$PROJECT_ROOT"
make dev-stop 2>/dev/null || true
pkill -f "manage.py runserver" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true

# Restore code from GitHub
echo "Restoring code from GitHub..."
cd "$PROJECT_ROOT"
git fetch origin
git checkout "$(grep 'Git Tag:' "$BACKUP_DIR/BACKUP_INFO.md" | cut -d' ' -f3)"

# Restore database
echo "Restoring database..."
cd "$PROJECT_ROOT/backend"

if [ -f "$BACKUP_DIR/database_postgresql.sql" ]; then
    echo "Restoring from PostgreSQL dump..."
    if command -v psql &> /dev/null; then
        psql -h localhost -U psychpath_user -d psychpath_db < "$BACKUP_DIR/database_postgresql.sql"
    elif command -v docker &> /dev/null && docker ps | grep -q postgres; then
        docker exec -i $(docker ps | grep postgres | awk '{print $1}') psql -U psychpath_user -d psychpath_db < "$BACKUP_DIR/database_postgresql.sql"
    else
        echo "ERROR: Cannot restore PostgreSQL database - no psql or Docker available"
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

# Install dependencies
echo "Installing dependencies..."
cd "$PROJECT_ROOT/backend"
./venv/bin/pip install -r requirements.txt

cd "$PROJECT_ROOT/frontend"
npm install

# Start services
echo "Starting services..."
cd "$PROJECT_ROOT"
make dev-start

echo "Recovery completed! Please verify all functionality."
EOF

chmod +x "$BACKUP_DIR/$BACKUP_NAME/RECOVER.sh"
success "Recovery script created"

# 7. Create backup information
cat > "$BACKUP_DIR/$BACKUP_NAME/BACKUP_INFO.md" << EOF
# Complete System Backup - $TIMESTAMP

## Backup Information
- **Backup ID**: $BACKUP_NAME
- **Timestamp**: $(date)
- **Git Commit**: $(git rev-parse HEAD)
- **Git Tag**: complete_backup_$TIMESTAMP
- **GitHub Branch**: $(git branch --show-current)

## Database State
- **PostgreSQL**: $(ls -la "$BACKUP_DIR/$BACKUP_NAME/database_postgresql.sql" 2>/dev/null && echo "✅ Available" || echo "❌ Not available")
- **Django Dump**: $(ls -la "$BACKUP_DIR/$BACKUP_NAME/database_django.json" 2>/dev/null && echo "✅ Available" || echo "❌ Not available")

## System State
- **Backend Log**: $(ls -la "$BACKUP_DIR/$BACKUP_NAME/logs/backend.log" 2>/dev/null && echo "✅ Available" || echo "❌ Not available")
- **Frontend Log**: $(ls -la "$BACKUP_DIR/$BACKUP_NAME/logs/frontend.log" 2>/dev/null && echo "✅ Available" || echo "❌ Not available")

## Recovery Instructions
1. **Stop services**: make dev-stop
2. **Restore code**: git checkout complete_backup_$TIMESTAMP
3. **Restore database**: Use the appropriate method based on available backups
4. **Start services**: make dev-start

## Quick Recovery
\`\`\`bash
cd "$BACKUP_DIR/$BACKUP_NAME"
./RECOVER.sh
\`\`\`

## Manual Recovery
\`\`\`bash
cd /Users/macdemac/Local\ Sites/PsychPATH
make dev-stop
git checkout complete_backup_$TIMESTAMP
# Then restore database using appropriate method
make dev-start
\`\`\`
EOF

success "Backup information created"

# 8. Update backup index
cat > "$BACKUP_DIR/COMPLETE_INDEX.md" << EOF
# Complete System Backup Index

## Latest Backup
- **Name**: $BACKUP_NAME
- **Date**: $(date)
- **Status**: ✅ Complete

## All Complete Backups
$(ls -la "$BACKUP_DIR" | grep "complete_backup_" | tail -10)

## Quick Recovery
\`\`\`bash
cd "$BACKUP_DIR/$BACKUP_NAME"
./RECOVER.sh
\`\`\`

## List All Backups
\`\`\`bash
ls -la backups/ | grep "complete_backup_"
\`\`\`
EOF

success "Backup index updated"

# 9. Cleanup old backups (keep last 5)
log "Cleaning up old backups..."
cd "$BACKUP_DIR"
ls -t | grep "complete_backup_" | tail -n +6 | xargs rm -rf 2>/dev/null || true
success "Old backups cleaned up"

log "Complete system backup finished!"
success "Backup ID: $BACKUP_NAME"
success "Location: $BACKUP_DIR/$BACKUP_NAME"
success "Recovery: cd $BACKUP_DIR/$BACKUP_NAME && ./RECOVER.sh"
success "GitHub: Code is also backed up to GitHub with tag complete_backup_$TIMESTAMP"
