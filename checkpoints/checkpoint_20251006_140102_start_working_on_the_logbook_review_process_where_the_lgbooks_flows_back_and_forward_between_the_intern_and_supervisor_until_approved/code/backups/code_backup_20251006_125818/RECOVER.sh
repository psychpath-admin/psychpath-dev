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
