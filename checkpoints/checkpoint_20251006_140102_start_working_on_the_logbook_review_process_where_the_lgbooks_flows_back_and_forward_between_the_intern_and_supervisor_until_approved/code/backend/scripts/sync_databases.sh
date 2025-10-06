#!/bin/bash

# Database synchronization script
# Syncs data and schema between SQLite (dev) and PostgreSQL (production)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$BACKEND_DIR")"

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

# Function to check if database exists
check_database_exists() {
    local db_type=$1
    if [ "$db_type" = "sqlite" ]; then
        if [ -f "$BACKEND_DIR/db.sqlite3" ]; then
            return 0
        else
            return 1
        fi
    elif [ "$db_type" = "postgres" ]; then
        # Check if we can connect to PostgreSQL
        cd "$BACKEND_DIR"
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
            return 0
        else
            return 1
        fi
    fi
}

# Function to backup database
backup_database() {
    local db_type=$1
    local timestamp=$(date +'%Y%m%d-%H%M%S')
    
    if [ "$db_type" = "sqlite" ]; then
        local backup_file="$BACKEND_DIR/backups/sqlite-sync-$timestamp.sqlite3"
        log "Backing up SQLite database to $backup_file"
        mkdir -p "$BACKEND_DIR/backups"
        cp "$BACKEND_DIR/db.sqlite3" "$backup_file"
        echo "$backup_file"
    elif [ "$db_type" = "postgres" ]; then
        local backup_file="$BACKEND_DIR/backups/postgres-sync-$timestamp.sql"
        log "Backing up PostgreSQL database to $backup_file"
        mkdir -p "$BACKEND_DIR/backups"
        
        cd "$BACKEND_DIR"
        ./venv/bin/python manage.py dumpdata --natural-foreign --natural-primary --indent=2 > "$backup_file"
        echo "$backup_file"
    fi
}

# Function to sync schema (migrations)
sync_schema() {
    log "Synchronizing database schema..."
    
    # Run migrations on both databases
    cd "$BACKEND_DIR"
    
    log "Applying migrations to SQLite..."
    USE_SQLITE=1 ./venv/bin/python manage.py migrate --noinput --fake-initial || {
        warning "SQLite migration failed, continuing..."
    }
    
    log "Applying migrations to PostgreSQL..."
    ./venv/bin/python manage.py migrate --noinput --fake-initial || {
        warning "PostgreSQL migration failed, continuing..."
    }
    
    success "Schema synchronization completed"
}

# Function to sync data from SQLite to PostgreSQL
sync_data_sqlite_to_postgres() {
    log "Synchronizing data from SQLite to PostgreSQL..."
    
    cd "$BACKEND_DIR"
    
    # Export data from SQLite
    local temp_file=$(mktemp)
    log "Exporting data from SQLite..."
    USE_SQLITE=1 ./venv/bin/python manage.py dumpdata --natural-foreign --natural-primary --indent=2 > "$temp_file"
    
    # Import data to PostgreSQL
    log "Importing data to PostgreSQL..."
    ./venv/bin/python manage.py loaddata "$temp_file" --verbosity=0
    
    # Clean up
    rm "$temp_file"
    
    success "Data synchronized from SQLite to PostgreSQL"
}

# Function to sync data from PostgreSQL to SQLite
sync_data_postgres_to_sqlite() {
    log "Synchronizing data from PostgreSQL to SQLite..."
    
    cd "$BACKEND_DIR"
    
    # Export data from PostgreSQL
    local temp_file=$(mktemp)
    log "Exporting data from PostgreSQL..."
    ./venv/bin/python manage.py dumpdata --natural-foreign --natural-primary --indent=2 > "$temp_file"
    
    # Import data to SQLite
    log "Importing data to SQLite..."
    USE_SQLITE=1 ./venv/bin/python manage.py loaddata "$temp_file" --verbosity=0
    
    # Clean up
    rm "$temp_file"
    
    success "Data synchronized from PostgreSQL to SQLite"
}

# Function to compare database content
compare_databases() {
    log "Comparing database content..."
    
    cd "$BACKEND_DIR"
    
    # Export both databases with error handling
    local sqlite_file=$(mktemp)
    local postgres_file=$(mktemp)
    
    if USE_SQLITE=1 ./venv/bin/python manage.py dumpdata --natural-foreign --natural-primary --indent=2 > "$sqlite_file" 2>/dev/null; then
        log "SQLite export successful"
    else
        warning "SQLite export failed"
        rm "$sqlite_file" "$postgres_file"
        return 1
    fi
    
    if ./venv/bin/python manage.py dumpdata --natural-foreign --natural-primary --indent=2 > "$postgres_file" 2>/dev/null; then
        log "PostgreSQL export successful"
    else
        warning "PostgreSQL export failed"
        rm "$sqlite_file" "$postgres_file"
        return 1
    fi
    
    # Compare files
    if diff -q "$sqlite_file" "$postgres_file" > /dev/null; then
        success "Databases are synchronized"
        rm "$sqlite_file" "$postgres_file"
        return 0
    else
        warning "Databases are not synchronized"
        log "SQLite file: $sqlite_file"
        log "PostgreSQL file: $postgres_file"
        log "Use 'diff $sqlite_file $postgres_file' to see differences"
        return 1
    fi
}

# Main function
main() {
    local direction=${1:-"both"}
    local force=${2:-"false"}
    
    log "Starting database synchronization (direction: $direction)"
    
    # Check if both databases exist
    if ! check_database_exists "sqlite"; then
        error "SQLite database not found at $BACKEND_DIR/db.sqlite3"
        exit 1
    fi
    
    if ! check_database_exists "postgres"; then
        error "PostgreSQL database not accessible"
        exit 1
    fi
    
    # Create backups
    log "Creating backups..."
    local sqlite_backup=$(backup_database "sqlite")
    local postgres_backup=$(backup_database "postgres")
    
    log "SQLite backup: $sqlite_backup"
    log "PostgreSQL backup: $postgres_backup"
    
    # Sync schema first
    sync_schema
    
    # Sync data based on direction
    case "$direction" in
        "sqlite-to-postgres"|"sqltopg")
            sync_data_sqlite_to_postgres
            ;;
        "postgres-to-sqlite"|"pgtosql")
            sync_data_postgres_to_sqlite
            ;;
        "both"|"sync")
            # Check if databases are already in sync
            if [ "$force" != "true" ] && compare_databases; then
                success "Databases are already synchronized"
                exit 0
            fi
            
            # Default to SQLite -> PostgreSQL (dev -> prod)
            sync_data_sqlite_to_postgres
            ;;
        *)
            error "Invalid direction: $direction"
            echo "Usage: $0 [sqlite-to-postgres|postgres-to-sqlite|both] [force]"
            echo "  sqlite-to-postgres: Sync from SQLite (dev) to PostgreSQL (prod)"
            echo "  postgres-to-sqlite: Sync from PostgreSQL (prod) to SQLite (dev)"
            echo "  both: Check if sync needed, then sync from SQLite to PostgreSQL"
            echo "  force: Force sync even if databases appear to be in sync"
            exit 1
            ;;
    esac
    
    # Final comparison
    log "Performing final comparison..."
    if compare_databases; then
        success "Database synchronization completed successfully"
    else
        warning "Databases may not be fully synchronized"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"
