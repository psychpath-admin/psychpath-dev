# Working Backup: working_backup_test_makefile

**Created:** Mon Oct  6 13:13:39 AEDT 2025
**Type:** Code + Database
**Status:** ✅ WORKING

## Contents
- Code: Git tag `working_backup_test_makefile`
- Database: `database.sql`
- Recovery: `RECOVER.sh`

## Recovery Instructions
1. Run: `cd backups/working_backup_test_makefile && ./RECOVER.sh`
2. Or manually:
   - `git checkout working_backup_test_makefile`
   - `psql -h localhost -U psychpath -d psychpath < database.sql`

## Git Tag: working_backup_test_makefile
