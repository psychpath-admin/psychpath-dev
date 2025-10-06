# PsychPATH Code Backup - 20251006_125818

## Backup Information
- **Backup ID**: code_backup_20251006_125818
- **Timestamp**: Mon Oct  6 12:58:19 AEDT 2025
- **Git Commit**: e79c9b1b03ff7262fdff7bd156f42e4d9c93f2f8
- **Git Tag**: code_backup_20251006_125818

## Recovery Instructions
1. **Stop services**: make dev-stop
2. **Restore code**: git checkout code_backup_20251006_125818
3. **Start services**: make dev-start

## Quick Recovery
```bash
cd "/Users/macdemac/Local Sites/PsychPATH/backups/code_backup_20251006_125818"
./RECOVER.sh
```

## Manual Recovery
```bash
cd /Users/macdemac/Local\ Sites/PsychPATH
make dev-stop
git checkout code_backup_20251006_125818
make dev-start
```
