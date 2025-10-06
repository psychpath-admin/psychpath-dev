"""
Custom management command to migrate data from SQLite development database to PostgreSQL production database.
This is useful when you need to migrate existing data from development to production.
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import connections, transaction
from django.conf import settings
import sqlite3
import os


class Command(BaseCommand):
    help = 'Migrate data from SQLite development database to PostgreSQL production database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--sqlite-path',
            type=str,
            help='Path to the SQLite database file (default: backend/db.sqlite3)',
            default='backend/db.sqlite3'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be migrated without actually doing it',
        )

    def handle(self, *args, **options):
        sqlite_path = options['sqlite_path']
        dry_run = options['dry_run']

        # Check if SQLite file exists
        if not os.path.exists(sqlite_path):
            raise CommandError(f'SQLite database file not found: {sqlite_path}')

        # Verify we're using PostgreSQL
        if 'sqlite' in settings.DATABASES['default']['ENGINE']:
            raise CommandError('This command should only be run against a PostgreSQL database')

        self.stdout.write(f'📊 Migrating data from SQLite: {sqlite_path}')
        self.stdout.write(f'🗄️  Target database: {settings.DATABASES["default"]["ENGINE"]}')

        if dry_run:
            self.stdout.write(self.style.WARNING('🔍 DRY RUN MODE - No data will be migrated'))

        # Connect to SQLite database
        sqlite_conn = sqlite3.connect(sqlite_path)
        sqlite_conn.row_factory = sqlite3.Row
        sqlite_cursor = sqlite_conn.cursor()

        # Get PostgreSQL connection
        pg_conn = connections['default']
        pg_cursor = pg_conn.cursor()

        # Define tables to migrate (in order to respect foreign key constraints)
        tables_to_migrate = [
            'api_user',
            'api_profile',
            'section_a_clientcontactentry',
            'section_b_professionaldevelopmententry',
            'section_c_supervisionentry',
        ]

        for table_name in tables_to_migrate:
            self.migrate_table(sqlite_cursor, pg_cursor, table_name, dry_run)

        sqlite_conn.close()
        self.stdout.write(self.style.SUCCESS('✅ Data migration completed!'))

    def migrate_table(self, sqlite_cursor, pg_cursor, table_name, dry_run):
        """Migrate a single table from SQLite to PostgreSQL"""
        try:
            # Get table schema from SQLite
            sqlite_cursor.execute(f"PRAGMA table_info({table_name})")
            columns = sqlite_cursor.fetchall()
            
            if not columns:
                self.stdout.write(f'⚠️  Table {table_name} not found in SQLite database')
                return

            # Get column names
            column_names = [col[1] for col in columns]
            
            # Count records in SQLite
            sqlite_cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = sqlite_cursor.fetchone()[0]
            
            if count == 0:
                self.stdout.write(f'📋 Table {table_name}: No records to migrate')
                return

            self.stdout.write(f'📋 Table {table_name}: {count} records to migrate')

            if dry_run:
                return

            # Clear existing data in PostgreSQL table
            pg_cursor.execute(f"DELETE FROM {table_name}")
            
            # Get all data from SQLite
            sqlite_cursor.execute(f"SELECT * FROM {table_name}")
            rows = sqlite_cursor.fetchall()
            
            # Prepare insert statement
            placeholders = ', '.join(['%s'] * len(column_names))
            insert_sql = f"INSERT INTO {table_name} ({', '.join(column_names)}) VALUES ({placeholders})"
            
            # Insert data in batches
            batch_size = 100
            for i in range(0, len(rows), batch_size):
                batch = rows[i:i + batch_size]
                batch_data = []
                
                for row in batch:
                    # Convert SQLite row to tuple
                    row_data = []
                    for j, col in enumerate(columns):
                        value = row[j]
                        # Handle None values and type conversions
                        if value is None:
                            row_data.append(None)
                        elif col[2] == 'INTEGER' and isinstance(value, str):
                            row_data.append(int(value) if value.isdigit() else None)
                        else:
                            row_data.append(value)
                    batch_data.append(tuple(row_data))
                
                # Execute batch insert
                pg_cursor.executemany(insert_sql, batch_data)
            
            self.stdout.write(f'✅ Migrated {len(rows)} records to {table_name}')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error migrating table {table_name}: {str(e)}')
            )
            raise
