# Working Backup: working_backup_test_postgres_tools

**Created:** Mon Oct  6 13:13:19 AEDT 2025
**Type:** Code + Database
**Status:** ✅ WORKING

## Contents
- Code: Git tag `working_backup_test_postgres_tools`
- Database: `database.sql`
- Recovery: `RECOVER.sh`

## Recovery Instructions
1. Run: `cd backups/working_backup_test_postgres_tools && ./RECOVER.sh`
2. Or manually:
   - `git checkout working_backup_test_postgres_tools`
   - `psql -h localhost -U psychpath -d psychpath < database.sql`

## Git Tag: working_backup_test_postgres_tools
