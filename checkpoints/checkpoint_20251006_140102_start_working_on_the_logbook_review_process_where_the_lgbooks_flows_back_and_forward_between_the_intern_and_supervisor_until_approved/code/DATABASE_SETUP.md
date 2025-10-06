# Database Configuration

## Development Environment
- **Database**: SQLite
- **Configuration**: Set `USE_SQLITE=1` environment variable
- **Database File**: `backend/db.sqlite3`
- **Usage**: `USE_SQLITE=1 make dev-start`

## Production Environment
- **Database**: PostgreSQL
- **Configuration**: Default Django settings (no `USE_SQLITE` environment variable)
- **Connection**: Uses environment variables from `.env` or system environment

## Migration Strategy for Production

### 1. Database Setup
```bash
# Create PostgreSQL database
createdb psychpath_prod

# Set production environment variables
export DB_NAME=psychpath_prod
export DB_USER=psychpath_user
export DB_PASSWORD=secure_password
export DB_HOST=your-postgres-host
export DB_PORT=5432
```

### 2. Schema Migration
```bash
# Run migrations on production database
python manage.py migrate

# This will apply all migrations including:
# - section_c.0005_supervisionentry_week_starting
# - section_c.0006_supervisionentry_week_starting_not_null
```

### 3. Data Migration (if needed)
If you have existing data to migrate from development:

```python
# Custom management command to migrate data
python manage.py migrate_data_from_sqlite --sqlite-path /path/to/dev/db.sqlite3
```

### 4. Environment-Specific Settings
The `config/settings.py` already handles this automatically:

```python
# Default (Production) - PostgreSQL
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'psychpath'),
        'USER': os.getenv('DB_USER', 'psychpath'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'psychpath'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': int(os.getenv('DB_PORT', '5432')),
    }
}

# Development Override - SQLite
if os.getenv('USE_SQLITE', '0') == '1':
    DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
```

## Key Differences Between SQLite and PostgreSQL

### 1. Field Types
- **SQLite**: More flexible, accepts various date formats
- **PostgreSQL**: Strict type checking, requires proper date format

### 2. Constraints
- **SQLite**: Limited foreign key support (needs to be enabled)
- **PostgreSQL**: Full foreign key constraint support

### 3. Migration Behavior
- **SQLite**: Some operations (like column renames) require table recreation
- **PostgreSQL**: More flexible schema modifications

## Production Deployment Checklist

1. **Environment Variables**
   - Set `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
   - Ensure `USE_SQLITE` is NOT set (or set to '0')

2. **Database Connection**
   - Test connection: `python manage.py dbshell`
   - Verify tables: `python manage.py showmigrations`

3. **Data Migration**
   - Run migrations: `python manage.py migrate`
   - Load initial data if needed: `python manage.py loaddata initial_data.json`

4. **Verification**
   - Test API endpoints
   - Verify Section C `week_starting` field works correctly
   - Check that all three sections (A, B, C) function properly

## Notes
- The `week_starting` field was added to resolve Section C API 500 errors
- All migrations are designed to work with both SQLite and PostgreSQL
- The `perform_create` method in `SupervisionEntryViewSet` automatically calculates `week_starting` for new entries
