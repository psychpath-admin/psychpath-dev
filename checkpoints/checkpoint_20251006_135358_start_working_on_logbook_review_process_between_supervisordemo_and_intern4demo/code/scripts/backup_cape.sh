#!/usr/bin/env bash
set -euo pipefail
BASE="/Users/macdemac/Local Sites/PsychPATH"
BACKUP_ROOT="/Users/macdemac/Local Sites/PsychPATH/backups"
TS="20250918_200910"
DEST="/"
RETENTION_DAYS="14"

mkdir -p ""

# 1) Save envs and logs
[ -f "/Users/macdemac/Local Sites/CAPE/backend/.env" ] && cp "/Users/macdemac/Local Sites/CAPE/backend/.env" "/backend.env" || true
[ -f "/Users/macdemac/Local Sites/CAPE/frontend/.env" ] && cp "/Users/macdemac/Local Sites/CAPE/frontend/.env" "/frontend.env" || true
[ -d "/Users/macdemac/Local Sites/CAPE/backend/logs" ] && cp -a "/Users/macdemac/Local Sites/CAPE/backend/logs" "/logs" || true

# 2) Database dump
if [ -f "/Users/macdemac/Local Sites/CAPE/backend/.env" ]; then set -a; . "/Users/macdemac/Local Sites/CAPE/backend/.env"; set +a; fi
DB_NAME=${DB_NAME:-psychpath}
DB_USER=${DB_USER:-psychpath}
DB_PASSWORD=${DB_PASSWORD:-psychpath}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
USE_SQLITE=${USE_SQLITE:-0}

if [ "" = "1" ] && [ -f "/Users/macdemac/Local Sites/CAPE/backend/db.sqlite3" ]; then
  cp "/Users/macdemac/Local Sites/CAPE/backend/db.sqlite3" "/db.sqlite3"
else
  if command -v pg_dump >/dev/null 2>&1; then
    PGPASSWORD="" pg_dump -h "" -p "" -U "" -d "" -Fc -f "/postgres.dump" || echo "[WARN] pg_dump failed"
  else
    echo "[INFO] pg_dump not found; skipping Postgres dump"
  fi
fi

# 3) Dependency snapshots
if [ -d "/Users/macdemac/Local Sites/CAPE/backend/.venv" ]; then
  . "/Users/macdemac/Local Sites/CAPE/backend/.venv/bin/activate" && pip freeze > "/requirements.freeze.txt" || true
fi
( cd "/Users/macdemac/Local Sites/CAPE/frontend" && npm ls --depth=0 --json > "/npm-deps.json" 2>/dev/null ) || true

# 4) Archive source (exclude heavy build and venv)
( cd "/Users/macdemac/Local Sites/CAPE" && tar --exclude=backend/.venv --exclude=**/__pycache__ --exclude=frontend/node_modules --exclude=frontend/dist --exclude=frontend/.vite -czf "/psychpath-source.tar.gz" backend frontend )

# 5) Create bundle tgz
( cd "" && tar -czf "psychpath_backup_${TS}.tgz" "" )

# 6) Prune old bundles beyond retention
find "" -maxdepth 1 -type f -name "psychpath_backup_*.tgz" -mtime +"" -print -delete || true

# 7) Log a marker
echo "Backup ready: /psychpath_backup_${TS}.tgz"
