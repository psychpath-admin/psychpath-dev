# PsychPATH Development Setup

## Quick Start

### Start Development Servers
```bash
./start-dev.sh
```

### Stop Development Servers
```bash
./stop-dev.sh
```

## Access Points

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000

## Test User Credentials

All test users use the password: **`testpass123`**

### Main Test Users

| Email | Role | Name |
|-------|------|------|
| `brett@cymp.com.au` | Admin | Brett Mackie |
| `intern1.demo@cymp.com.au` | Provisional | Phil O'Brien |
| `intern2.demo@cymp.com.au` | Provisional | Maryam Baboli |
| `intern3.demo@cymp.com.au` | Provisional | Intern Three |
| `intern4.demo@cymp.com.au` | Provisional | Charlotte Gorham Mackie |
| `supervisor.demo@cymp.com.au` | Supervisor | Brett Mackie |
| `registrar1.demo@cymp.com.au` | Registrar | Registrar One |
| `registrar.demo@cymp.com.au` | Registrar | - |
| `admin@demo.test` | Admin | - |

## Troubleshooting

### Port Already in Use
If you get port errors, run:
```bash
./stop-dev.sh
./start-dev.sh
```

### Clear Browser Cache
1. Press `Ctrl+Shift+Delete` (Windows/Linux) or `Cmd+Shift+Delete` (Mac)
2. Select "All time"
3. Clear "Cached images and files" and "Cookies and site data"
4. Close and reopen browser

### View Server Logs
```bash
# Backend logs
tail -f /tmp/psychpath-backend.log

# Frontend logs
tail -f /tmp/psychpath-frontend.log
```

### Reset User Password
```bash
cd backend
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
user = User.objects.get(username='EMAIL_HERE')
user.set_password('testpass123')
user.save()
"
```

## Notes

- Frontend uses Vite proxy to avoid CORS issues
- All API requests go through `/api` prefix
- Port 5173 is reserved for frontend
- Port 8000 is reserved for backend

