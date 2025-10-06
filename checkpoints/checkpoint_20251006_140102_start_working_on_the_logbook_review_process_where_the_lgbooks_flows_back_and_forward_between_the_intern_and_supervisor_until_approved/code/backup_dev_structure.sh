#!/bin/bash

# PsychPATH Development Structure Backup Script
# Creates a complete backup of the development environment

set -euo pipefail

# Configuration
BACKUP_DIR="/Users/macdemac/Local Sites/PsychPATH-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="psychpath_dev_backup_${TIMESTAMP}"
FULL_BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting PsychPATH Development Structure Backup${NC}"
echo "Backup will be created at: ${FULL_BACKUP_PATH}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Get current directory (should be the PsychPATH project root)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${YELLOW}📁 Project root: ${PROJECT_ROOT}${NC}"

# Create temporary backup directory
mkdir -p "${FULL_BACKUP_PATH}"

echo -e "${YELLOW}📦 Creating backup archive...${NC}"

# Backup the entire project structure
cd "${PROJECT_ROOT}"

# Create tar.gz archive excluding unnecessary files
tar --exclude='.git' \
    --exclude='backend/.venv' \
    --exclude='frontend/node_modules' \
    --exclude='frontend/dist' \
    --exclude='backend/__pycache__' \
    --exclude='backend/*/__pycache__' \
    --exclude='backend/*/*/__pycache__' \
    --exclude='backend/db.sqlite3' \
    --exclude='backups' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    --exclude='*.tmp' \
    --exclude='*.swp' \
    -czf "${FULL_BACKUP_PATH}/psychpath_source_code.tar.gz" \
    .

echo -e "${YELLOW}💾 Backing up database...${NC}"

# Backup database if it exists
if [ -f "backend/db.sqlite3" ]; then
    cp "backend/db.sqlite3" "${FULL_BACKUP_PATH}/db_backup.sqlite3"
    echo -e "${GREEN}✅ Database backed up${NC}"
else
    echo -e "${YELLOW}⚠️  No SQLite database found${NC}"
fi

# Backup environment files
echo -e "${YELLOW}🔐 Backing up environment files...${NC}"
if [ -f "backend/.env" ]; then
    cp "backend/.env" "${FULL_BACKUP_PATH}/backend.env"
fi
if [ -f "frontend/.env" ]; then
    cp "frontend/.env" "${FULL_BACKUP_PATH}/frontend.env"
fi

# Create backup info file
cat > "${FULL_BACKUP_PATH}/backup_info.txt" << EOF
PsychPATH Development Structure Backup
=====================================

Backup Date: $(date)
Project Root: ${PROJECT_ROOT}
Git Branch: $(git branch --show-current)
Git Commit: $(git rev-parse HEAD)
Git Status: $(git status --porcelain | wc -l) files modified

Contents:
- psychpath_source_code.tar.gz: Complete source code
- db_backup.sqlite3: Database backup (if exists)
- backend.env: Backend environment variables (if exists)
- frontend.env: Frontend environment variables (if exists)
- backup_info.txt: This file

To restore:
1. Extract: tar -xzf psychpath_source_code.tar.gz
2. Copy database: cp db_backup.sqlite3 backend/db.sqlite3
3. Copy env files: cp backend.env backend/.env (if needed)
4. Install dependencies: 
   - Backend: cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
   - Frontend: cd frontend && npm install
5. Run migrations: python manage.py migrate
EOF

# Create final archive
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}/"

# Clean up temporary directory
rm -rf "${FULL_BACKUP_PATH}"

# Calculate size
BACKUP_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)

echo -e "${GREEN}✅ Backup completed successfully!${NC}"
echo -e "${GREEN}📁 Backup location: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz${NC}"
echo -e "${GREEN}📏 Backup size: ${BACKUP_SIZE}${NC}"

# Show recent backups
echo -e "${YELLOW}📋 Recent backups:${NC}"
ls -la "${BACKUP_DIR}"/*.tar.gz | tail -5

echo -e "${GREEN}🎉 PsychPATH development structure backup complete!${NC}"
