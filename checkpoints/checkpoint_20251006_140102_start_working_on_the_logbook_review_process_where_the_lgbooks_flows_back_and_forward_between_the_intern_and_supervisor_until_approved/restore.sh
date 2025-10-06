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
