# PsychPATH Checkpoint Log

This file tracks all daily checkpoint backups. Each checkpoint creates a complete backup of:
- Source code (filesystem)
- PostgreSQL database (custom format + globals)
- Git state (commit hash and branch)

All backups are stored in OneDrive for safe keeping.

## Checkpoints


### Checkpoint: 2025-10-10 20251010_081604

- **Date**: 2025-10-10 at 08:16:34
- **Git Commit**: `4aeac78` on branch `feature/fix-logbook-submit-error`
- **Filesystem Backup**: ` 54M` (local: `backups/fs_backup_20251010_081604.tar.gz`)
- **Database Backup**: `272K` (PostgreSQL custom format + globals)
- **OneDrive Location**: `~/OneDrive - CHANGE YOUR MIND PSYCHOLOGY PTY LTD/PsychPATH-Backups/20251010_081604/`
- **Message**: Test complete checkpoint backup

**Artifacts:**
- `fs_backup.tar.gz` - Full source code (excluding node_modules, venv, etc.)
- `psychpath.dump` - PostgreSQL database (custom format)
- `postgres_globals.sql` - PostgreSQL roles and permissions
- `MANIFEST.env` - Backup metadata
- `SHA256SUMS.txt` - File checksums

**Recovery:**
```bash
# Restore database
pg_restore --clean --create -h localhost -U psychpath -d postgres \
  "~/OneDrive - CHANGE YOUR MIND PSYCHOLOGY PTY LTD/PsychPATH-Backups/20251010_081604/psychpath.dump"

# Restore code
tar -xzf "~/OneDrive - CHANGE YOUR MIND PSYCHOLOGY PTY LTD/PsychPATH-Backups/20251010_081604/fs_backup.tar.gz" \
  -C "/Users/macdemac/Local Sites/PsychPATH"
```


### Checkpoint: 2025-10-10 20251010_082121

- **Date**: 2025-10-10 at 08:21:55
- **Git Commit**: `ecc1298` on branch `feature/fix-logbook-submit-error`
- **Filesystem Backup**: ` 54M` (local: `backups/fs_backup_20251010_082121.tar.gz`)
- **Database Backup**: `272K` (PostgreSQL custom format + globals)
- **OneDrive Location**: `~/OneDrive - CHANGE YOUR MIND PSYCHOLOGY PTY LTD/PsychPATH-Backups/20251010_082121/`
- **Message**: Daily automated checkpoint

**Artifacts:**
- `fs_backup.tar.gz` - Full source code (excluding node_modules, venv, etc.)
- `psychpath.dump` - PostgreSQL database (custom format)
- `postgres_globals.sql` - PostgreSQL roles and permissions
- `MANIFEST.env` - Backup metadata
- `SHA256SUMS.txt` - File checksums

**Recovery:**
```bash
# Restore database
pg_restore --clean --create -h localhost -U psychpath -d postgres \
  "~/OneDrive - CHANGE YOUR MIND PSYCHOLOGY PTY LTD/PsychPATH-Backups/20251010_082121/psychpath.dump"

# Restore code
tar -xzf "~/OneDrive - CHANGE YOUR MIND PSYCHOLOGY PTY LTD/PsychPATH-Backups/20251010_082121/fs_backup.tar.gz" \
  -C "/Users/macdemac/Local Sites/PsychPATH"
```


### Checkpoint: 2025-10-10 20251010_124722

- **Date**: 2025-10-10 at 12:47:39
- **Git Commit**: `8329b81` on branch `feature/fix-logbook-submit-error`
- **Filesystem Backup**: ` 54M` (local: `backups/fs_backup_20251010_124722.tar.gz`)
- **Database Backup**: `272K` (PostgreSQL custom format + globals)
- **OneDrive Location**: `~/OneDrive - CHANGE YOUR MIND PSYCHOLOGY PTY LTD/PsychPATH-Backups/20251010_124722/`
- **Message**: Manual checkpoint request

**Artifacts:**
- `fs_backup.tar.gz` - Full source code (excluding node_modules, venv, etc.)
- `psychpath.dump` - PostgreSQL database (custom format)
- `postgres_globals.sql` - PostgreSQL roles and permissions
- `MANIFEST.env` - Backup metadata
- `SHA256SUMS.txt` - File checksums

**Recovery:**
```bash
# Restore database
pg_restore --clean --create -h localhost -U psychpath -d postgres \
  "~/OneDrive - CHANGE YOUR MIND PSYCHOLOGY PTY LTD/PsychPATH-Backups/20251010_124722/psychpath.dump"

# Restore code
tar -xzf "~/OneDrive - CHANGE YOUR MIND PSYCHOLOGY PTY LTD/PsychPATH-Backups/20251010_124722/fs_backup.tar.gz" \
  -C "/Users/macdemac/Local Sites/PsychPATH"
```

