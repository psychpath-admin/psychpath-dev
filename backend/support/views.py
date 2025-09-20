from django.shortcuts import render
from django.contrib.admin.views.decorators import staff_member_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.conf import settings
from django.db.models import Count, Q, Sum
from django.utils import timezone
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
import os
import json
import subprocess
import psutil
import signal
from datetime import datetime, timedelta
from api.models import UserProfile
from .models import SupportUser, UserActivity, SupportTicket, SystemAlert, WeeklyStats
from section_b.models import ProfessionalDevelopmentEntry
from section_c.models import SupervisionEntry
from section_a.models import SectionAEntry

@staff_member_required
def support_dashboard(request):
    """Enhanced support dashboard with comprehensive statistics"""
    return render(request, 'support/dashboard.html', {
        'title': 'CAPE Support Dashboard'
    })

@staff_member_required
@require_http_methods(["GET"])
def get_error_logs(request):
    """Get recent error logs for support team"""
    try:
        logs_dir = os.path.join(settings.BASE_DIR, 'logs')
        support_log_file = os.path.join(logs_dir, 'support_errors.log')
        
        if not os.path.exists(support_log_file):
            return JsonResponse({'logs': [], 'message': 'No support logs found'})
        
        # Read last 100 lines
        with open(support_log_file, 'r') as f:
            lines = f.readlines()
            recent_lines = lines[-100:] if len(lines) > 100 else lines
        
        logs = []
        for line in recent_lines:
            if line.strip():
                logs.append({
                    'timestamp': line[:19] if len(line) > 19 else 'Unknown',
                    'content': line.strip()
                })
        
        return JsonResponse({'logs': logs})
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@staff_member_required
@require_http_methods(["GET"])
def get_audit_logs(request):
    """Get recent audit logs"""
    try:
        logs_dir = os.path.join(settings.BASE_DIR, 'logs')
        audit_log_file = os.path.join(logs_dir, 'data_access_audit.log')
        
        if not os.path.exists(audit_log_file):
            return JsonResponse({'logs': [], 'message': 'No audit logs found'})
        
        # Read last 100 lines
        with open(audit_log_file, 'r') as f:
            lines = f.readlines()
            recent_lines = lines[-100:] if len(lines) > 100 else lines
        
        logs = []
        for line in recent_lines:
            if line.strip():
                logs.append({
                    'timestamp': line[:19] if len(line) > 19 else 'Unknown',
                    'content': line.strip()
                })
        
        return JsonResponse({'logs': logs})
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@staff_member_required
@require_http_methods(["GET"])
def get_user_stats(request):
    """Get user statistics for support team"""
    try:
        stats = {
            'total_users': User.objects.count(),
            'active_users': User.objects.filter(is_active=True).count(),
            'users_by_role': {},
            'recent_registrations': []
        }
        
        # Count users by role
        for role, _ in UserProfile.UserRole.choices:
            count = UserProfile.objects.filter(role=role).count()
            stats['users_by_role'][role] = count
        
        # Recent registrations (last 7 days)
        week_ago = datetime.now() - timedelta(days=7)
        recent_profiles = UserProfile.objects.filter(
            created_at__gte=week_ago
        ).select_related('user').order_by('-created_at')[:10]
        
        stats['recent_registrations'] = [
            {
                'email': profile.user.email,
                'role': profile.role,
                'created_at': profile.created_at.isoformat() if profile.created_at else None,
                'organization': profile.organization.name if profile.organization else None
            }
            for profile in recent_profiles
        ]
        
        return JsonResponse(stats)
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@staff_member_required
@require_http_methods(["GET"])
def get_system_health(request):
    """Get system health status"""
    try:
        health_status = {
            'database': 'healthy',
            'logs': 'healthy',
            'permissions': 'healthy',
            'last_check': datetime.now().isoformat()
        }
        
        # Check database
        try:
            User.objects.count()
        except Exception:
            health_status['database'] = 'error'
        
        # Check logs directory
        logs_dir = os.path.join(settings.BASE_DIR, 'logs')
        if not os.path.exists(logs_dir):
            health_status['logs'] = 'warning'
        
        # Check log files
        log_files = ['support_errors.log', 'data_access_audit.log', 'application_errors.log']
        for log_file in log_files:
            log_path = os.path.join(logs_dir, log_file)
            if not os.path.exists(log_path):
                health_status['logs'] = 'warning'
                break
        
        return JsonResponse(health_status)
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@staff_member_required
@require_http_methods(["GET"])
def get_dashboard_stats(request):
    """Get comprehensive dashboard statistics"""
    try:
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
        # User statistics
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        new_users_week = User.objects.filter(date_joined__gte=week_ago).count()
        new_users_month = User.objects.filter(date_joined__gte=month_ago).count()
        
        # User activity statistics
        recent_logins = UserActivity.objects.filter(
            activity_type='LOGIN',
            created_at__gte=week_ago
        ).count()
        
        last_10_logins = UserActivity.objects.filter(
            activity_type='LOGIN'
        ).select_related('user').order_by('-created_at')[:10]
        
        # Most active users (by activity count)
        most_active_users = UserActivity.objects.filter(
            created_at__gte=week_ago
        ).values('user__email', 'user__first_name', 'user__last_name').annotate(
            activity_count=Count('id')
        ).order_by('-activity_count')[:10]
        
        # Entry statistics
        pd_entries_week = ProfessionalDevelopmentEntry.objects.filter(
            created_at__gte=week_ago
        ).count()
        
        supervision_entries_week = SupervisionEntry.objects.filter(
            created_at__gte=week_ago
        ).count()
        
        section_a_entries_week = SectionAEntry.objects.filter(
            created_at__gte=week_ago
        ).count()
        
        # Support ticket statistics
        open_tickets = SupportTicket.objects.filter(status__in=['OPEN', 'IN_PROGRESS']).count()
        resolved_tickets_week = SupportTicket.objects.filter(
            status='RESOLVED',
            resolved_at__gte=week_ago
        ).count()
        
        # System alerts
        active_alerts = SystemAlert.objects.filter(is_resolved=False).count()
        critical_alerts = SystemAlert.objects.filter(
            is_resolved=False,
            severity='CRITICAL'
        ).count()
        
        # User role distribution
        role_distribution = UserProfile.objects.values('role').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Recent activities
        recent_activities = UserActivity.objects.select_related('user').order_by('-created_at')[:20]
        
        stats = {
            'users': {
                'total': total_users,
                'active': active_users,
                'new_this_week': new_users_week,
                'new_this_month': new_users_month,
                'recent_logins': recent_logins,
                'role_distribution': list(role_distribution)
            },
            'activities': {
                'last_10_logins': [
                    {
                        'user': f"{activity.user.first_name} {activity.user.last_name}",
                        'email': activity.user.email,
                        'timestamp': activity.created_at.isoformat(),
                        'ip': activity.ip_address
                    }
                    for activity in last_10_logins
                ],
                'most_active_users': list(most_active_users),
                'recent_activities': [
                    {
                        'user': f"{activity.user.first_name} {activity.user.last_name}",
                        'email': activity.user.email,
                        'type': activity.activity_type,
                        'description': activity.description,
                        'timestamp': activity.created_at.isoformat()
                    }
                    for activity in recent_activities
                ]
            },
            'entries': {
                'pd_entries_week': pd_entries_week,
                'supervision_entries_week': supervision_entries_week,
                'section_a_entries_week': section_a_entries_week,
                'total_entries_week': pd_entries_week + supervision_entries_week + section_a_entries_week
            },
            'support': {
                'open_tickets': open_tickets,
                'resolved_tickets_week': resolved_tickets_week,
                'active_alerts': active_alerts,
                'critical_alerts': critical_alerts
            }
        }
        
        return JsonResponse(stats)
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@staff_member_required
@require_http_methods(["GET"])
def get_support_tickets(request):
    """Get support tickets"""
    try:
        tickets = SupportTicket.objects.select_related('user', 'assigned_to').order_by('-created_at')[:50]
        
        ticket_data = []
        for ticket in tickets:
            ticket_data.append({
                'id': ticket.id,
                'subject': ticket.subject,
                'status': ticket.status,
                'priority': ticket.priority,
                'user': f"{ticket.user.first_name} {ticket.user.last_name}",
                'user_email': ticket.user.email,
                'assigned_to': f"{ticket.assigned_to.first_name} {ticket.assigned_to.last_name}" if ticket.assigned_to else None,
                'created_at': ticket.created_at.isoformat(),
                'updated_at': ticket.updated_at.isoformat(),
                'tags': ticket.tags
            })
        
        return JsonResponse({'tickets': ticket_data})
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@staff_member_required
@require_http_methods(["GET"])
def get_system_alerts(request):
    """Get system alerts"""
    try:
        alerts = SystemAlert.objects.order_by('-created_at')[:20]
        
        alert_data = []
        for alert in alerts:
            alert_data.append({
                'id': alert.id,
                'type': alert.alert_type,
                'title': alert.title,
                'description': alert.description,
                'severity': alert.severity,
                'is_resolved': alert.is_resolved,
                'resolved_by': f"{alert.resolved_by.first_name} {alert.resolved_by.last_name}" if alert.resolved_by else None,
                'created_at': alert.created_at.isoformat(),
                'resolved_at': alert.resolved_at.isoformat() if alert.resolved_at else None
            })
        
        return JsonResponse({'alerts': alert_data})
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@staff_member_required
@require_http_methods(["GET"])
def get_weekly_stats(request):
    """Get weekly statistics"""
    try:
        weeks = WeeklyStats.objects.order_by('-week_start')[:12]  # Last 12 weeks
        
        stats_data = []
        for week in weeks:
            stats_data.append({
                'week_start': week.week_start.isoformat(),
                'total_users': week.total_users,
                'active_users': week.active_users,
                'new_registrations': week.new_registrations,
                'pd_entries_created': week.pd_entries_created,
                'supervision_entries_created': week.supervision_entries_created,
                'section_a_entries_created': week.section_a_entries_created,
                'support_tickets_created': week.support_tickets_created,
                'support_tickets_resolved': week.support_tickets_resolved,
                'error_count': week.error_count
            })
        
        return JsonResponse({'weekly_stats': stats_data})
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@staff_member_required
@require_http_methods(["GET"])
def get_server_status(request):
    """Get status of Django and frontend servers"""
    try:
        django_running = is_django_running()
        frontend_running = is_frontend_running()
        
        status = {
            'django': {
                'running': django_running,
                'status': 'Running' if django_running else 'Stopped',
                'url': 'http://localhost:8000' if django_running else None
            },
            'frontend': {
                'running': frontend_running,
                'status': 'Running' if frontend_running else 'Stopped',
                'url': 'http://localhost:5173' if frontend_running else None
            }
        }
        
        return JsonResponse(status)
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@staff_member_required
@require_http_methods(["POST"])
def control_server(request):
    """Start, stop, or restart servers"""
    try:
        data = json.loads(request.body)
        action = data.get('action')  # start, stop, restart
        server = data.get('server', 'both')  # django, frontend, both
        
        if action == 'start':
            result = start_servers(server)
        elif action == 'stop':
            result = stop_servers(server)
        elif action == 'restart':
            stop_servers(server)
            result = start_servers(server)
        else:
            return JsonResponse({'error': 'Invalid action'}, status=400)
        
        return JsonResponse({'success': True, 'message': result})
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@staff_member_required
@require_http_methods(["POST"])
def reset_user_password(request):
    """Reset a user's password"""
    try:
        data = json.loads(request.body)
        email = data.get('email')
        new_password = data.get('password')
        
        if not email or not new_password:
            return JsonResponse({'error': 'Email and password are required'}, status=400)
        
        try:
            user = User.objects.get(email=email)
            user.set_password(new_password)
            user.save()
            
            # Log the password reset activity
            UserActivity.objects.create(
                user=request.user,
                activity_type='PASSWORD_RESET',
                description=f'Password reset for user: {email}',
                metadata={'target_user': email, 'reset_by': request.user.email}
            )
            
            return JsonResponse({'success': True, 'message': f'Password reset successfully for {email}'})
            
        except User.DoesNotExist:
            return JsonResponse({'error': f'User with email {email} not found'}, status=404)
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@staff_member_required
@require_http_methods(["GET"])
def get_all_users(request):
    """Get list of all users for password reset"""
    try:
        users = User.objects.all().order_by('email')
        user_data = []
        
        for user in users:
            try:
                profile = user.profile
                role = profile.role
                organization = profile.organization.name if profile.organization else None
            except:
                role = 'No Profile'
                organization = None
            
            user_data.append({
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_active': user.is_active,
                'date_joined': user.date_joined.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'role': role,
                'organization': organization
            })
        
        return JsonResponse({'users': user_data})
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

# Helper functions for server control
def is_django_running():
    """Check if Django server is running"""
    try:
        if os.path.exists('django.pid'):
            with open('django.pid', 'r') as f:
                pid = int(f.read().strip())
            return psutil.pid_exists(pid)
    except:
        pass
    return False

def is_frontend_running():
    """Check if frontend server is running"""
    try:
        frontend_pid_file = os.path.join(settings.BASE_DIR, '..', 'frontend', 'frontend.pid')
        if os.path.exists(frontend_pid_file):
            with open(frontend_pid_file, 'r') as f:
                pid = int(f.read().strip())
            return psutil.pid_exists(pid)
    except:
        pass
    return False

def start_servers(server):
    """Start the specified servers"""
    results = []
    
    if server in ['django', 'both']:
        if is_django_running():
            results.append('Django server is already running')
        else:
            try:
                # Start Django server
                django_cmd = ['python', 'manage.py', 'runserver', '0.0.0.0:8000']
                process = subprocess.Popen(
                    django_cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    preexec_fn=os.setsid
                )
                
                # Save PID
                with open('django.pid', 'w') as f:
                    f.write(str(process.pid))
                
                results.append('Django server started successfully')
            except Exception as e:
                results.append(f'Error starting Django server: {str(e)}')
    
    if server in ['frontend', 'both']:
        if is_frontend_running():
            results.append('Frontend server is already running')
        else:
            try:
                # Start frontend server
                frontend_cmd = ['npm', 'run', 'dev']
                frontend_dir = os.path.join(settings.BASE_DIR, '..', 'frontend')
                
                process = subprocess.Popen(
                    frontend_cmd,
                    cwd=frontend_dir,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    preexec_fn=os.setsid
                )
                
                # Save PID
                frontend_pid_file = os.path.join(frontend_dir, 'frontend.pid')
                with open(frontend_pid_file, 'w') as f:
                    f.write(str(process.pid))
                
                results.append('Frontend server started successfully')
            except Exception as e:
                results.append(f'Error starting frontend server: {str(e)}')
    
    return '; '.join(results)

def stop_servers(server):
    """Stop the specified servers"""
    results = []
    
    if server in ['django', 'both']:
        try:
            if os.path.exists('django.pid'):
                with open('django.pid', 'r') as f:
                    pid = int(f.read().strip())
                
                try:
                    os.killpg(os.getpgid(pid), signal.SIGTERM)
                    results.append('Django server stopped')
                except ProcessLookupError:
                    results.append('Django server was not running')
                
                os.remove('django.pid')
            else:
                results.append('No Django PID file found')
        except Exception as e:
            results.append(f'Error stopping Django server: {str(e)}')
    
    if server in ['frontend', 'both']:
        try:
            frontend_pid_file = os.path.join(settings.BASE_DIR, '..', 'frontend', 'frontend.pid')
            if os.path.exists(frontend_pid_file):
                with open(frontend_pid_file, 'r') as f:
                    pid = int(f.read().strip())
                
                try:
                    os.killpg(os.getpgid(pid), signal.SIGTERM)
                    results.append('Frontend server stopped')
                except ProcessLookupError:
                    results.append('Frontend server was not running')
                
                os.remove(frontend_pid_file)
            else:
                results.append('No frontend PID file found')
        except Exception as e:
            results.append(f'Error stopping frontend server: {str(e)}')
    
    return '; '.join(results)
