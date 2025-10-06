#!/bin/bash

# PostgreSQL Backup Script for PsychPATH
# This script creates both SQL and custom format backups of the PostgreSQL database

set -e

# Configuration
DB_NAME="psychpath"
DB_USER="psychpath"
BACKUP_DIR="/Users/macdemac/Local Sites/PsychPATH/backend/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
POSTGRES_BIN="/opt/homebrew/opt/postgresql@16/bin"

# Add PostgreSQL binaries to PATH
export PATH="$POSTGRES_BIN:$PATH"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting PostgreSQL backup for database: $DB_NAME"
echo "Timestamp: $TIMESTAMP"
echo "Backup directory: $BACKUP_DIR"

# Create SQL format backup (human-readable)
echo "Creating SQL format backup..."
pg_dump -U "$DB_USER" -d "$DB_NAME" --verbose --clean --if-exists --create \
    -f "$BACKUP_DIR/postgres-backup-$TIMESTAMP.sql"

# Create custom format backup (compressed, faster restore)
echo "Creating custom format backup..."
pg_dump -U "$DB_USER" -d "$DB_NAME" --verbose --format=custom --compress=9 \
    -f "$BACKUP_DIR/postgres-backup-$TIMESTAMP.dump"

# Create schema-only backup
echo "Creating schema-only backup..."
pg_dump -U "$DB_USER" -d "$DB_NAME" --verbose --schema-only \
    -f "$BACKUP_DIR/postgres-schema-$TIMESTAMP.sql"

# Create data-only backup
echo "Creating data-only backup..."
pg_dump -U "$DB_USER" -d "$DB_NAME" --verbose --data-only \
    -f "$BACKUP_DIR/postgres-data-$TIMESTAMP.sql"

# Get file sizes
SQL_SIZE=$(du -h "$BACKUP_DIR/postgres-backup-$TIMESTAMP.sql" | cut -f1)
DUMP_SIZE=$(du -h "$BACKUP_DIR/postgres-backup-$TIMESTAMP.dump" | cut -f1)
SCHEMA_SIZE=$(du -h "$BACKUP_DIR/postgres-schema-$TIMESTAMP.sql" | cut -f1)
DATA_SIZE=$(du -h "$BACKUP_DIR/postgres-data-$TIMESTAMP.sql" | cut -f1)

echo ""
echo "Backup completed successfully!"
echo "Files created:"
echo "  - SQL backup: $BACKUP_DIR/postgres-backup-$TIMESTAMP.sql ($SQL_SIZE)"
echo "  - Custom backup: $BACKUP_DIR/postgres-backup-$TIMESTAMP.dump ($DUMP_SIZE)"
echo "  - Schema backup: $BACKUP_DIR/postgres-schema-$TIMESTAMP.sql ($SCHEMA_SIZE)"
echo "  - Data backup: $BACKUP_DIR/postgres-data-$TIMESTAMP.sql ($DATA_SIZE)"
echo ""
echo "To restore from SQL backup:"
echo "  psql -U $DB_USER -d postgres -f $BACKUP_DIR/postgres-backup-$TIMESTAMP.sql"
echo ""
echo "To restore from custom backup:"
echo "  pg_restore -U $DB_USER -d $DB_NAME --verbose --clean --if-exists $BACKUP_DIR/postgres-backup-$TIMESTAMP.dump"
