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
