# PsychPATH Native Backup System

## ✅ Implementation Complete

The native backup system has been successfully implemented and tested. Your PsychPATH application now has automated nightly backups at 2:30 AM with comprehensive logging and error handling.

## 📁 Files Created

### Core Scripts
- `scripts/nightly-backup-native.sh` - Main backup script
- `scripts/nightly-backup-wrapper.sh` - Wrapper with logging and error handling
- `scripts/backup-manager.sh` - Management utility for backup operations

### Configuration
- `.backup-env` - Database configuration
- `~/Library/LaunchAgents/com.psychpath.nightly-backup.plist` - macOS launchd configuration

## 🚀 What's Working

### ✅ Automated Backups
- **Schedule**: Every night at 2:30 AM
- **Location**: OneDrive folder with fallback to Documents
- **Contents**: Database dump, source code, dependency manifests
- **Size**: ~715MB per backup
- **Retention**: 30 days (automatic cleanup)

### ✅ Comprehensive Logging
- Daily log files in `logs/nightly-backup-YYYYMMDD.log`
- Launchd logs in `logs/launchd-backup-*.log`
- Success/failure notifications via macOS notifications

### ✅ Error Handling
- Database connection testing before backup
- Automatic fallback to local backup if OneDrive unavailable
- PostgreSQL path detection for different installations
- Graceful failure with detailed error messages

## 🛠️ Management Commands

### Quick Status Check
```bash
./scripts/backup-manager.sh status
```

### Manual Backup Test
```bash
./scripts/backup-manager.sh test
```

### Enable/Disable Scheduled Backups
```bash
./scripts/backup-manager.sh enable
./scripts/backup-manager.sh disable
```

### View Logs
```bash
./scripts/backup-manager.sh logs
```

### Restore from Backup
```bash
./scripts/backup-manager.sh restore 20251018-232738
```

## 📊 Current Status

**Scheduled Job**: ✅ Active (PID: 1)
**Last Backup**: ✅ 2025-10-18 23:28:08 (715MB)
**Database**: ✅ PostgreSQL 15.14 (Homebrew)
**Backup Location**: ✅ OneDrive + local fallback
**Logs**: ✅ Comprehensive logging active

## 🔧 Technical Details

### Backup Contents
- `db-YYYYMMDD-HHMMSS.sql.gz` - Compressed PostgreSQL dump
- `source/` - Complete source code snapshot (excludes node_modules, venv, .git)
- `frontend-package.json` - Frontend dependencies
- `frontend-package-lock.json` - Exact frontend dependency versions
- `backend-requirements.txt` - Backend Python dependencies
- `backend-freeze-YYYYMMDD-HHMMSS.txt` - Exact Python environment
- `BACKUP_INFO.txt` - Restoration instructions and metadata

### Database Configuration
- **Database**: `psychpath`
- **User**: `macdemac`
- **PostgreSQL Path**: `/opt/homebrew/opt/postgresql@15/bin/pg_dump`

### Environment Variables
- `POSTGRES_DB=psychpath`
- `POSTGRES_USER=macdemac`

## 🔄 Restoration Process

1. **Stop services**: `pkill -f "manage.py runserver" && pkill -f "npm run dev"`
2. **Restore database**: `gunzip -c backup/db-*.sql.gz | psql -U macdemac -d psychpath`
3. **Restore source**: `rsync -av backup/source/ /path/to/restore/`
4. **Reinstall dependencies**: `pip install -r backup/backend-freeze-*.txt`
5. **Run migrations**: `python manage.py migrate`
6. **Restart services**: `make dev-start`

## 📱 macOS Integration

### Sleep Considerations
For reliable 2:30 AM backups, ensure your Mac stays awake:
```bash
# Schedule wake at 2:25 AM daily
sudo pmset repeat wakeorpoweron MTWRFSU 02:25:00
```

### Launchd Management
```bash
# View job status
launchctl list | grep psychpath

# Manual trigger
launchctl start com.psychpath.nightly-backup

# Unload/load after changes
launchctl unload ~/Library/LaunchAgents/com.psychpath.nightly-backup.plist
launchctl load ~/Library/LaunchAgents/com.psychpath.nightly-backup.plist
```

## 🎯 Key Benefits

1. **Native Integration**: No Docker required, works with current setup
2. **Automatic**: Set-and-forget nightly backups
3. **Reliable**: Multiple fallbacks and error handling
4. **Comprehensive**: Database + source code + dependencies
5. **Manageable**: Easy-to-use management script
6. **Monitored**: Detailed logging and notifications
7. **Efficient**: Compressed backups, automatic cleanup

## 📈 Monitoring

### Weekly Checks
```bash
# Check recent backups
ls -lt "/Users/macdemac/OneDrive - CHANGE YOUR MIND PSYCHOLOGY PTY LTD/PsychPATH-Backups/" | head -8

# Review logs for errors
grep -i error logs/nightly-backup-*.log | tail -20
```

### Monthly Review
- Verify OneDrive sync status
- Test restore procedure
- Review backup sizes and retention
- Clean up old log files

## 🎉 Ready for Production

Your backup system is now production-ready with:
- ✅ Automated nightly backups
- ✅ Comprehensive error handling
- ✅ Easy management and monitoring
- ✅ Native macOS integration
- ✅ Tested and verified working

**Next Steps**: The system will automatically start backing up tonight at 2:30 AM. Monitor the first few backups to ensure everything works smoothly in your environment.
