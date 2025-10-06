#!/bin/bash

# Simple PsychPATH Backup System
# This works without requiring additional PostgreSQL tools

set -e

PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="psychpath_backup_$TIMESTAMP"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

log "Starting simple backup: $BACKUP_NAME"

# 1. Code State Backup (Git)
log "Backing up code state..."
cd "$PROJECT_ROOT"
git add -A
git commit -m "BACKUP: Automated backup checkpoint - $TIMESTAMP" || true
git tag "backup_$TIMESTAMP"
success "Code state backed up with tag: backup_$TIMESTAMP"

# 2. Database Backup (using Django)
log "Backing up database using Django..."
cd "$PROJECT_ROOT/backend"
python manage.py dumpdata --natural-foreign --natural-primary > "$BACKUP_DIR/$BACKUP_NAME/database_django.json"
success "Database backed up using Django dumpdata"

# 3. Environment Files
log "Backing up environment files..."
cp "$PROJECT_ROOT/backend.env" "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || true
cp "$PROJECT_ROOT/docker-compose.yml" "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || true
cp "$PROJECT_ROOT/docker-compose.prod.yml" "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || true
success "Environment files backed up"

# 4. Dependencies
log "Backing up dependencies..."
cp "$PROJECT_ROOT/backend/requirements.txt" "$BACKUP_DIR/$BACKUP_NAME/"
cp "$PROJECT_ROOT/frontend/package.json" "$BACKUP_DIR/$BACKUP_NAME/"
cp "$PROJECT_ROOT/frontend/package-lock.json" "$BACKUP_DIR/$BACKUP_NAME/"
success "Dependencies backed up"

# 5. Create recovery script
log "Creating recovery script..."
cat > "$BACKUP_DIR/$BACKUP_NAME/RECOVER.sh" << 'EOF'
#!/bin/bash
# Simple PsychPATH Recovery Script

set -e

PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"
BACKUP_DIR="$(dirname "$0")"

echo "Starting PsychPATH recovery..."

# Stop services
cd "$PROJECT_ROOT"
make dev-stop 2>/dev/null || true

# Restore code state
echo "Restoring code state..."
cd "$PROJECT_ROOT"
git checkout "$(grep 'Git Tag:' "$BACKUP_DIR/BACKUP_INFO.md" | cut -d' ' -f3)"

# Restore database
echo "Restoring database..."
cd "$PROJECT_ROOT/backend"
python manage.py flush --noinput
python manage.py loaddata "$BACKUP_DIR/database_django.json"

# Start services
echo "Starting services..."
cd "$PROJECT_ROOT"
make dev-start

echo "Recovery completed! Please verify all functionality."
EOF

chmod +x "$BACKUP_DIR/$BACKUP_NAME/RECOVER.sh"
success "Recovery script created"

# 6. Create backup info
cat > "$BACKUP_DIR/$BACKUP_NAME/BACKUP_INFO.md" << EOF
# PsychPATH Backup - $TIMESTAMP

## Backup Information
- **Backup ID**: $BACKUP_NAME
- **Timestamp**: $(date)
- **Git Commit**: $(git rev-parse HEAD)
- **Git Tag**: backup_$TIMESTAMP

## Database State
- **Django Dump**: database_django.json
- **File Size**: $(du -h "$BACKUP_DIR/$BACKUP_NAME/database_django.json" | cut -f1)

## Recovery Instructions
1. **Stop services**: make dev-stop
2. **Restore code**: git checkout backup_$TIMESTAMP
3. **Restore database**: cd backend && python manage.py flush --noinput && python manage.py loaddata ../backups/$BACKUP_NAME/database_django.json
4. **Start services**: make dev-start

## Quick Recovery
\`\`\`bash
cd "$BACKUP_DIR/$BACKUP_NAME"
./RECOVER.sh
\`\`\`
EOF

success "Backup info created"

# 7. Update backup index
cat > "$BACKUP_DIR/INDEX.md" << EOF
# PsychPATH Backup Index

## Latest Backup
- **Name**: $BACKUP_NAME
- **Date**: $(date)
- **Status**: ✅ Complete

## All Backups
$(ls -la "$BACKUP_DIR" | grep "psychpath_backup_" | tail -10)

## Quick Recovery
\`\`\`bash
cd "$BACKUP_DIR/$BACKUP_NAME"
./RECOVER.sh
\`\`\`
EOF

success "Backup index updated"

log "Backup completed successfully!"
success "Backup ID: $BACKUP_NAME"
success "Location: $BACKUP_DIR/$BACKUP_NAME"
success "Recovery: cd $BACKUP_DIR/$BACKUP_NAME && ./RECOVER.sh"
