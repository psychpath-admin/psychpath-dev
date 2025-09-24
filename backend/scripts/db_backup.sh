#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB_FILE="$ROOT_DIR/db.sqlite3"
BACKUP_DIR="$ROOT_DIR/backups"
TS="$(date +%Y%m%d-%H%M%S)"
DEST="$BACKUP_DIR/db-$TS.sqlite3"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_FILE" ]; then
  echo "No SQLite database found at $DB_FILE. Skipping backup."
  exit 0
fi

cp -p "$DB_FILE" "$DEST"
echo "SQLite backup created: $DEST"


