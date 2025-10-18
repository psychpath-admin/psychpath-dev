#!/bin/bash

# Proper PostgreSQL Backup Script
# This creates a complete backup of the PostgreSQL database including all data

echo "🔄 Creating proper PostgreSQL backup..."

# Create backup directory with timestamp
BACKUP_DIR="backups/postgres_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Create PostgreSQL dump with all data
echo "📦 Creating PostgreSQL dump..."
pg_dump -h localhost -U psychpath -d psychpath --no-password --verbose --format=custom --file="$BACKUP_DIR/database.dump"

if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL dump created successfully"
else
    echo "❌ PostgreSQL dump failed"
    exit 1
fi

# Also create a plain SQL backup
echo "📦 Creating plain SQL backup..."
pg_dump -h localhost -U psychpath -d psychpath --no-password --verbose --format=plain --file="$BACKUP_DIR/database.sql"

if [ $? -eq 0 ]; then
    echo "✅ Plain SQL backup created successfully"
else
    echo "❌ Plain SQL backup failed"
    exit 1
fi

# Create Django JSON backup
echo "📦 Creating Django JSON backup..."
cd backend
./venv/bin/python manage.py dumpdata --natural-foreign --natural-primary --indent=2 > "../$BACKUP_DIR/django_data.json"

if [ $? -eq 0 ]; then
    echo "✅ Django JSON backup created successfully"
else
    echo "❌ Django JSON backup failed"
    exit 1
fi

cd ..

# Create backup info file
cat > "$BACKUP_DIR/BACKUP_INFO.md" << EOF
# PostgreSQL Backup - $(date)

## Backup Details
- **Date**: $(date)
- **Database**: psychpath
- **User**: psychpath
- **Format**: PostgreSQL custom dump + plain SQL + Django JSON

## Files
- \`database.dump\` - PostgreSQL custom format (use pg_restore)
- \`database.sql\` - Plain SQL format (use psql)
- \`django_data.json\` - Django JSON format (use loaddata)

## Restore Commands

### From PostgreSQL dump:
\`\`\`bash
pg_restore -h localhost -U psychpath -d psychpath --clean --if-exists database.dump
\`\`\`

### From plain SQL:
\`\`\`bash
psql -h localhost -U psychpath -d psychpath -f database.sql
\`\`\`

### From Django JSON:
\`\`\`bash
cd backend && ./venv/bin/python manage.py loaddata ../django_data.json
\`\`\`

## User Count
$(psql -d psychpath -tAc "SELECT COUNT(*) FROM auth_user;") users in database
EOF

echo "✅ Backup complete!"
echo "📁 Backup location: $BACKUP_DIR"
echo "📊 Files created:"
ls -la "$BACKUP_DIR"
