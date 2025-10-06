#!/bin/bash

# Simple Code Backup System
# This creates a code-only backup that you can easily restore from

set -e

PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="code_backup_$TIMESTAMP"

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

log "Starting code backup: $BACKUP_NAME"

# 1. Code State Backup (Git)
log "Backing up code state..."
cd "$PROJECT_ROOT"
git add -A
git commit -m "BACKUP: Code backup checkpoint - $TIMESTAMP" || true
git tag "code_backup_$TIMESTAMP"
success "Code state backed up with tag: code_backup_$TIMESTAMP"

# 2. Create a simple recovery script
log "Creating recovery script..."
cat > "$BACKUP_DIR/$BACKUP_NAME/RECOVER.sh" << 'EOF'
#!/bin/bash
# Simple Code Recovery Script

set -e

PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"
BACKUP_DIR="$(dirname "$0")"

echo "Starting PsychPATH code recovery..."

# Stop services
cd "$PROJECT_ROOT"
make dev-stop 2>/dev/null || true

# Restore code state
echo "Restoring code state..."
cd "$PROJECT_ROOT"
git checkout "$(grep 'Git Tag:' "$BACKUP_DIR/BACKUP_INFO.md" | cut -d' ' -f3)"

# Start services
echo "Starting services..."
cd "$PROJECT_ROOT"
make dev-start

echo "Code recovery completed! Please verify all functionality."
EOF

chmod +x "$BACKUP_DIR/$BACKUP_NAME/RECOVER.sh"
success "Recovery script created"

# 3. Create backup info
cat > "$BACKUP_DIR/$BACKUP_NAME/BACKUP_INFO.md" << EOF
# PsychPATH Code Backup - $TIMESTAMP

## Backup Information
- **Backup ID**: $BACKUP_NAME
- **Timestamp**: $(date)
- **Git Commit**: $(git rev-parse HEAD)
- **Git Tag**: code_backup_$TIMESTAMP

## Recovery Instructions
1. **Stop services**: make dev-stop
2. **Restore code**: git checkout code_backup_$TIMESTAMP
3. **Start services**: make dev-start

## Quick Recovery
\`\`\`bash
cd "$BACKUP_DIR/$BACKUP_NAME"
./RECOVER.sh
\`\`\`

## Manual Recovery
\`\`\`bash
cd /Users/macdemac/Local\ Sites/PsychPATH
make dev-stop
git checkout code_backup_$TIMESTAMP
make dev-start
\`\`\`
EOF

success "Backup info created"

# 4. Update backup index
cat > "$BACKUP_DIR/CODE_INDEX.md" << EOF
# PsychPATH Code Backup Index

## Latest Backup
- **Name**: $BACKUP_NAME
- **Date**: $(date)
- **Status**: ✅ Complete

## All Code Backups
$(ls -la "$BACKUP_DIR" | grep "code_backup_" | tail -10)

## Quick Recovery
\`\`\`bash
cd "$BACKUP_DIR/$BACKUP_NAME"
./RECOVER.sh
\`\`\`

## List All Backups
\`\`\`bash
ls -la backups/ | grep "code_backup_"
\`\`\`
EOF

success "Backup index updated"

log "Code backup completed successfully!"
success "Backup ID: $BACKUP_NAME"
success "Location: $BACKUP_DIR/$BACKUP_NAME"
success "Recovery: cd $BACKUP_DIR/$BACKUP_NAME && ./RECOVER.sh"
success "Manual Recovery: git checkout code_backup_$TIMESTAMP"
