# PsychPATH Backend Server Troubleshooting Guide

## 🚀 Quick Start

The backend server now has robust management tools to prevent crashes and make debugging easier.

### Available Commands

```bash
# Check server health
make backend-health

# Restart server with monitoring
make backend-restart

# Restart everything (backend + frontend)
make restart-all

# Manual server management
cd backend
./health_check.sh      # Diagnose issues
./start_server.sh      # Start with auto-restart monitoring
```

## 🔧 Common Issues & Solutions

### 1. "We're having trouble connecting to the model provider"

**Root Cause:** Backend server crashed or stopped responding

**Solution:**
```bash
make restart-all       # Restart everything (recommended)
# OR
make backend-health    # Check what's wrong
make backend-restart   # Restart just the backend
```

### 2. Server Keeps Crashing

**Root Causes:**
- Memory issues
- Database connection problems
- Port conflicts
- Python environment issues

**Solution:**
```bash
cd backend
./health_check.sh      # Get detailed diagnosis
./start_server.sh      # Start with auto-restart monitoring
```

### 3. Authentication Errors (401/403)

**Root Cause:** JWT tokens expired or invalid

**Solution:**
- Log out and log back in to the frontend
- Check if backend server is running: `make backend-health`

### 4. Database Connection Issues

**Root Cause:** PostgreSQL not running or database doesn't exist

**Solution:**
```bash
# Check PostgreSQL status
brew services list | grep postgresql

# Start PostgreSQL if needed
brew services start postgresql

# Create database if missing
make db-setup
```

## 📊 Health Check Details

The health check script (`./health_check.sh`) checks:

- ✅ Virtual environment activation
- ✅ Python version compatibility
- ✅ Django installation
- ✅ Database connectivity
- ✅ Server responsiveness
- ✅ System resources (memory, disk)
- ✅ Port availability

## 🔄 Auto-Restart Monitoring

The `start_server.sh` script provides:

- **Automatic restart** if server crashes
- **Health monitoring** every 10 seconds
- **Detailed logging** to `runserver.log`
- **Process management** (kills old processes)

## 📝 Logs & Debugging

### View Server Logs
```bash
cd backend
tail -f runserver.log
```

### Debug Mode
```bash
cd backend
python manage.py runserver 0.0.0.0:8000 --verbosity=2
```

### Check System Resources
```bash
# Memory usage
ps aux | grep "manage.py runserver"

# Port usage
lsof -i :8000

# Disk space
df -h
```

## 🛠️ Advanced Troubleshooting

### Reset Everything
```bash
make dev-stop          # Stop all servers
make backend-restart   # Restart backend with monitoring
cd frontend && npm run dev &  # Start frontend
```

### Database Issues
```bash
cd backend
python manage.py check --deploy  # Check Django config
python manage.py shell -c "from django.db import connection; connection.ensure_connection()"  # Test DB
```

### Environment Issues
```bash
cd backend
source venv/bin/activate  # Activate virtual environment
python --version         # Check Python version
pip list | grep Django   # Check Django installation
```

## 📞 When to Contact Support

Contact support if you see:

- Persistent crashes after running `make backend-restart`
- Database corruption errors
- Memory usage consistently above 80%
- Python version incompatibility errors

## 🎯 Best Practices

1. **Always check health first:** `make backend-health`
2. **Use the restart command:** `make backend-restart`
3. **Monitor logs:** `tail -f backend/runserver.log`
4. **Keep backups:** Regular database backups with `make db-backup`
5. **Update regularly:** Keep dependencies updated

---

**Last Updated:** October 18, 2025
**Version:** 1.0
