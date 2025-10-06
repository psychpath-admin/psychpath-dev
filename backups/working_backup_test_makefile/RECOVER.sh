#!/bin/bash
# Simple Recovery Script

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$(dirname "${BASH_SOURCE[0]}")"

echo "Starting recovery..."

# Stop services
echo "Stopping services..."
cd "$PROJECT_ROOT"
make dev-stop 2>/dev/null || true

# Restore code
echo "Restoring code..."
cd "$PROJECT_ROOT"
git checkout "$(grep 'Git Tag:' "$BACKUP_DIR/BACKUP_INFO.md" | cut -d' ' -f3)"

# Restore database
echo "Restoring database..."
cd "$PROJECT_ROOT/backend"
PSQL="/opt/homebrew/Cellar/postgresql@16/16.10/bin/psql"
if [ -f "$BACKUP_DIR/database.sql" ]; then
    $PSQL -h localhost -U psychpath -d psychpath < "$BACKUP_DIR/database.sql" || \
    $PSQL -h 127.0.0.1 -U psychpath -d psychpath < "$BACKUP_DIR/database.sql"
else
    echo "ERROR: No database backup found"
    exit 1
fi

# Start services
echo "Starting services..."
cd "$PROJECT_ROOT"
make dev-start

echo "Recovery completed!"
