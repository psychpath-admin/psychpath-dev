#!/bin/bash

# Sync PsychPATH checkpoints to OneDrive for offsite backup

set -e

PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"
CHECKPOINT_DIR="$PROJECT_ROOT/checkpoints"

# OneDrive path - adjust this to your OneDrive location
ONEDRIVE_ROOT="$HOME/OneDrive"
ONEDRIVE_PROJECT="$ONEDRIVE_ROOT/PsychPATH_Backups"

echo "☁️  Syncing PsychPATH to OneDrive"
echo "================================="
echo ""

# Check if OneDrive directory exists
if [ ! -d "$ONEDRIVE_ROOT" ]; then
    echo "❌ OneDrive directory not found at: $ONEDRIVE_ROOT"
    echo "Please adjust the ONEDRIVE_ROOT path in this script to match your OneDrive location."
    exit 1
fi

# Create OneDrive project directory
mkdir -p "$ONEDRIVE_PROJECT"

# Sync checkpoints
if [ -d "$CHECKPOINT_DIR" ]; then
    echo "📦 Syncing checkpoints..."
    rsync -av --progress "$CHECKPOINT_DIR/" "$ONEDRIVE_PROJECT/checkpoints/"
    echo "✅ Checkpoints synced"
else
    echo "⚠️  No checkpoints directory found. Create some checkpoints first."
fi

# Sync database backups
if [ -d "$PROJECT_ROOT/backend/backups" ]; then
    echo "💾 Syncing database backups..."
    mkdir -p "$ONEDRIVE_PROJECT/database_backups"
    rsync -av --progress "$PROJECT_ROOT/backend/backups/" "$ONEDRIVE_PROJECT/database_backups/"
    echo "✅ Database backups synced"
fi

# Sync git repository (compressed)
echo "🔀 Creating git backup..."
cd "$PROJECT_ROOT"
git bundle create "$ONEDRIVE_PROJECT/psychpath-git-backup-$(date +%Y%m%d_%H%M%S).bundle" --all
echo "✅ Git repository backed up"

# Create project info
echo "📋 Creating project info..."
cat > "$ONEDRIVE_PROJECT/project-info.txt" << EOF
PsychPATH Project Backup
========================

Created: $(date)
Location: $PROJECT_ROOT
OneDrive: $ONEDRIVE_PROJECT

Checkpoints: $([ -d "$CHECKPOINT_DIR" ] && find "$CHECKPOINT_DIR" -maxdepth 1 -type d | wc -l | xargs || echo "0") available
Database: PostgreSQL 16.10
Git: $(git branch --show-current) branch

Recovery Instructions:
1. Restore git: git clone psychpath-git-backup-[timestamp].bundle
2. Restore database: Use PostgreSQL backup files
3. Restore checkpoint: Use checkpoint restore scripts

Last sync: $(date)
EOF

echo ""
echo "✅ OneDrive sync completed!"
echo "📁 Backed up to: $ONEDRIVE_PROJECT"
echo ""
echo "📊 Backup Summary:"
echo "   Checkpoints: $([ -d "$ONEDRIVE_PROJECT/checkpoints" ] && find "$ONEDRIVE_PROJECT/checkpoints" -maxdepth 1 -type d | wc -l | xargs || echo "0")"
echo "   Database backups: $([ -d "$ONEDRIVE_PROJECT/database_backups" ] && find "$ONEDRIVE_PROJECT/database_backups" -name "*.sql" | wc -l | xargs || echo "0")"
echo "   Git bundles: $([ -d "$ONEDRIVE_PROJECT" ] && find "$ONEDRIVE_PROJECT" -name "*.bundle" | wc -l | xargs || echo "0")"
echo ""
echo "💡 This backup will automatically sync to OneDrive cloud storage"
