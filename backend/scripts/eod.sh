#!/bin/bash
set -euo pipefail

MSG=${1:-"End of day checkpoint"}
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
REPO_DIR="$ROOT_DIR"
BACKUP_DIR="$ROOT_DIR/backend/backups"
TS="$(date +%Y%m%d-%H%M)"
TAG="eod-$TS"

# 1) DB snapshot
"$ROOT_DIR/backend/scripts/db_backup.sh"

# 2) Commit and tag code (non-invasive: add changes only if present)
cd "$REPO_DIR"
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repository; skipping code tagging"
else
  git add -A || true
  if ! git diff --cached --quiet; then
    git commit -m "EOD: $MSG"
  fi
  git tag -a "$TAG" -m "EOD snapshot: $MSG" || echo "Tag $TAG already exists"
fi

# 3) Index record
mkdir -p "$BACKUP_DIR"
INDEX="$BACKUP_DIR/INDEX.md"
SNAPSHOT_FILE=$(ls -1t "$BACKUP_DIR"/db-*.sqlite3 | head -n 1 | xargs -n1 basename)
{
  echo "- $TS | tag: $TAG | db: $SNAPSHOT_FILE | $MSG"
} >> "$INDEX"

echo "EOD checkpoint created: tag=$TAG, db=$SNAPSHOT_FILE"


