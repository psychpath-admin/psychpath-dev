#!/bin/bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 path/to/db-YYYYmmdd-HHMMSS.sqlite3"
  exit 1
fi

SNAPSHOT="$1"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB_FILE="$ROOT_DIR/db.sqlite3"

if [ ! -f "$SNAPSHOT" ]; then
  echo "Snapshot not found: $SNAPSHOT"
  exit 1
fi

cp -p "$SNAPSHOT" "$DB_FILE"
echo "Restored SQLite database from: $SNAPSHOT"


