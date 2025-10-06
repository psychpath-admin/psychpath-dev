# 🛡️ PsychPATH Recovery Guide

## 🚨 **Emergency Recovery Procedures**

### **Quick Recovery (5 minutes)**
```bash
# 1. Stop all services
make dev-stop

# 2. List available backups
ls -la backups/ | grep "psychpath_backup_"

# 3. Recover from specific backup
make recover BACKUP=psychpath_backup_YYYYMMDD_HHMMSS

# 4. Validate system
make validate
```

### **Checkpoint Recovery (2 minutes)**
```bash
# 1. List available checkpoints
ls -la checkpoints/ | grep "checkpoint_"

# 2. Quick recovery from checkpoint
cd checkpoints/checkpoint_YYYYMMDD_HHMMSS
./QUICK_RECOVER.sh

# 3. Validate
make validate
```

## 📋 **Pre-Change Safety Protocol**

### **Before ANY major changes:**
```bash
# 1. Create checkpoint
make checkpoint MSG="Before implementing [feature name]"

# 2. Create full backup
make backup

# 3. Validate current state
make validate
```

### **After changes:**
```bash
# 1. Test functionality
make validate

# 2. If issues found, recover immediately
make recover BACKUP=latest_backup_name
```

## 🔍 **System Validation Checklist**

### **Database Validation**
- [ ] All users can login
- [ ] All logbook entries visible
- [ ] Supervisor-supervisee relationships intact
- [ ] No database errors in logs

### **API Validation**
- [ ] All endpoints responding (200/201)
- [ ] Authentication working
- [ ] Data retrieval working
- [ ] No 500 errors

### **Frontend Validation**
- [ ] All pages load without errors
- [ ] Navigation working
- [ ] Forms submit successfully
- [ ] No console errors

## 🚨 **Common Recovery Scenarios**

### **Scenario 1: Data Loss**
```bash
# Symptoms: Users missing, logbooks gone, relationships broken
# Solution: Restore from backup
make recover BACKUP=psychpath_backup_YYYYMMDD_HHMMSS
```

### **Scenario 2: Code Issues**
```bash
# Symptoms: Compilation errors, missing files, broken functionality
# Solution: Restore from checkpoint
cd checkpoints/checkpoint_YYYYMMDD_HHMMSS
./QUICK_RECOVER.sh
```

### **Scenario 3: Database Corruption**
```bash
# Symptoms: Database errors, migration failures
# Solution: Full system restore
make dev-stop
make recover BACKUP=psychpath_backup_YYYYMMDD_HHMMSS
make dev-start
```

### **Scenario 4: Service Failures**
```bash
# Symptoms: Servers won't start, port conflicts
# Solution: Clean restart
make dev-stop
pkill -f "manage.py runserver" || true
pkill -f "npm run dev" || true
make dev-start
```

## 📊 **Backup Management**

### **Automatic Backups**
- **Frequency**: Before every major change
- **Retention**: Last 10 backups kept
- **Location**: `backups/psychpath_backup_YYYYMMDD_HHMMSS/`

### **Manual Backups**
```bash
# Create backup now
make backup

# List all backups
ls -la backups/

# Recover from specific backup
make recover BACKUP=psychpath_backup_YYYYMMDD_HHMMSS
```

### **Checkpoint Management**
- **Frequency**: Before any code changes
- **Retention**: Last 20 checkpoints kept
- **Location**: `checkpoints/checkpoint_YYYYMMDD_HHMMSS/`

## 🔧 **Troubleshooting**

### **Backup Not Found**
```bash
# Check available backups
ls -la backups/

# Check git tags
git tag | grep backup

# Check git log
git log --oneline -10
```

### **Recovery Failed**
```bash
# Check logs
tail -f logs/backend.log
tail -f logs/frontend.log

# Manual recovery
cd backups/backup_name
./RECOVER.sh
```

### **Validation Failed**
```bash
# Check service status
make dev-status

# Check database
psql -h localhost -U psychpath_user -d psychpath_db -c "SELECT COUNT(*) FROM api_userprofile;"

# Check API
curl http://localhost:8000/api/me/
```

## 📝 **Best Practices**

### **Daily Workflow**
1. **Start of day**: `make checkpoint MSG="Start of day"`
2. **Before changes**: `make checkpoint MSG="Before [change description]"`
3. **End of day**: `make backup`

### **Weekly Workflow**
1. **Monday**: `make backup` (weekly backup)
2. **Friday**: `make eod-complete` (full EOD workflow)

### **Emergency Procedures**
1. **Stop immediately** if issues detected
2. **Don't make more changes** until recovered
3. **Use latest backup** for recovery
4. **Validate thoroughly** after recovery

## 🎯 **Recovery Success Criteria**

### **System is fully recovered when:**
- [ ] All users can login
- [ ] All logbook entries visible
- [ ] Supervisor-supervisee relationships intact
- [ ] All functionality working as expected
- [ ] No console errors
- [ ] All API endpoints responding
- [ ] Database queries successful

## 📞 **Emergency Contacts**

### **If Recovery Fails:**
1. Check this guide first
2. Review backup logs
3. Check git history
4. Contact support with specific error messages

---

**Remember**: It's better to recover early than to dig deeper into problems. When in doubt, recover from the latest backup and start fresh.
