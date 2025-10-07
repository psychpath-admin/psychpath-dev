# PsychPATH Code Backup - 20251007_221655

## Backup Information
- **Backup ID**: code_backup_20251007_221655
- **Timestamp**: Tue Oct  7 22:16:56 AEDT 2025
- **Git Commit**: c0c8450637dadb287aa28608052ff226ac685ab1
- **Git Tag**: code_backup_20251007_221655

## Recovery Instructions
1. **Stop services**: make dev-stop
2. **Restore code**: git checkout code_backup_20251007_221655
3. **Start services**: make dev-start

## Quick Recovery
```bash
cd "/Users/macdemac/Local Sites/PsychPATH/backups/code_backup_20251007_221655"
./RECOVER.sh
```

## Manual Recovery
```bash
cd /Users/macdemac/Local\ Sites/PsychPATH
make dev-stop
git checkout code_backup_20251007_221655
make dev-start
```
