#!/bin/bash

# PsychPATH Automated Checkpoint System
# This script creates detailed checkpoints before any major changes

set -e

PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"
CHECKPOINT_DIR="$PROJECT_ROOT/checkpoints"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CHECKPOINT_NAME="checkpoint_$TIMESTAMP"

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

# Create checkpoint directory
mkdir -p "$CHECKPOINT_DIR/$CHECKPOINT_NAME"

log "Creating checkpoint: $CHECKPOINT_NAME"

# 1. Capture current system state
log "Capturing system state..."

# Database state
cd "$PROJECT_ROOT/backend"
if command -v pg_dump &> /dev/null; then
    pg_dump -h localhost -U psychpath_user -d psychpath_db > "$CHECKPOINT_DIR/$CHECKPOINT_NAME/database_snapshot.sql"
    success "Database snapshot captured"
else
    warning "PostgreSQL not available, skipping database snapshot"
fi

# Git state
cd "$PROJECT_ROOT"
git add -A
git commit -m "CHECKPOINT: $CHECKPOINT_NAME - $(date)" || true
git tag "checkpoint_$TIMESTAMP"
success "Git state captured with tag: checkpoint_$TIMESTAMP"

# 2. Create detailed checkpoint documentation
cat > "$CHECKPOINT_DIR/$CHECKPOINT_NAME/CHECKPOINT_DETAILS.md" << EOF
# PsychPATH Checkpoint - $TIMESTAMP

## System State
- **Checkpoint ID**: $CHECKPOINT_NAME
- **Timestamp**: $(date)
- **Git Commit**: $(git rev-parse HEAD)
- **Git Branch**: $(git branch --show-current)
- **Working Directory**: $(pwd)

## Database State
- **PostgreSQL**: $(psql -h localhost -U psychpath_user -d psychpath_db -c "SELECT COUNT(*) FROM api_userprofile;" 2>/dev/null | tail -1 | xargs) user profiles
- **Logbook Entries**: $(psql -h localhost -U psychpath_user -d psychpath_db -c "SELECT COUNT(*) FROM logbook_app_weeklylogbook;" 2>/dev/null | tail -1 | xargs) entries
- **Supervision Records**: $(psql -h localhost -U psychpath_user -d psychpath_db -c "SELECT COUNT(*) FROM api_supervision;" 2>/dev/null | tail -1 | xargs) records

## Code State
- **Uncommitted Changes**: $(git status --porcelain | wc -l) files
- **Modified Files**: $(git status --porcelain | grep "^ M" | wc -l) files
- **New Files**: $(git status --porcelain | grep "^??" | wc -l) files

## Services Status
- **Backend Server**: $(pgrep -f "manage.py runserver" && echo "Running (PID: $(pgrep -f "manage.py runserver"))" || echo "Stopped")
- **Frontend Server**: $(pgrep -f "npm run dev" && echo "Running (PID: $(pgrep -f "npm run dev"))" || echo "Stopped")

## Environment
- **Node Version**: $(node --version 2>/dev/null || echo "Not available")
- **Python Version**: $(python3 --version 2>/dev/null || echo "Not available")
- **PostgreSQL Version**: $(psql --version 2>/dev/null || echo "Not available")

## Recent Changes
$(git log --oneline -10)

## File Modifications
$(git diff --name-only HEAD~5..HEAD 2>/dev/null || echo "No recent changes")

## Recovery Instructions
1. **Restore Database**: psql -h localhost -U psychpath_user -d psychpath_db < database_snapshot.sql
2. **Restore Code**: git checkout checkpoint_$TIMESTAMP
3. **Start Services**: make dev-start
4. **Validate**: Run validation tests

## Validation Checklist
- [ ] Database restored successfully
- [ ] All users can login
- [ ] All logbook entries visible
- [ ] Supervisor-supervisee relationships intact
- [ ] All functionality working as expected
- [ ] No console errors
- [ ] All API endpoints responding

## Notes
$(echo "Checkpoint created before: $1" || echo "Checkpoint created for system stability")
EOF

success "Checkpoint documentation created"

# 3. Create quick recovery script
cat > "$CHECKPOINT_DIR/$CHECKPOINT_NAME/QUICK_RECOVER.sh" << 'EOF'
#!/bin/bash
# Quick Recovery Script for Checkpoint
set -e

PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"
CHECKPOINT_DIR="$(dirname "$0")"

echo "Quick recovery from checkpoint..."

# Stop services
cd "$PROJECT_ROOT"
make dev-stop 2>/dev/null || true

# Restore database
if [ -f "$CHECKPOINT_DIR/database_snapshot.sql" ]; then
    echo "Restoring database..."
    cd "$PROJECT_ROOT/backend"
    psql -h localhost -U psychpath_user -d psychpath_db < "$CHECKPOINT_DIR/database_snapshot.sql"
fi

# Restore code
echo "Restoring code state..."
cd "$PROJECT_ROOT"
git checkout "$(grep 'Git Tag:' "$CHECKPOINT_DIR/CHECKPOINT_DETAILS.md" | cut -d' ' -f3)"

# Start services
echo "Starting services..."
make dev-start

echo "Recovery completed!"
EOF

chmod +x "$CHECKPOINT_DIR/$CHECKPOINT_NAME/QUICK_RECOVER.sh"

# 4. Update checkpoint index
cat > "$CHECKPOINT_DIR/INDEX.md" << EOF
# PsychPATH Checkpoint Index

## Latest Checkpoint
- **Name**: $CHECKPOINT_NAME
- **Date**: $(date)
- **Status**: ✅ Complete

## All Checkpoints
$(ls -la "$CHECKPOINT_DIR" | grep "checkpoint_" | tail -10)

## Quick Recovery
\`\`\`bash
cd "$CHECKPOINT_DIR/$CHECKPOINT_NAME"
./QUICK_RECOVER.sh
\`\`\`
EOF

success "Checkpoint completed: $CHECKPOINT_NAME"
success "Location: $CHECKPOINT_DIR/$CHECKPOINT_NAME"
success "Quick Recovery: cd $CHECKPOINT_DIR/$CHECKPOINT_NAME && ./QUICK_RECOVER.sh"
