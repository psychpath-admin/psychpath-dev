#!/usr/bin/env bash
set -euo pipefail

# OneDrive destination (path with spaces)
ONEDRIVE_DIR="$HOME/OneDrive - CHANGE YOUR MIND PSYCHOLOGY PTY LTD/PsychPATH-Backups"
PROJECT_ROOT="$HOME/Local Sites/PsychPATH"

# DB connection (override via env vars if needed)
DB_HOST="${PGHOST:-127.0.0.1}"
DB_PORT="${PGPORT:-5432}"
DB_NAME="${PGDATABASE:-psychpath}"
DB_USER="${PGUSER:-psychpath}"
# Auth: use ~/.pgpass or export PGPASSWORD before running

TS=$(date -u +%Y%m%d_%H%M%S)
OUT="$ONEDRIVE_DIR/$TS"
mkdir -p "$OUT"

# 1) Database dumps
pg_dump \
  --host "$DB_HOST" --port "$DB_PORT" \
  --username "$DB_USER" \
  --format=custom --file "$OUT/${DB_NAME}.dump" \
  "$DB_NAME"

pg_dumpall \
  --host "$DB_HOST" --port "$DB_PORT" \
  --username "$DB_USER" \
  --globals-only > "$OUT/postgres_globals.sql"

# 2) Manifest + checksums
cd "$PROJECT_ROOT"
COMMIT=$(git rev-parse --short HEAD || echo "unknown")
{
  echo "DB_NAME=$DB_NAME"
  echo "DB_HOST=$DB_HOST"
  echo "DB_PORT=$DB_PORT"
  echo "COMMIT=$COMMIT"
  echo "TIMESTAMP=$TS"
} > "$OUT/MANIFEST.env"

if command -v shasum >/dev/null 2>&1; then
  shasum -a256 "$OUT"/* > "$OUT/SHA256SUMS.txt"
elif command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$OUT"/* > "$OUT/SHA256SUMS.txt"
fi

# 3) Retention: keep 15 latest
cd "$ONEDRIVE_DIR"
ls -1dt */ | tail -n +16 | xargs -I{} rm -rf "{}" 2>/dev/null || true

echo "Backup complete: $OUT"


