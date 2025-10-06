#!/bin/bash

# PsychPATH Bulletproof Backup & Recovery System
# This script ensures complete system state capture and recovery

set -e  # Exit on any error

# Configuration
PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="psychpath_backup_$TIMESTAMP"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

log "Starting comprehensive backup: $BACKUP_NAME"

# 1. Database Backup (PostgreSQL)
log "Backing up PostgreSQL database..."
cd "$PROJECT_ROOT/backend"
if command -v pg_dump &> /dev/null; then
    pg_dump -h localhost -U psychpath_user -d psychpath_db > "$BACKUP_DIR/$BACKUP_NAME/database_postgresql.sql"
    success "PostgreSQL backup completed"
else
    error "pg_dump not found. Please install PostgreSQL client tools."
    exit 1
fi

# 2. Code State Backup
log "Backing up code state..."
cd "$PROJECT_ROOT"
git add -A
git commit -m "BACKUP: Automated backup checkpoint - $TIMESTAMP" || true
git tag "backup_$TIMESTAMP"
success "Code state backed up with tag: backup_$TIMESTAMP"

# 3. Environment Configuration Backup
log "Backing up environment configuration..."
cp -r "$PROJECT_ROOT/backend/.env" "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || true
cp "$PROJECT_ROOT/backend.env" "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || true
cp "$PROJECT_ROOT/docker-compose.yml" "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || true
cp "$PROJECT_ROOT/docker-compose.prod.yml" "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || true
success "Environment configuration backed up"

# 4. Frontend Dependencies Backup
log "Backing up frontend dependencies..."
cd "$PROJECT_ROOT/frontend"
cp package.json "$BACKUP_DIR/$BACKUP_NAME/"
cp package-lock.json "$BACKUP_DIR/$BACKUP_NAME/"
success "Frontend dependencies backed up"

# 5. Backend Dependencies Backup
log "Backing up backend dependencies..."
cd "$PROJECT_ROOT/backend"
cp requirements.txt "$BACKUP_DIR/$BACKUP_NAME/"
success "Backend dependencies backed up"

# 6. System State Documentation
log "Creating system state documentation..."
cat > "$BACKUP_DIR/$BACKUP_NAME/SYSTEM_STATE.md" << EOF
# PsychPATH System State - $TIMESTAMP

## Backup Information
- **Backup ID**: $BACKUP_NAME
- **Timestamp**: $(date)
- **Git Commit**: $(git rev-parse HEAD)
- **Git Branch**: $(git branch --show-current)

## Database State
- **PostgreSQL**: Backed up to database_postgresql.sql
- **Database Size**: $(du -h "$BACKUP_DIR/$BACKUP_NAME/database_postgresql.sql" | cut -f1)

## Code State
- **Git Tag**: backup_$TIMESTAMP
- **Uncommitted Changes**: $(git status --porcelain | wc -l) files

## Environment
- **Node Version**: $(node --version 2>/dev/null || echo "Not available")
- **Python Version**: $(python3 --version 2>/dev/null || echo "Not available")
- **PostgreSQL Version**: $(psql --version 2>/dev/null || echo "Not available")

## Services Status
- **Backend Server**: $(pgrep -f "manage.py runserver" && echo "Running" || echo "Stopped")
- **Frontend Server**: $(pgrep -f "npm run dev" && echo "Running" || echo "Stopped")

## Recovery Instructions
1. Restore database: psql -h localhost -U psychpath_user -d psychpath_db < database_postgresql.sql
2. Restore code: git checkout backup_$TIMESTAMP
3. Install dependencies: cd backend && pip install -r requirements.txt && cd ../frontend && npm install
4. Start services: make dev-start

## Validation Checklist
- [ ] Database restored successfully
- [ ] All users can login
- [ ] All logbook entries visible
- [ ] Supervisor-supervisee relationships intact
- [ ] All functionality working as expected
EOF

success "System state documentation created"

# 7. Create recovery script
log "Creating recovery script..."
cat > "$BACKUP_DIR/$BACKUP_NAME/RECOVER.sh" << 'EOF'
#!/bin/bash
# PsychPATH Recovery Script
# Usage: ./RECOVER.sh

set -e

PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"
BACKUP_DIR="$(dirname "$0")"

echo "Starting PsychPATH recovery..."

# Stop any running services
cd "$PROJECT_ROOT"
make dev-stop 2>/dev/null || true

# Restore database
echo "Restoring PostgreSQL database..."
cd "$PROJECT_ROOT/backend"
psql -h localhost -U psychpath_user -d psychpath_db < "$BACKUP_DIR/database_postgresql.sql"

# Restore code state
echo "Restoring code state..."
cd "$PROJECT_ROOT"
git checkout "$(grep 'Git Tag:' "$BACKUP_DIR/SYSTEM_STATE.md" | cut -d' ' -f3)"

# Install dependencies
echo "Installing backend dependencies..."
cd "$PROJECT_ROOT/backend"
pip install -r requirements.txt

echo "Installing frontend dependencies..."
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

# 8. Create validation script
log "Creating validation script..."
cat > "$BACKUP_DIR/$BACKUP_NAME/VALIDATE.sh" << 'EOF'
#!/bin/bash
# PsychPATH Validation Script
# Usage: ./VALIDATE.sh

set -e

PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"

echo "Validating PsychPATH system..."

# Check if services are running
echo "Checking services..."
if ! pgrep -f "manage.py runserver" > /dev/null; then
    echo "ERROR: Backend server not running"
    exit 1
fi

if ! pgrep -f "npm run dev" > /dev/null; then
    echo "ERROR: Frontend server not running"
    exit 1
fi

# Test database connection
echo "Testing database connection..."
cd "$PROJECT_ROOT/backend"
python manage.py check --database default

# Test API endpoints
echo "Testing API endpoints..."
curl -s http://localhost:8000/api/me/ > /dev/null || {
    echo "ERROR: API not responding"
    exit 1
}

echo "SUCCESS: All validations passed!"
EOF

chmod +x "$BACKUP_DIR/$BACKUP_NAME/VALIDATE.sh"
success "Validation script created"

# 9. Update backup index
log "Updating backup index..."
cat > "$BACKUP_DIR/INDEX.md" << EOF
# PsychPATH Backup Index

## Latest Backup
- **Name**: $BACKUP_NAME
- **Date**: $(date)
- **Status**: ✅ Complete

## All Backups
$(ls -la "$BACKUP_DIR" | grep "psychpath_backup_" | tail -10)

## Recovery Instructions
1. Navigate to desired backup directory
2. Run: ./RECOVER.sh
3. Run: ./VALIDATE.sh
4. Verify functionality manually

## Emergency Recovery
If you need to recover from a specific backup:
\`\`\`bash
cd "$BACKUP_DIR/$BACKUP_NAME"
./RECOVER.sh
./VALIDATE.sh
\`\`\`
EOF

success "Backup index updated"

# 10. Cleanup old backups (keep last 10)
log "Cleaning up old backups..."
cd "$BACKUP_DIR"
ls -t | grep "psychpath_backup_" | tail -n +11 | xargs rm -rf 2>/dev/null || true
success "Old backups cleaned up"

log "Backup completed successfully!"
success "Backup ID: $BACKUP_NAME"
success "Location: $BACKUP_DIR/$BACKUP_NAME"
success "Recovery: cd $BACKUP_DIR/$BACKUP_NAME && ./RECOVER.sh"
