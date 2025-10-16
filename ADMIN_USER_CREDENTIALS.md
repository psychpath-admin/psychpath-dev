# Admin Support User Credentials

## Overview
Admin support user created for PsychPATH to assist psychology users with technical issues and provide support services.

## Credentials
- **Email**: admin@psychpath.com.au
- **Password**: testpass123
- **Support Level**: ADMIN (full permissions)
- **Django Staff**: Yes (access to Django admin and support dashboard)

## Access Points
- **Support Dashboard**: http://localhost:8000/support/
- **Django Admin**: http://localhost:8000/admin/
- **Login URL**: http://localhost:8000/admin/login/?next=/support/

## Available Features
### Dashboard Access (`/support/`)
- **User Activity Logs**: View all user activities (logins, logbook entries, profile updates)
- **Error Logs**: View user errors from database and file logs
- **Audit Logs**: View data access audit trail
- **User Management**: View all users, reset passwords
- **Support Tickets**: Manage user support requests
- **System Health**: Monitor server status and statistics

### Data Sources
- **UserActivity Model**: 1 record (tracks user activities)
- **SupportErrorLog Model**: 26 records (user errors with context)
- **Log Files**:
  - `logs/backend.log` - General application logs
  - `logs/frontend.log` - Frontend application logs
  - `logs/support_errors.log` - Support-specific errors (empty currently)

### API Endpoints (Require Staff Authentication)
- `/support/api/error-logs/` - Get error logs
- `/support/api/audit-logs/` - Get audit logs
- `/support/api/user-stats/` - Get user statistics
- `/support/api/system-health/` - Get system health
- `/support/api/dashboard-stats/` - Get dashboard statistics
- `/support/api/support-tickets/` - Get support tickets
- `/support/api/system-alerts/` - Get system alerts
- `/support/api/weekly-stats/` - Get weekly statistics
- `/support/api/server-status/` - Get server status
- `/support/api/control-server/` - Control server (start/stop)
- `/support/api/reset-password/` - Reset user passwords
- `/support/api/all-users/` - Get all users

## Usage Instructions
1. Start the backend server: `cd backend && source .venv/bin/activate && python manage.py runserver`
2. Navigate to: http://localhost:8000/support/
3. Login with the credentials above
4. Use the dashboard to:
   - View user activities and filter by date/type
   - View and resolve user errors
   - Monitor system health
   - Manage user accounts
   - View audit trails

## Security Notes
- This is a non-psychology user (no UserProfile with psychology fields)
- Has full staff permissions for support purposes
- Cannot access psychology workflows or create clinical data
- Read-only access to user data for support purposes
- Can reset passwords and view user information to assist with issues

## Created
- **Date**: October 15, 2025
- **Method**: Django management command `create_support_user`
- **Status**: Active and ready for use
