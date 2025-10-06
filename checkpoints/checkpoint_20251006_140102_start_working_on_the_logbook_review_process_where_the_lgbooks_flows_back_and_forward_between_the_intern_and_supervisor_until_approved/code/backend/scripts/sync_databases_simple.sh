#!/bin/bash

# Simple database synchronization script
# Syncs key data between SQLite (dev) and PostgreSQL (production)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check database connectivity
check_databases() {
    log "Checking database connectivity..."
    
    cd "$BACKEND_DIR"
    
    # Check SQLite
    if [ -f "db.sqlite3" ]; then
        log "SQLite database found"
    else
        warning "SQLite database not found"
        return 1
    fi
    
    # Check PostgreSQL connectivity
    if ./venv/bin/python -c "
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.db import connection
try:
    connection.ensure_connection()
    print('PostgreSQL connection successful')
except Exception as e:
    print(f'PostgreSQL connection failed: {e}')
    exit(1)
" 2>/dev/null; then
        log "PostgreSQL connection successful"
    else
        warning "PostgreSQL connection failed"
        return 1
    fi
    
    return 0
}

# Function to sync key data from SQLite to PostgreSQL
sync_key_data() {
    log "Synchronizing key data from SQLite to PostgreSQL..."
    
    cd "$BACKEND_DIR"
    
    # Create backup first
    local timestamp=$(date +'%Y%m%d-%H%M%S')
    local backup_file="$BACKEND_DIR/backups/postgres-sync-$timestamp.sql"
    mkdir -p "$BACKEND_DIR/backups"
    
    log "Creating PostgreSQL backup..."
    ./venv/bin/python manage.py dumpdata --natural-foreign --natural-primary --indent=2 > "$backup_file" || {
        warning "PostgreSQL backup failed, continuing..."
    }
    
    # Sync key apps only (avoid problematic data)
    local apps_to_sync=("auth.user" "api.profile" "section_a.sectionaentry" "section_b.professionaldevelopmententry" "section_c.supervisionentry" "logbook_app.weeklylogbook")
    
    for app in "${apps_to_sync[@]}"; do
        log "Syncing $app..."
        
        # Export from SQLite
        local temp_file=$(mktemp)
        if USE_SQLITE=1 ./venv/bin/python manage.py dumpdata "$app" --natural-foreign --natural-primary --indent=2 > "$temp_file" 2>/dev/null; then
            # Import to PostgreSQL (with error handling)
            if ./venv/bin/python manage.py loaddata "$temp_file" --verbosity=0 2>/dev/null; then
                log "Successfully synced $app"
            else
                warning "Failed to sync $app to PostgreSQL"
            fi
        else
            warning "Failed to export $app from SQLite"
        fi
        
        rm -f "$temp_file"
    done
    
    success "Key data synchronization completed"
}

# Function to create database comparison report
create_comparison_report() {
    log "Creating database comparison report..."
    
    cd "$BACKEND_DIR"
    
    local report_file="$BACKEND_DIR/backups/db-comparison-$(date +'%Y%m%d-%H%M%S').txt"
    
    {
        echo "Database Comparison Report - $(date)"
        echo "=========================================="
        echo ""
        
        # Count records in key tables
        echo "Record counts:"
        echo "---------------"
        
        local tables=("auth_user" "api_profile" "section_a_sectionaentry" "section_b_professionaldevelopmententry" "section_c_supervisionentry" "logbook_app_weeklylogbook")
        
        for table in "${tables[@]}"; do
            echo -n "$table: "
            
            # SQLite count
            sqlite_count=$(USE_SQLITE=1 ./venv/bin/python manage.py shell -c "
import django
django.setup()
from django.db import connection
cursor = connection.cursor()
cursor.execute('SELECT COUNT(*) FROM $table')
print(cursor.fetchone()[0])
" 2>/dev/null || echo "ERROR")
            
            # PostgreSQL count
            postgres_count=$(./venv/bin/python manage.py shell -c "
import django
django.setup()
from django.db import connection
cursor = connection.cursor()
cursor.execute('SELECT COUNT(*) FROM $table')
print(cursor.fetchone()[0])
" 2>/dev/null || echo "ERROR")
            
            echo "SQLite: $sqlite_count, PostgreSQL: $postgres_count"
            
            if [ "$sqlite_count" != "$postgres_count" ] && [ "$sqlite_count" != "ERROR" ] && [ "$postgres_count" != "ERROR" ]; then
                echo "  ⚠️  MISMATCH DETECTED"
            fi
        done
        
        echo ""
        echo "Report generated at: $(date)"
        
    } > "$report_file"
    
    log "Comparison report saved to: $report_file"
    cat "$report_file"
}

# Main function
main() {
    local action=${1:-"sync"}
    
    log "Starting database synchronization (action: $action)"
    
    # Check database connectivity
    if ! check_databases; then
        error "Database connectivity check failed"
        exit 1
    fi
    
    case "$action" in
        "sync")
            sync_key_data
            ;;
        "report"|"compare")
            create_comparison_report
            ;;
        *)
            echo "Usage: $0 [sync|report]"
            echo "  sync: Synchronize key data from SQLite to PostgreSQL"
            echo "  report: Create a comparison report between databases"
            exit 1
            ;;
    esac
    
    success "Database operation completed"
}

# Run main function with all arguments
main "$@"
