# PsychPATH Backup Guide (PostgreSQL → OneDrive)

## Script
- Path: `scripts/pg_onedrive_backup.sh`
- Output: `~/OneDrive - CHANGE YOUR MIND PSYCHOLOGY PTY LTD/PsychPATH-Backups/YYYYmmdd_HHMMSS/`
- Files: `psychpath.dump` (custom format), `MANIFEST.env`, `SHA256SUMS.txt`

## Run manually
```bash
"/Users/macdemac/Local Sites/PsychPATH/scripts/pg_onedrive_backup.sh"
```

## Schedule (cron, daily at 02:10)
```bash
crontab -e
10 2 * * * PATH="/opt/homebrew/opt/postgresql@16/bin:/usr/local/bin:/usr/bin:/bin" /bin/bash \
  "/Users/macdemac/Local Sites/PsychPATH/scripts/pg_onedrive_backup.sh" \
  >> "/Users/macdemac/Local Sites/PsychPATH/logs/backup.log" 2>&1
```

Notes:
- Ensure authentication via `~/.pgpass` (recommended) or `PGPASSWORD` in your shell profile.
- Ensure `pg_dump` v16 tools are in PATH (as above) to match server version.
- Retention: the script keeps the 15 most recent backups automatically.

## Restore (summary)
```bash
pg_restore --clean --create -h HOST -p PORT -U USER -d postgres \
  "~/OneDrive - CHANGE YOUR MIND PSYCHOLOGY PTY LTD/PsychPATH-Backups/YYYYmmdd_HHMMSS/psychpath.dump"
```

If you later want role/global backup, run script as a superuser and uncomment/add the `pg_dumpall --globals-only` step.
