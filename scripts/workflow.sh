#!/usr/bin/env bash
set -euo pipefail

# PsychPATH simple workflow utility
# Usage:
#   scripts/workflow.sh checkpoint "message here"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUPS_DIR="$PROJECT_ROOT/backups"
DB_BACKUPS_DIR="$PROJECT_ROOT/backend/backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

# Load backend .env if present for DB creds
ENV_FILE="$PROJECT_ROOT/backend/.env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC2046
  export $(grep -E '^(DB_NAME|DB_USER|DB_PASSWORD|DB_HOST|DB_PORT)=' "$ENV_FILE" | sed 's/\r$//') || true
fi

# Defaults if not provided in .env
DB_NAME="${DB_NAME:-psychpath}"
DB_USER="${DB_USER:-psychpath}"
DB_PASSWORD="${DB_PASSWORD:-psychpath}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Prefer Homebrew Postgres 16; fallback to PATH
POSTGRES_BIN="${POSTGRES_BIN:-/opt/homebrew/opt/postgresql@16/bin}"
if [[ -x "$POSTGRES_BIN/pg_dump" ]]; then
  PG_DUMP="$POSTGRES_BIN/pg_dump"
else
  PG_DUMP="pg_dump"
fi

checkpoint() {
  local msg="${1:-manual checkpoint}"

  mkdir -p "$BACKUPS_DIR" "$DB_BACKUPS_DIR"

  echo "[1/3] Git checkpoint..."
  pushd "$PROJECT_ROOT" >/dev/null
  git add -A
  git commit -m "checkpoint: $msg" --allow-empty || true
  local tag="checkpoint-${TIMESTAMP}"
  git tag -f "$tag"
  echo "  Created tag $tag"
  popd >/dev/null

  echo "[2/3] Database dump (PostgreSQL)..."
  export PGPASSWORD="$DB_PASSWORD"
  "$PG_DUMP" -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -Fc -f "$DB_BACKUPS_DIR/pgdump-${TIMESTAMP}.dump"
  echo "  Wrote $DB_BACKUPS_DIR/pgdump-${TIMESTAMP}.dump"

  echo "[3/3] Code snapshot (tar.gz)..."
  tar \
    --exclude=".git" \
    --exclude="**/node_modules" \
    --exclude="**/venv" \
    --exclude="**/.venv" \
    -czf "$BACKUPS_DIR/code-${TIMESTAMP}.tar.gz" -C "$PROJECT_ROOT" .
  echo "  Wrote $BACKUPS_DIR/code-${TIMESTAMP}.tar.gz"

  echo "Done. You can push with: git push && git push --tags"
}

case "${1:-}" in
  checkpoint)
    shift || true
    checkpoint "${1:-manual checkpoint}"
    ;;
  *)
    echo "Usage: $0 checkpoint \"message\"" >&2
    exit 1
    ;;
esac

#!/bin/bash

# PsychPATH Development Workflow Script
# Manages checkpoints for specific development tasks

set -e

PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"

show_help() {
    echo "🛡️  PsychPATH Development Workflow"
    echo "=================================="
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  start [description]    Start a new development session with checkpoint"
    echo "  checkpoint [desc]      Create a checkpoint of current work"
    echo "  finish [desc]          Finish current work and create final checkpoint"
    echo "  list                   List all checkpoints"
    echo "  restore [name]         Restore a specific checkpoint"
    echo "  status                 Show current development status"
    echo ""
    echo "Examples:"
    echo "  $0 start 'Working on logbook review process'"
    echo "  $0 checkpoint 'Completed supervisor review logic'"
    echo "  $0 finish 'Logbook review process completed'"
    echo "  $0 restore checkpoint_20251006_134500_working_on_logbook_review_process"
    echo ""
}

create_checkpoint() {
    local description="$1"
    echo "🛡️  Creating checkpoint..."
    "$PROJECT_ROOT/scripts/checkpoint.sh" "$description"
}

start_session() {
    local description="$1"
    if [ -z "$description" ]; then
        echo "❌ Please provide a description for your development session"
        echo "Usage: $0 start 'Description of what you're working on'"
        exit 1
    fi
    
    echo "🚀 Starting new development session..."
    echo "📝 Description: $description"
    echo ""
    
    # Create initial checkpoint
    create_checkpoint "START: $description"
    
    echo ""
    echo "✅ Development session started!"
    echo "💡 Use '$0 checkpoint [desc]' to save progress"
    echo "💡 Use '$0 finish [desc]' when done"
}

finish_session() {
    local description="$1"
    if [ -z "$description" ]; then
        echo "❌ Please provide a description for your completed work"
        echo "Usage: $0 finish 'Description of completed work'"
        exit 1
    fi
    
    echo "🏁 Finishing development session..."
    echo "📝 Description: $description"
    echo ""
    
    # Create final checkpoint
    create_checkpoint "FINISH: $description"
    
    echo ""
    echo "✅ Development session completed!"
    echo "🎉 Work has been checkpointed and is ready for backup to OneDrive"
}

show_status() {
    echo "📊 Current Development Status"
    echo "============================"
    echo ""
    
    # Git status
    cd "$PROJECT_ROOT"
    echo "🔀 Git Status:"
    echo "   Branch: $(git branch --show-current)"
    echo "   Uncommitted changes: $(git status --porcelain | wc -l | xargs)"
    echo ""
    
    # Database status
    echo "💾 Database Status:"
    export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
    if psql -U psychpath -d psychpath -c "SELECT 1;" >/dev/null 2>&1; then
        echo "   PostgreSQL: ✅ Connected"
        echo "   Database: $(psql -U psychpath -d psychpath -t -c 'SELECT current_database();' | xargs)"
        echo "   Users: $(psql -U psychpath -d psychpath -t -c 'SELECT COUNT(*) FROM auth_user;' | xargs)"
    else
        echo "   PostgreSQL: ❌ Not connected"
    fi
    echo ""
    
    # Checkpoints status
    echo "🛡️  Checkpoints:"
    if [ -d "$PROJECT_ROOT/checkpoints" ]; then
        checkpoint_count=$(find "$PROJECT_ROOT/checkpoints" -maxdepth 1 -type d | wc -l | xargs)
        echo "   Available: $((checkpoint_count - 1)) checkpoints"
    else
        echo "   Available: No checkpoints yet"
    fi
    echo ""
    
    # Docker status
    echo "🐳 Docker Status:"
    if docker ps | grep -q psychpath; then
        echo "   Containers: ✅ Running"
        docker ps --format "   {{.Names}}: {{.Status}}" | grep psychpath
    else
        echo "   Containers: ❌ Not running"
    fi
}

restore_checkpoint() {
    local checkpoint_name="$1"
    if [ -z "$checkpoint_name" ]; then
        echo "❌ Please provide a checkpoint name"
        echo "Usage: $0 restore [checkpoint-name]"
        echo ""
        echo "Available checkpoints:"
        "$PROJECT_ROOT/scripts/list-checkpoints.sh"
        exit 1
    fi
    
    local checkpoint_path="$PROJECT_ROOT/checkpoints/$checkpoint_name"
    if [ ! -d "$checkpoint_path" ]; then
        echo "❌ Checkpoint not found: $checkpoint_name"
        echo "Available checkpoints:"
        "$PROJECT_ROOT/scripts/list-checkpoints.sh"
        exit 1
    fi
    
    echo "🔄 Restoring checkpoint: $checkpoint_name"
    echo "⚠️  This will replace your current work!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        "$checkpoint_path/restore.sh"
    else
        echo "❌ Restore cancelled"
    fi
}

# Main script logic
case "${1:-help}" in
    "start")
        start_session "$2"
        ;;
    "checkpoint")
        if [ -z "$2" ]; then
            echo "❌ Please provide a description for the checkpoint"
            echo "Usage: $0 checkpoint 'Description of current progress'"
            exit 1
        fi
        create_checkpoint "$2"
        ;;
    "finish")
        finish_session "$2"
        ;;
    "list")
        "$PROJECT_ROOT/scripts/list-checkpoints.sh"
        ;;
    "restore")
        restore_checkpoint "$2"
        ;;
    "status")
        show_status
        ;;
    "help"|*)
        show_help
        ;;
esac
