#!/bin/bash

# PsychPATH Checkpoint System
# Creates a complete snapshot of the current development state

set -e

# Configuration
PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"
CHECKPOINT_DIR="$PROJECT_ROOT/checkpoints"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
POSTGRES_BIN="/opt/homebrew/opt/postgresql@16/bin"

# Add PostgreSQL binaries to PATH
export PATH="$POSTGRES_BIN:$PATH"

# Get checkpoint description
if [ -z "$1" ]; then
    echo "Usage: $0 'Description of work being checkpointed'"
    echo "Example: $0 'Working on logbook review process between supervisor.demo and intern4.demo'"
    exit 1
fi

DESCRIPTION="$1"
CHECKPOINT_NAME="checkpoint_${TIMESTAMP}_$(echo "$DESCRIPTION" | tr ' ' '_' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9_-]//g')"
CHECKPOINT_PATH="$CHECKPOINT_DIR/$CHECKPOINT_NAME"

echo "🛡️  Creating checkpoint: $CHECKPOINT_NAME"
echo "📝 Description: $DESCRIPTION"
echo "📁 Location: $CHECKPOINT_PATH"
echo ""

# Create checkpoint directory
mkdir -p "$CHECKPOINT_PATH"

# 1. Create PostgreSQL backup
echo "💾 Creating PostgreSQL backup..."
mkdir -p "$CHECKPOINT_PATH/database"
pg_dump -U psychpath -d psychpath --verbose --clean --if-exists --create \
    -f "$CHECKPOINT_PATH/database/postgres-backup.sql"
pg_dump -U psychpath -d psychpath --verbose --format=custom --compress=9 \
    -f "$CHECKPOINT_PATH/database/postgres-backup.dump"

# 2. Create code backup
echo "📦 Creating code backup..."
mkdir -p "$CHECKPOINT_PATH/code"
rsync -av --exclude='node_modules' --exclude='.git' --exclude='__pycache__' \
    --exclude='*.pyc' --exclude='.DS_Store' --exclude='venv' \
    --exclude='checkpoints' \
    "$PROJECT_ROOT/" "$CHECKPOINT_PATH/code/"

# 3. Create git checkpoint
echo "🔀 Creating git checkpoint..."
cd "$PROJECT_ROOT"
CURRENT_BRANCH=$(git branch --show-current)
CHECKPOINT_BRANCH="checkpoint/$CHECKPOINT_NAME"

# Create checkpoint branch
git checkout -b "$CHECKPOINT_BRANCH" 2>/dev/null || git checkout "$CHECKPOINT_BRANCH"

# Add all changes and commit
git add .
git commit -m "CHECKPOINT: $DESCRIPTION

Created: $(date)
Branch: $CURRENT_BRANCH
Checkpoint: $CHECKPOINT_NAME

This checkpoint captures the state before continuing work.
Use 'git checkout $CHECKPOINT_BRANCH' to return to this state."

# Tag the checkpoint
git tag -a "$CHECKPOINT_NAME" -m "Checkpoint: $DESCRIPTION"

# Return to original branch
git checkout "$CURRENT_BRANCH"

# 4. Create Docker snapshot (if containers are running)
echo "🐳 Creating Docker snapshot..."
if docker ps | grep -q psychpath; then
    echo "Docker containers detected. Creating snapshot..."
    
    # Export PostgreSQL container
    docker exec psychpath_postgres pg_dump -U psychpath psychpath > "$CHECKPOINT_PATH/docker-postgres.sql"
    
    # Save container states
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" > "$CHECKPOINT_PATH/docker-status.txt"
else
    echo "No Docker containers running. Skipping Docker snapshot."
fi

# 5. Create checkpoint metadata
echo "📋 Creating checkpoint metadata..."
cat > "$CHECKPOINT_PATH/checkpoint-info.json" << EOF
{
    "name": "$CHECKPOINT_NAME",
    "description": "$DESCRIPTION",
    "created": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "timestamp": "$TIMESTAMP",
    "git_branch": "$CURRENT_BRANCH",
    "git_commit": "$(git rev-parse HEAD)",
    "postgres_version": "$(psql -U psychpath -d psychpath -t -c 'SELECT version();' | xargs)",
    "database_size": "$(psql -U psychpath -d psychpath -t -c 'SELECT pg_size_pretty(pg_database_size(current_database()));' | xargs)",
    "files_count": "$(find "$PROJECT_ROOT" -type f -name "*.py" -o -name "*.tsx" -o -name "*.ts" | wc -l | xargs)",
    "recovery_instructions": {
        "postgresql": "psql -U psychpath -d postgres -f $CHECKPOINT_PATH/database/postgres-backup.sql",
        "git": "git checkout $CHECKPOINT_BRANCH",
        "docker": "docker-compose -f docker-compose.checkpoint.yml up -d"
    }
}
EOF

# 6. Create recovery script
echo "🔧 Creating recovery script..."
cat > "$CHECKPOINT_PATH/restore.sh" << 'EOF'
#!/bin/bash
# Recovery script for checkpoint: $CHECKPOINT_NAME

set -e

CHECKPOINT_PATH="$(dirname "$0")"
PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"

echo "🔄 Restoring checkpoint: $(basename "$CHECKPOINT_PATH")"
echo "📁 From: $CHECKPOINT_PATH"
echo ""

# Restore code
echo "📦 Restoring code..."
rsync -av --delete "$CHECKPOINT_PATH/code/" "$PROJECT_ROOT/"

# Restore PostgreSQL
echo "💾 Restoring PostgreSQL database..."
cd "$PROJECT_ROOT"
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

# Drop and recreate database
psql -U psychpath -d postgres -c "DROP DATABASE IF EXISTS psychpath;"
psql -U psychpath -d postgres -c "CREATE DATABASE psychpath OWNER psychpath;"

# Restore from backup
psql -U psychpath -d psychpath -f "$CHECKPOINT_PATH/database/postgres-backup.sql"

# Restore git state
echo "🔀 Restoring git state..."
git checkout "$CHECKPOINT_NAME" 2>/dev/null || git checkout "checkpoint/$CHECKPOINT_NAME"

echo ""
echo "✅ Checkpoint restored successfully!"
echo "🚀 You can now continue development from this point."
EOF

chmod +x "$CHECKPOINT_PATH/restore.sh"

# 7. Calculate sizes and create summary
SQL_SIZE=$(du -h "$CHECKPOINT_PATH/database/postgres-backup.sql" | cut -f1)
DUMP_SIZE=$(du -h "$CHECKPOINT_PATH/database/postgres-backup.dump" | cut -f1)
CODE_SIZE=$(du -sh "$CHECKPOINT_PATH/code" | cut -f1)
TOTAL_SIZE=$(du -sh "$CHECKPOINT_PATH" | cut -f1)

echo ""
echo "✅ Checkpoint created successfully!"
echo ""
echo "📊 Checkpoint Summary:"
echo "   Name: $CHECKPOINT_NAME"
echo "   Description: $DESCRIPTION"
echo "   Location: $CHECKPOINT_PATH"
echo "   SQL Backup: $SQL_SIZE"
echo "   Custom Backup: $DUMP_SIZE"
echo "   Code Backup: $CODE_SIZE"
echo "   Total Size: $TOTAL_SIZE"
echo ""
echo "🔄 Recovery Options:"
echo "   1. Quick restore: $CHECKPOINT_PATH/restore.sh"
echo "   2. Git restore: git checkout $CHECKPOINT_BRANCH"
echo "   3. Database restore: psql -U psychpath -d postgres -f $CHECKPOINT_PATH/database/postgres-backup.sql"
echo ""
echo "📋 Next Steps:"
echo "   1. Continue your work"
echo "   2. Create another checkpoint when ready"
echo "   3. Use OneDrive to sync this checkpoint for offsite backup"
