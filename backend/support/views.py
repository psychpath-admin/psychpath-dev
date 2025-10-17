from django.shortcuts import render
from django.contrib.admin.views.decorators import staff_member_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
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
from .models import SupportUser, UserActivity, SupportTicket, SystemAlert, WeeklyStats, ChatSession, ChatMessage, SupportUserStatus, Release
from .emails import send_new_ticket_email, send_ticket_reply_email, send_ticket_update_email
from section_b.models import ProfessionalDevelopmentEntry
from section_c.models import SupervisionEntry
from section_a.models import SectionAEntry

@staff_member_required
def support_dashboard(request):
    """Enhanced support dashboard with comprehensive statistics"""
    return render(request, 'support/dashboard.html', {
        'title': 'PsychPATH Support Dashboard'
    })


@staff_member_required
def testing_guide_view(request):
    """Render the testing guide markdown content for admins"""
    try:
        docs_dir = os.path.join(settings.BASE_DIR, '..')
        filepath = os.path.join(docs_dir, 'TESTING_GUIDE_2025-10-12.md')
        content = 'File not found.'
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                content = f.read()
        return render(request, 'support/docs.html', {
            'title': 'Testing Guide',
            'content': content
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
def testing_checklist_view(request):
    """Render the logbook testing checklist markdown content for admins"""
    try:
        docs_dir = os.path.join(settings.BASE_DIR, '..')
        filepath = os.path.join(docs_dir, 'LOGBOOK_TESTING_CHECKLIST.md')
        content = 'File not found.'
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                content = f.read()
        return render(request, 'support/docs.html', {
            'title': 'Logbook Testing Checklist',
            'content': content
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
def tests_list_view(request):
    """List tickets that have a test plan (staff only)."""
    try:
        # Show recent tickets, even if they don't have a plan yet
        tickets = SupportTicket.objects.all().order_by('-updated_at')[:200]
        items = []
        for t in tickets:
            plan = t.test_plan or {}
            items.append({
                'id': t.id,
                'subject': t.subject,
                'status': t.status,
                'qa_status': t.qa_status,
                'testing_level': plan.get('testing_level', 'DEV') if plan else '—',
                'has_plan': bool(plan and (plan.get('suites') or plan.get('testing_level'))),
                'updated_at': t.updated_at.isoformat() if t.updated_at else None,
            })
        return render(request, 'support/tests_list.html', {
            'title': 'Test Plans',
            'tickets': items
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
def test_detail_view(request, ticket_id):
    """Show a single ticket's test plan with simple checkable UI (staff only)."""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        plan = ticket.test_plan or {'testing_level': 'DEV', 'suites': []}
        return render(request, 'support/test_detail.html', {
            'title': f"Test Plan for Ticket #{ticket.id}",
            'ticket_id': ticket.id,
            'subject': ticket.subject,
            'testing_level': plan.get('testing_level', 'DEV'),
            'plan_json': json.dumps(plan),
        })
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

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
        # Debug: Log the request
        print(f"Server status request from user: {request.user.is_authenticated}, is_staff: {request.user.is_staff}")
        
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
        print(f"Server status error: {e}")
        return JsonResponse({'error': str(e)}, status=500)

@staff_member_required
@csrf_exempt
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
@csrf_exempt
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
        # First try PID file method
        if os.path.exists('django.pid'):
            with open('django.pid', 'r') as f:
                pid = int(f.read().strip())
            return psutil.pid_exists(pid)
        
        # If no PID file, try HTTP request method
        try:
            import urllib.request
            response = urllib.request.urlopen('http://localhost:8000/admin/', timeout=2)
            return response.getcode() in [200, 302]  # 200 or redirect to login
        except:
            pass
            
        # If HTTP fails, try to find Django process by name
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                if proc.info['cmdline'] and any('manage.py' in arg and 'runserver' in arg for arg in proc.info['cmdline']):
                    return True
            except:
                pass
    except:
        pass
    return False

def is_frontend_running():
    """Check if frontend server is running"""
    try:
        # First try PID file method
        frontend_pid_file = os.path.join(settings.BASE_DIR, '..', 'frontend', 'frontend.pid')
        if os.path.exists(frontend_pid_file):
            with open(frontend_pid_file, 'r') as f:
                pid = int(f.read().strip())
            return psutil.pid_exists(pid)
        
        # If no PID file, try HTTP request method
        try:
            import urllib.request
            response = urllib.request.urlopen('http://localhost:5173/', timeout=2)
            return response.getcode() == 200
        except:
            pass
            
        # If HTTP fails, try to find Vite/Node process by name
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                if proc.info['cmdline'] and any('vite' in arg.lower() or 'npm' in arg or 'node' in arg for arg in proc.info['cmdline']):
                    return True
            except:
                pass
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


# New API endpoints for support tickets and chat
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views import View
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
import json


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_support_ticket(request):
    """Create a new support ticket"""
    try:
        data = request.data
        subject = data.get('subject', '').strip()
        description = data.get('description', '').strip()
        priority = data.get('priority', 'MEDIUM')
        tags = data.get('tags', [])
        ticket_type = data.get('ticket_type', 'QUESTION')
        
        # Auto-capture metadata from request headers
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        current_url = data.get('current_url', '')
        browser_info = data.get('browser_info', '')
        app_version = data.get('app_version', '')
        
        # Planning fields (optional for ticket creation)
        user_story = data.get('user_story', '')
        acceptance_criteria = data.get('acceptance_criteria', [])
        
        # Context data from frontend (form data, console errors, etc.)
        context_data = data.get('context_data', {})
        
        if not subject or not description:
            return Response({'error': 'Subject and description are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Prepare ticket creation data
        ticket_data = {
            'user': request.user,
            'ticket_type': ticket_type,
            'subject': subject,
            'description': description,
            'priority': priority,
            'tags': tags,
            'current_url': current_url,
            'browser_info': browser_info,
            'user_agent': user_agent,
            'app_version': app_version,
            'user_story': user_story,
            'acceptance_criteria': acceptance_criteria,
            'context_data': context_data,
        }
        
        # Set stage for all ticket types to avoid database constraint violation
        ticket_data['stage'] = 'IDEA'
        
        ticket = SupportTicket.objects.create(**ticket_data)
        
        # Send email notification to support team
        send_new_ticket_email(ticket)
        
        return Response({
            'id': ticket.id,
            'ticket_type': ticket.ticket_type,
            'subject': ticket.subject,
            'status': ticket.status,
            'priority': ticket.priority,
            'created_at': ticket.created_at.isoformat(),
            'message': 'Ticket created successfully'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_tickets(request):
    """Get all tickets for the current user"""
    try:
        tickets = SupportTicket.objects.filter(user=request.user).order_by('-created_at')
        
        ticket_list = []
        for ticket in tickets:
            ticket_list.append({
                'id': ticket.id,
                'ticket_type': ticket.ticket_type,
                'subject': ticket.subject,
                'status': ticket.status,
                'priority': ticket.priority,
                'stage': ticket.stage,
                'business_value': ticket.business_value,
                'effort_estimate': ticket.effort_estimate,
                'created_at': ticket.created_at.isoformat(),
                'updated_at': ticket.updated_at.isoformat(),
                'has_unread_messages': ticket.has_unread_messages,
                'last_message_at': ticket.last_message_at.isoformat() if ticket.last_message_at else None,
                'assigned_to': ticket.assigned_to.email if ticket.assigned_to else None,
                'tags': ticket.tags,
                'target_milestone': ticket.target_milestone
            })
        
        return Response({'tickets': ticket_list})
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_ticket_detail(request, ticket_id):
    """Get detailed information about a specific ticket"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id, user=request.user)
        
        # Get chat session and messages
        session = ChatSession.objects.filter(ticket=ticket).first()
        messages = []
        if session:
            chat_messages = ChatMessage.objects.filter(session=session).order_by('created_at')
            for msg in chat_messages:
                messages.append({
                    'id': msg.id,
                    'message': msg.message,
                    'sender': {
                        'id': msg.sender.id,
                        'email': msg.sender.email,
                        'first_name': msg.sender.first_name,
                        'last_name': msg.sender.last_name,
                    },
                    'is_support': msg.is_support,
                    'created_at': msg.created_at.isoformat(),
                    'read_by_user': msg.read_by_user,
                    'read_by_support': msg.read_by_support,
                })
        
        return Response({
            'ticket': {
                'id': ticket.id,
                'ticket_type': ticket.ticket_type,
                'subject': ticket.subject,
                'description': ticket.description,
                'status': ticket.status,
                'priority': ticket.priority,
                'stage': ticket.stage,
                'business_value': ticket.business_value,
                'effort_estimate': ticket.effort_estimate,
                'implementation_notes': ticket.implementation_notes,
                'user_story': ticket.user_story,
                'acceptance_criteria': ticket.acceptance_criteria,
                'test_plan': ticket.test_plan,
                'target_milestone': ticket.target_milestone,
                'completed_at': ticket.completed_at.isoformat() if ticket.completed_at else None,
                'related_tickets': [t.id for t in ticket.related_tickets.all()],
                'user': {
                    'email': ticket.user.email,
                    'first_name': ticket.user.first_name,
                    'last_name': ticket.user.last_name,
                    'name': f"{ticket.user.first_name} {ticket.user.last_name}".strip() or ticket.user.email
                },
                'created_at': ticket.created_at.isoformat(),
                'updated_at': ticket.updated_at.isoformat(),
                'resolved_at': ticket.resolved_at.isoformat() if ticket.resolved_at else None,
                'assigned_to': ticket.assigned_to.email if ticket.assigned_to else None,
                'tags': ticket.tags,
                'has_unread_messages': ticket.has_unread_messages,
                'last_message_at': ticket.last_message_at.isoformat() if ticket.last_message_at else None,
                'context_data': ticket.context_data,
                'messages': messages,
                'session_id': session.id if session else None
            }
        })
        
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_ticket_message(request, ticket_id):
    """Send a message to a support ticket"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        
        # Check if user owns the ticket or is staff
        if ticket.user != request.user and not request.user.is_staff:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data
        message_content = data.get('message', '').strip()
        
        if not message_content:
            return Response({'error': 'Message content is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get or create chat session for this ticket
        session, created = ChatSession.objects.get_or_create(
            ticket=ticket,
            defaults={
                'user': ticket.user,
                'status': 'ACTIVE'
            }
        )
        
        # Create the message
        is_support_message = request.user.is_staff
        chat_message = ChatMessage.objects.create(
            session=session,
            sender=request.user,
            message=message_content,
            is_support=is_support_message,
            read_by_user=is_support_message,  # Mark as read by user if sent by support
            read_by_support=not is_support_message  # Mark as read by support if sent by user
        )
        
        # Update session's last_message_at
        session.last_message_at = timezone.now()
        session.save()
        
        # Update ticket's unread status
        if is_support_message:
            ticket.has_unread_messages = False  # Support replied, user needs to read
        else:
            ticket.has_unread_messages = True  # User replied, support needs to read
        ticket.last_message_at = timezone.now()
        ticket.save()
        
        # Send email notification
        send_ticket_reply_email(ticket, chat_message, is_support_message)
        
        return Response({
            'id': chat_message.id,
            'message': chat_message.message,
            'sender': {
                'id': request.user.id,
                'email': request.user.email,
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
            },
            'is_support': chat_message.is_support,
            'created_at': chat_message.created_at.isoformat(),
            'read_by_user': chat_message.read_by_user,
            'read_by_support': chat_message.read_by_support,
        }, status=status.HTTP_201_CREATED)
        
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_support_online_status(request):
    """Check if support team is online"""
    try:
        # Check if any support staff are online
        online_support = SupportUserStatus.objects.filter(
            is_online=True
        ).first()
        
        if online_support and online_support.is_actually_online:
            return Response({
                'is_online': True,
                'support_name': f"{online_support.user.first_name} {online_support.user.last_name}".strip() or online_support.user.email
            })
        
        return Response({'is_online': False})
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_ticket_changes(request, ticket_id):
    """Check if ticket has changes since last check - lightweight endpoint"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id, user=request.user)
        
        # Get the last modified timestamp from the request
        last_check = request.GET.get('last_check')
        if last_check:
            try:
                from datetime import datetime
                last_check_dt = datetime.fromisoformat(last_check.replace('Z', '+00:00'))
                
                # Check if ticket was modified after last check
                if ticket.updated_at <= last_check_dt:
                    # Check if any messages were added after last check
                    session = ChatSession.objects.filter(ticket=ticket).first()
                    if session:
                        latest_message = ChatMessage.objects.filter(session=session).order_by('-created_at').first()
                        if latest_message and latest_message.created_at <= last_check_dt:
                            # No changes
                            return Response({'has_changes': False})
                
                # Changes detected
                return Response({'has_changes': True})
            except (ValueError, TypeError):
                pass
        
        # If no last_check provided or invalid, assume changes
        return Response({'has_changes': True})
        
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def send_ticket_message_dashboard(request, ticket_id):
    """Send a message to a support ticket (Django session authenticated for admin dashboard)"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        
        # Check if user owns the ticket or is staff
        if ticket.user != request.user and not request.user.is_staff:
            return JsonResponse({'error': 'Permission denied'}, status=403)
        
        import json
        data = json.loads(request.body)
        message_content = data.get('message', '').strip()
        
        if not message_content:
            return JsonResponse({'error': 'Message content is required'}, status=400)
        
        # Get or create chat session for this ticket
        session, created = ChatSession.objects.get_or_create(
            ticket=ticket,
            defaults={
                'user': ticket.user,
                'status': 'ACTIVE'
            }
        )
        
        # Create the message
        is_support_message = request.user.is_staff
        chat_message = ChatMessage.objects.create(
            session=session,
            sender=request.user,
            message=message_content,
            is_support=is_support_message,
            read_by_user=is_support_message,  # Mark as read by user if sent by support
            read_by_support=not is_support_message  # Mark as read by support if sent by user
        )
        
        # Update session's last_message_at
        session.last_message_at = timezone.now()
        session.save()
        
        # Update ticket's unread status
        if is_support_message:
            ticket.has_unread_messages = False  # Support replied, user needs to read
        else:
            ticket.has_unread_messages = True  # User replied, support needs to read
        ticket.last_message_at = timezone.now()
        ticket.save()
        
        # Send email notification
        send_ticket_reply_email(ticket, chat_message, is_support_message)
        
        return JsonResponse({
            'id': chat_message.id,
            'message': chat_message.message,
            'sender': {
                'id': request.user.id,
                'email': request.user.email,
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
            },
            'is_support': chat_message.is_support,
            'created_at': chat_message.created_at.isoformat(),
            'read_by_user': chat_message.read_by_user,
            'read_by_support': chat_message.read_by_support,
        })
        
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def toggle_support_status(request):
    """Toggle support staff online status (staff only)"""
    try:
        data = json.loads(request.body)
        is_online = data.get('is_online', False)
        
        status, created = SupportUserStatus.objects.get_or_create(
            user=request.user,
            defaults={'is_online': is_online, 'auto_status': False}
        )
        
        status.is_online = is_online
        status.auto_status = False  # Manual override
        status.last_activity = timezone.now()
        status.save()
        
        return JsonResponse({
            'is_online': status.is_online,
            'message': f"Status updated to {'Online' if is_online else 'Offline'}"
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@staff_member_required
@require_http_methods(["GET"])
def get_all_tickets_dashboard(request):
    """Get all tickets for support dashboard (staff only) - Django session auth"""
    try:
        tickets = SupportTicket.objects.all().order_by('-created_at')
        
        ticket_list = []
        for ticket in tickets:
            # Get chat session info
            session = ChatSession.objects.filter(ticket=ticket).first()
            unread_count = 0
            if session:
                unread_count = ChatMessage.objects.filter(
                    session=session,
                    is_support=False,
                    read_by_support=False
                ).count()
            
            ticket_list.append({
                'id': ticket.id,
                'subject': ticket.subject,
                'description': ticket.description,
                'status': ticket.status,
                'ticket_type': ticket.ticket_type,
                'stage': ticket.stage,
                'priority': ticket.priority,
                'user': {
                    'email': ticket.user.email,
                    'first_name': ticket.user.first_name,
                    'last_name': ticket.user.last_name,
                    'name': f"{ticket.user.first_name} {ticket.user.last_name}".strip() or ticket.user.email
                },
                'created_at': ticket.created_at.isoformat(),
                'updated_at': ticket.updated_at.isoformat(),
                'has_unread_messages': ticket.has_unread_messages,
                'unread_count': unread_count,
                'assigned_to': ticket.assigned_to.email if ticket.assigned_to else None,
                'tags': ticket.tags,
                'session_id': session.id if session else None
            })
        
        return JsonResponse({'tickets': ticket_list})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_tickets(request):
    """Get all tickets for support dashboard (staff only)"""
    # Check if user is staff
    if not request.user.is_staff:
        return Response({'error': 'Permission denied. Staff access required.'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        tickets = SupportTicket.objects.all().order_by('-created_at')
        
        ticket_list = []
        for ticket in tickets:
            # Get chat session info
            session = ChatSession.objects.filter(ticket=ticket).first()
            unread_count = 0
            if session:
                unread_count = ChatMessage.objects.filter(
                    session=session,
                    is_support=False,
                    read_by_support=False
                ).count()
            
            ticket_list.append({
                'id': ticket.id,
                'subject': ticket.subject,
                'description': ticket.description,
                'status': ticket.status,
                'ticket_type': ticket.ticket_type,
                'stage': ticket.stage,
                'priority': ticket.priority,
                'user': {
                    'email': ticket.user.email,
                    'first_name': ticket.user.first_name,
                    'last_name': ticket.user.last_name,
                    'name': f"{ticket.user.first_name} {ticket.user.last_name}".strip() or ticket.user.email
                },
                'created_at': ticket.created_at.isoformat(),
                'updated_at': ticket.updated_at.isoformat(),
                'has_unread_messages': ticket.has_unread_messages,
                'unread_count': unread_count,
                'assigned_to': ticket.assigned_to.email if ticket.assigned_to else None,
                'tags': ticket.tags,
                'session_id': session.id if session else None
            })
        
        return Response({'tickets': ticket_list})
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@staff_member_required
@require_http_methods(["GET"])
def get_admin_ticket_detail_dashboard(request, ticket_id):
    """Get detailed information about a specific ticket for admin (staff only) - Django session auth"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        
        # Get chat session and messages
        session = ChatSession.objects.filter(ticket=ticket).first()
        messages = []
        if session:
            chat_messages = ChatMessage.objects.filter(session=session).order_by('created_at')
            for msg in chat_messages:
                messages.append({
                    'id': msg.id,
                    'message': msg.message,
                    'sender': {
                        'id': msg.sender.id,
                        'email': msg.sender.email,
                        'first_name': msg.sender.first_name,
                        'last_name': msg.sender.last_name,
                    },
                    'is_support': msg.is_support,
                    'created_at': msg.created_at.isoformat(),
                    'read_by_user': msg.read_by_user,
                    'read_by_support': msg.read_by_support,
                })
        
        return JsonResponse({
            'ticket': {
                'id': ticket.id,
                'ticket_type': ticket.ticket_type,
                'subject': ticket.subject,
                'description': ticket.description,
                'status': ticket.status,
                'priority': ticket.priority,
                'stage': ticket.stage,
                'business_value': ticket.business_value,
                'effort_estimate': ticket.effort_estimate,
                'implementation_notes': ticket.implementation_notes,
                'user_story': ticket.user_story,
                'acceptance_criteria': ticket.acceptance_criteria,
                'test_plan': ticket.test_plan,
                'target_milestone': ticket.target_milestone,
                'completed_at': ticket.completed_at.isoformat() if ticket.completed_at else None,
                'related_tickets': [t.id for t in ticket.related_tickets.all()],
                'user': {
                    'email': ticket.user.email,
                    'first_name': ticket.user.first_name,
                    'last_name': ticket.user.last_name,
                    'name': f"{ticket.user.first_name} {ticket.user.last_name}".strip() or ticket.user.email
                },
                'created_at': ticket.created_at.isoformat(),
                'updated_at': ticket.updated_at.isoformat(),
                'resolved_at': ticket.resolved_at.isoformat() if ticket.resolved_at else None,
                'assigned_to': ticket.assigned_to.email if ticket.assigned_to else None,
                'tags': ticket.tags,
                'has_unread_messages': ticket.has_unread_messages,
                'last_message_at': ticket.last_message_at.isoformat() if ticket.last_message_at else None,
                'context_data': ticket.context_data,
                'messages': messages,
                'session_id': session.id if session else None
            }
        })
        
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_admin_ticket_detail(request, ticket_id):
    """Get detailed information about a specific ticket for admin (staff only)"""
    # Check if user is staff
    if not request.user.is_staff:
        return Response({'error': 'Permission denied. Staff access required.'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        
        # Get chat session and messages
        session = ChatSession.objects.filter(ticket=ticket).first()
        messages = []
        if session:
            chat_messages = ChatMessage.objects.filter(session=session).order_by('created_at')
            for msg in chat_messages:
                messages.append({
                    'id': msg.id,
                    'message': msg.message,
                    'sender': {
                        'id': msg.sender.id,
                        'email': msg.sender.email,
                        'first_name': msg.sender.first_name,
                        'last_name': msg.sender.last_name,
                    },
                    'is_support': msg.is_support,
                    'created_at': msg.created_at.isoformat(),
                    'read_by_user': msg.read_by_user,
                    'read_by_support': msg.read_by_support,
                })
        
        return Response({
            'ticket': {
                'id': ticket.id,
                'ticket_type': ticket.ticket_type,
                'subject': ticket.subject,
                'description': ticket.description,
                'status': ticket.status,
                'priority': ticket.priority,
                'stage': ticket.stage,
                'business_value': ticket.business_value,
                'effort_estimate': ticket.effort_estimate,
                'implementation_notes': ticket.implementation_notes,
                'user_story': ticket.user_story,
                'acceptance_criteria': ticket.acceptance_criteria,
                'test_plan': ticket.test_plan,
                'target_milestone': ticket.target_milestone,
                'completed_at': ticket.completed_at.isoformat() if ticket.completed_at else None,
                'related_tickets': [t.id for t in ticket.related_tickets.all()],
                'user': {
                    'email': ticket.user.email,
                    'first_name': ticket.user.first_name,
                    'last_name': ticket.user.last_name,
                    'name': f"{ticket.user.first_name} {ticket.user.last_name}".strip() or ticket.user.email
                },
                'created_at': ticket.created_at.isoformat(),
                'updated_at': ticket.updated_at.isoformat(),
                'resolved_at': ticket.resolved_at.isoformat() if ticket.resolved_at else None,
                'assigned_to': ticket.assigned_to.email if ticket.assigned_to else None,
                'tags': ticket.tags,
                'has_unread_messages': ticket.has_unread_messages,
                'last_message_at': ticket.last_message_at.isoformat() if ticket.last_message_at else None,
                'context_data': ticket.context_data,
                'messages': messages,
                'session_id': session.id if session else None
            }
        })
        
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def update_ticket_status(request, ticket_id):
    """Update ticket status (staff only)"""
    try:
        data = json.loads(request.body)
        new_status = data.get('status', '')
        assigned_to = data.get('assigned_to', None)
        
        if new_status not in [choice[0] for choice in SupportTicket.STATUS_CHOICES]:
            return JsonResponse({'error': 'Invalid status'}, status=400)
        
        ticket = SupportTicket.objects.get(id=ticket_id)
        old_status = ticket.status
        ticket.status = new_status
        
        if assigned_to:
            try:
                user = User.objects.get(email=assigned_to)
                ticket.assigned_to = user
            except User.DoesNotExist:
                return JsonResponse({'error': 'User not found'}, status=400)
        
        if new_status in ['RESOLVED', 'CLOSED']:
            ticket.resolved_at = timezone.now()
        
        # Persist status first
        ticket.save()

        # Auto-update stage based on status transitions
        try:
            if new_status == 'IN_PROGRESS' and ticket.stage in ['IDEA', 'PLANNED']:
                ticket.stage = 'IN_DEVELOPMENT'
                ticket.save(update_fields=['stage'])
            elif new_status == 'RESOLVED':
                # When resolved, move item to TESTING for verification
                ticket.stage = 'TESTING'
                ticket.save(update_fields=['stage'])
            elif new_status == 'CLOSED' and ticket.stage in ['TESTING', 'IN_DEVELOPMENT', 'PLANNED']:
                # Closed implies work verified and deployed
                ticket.stage = 'DEPLOYED'
                ticket.completed_at = timezone.now()
                ticket.save(update_fields=['stage', 'completed_at'])
        except Exception:
            # Stage updates are best-effort; do not block status change
            pass

        # Auto-bootstrap a test plan when policy warrants
        try:
            should_bootstrap = False
            if ticket.ticket_type in ['FEATURE', 'TASK'] and new_status in ['PLANNED', 'IN_PROGRESS']:
                should_bootstrap = True
            if ticket.ticket_type == 'BUG' and new_status in ['RESOLVED']:
                should_bootstrap = True
            if should_bootstrap:
                _bootstrap_test_plan_internal(ticket)
        except Exception:
            pass
        
        # Send email notification to user about status change
        if old_status != new_status:
            send_ticket_update_email(ticket, old_status, new_status, request.user)
        
        return JsonResponse({
            'id': ticket.id,
            'status': ticket.status,
            'assigned_to': ticket.assigned_to.email if ticket.assigned_to else None,
            'stage': ticket.stage,
            'message': 'Ticket status and stage updated successfully'
        })
        
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminUser])
def promote_to_planned(request, ticket_id):
    """Admin: Promote idea to planned status"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        
        # Only allow promotion of Feature/Task tickets in IDEA stage
        if ticket.ticket_type not in ['FEATURE', 'TASK'] or ticket.stage != 'IDEA':
            return Response({'error': 'Only Feature/Task tickets in IDEA stage can be promoted'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        data = request.data
        
        # Validate required fields for planning
        effort_estimate = data.get('effort_estimate')
        business_value = data.get('business_value', 'MEDIUM')
        user_story = data.get('user_story', '')
        acceptance_criteria = data.get('acceptance_criteria', [])
        
        if not effort_estimate:
            return Response({'error': 'Effort estimate is required to promote to planned'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Update planning fields
        ticket.effort_estimate = effort_estimate
        ticket.business_value = business_value
        ticket.user_story = user_story
        ticket.acceptance_criteria = acceptance_criteria
        ticket.stage = 'PLANNED'
        ticket.save()
        
        return Response({
            'id': ticket.id,
            'stage': ticket.stage,
            'effort_estimate': ticket.effort_estimate,
            'business_value': ticket.business_value,
            'message': 'Ticket promoted to planned status'
        })
        
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_roadmap(request):
    """Get roadmap view of planned items"""
    try:
        # Get tickets in planning stages
        tickets = SupportTicket.objects.filter(
            stage__in=['PLANNED', 'IN_DEVELOPMENT', 'TESTING'],
            ticket_type__in=['FEATURE', 'TASK']
        ).order_by('business_value', 'target_milestone', 'created_at')
        
        roadmap_data = []
        for ticket in tickets:
            roadmap_data.append({
                'id': ticket.id,
                'subject': ticket.subject,
                'ticket_type': ticket.ticket_type,
                'stage': ticket.stage,
                'business_value': ticket.business_value,
                'effort_estimate': ticket.effort_estimate,
                'target_milestone': ticket.target_milestone,
                'priority': ticket.priority,
                'created_at': ticket.created_at.isoformat(),
                'user': {
                    'name': f"{ticket.user.first_name} {ticket.user.last_name}".strip() or ticket.user.email
                }
            })
        
        return Response({'roadmap': roadmap_data})
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def get_planning_dashboard(request):
    """Admin: Get planning dashboard statistics"""
    try:
        stats = {}
        
        # Count by stage
        stats['by_stage'] = {
            'ideas': SupportTicket.objects.filter(stage='IDEA', ticket_type__in=['FEATURE', 'TASK']).count(),
            'planned': SupportTicket.objects.filter(stage='PLANNED').count(),
            'in_development': SupportTicket.objects.filter(stage='IN_DEVELOPMENT').count(),
            'testing': SupportTicket.objects.filter(stage='TESTING').count(),
            'deployed': SupportTicket.objects.filter(stage='DEPLOYED').count(),
        }
        
        # Ideas needing triage
        ideas = SupportTicket.objects.filter(stage='IDEA', ticket_type__in=['FEATURE', 'TASK'])\
            .order_by('-priority', '-created_at')[:10]
        
        ideas_list = []
        for idea in ideas:
            ideas_list.append({
                'id': idea.id,
                'subject': idea.subject,
                'ticket_type': idea.ticket_type,
                'priority': idea.priority,
                'created_at': idea.created_at.isoformat(),
                'user': idea.user.email
            })
        
        stats['ideas_needing_triage'] = ideas_list
        
        # Active work summary
        active_work = SupportTicket.objects.filter(
            stage__in=['PLANNED', 'IN_DEVELOPMENT', 'TESTING']
        ).order_by('stage', 'business_value')
        
        active_list = []
        for item in active_work:
            active_list.append({
                'id': item.id,
                'subject': item.subject,
                'stage': item.stage,
                'business_value': item.business_value,
                'effort_estimate': item.effort_estimate,
                'assigned_to': item.assigned_to.email if item.assigned_to else None,
                'target_milestone': item.target_milestone
            })
        
        stats['active_work'] = active_list
        
        return Response(stats)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminUser])
def update_test_plan(request, ticket_id):
    """Admin: Update test plan for a ticket"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        
        data = request.data
        test_plan = data.get('test_plan', {})
        
        # Validate test plan structure
        if not isinstance(test_plan, dict):
            return Response({'error': 'Test plan must be a valid object'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        ticket.test_plan = test_plan
        ticket.save()
        
        return Response({
            'id': ticket.id,
            'test_plan': ticket.test_plan,
            'message': 'Test plan updated successfully'
        })
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# --- Test Plan Builder Endpoints ---

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_test_plan(request, ticket_id):
    """Get only the test_plan for a ticket (lightweight)."""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        # Ensure dict shape with defaults
        plan = ticket.test_plan or {}
        if 'testing_level' not in plan:
            plan['testing_level'] = plan.get('testing_level', 'DEV')
        if 'suites' not in plan:
            plan['suites'] = plan.get('suites', [])
        return Response({'test_plan': plan})
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def add_test_suite(request, ticket_id):
    """Add a new suite to a ticket's test plan."""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = request.data
        title = data.get('title', '').strip() or 'Untitled Suite'
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        plan.setdefault('testing_level', 'DEV')
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return Response({'test_plan': ticket.test_plan, 'added': {'id': new_id, 'title': title}}, status=status.HTTP_201_CREATED)
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def add_test_case(request, ticket_id):
    """Add a test to a suite in the ticket's plan."""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = request.data
        suite_id = data.get('suiteId')
        title = (data.get('title') or 'Untitled Test').strip()
        initial_state = data.get('initial_state', '')
        action = data.get('action', '')
        expected = data.get('expected', '')
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'steps': [], 'last_result': 'NOT_TESTED'})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return Response({'test_plan': plan, 'added': {'id': new_id, 'title': title}}, status=status.HTTP_201_CREATED)
        return Response({'error': 'Suite not found'}, status=status.HTTP_400_BAD_REQUEST)
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def add_test_step(request, ticket_id):
    """Add a step to a test case in the ticket's plan."""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = request.data
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return Response({'test_plan': plan, 'added': {'id': new_id}}, status=status.HTTP_201_CREATED)
        return Response({'error': 'Suite/Test not found'}, status=status.HTTP_400_BAD_REQUEST)
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_test_step(request, ticket_id):
    """Update a single step status/notes; server stamps tester and date."""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = request.data
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status_value = data.get('status')  # NOT_TESTED|PASSED|FAILED
        notes = data.get('notes', '')

        if status_value not in ['NOT_TESTED', 'PASSED', 'FAILED']:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        found = False
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status_value
                                step['notes'] = notes
                                step['tester'] = request.user.email
                                step['date_tested'] = timezone.now().isoformat()
                                found = True
                                break
        if not found:
            return Response({'error': 'Step not found'}, status=status.HTTP_400_BAD_REQUEST)

        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])

        # Audit
        try:
            UserActivity.objects.create(
                user=request.user,
                activity_type='LOGBOOK_UPDATE',
                description=f"Updated test step {step_id} on ticket #{ticket.id} to {status_value}",
                metadata={'ticket_id': ticket.id, 'suite_id': suite_id, 'test_id': test_id, 'step_id': step_id, 'status': status_value}
            )
        except Exception:
            pass

        return Response({'test_plan': plan})
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminUser])
def promote_testing_level(request, ticket_id):
    """Promote a ticket's test plan level DEV→TEST→QA→PROD."""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        plan = ticket.test_plan or {}
        current = plan.get('testing_level', 'DEV')
        order = ['DEV', 'TEST', 'QA', 'PROD']
        try:
            idx = order.index(current)
        except ValueError:
            idx = 0
        new_level = order[min(idx + 1, len(order)-1)]
        plan['testing_level'] = new_level
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return Response({'testing_level': new_level, 'test_plan': plan})
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def _bootstrap_test_plan_internal(ticket):
    """Create a basic test plan on a ticket if none exists."""
    plan = ticket.test_plan or {}
    if plan.get('suites'):
        return plan
    subject = (ticket.subject or 'Test Plan').strip()
    suite_title = subject.split('–')[0].strip() if '–' in subject else subject
    happy_title = f"Happy Path — {subject}"
    plan = {
        'testing_level': 'DEV',
        'suites': [
            {
                'id': 'suite_1',
                'title': suite_title,
                'tests': [
                    {
                        'id': 'test_1',
                        'title': happy_title,
                        'initial_state': 'User is authenticated if required; environment is ready',
                        'action': 'Follow the UI to perform the described action',
                        'expected': 'Feature works end-to-end without errors',
                        'last_result': 'NOT_TESTED',
                        'steps': []
                    }
                ]
            }
        ]
    }
    if ticket.ticket_type == 'BUG':
        plan['suites'][0]['tests'].append({
            'id': 'test_2',
            'title': f"Edge Cases — {subject}",
            'initial_state': '',
            'action': '',
            'expected': '',
            'last_result': 'NOT_TESTED',
            'steps': [
                {'id': 'edge_1', 'action': 'Reproduce original bug', 'expected': 'No longer reproducible', 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None},
                {'id': 'edge_2', 'action': 'Try boundary/invalid inputs', 'expected': 'Graceful validation and handling', 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None}
            ]
        })
    ticket.test_plan = plan
    ticket.save(update_fields=['test_plan'])
    return plan


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def bootstrap_test_plan(request, ticket_id):
    """Manually create a starter plan for the ticket, if not present."""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        plan = _bootstrap_test_plan_internal(ticket)
        return Response({'test_plan': plan})
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_suite_notes(request, ticket_id):
    """Update notes for a suite within the test plan."""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = request.data
        suite_id = data.get('suiteId')
        notes = data.get('notes', '')
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        found = False
        for suite in suites:
            if suite.get('id') == suite_id:
                suite['notes'] = notes
                found = True
                break
        if not found:
            return Response({'error': 'Suite not found'}, status=status.HTTP_400_BAD_REQUEST)
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return Response({'test_plan': plan})
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_test_notes(request, ticket_id):
    """Update notes for a single test case within a suite."""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = request.data
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        notes = data.get('notes', '')
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        found = False
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        test['notes'] = notes
                        found = True
                        break
        if not found:
            return Response({'error': 'Suite/Test not found'}, status=status.HTTP_400_BAD_REQUEST)
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return Response({'test_plan': plan})
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdminUser])
def delete_suite(request, ticket_id):
    """Delete a suite (and all its tests/steps) from a ticket's plan"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        suite_id = request.data.get('suiteId') or request.GET.get('suiteId')
        if not suite_id:
            return Response({'error': 'suiteId is required'}, status=status.HTTP_400_BAD_REQUEST)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        before = len(suites)
        suites = [s for s in suites if s.get('id') != suite_id]
        if len(suites) == before:
            return Response({'error': 'Suite not found'}, status=status.HTTP_404_NOT_FOUND)
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return Response({'test_plan': plan})
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdminUser])
def delete_test(request, ticket_id):
    """Delete a single test from a suite"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        suite_id = request.data.get('suiteId') or request.GET.get('suiteId')
        test_id = request.data.get('testId') or request.GET.get('testId')
        if not suite_id or not test_id:
            return Response({'error': 'suiteId and testId are required'}, status=status.HTTP_400_BAD_REQUEST)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        found = False
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                before = len(tests)
                suite['tests'] = [t for t in tests if t.get('id') != test_id]
                if len(suite['tests']) != before:
                    found = True
                break
        if not found:
            return Response({'error': 'Suite/Test not found'}, status=status.HTTP_404_NOT_FOUND)
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return Response({'test_plan': plan})
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_step(request, ticket_id):
    """Delete a single step from a test"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        suite_id = request.data.get('suiteId') or request.GET.get('suiteId')
        test_id = request.data.get('testId') or request.GET.get('testId')
        step_id = request.data.get('stepId') or request.GET.get('stepId')
        if not suite_id or not test_id or not step_id:
            return Response({'error': 'suiteId, testId and stepId are required'}, status=status.HTTP_400_BAD_REQUEST)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        found = False
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        before = len(steps)
                        test['steps'] = [s for s in steps if s.get('id') != step_id]
                        if len(test['steps']) != before:
                            found = True
                        break
        if not found:
            return Response({'error': 'Suite/Test/Step not found'}, status=status.HTTP_404_NOT_FOUND)
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return Response({'test_plan': plan})
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def attach_default_test_plan(request, ticket_id):
    """Admin: Attach the canonical test plan template to a ticket"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)

        default_plan = {
            "preconditions": "Servers running; test accounts available.",
            "test_cases": [
                {
                    "description": "Draft → Submitted → Approved flow",
                    "steps": [
                        "Create draft logbook",
                        "Submit for review",
                        "Approve as supervisor"
                    ],
                    "expected_result": "Status becomes approved; entries locked",
                    "actual_result": "",
                    "status": "NOT_TESTED"
                }
            ]
        }

        ticket.test_plan = default_plan
        ticket.save(update_fields=['test_plan'])

        return Response({
            'id': ticket.id,
            'test_plan': ticket.test_plan,
            'message': 'Default test plan attached'
        })
    
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminUser])
def move_to_roadmap(request, ticket_id):
    """Admin: Move a ticket into roadmap planning (stage=PLANNED, ensure type)"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)

        ticket.ticket_type = ticket.ticket_type if ticket.ticket_type in ['FEATURE', 'TASK'] else 'TASK'
        if ticket.stage in ['IDEA', 'ARCHIVED']:
            ticket.stage = 'PLANNED'
        # Ensure minimal planning fields exist
        if not ticket.effort_estimate:
            ticket.effort_estimate = 'S'
        if not ticket.business_value:
            ticket.business_value = 'MEDIUM'
        ticket.save(update_fields=['ticket_type', 'stage', 'effort_estimate', 'business_value'])

        return Response({
            'id': ticket.id,
            'stage': ticket.stage,
            'ticket_type': ticket.ticket_type,
            'message': 'Ticket moved to roadmap (PLANNED)'
        })
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# --- Release Workflow ---

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def create_release(request):
    """Create a new Release with default checklist"""
    try:
        data = request.data
        version = (data.get('version') or '').strip() or 'v0.0.1'
        notes = data.get('notes', '')
        default_checklist = [
            { 'item': 'All critical tests passed', 'done': False },
            { 'item': 'UAT review completed', 'done': False },
            { 'item': 'Documentation updated', 'done': False },
            { 'item': 'Deployment plan reviewed', 'done': False },
            { 'item': 'Rollback strategy prepared', 'done': False },
            { 'item': 'Stakeholder approval given', 'done': False },
        ]
        release = Release.objects.create(version=version, notes=notes, checklist=default_checklist)
        return Response({'id': release.id, 'version': release.version, 'status': release.status}, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def list_releases(request):
    releases = Release.objects.all().order_by('-created_at')
    data = []
    for r in releases:
        data.append({
            'id': r.id,
            'version': r.version,
            'status': r.status,
            'release_date': r.release_date.isoformat() if r.release_date else None,
            'checklist_completed': r.checklist_completed,
        })
    return Response({'releases': data})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def release_detail(request, release_id):
    try:
        r = Release.objects.get(id=release_id)
        tickets = r.release_tickets.select_related('user').all()
        return Response({
            'id': r.id,
            'version': r.version,
            'status': r.status,
            'notes': r.notes,
            'release_date': r.release_date.isoformat() if r.release_date else None,
            'checklist': r.checklist,
            'checklist_completed': r.checklist_completed,
            'tickets': [
                {
                    'id': t.id,
                    'subject': t.subject,
                    'status': t.status,
                    'qa_status': t.qa_status,
                    'ticket_type': t.ticket_type,
                } for t in tickets
            ]
        })
    except Release.DoesNotExist:
        return Response({'error': 'Release not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminUser])
def update_release(request, release_id):
    try:
        r = Release.objects.get(id=release_id)
        data = request.data
        if 'status' in data:
            new_status = data.get('status')
            if new_status not in dict(Release.STATUS_CHOICES):
                return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
            r.status = new_status
            if new_status == 'RELEASED' and not r.release_date:
                r.release_date = timezone.now()
        if 'notes' in data:
            r.notes = data.get('notes', r.notes)
        if 'checklist' in data:
            r.checklist = data.get('checklist') or []
        r.recompute_checklist_completed()
        r.save()
        return Response({'id': r.id, 'status': r.status, 'checklist_completed': r.checklist_completed})
    except Release.DoesNotExist:
        return Response({'error': 'Release not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def release_add_ticket(request, release_id):
    try:
        r = Release.objects.get(id=release_id)
        ticket_id = request.data.get('ticket_id')
        t = SupportTicket.objects.get(id=ticket_id)
        if t.ticket_type not in ['BUG', 'FEATURE', 'TASK']:
            return Response({'error': 'Only BUG/FEATURE/TASK can be promoted'}, status=status.HTTP_400_BAD_REQUEST)
        if t.status not in ['RESOLVED', 'CLOSED']:
            return Response({'error': 'Ticket must be RESOLVED or CLOSED to promote'}, status=status.HTTP_400_BAD_REQUEST)
        t.release = r
        t.promoted_to_release = True
        t.qa_status = 'NOT_TESTED'
        t.save(update_fields=['release', 'promoted_to_release', 'qa_status'])
        r.release_tickets.add(t)
        return Response({'message': f'Ticket {t.id} added to release {r.version}'})
    except Release.DoesNotExist:
        return Response({'error': 'Release not found'}, status=status.HTTP_404_NOT_FOUND)
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminUser])
def set_ticket_qa_status(request, ticket_id):
    try:
        t = SupportTicket.objects.get(id=ticket_id)
        new_status = request.data.get('qa_status')
        if new_status not in ['NOT_TESTED', 'IN_QA', 'PASSED', 'REJECTED']:
            return Response({'error': 'Invalid qa_status'}, status=status.HTTP_400_BAD_REQUEST)
        t.qa_status = new_status
        t.save(update_fields=['qa_status'])
        return Response({'id': t.id, 'qa_status': t.qa_status})
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
        
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminUser])
def update_ticket_stage(request, ticket_id):
    """Admin: Update ticket stage"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        
        data = request.data
        new_stage = data.get('stage')
        
        if new_stage not in [choice[0] for choice in SupportTicket._meta.get_field('stage').choices]:
            return Response({'error': 'Invalid stage'}, status=status.HTTP_400_BAD_REQUEST)
        
        old_stage = ticket.stage
        ticket.stage = new_stage
        
        # Set completed_at if moving to DEPLOYED
        if new_stage == 'DEPLOYED' and not ticket.completed_at:
            ticket.completed_at = timezone.now()
        
        ticket.save()
        
        return Response({
            'id': ticket.id,
            'stage': ticket.stage,
            'previous_stage': old_stage,
            'completed_at': ticket.completed_at.isoformat() if ticket.completed_at else None,
            'message': f'Ticket stage updated from {old_stage} to {new_stage}'
        })
        
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Session-based views for Django admin template compatibility
@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_step_session(request, ticket_id):
    """Add a step to a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        steps = test.get('steps', [])
                        new_id = f"step_{len(steps)+1}"
                        steps.append({'id': new_id, 'action': action, 'expected': expected, 'status': 'NOT_TESTED', 'notes': '', 'date_tested': None, 'tester': None})
                        test['steps'] = steps
                        ticket.test_plan = plan
                        ticket.save(update_fields=['test_plan'])
                        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite/Test not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_suite_session(request, ticket_id):
    """Add a test suite - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        new_id = f"suite_{len(suites)+1}"
        suites.append({'id': new_id, 'title': title, 'tests': []})
        plan['suites'] = suites
        ticket.test_plan = plan
        ticket.save(update_fields=['test_plan'])
        return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def add_test_case_session(request, ticket_id):
    """Add a test case - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        title = (data.get('title') or '').strip()
        initial_state = (data.get('initial_state') or '').strip()
        action = (data.get('action') or '').strip()
        expected = (data.get('expected') or '').strip()
        if not suite_id or not title:
            return JsonResponse({'error': 'Suite ID and title are required'}, status=400)
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                tests = suite.get('tests', [])
                new_id = f"test_{len(tests)+1}"
                tests.append({'id': new_id, 'title': title, 'initial_state': initial_state, 'action': action, 'expected': expected, 'last_result': 'NOT_TESTED', 'steps': []})
                suite['tests'] = tests
                ticket.test_plan = plan
                ticket.save(update_fields=['test_plan'])
                return JsonResponse({'test_plan': plan, 'added': {'id': new_id}})
        return JsonResponse({'error': 'Suite not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def update_test_step_session(request, ticket_id):
    """Update test step status/notes - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        suite_id = data.get('suiteId')
        test_id = data.get('testId')
        step_id = data.get('stepId')
        status = data.get('status')
        notes = (data.get('notes') or '').strip()
        plan = ticket.test_plan or {}
        suites = plan.get('suites', [])
        for suite in suites:
            if suite.get('id') == suite_id:
                for test in suite.get('tests', []):
                    if test.get('id') == test_id:
                        for step in test.get('steps', []):
                            if step.get('id') == step_id:
                                step['status'] = status
                                step['notes'] = notes
                                if status != 'NOT_TESTED':
                                    step['date_tested'] = timezone.now().isoformat()
                                    step['tester'] = request.user.email
                                ticket.test_plan = plan
                                ticket.save(update_fields=['test_plan'])
                                return JsonResponse({'test_plan': plan})
        return JsonResponse({'error': 'Step not found'}, status=400)
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def get_test_plan_session(request, ticket_id):
    """Get test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return JsonResponse({'test_plan': ticket.test_plan or {}})
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
def save_test_plan_session(request, ticket_id):
    """Save test plan - Django session auth version"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        data = json.loads(request.body)
        test_plan = data.get('test_plan', {})
        
        # Validate test plan structure
        if not isinstance(test_plan, dict):
            return JsonResponse({'error': 'Test plan must be a valid object'}, status=400)
        
        ticket.test_plan = test_plan
        ticket.save(update_fields=['test_plan'])
        
        return JsonResponse({
            'test_plan': ticket.test_plan,
            'message': 'Test plan saved successfully'
        })
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# Test Dashboard Views
@staff_member_required
def test_dashboard_overview(request):
    """Test dashboard overview page"""
    return render(request, 'support/test_dashboard.html', {
        'title': 'Test Plans Dashboard'
    })


@staff_member_required
def test_dashboard_suite_detail(request, ticket_id):
    """Test suite detail page"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        return render(request, 'support/test_suite_detail.html', {
            'title': f'Test Suite: {ticket.subject}',
            'ticket': ticket
        })
    except SupportTicket.DoesNotExist:
        return render(request, 'support/test_suite_detail.html', {
            'title': 'Test Suite Not Found',
            'error': 'Test suite not found'
        })


# Test Dashboard API Views
@staff_member_required
@require_http_methods(["GET"])
def test_dashboard_summary(request):
    """Get overall test suite statistics"""
    try:
        from .utils.test_helpers import calculate_suite_summary
        
        # Get all test plan tickets
        test_tickets = SupportTicket.objects.filter(
            ticket_type='TESTING'
        ).exclude(test_plan__isnull=True).exclude(test_plan={})
        
        total_suites = test_tickets.count()
        total_tests = 0
        total_passed = 0
        total_failed = 0
        total_blocked = 0
        total_to_be_implemented = 0
        by_status_counts = {
            'NOT_TESTED': 0,
            'IN_QA': 0,
            'PASSED': 0,
            'REJECTED': 0,
            'BLOCKED': 0
        }
        
        for ticket in test_tickets:
            summary = calculate_suite_summary(ticket.test_plan)
            total_tests += summary['total_tests']
            total_passed += summary['passed']
            total_failed += summary['failed']
            total_blocked += summary['blocked']
            total_to_be_implemented += summary['to_be_implemented']
            
            qa_status = ticket.qa_status or 'NOT_TESTED'
            if qa_status in by_status_counts:
                by_status_counts[qa_status] += 1
        
        # Calculate overall pass rate
        executed_tests = total_passed + total_failed
        overall_pass_rate = f"{(total_passed / executed_tests * 100):.1f}%" if executed_tests > 0 else "0%"
        
        return JsonResponse({
            'total_suites': total_suites,
            'total_tests': total_tests,
            'total_passed': total_passed,
            'total_failed': total_failed,
            'total_blocked': total_blocked,
            'total_to_be_implemented': total_to_be_implemented,
            'overall_pass_rate': overall_pass_rate,
            'by_status_counts': by_status_counts
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def test_dashboard_suites(request):
    """Get all test suites with summary"""
    try:
        from .utils.test_helpers import calculate_suite_summary
        
        # Get filter parameters
        status_filter = request.GET.get('status')
        type_filter = request.GET.get('type')
        
        # Base queryset
        test_tickets = SupportTicket.objects.filter(
            ticket_type='TESTING'
        ).exclude(test_plan__isnull=True).exclude(test_plan={})
        
        # Apply filters
        if status_filter and status_filter != 'all':
            test_tickets = test_tickets.filter(qa_status=status_filter)
        
        # TODO: Add type filter when we have type field in tickets
        
        suites = []
        for ticket in test_tickets:
            summary = calculate_suite_summary(ticket.test_plan)
            
            suite_data = {
                'id': ticket.id,
                'subject': ticket.subject,
                'description': ticket.description,
                'qa_status': ticket.qa_status or 'NOT_TESTED',
                'priority': ticket.priority,
                'created_at': ticket.created_at.isoformat(),
                'updated_at': ticket.updated_at.isoformat(),
                'summary': summary
            }
            suites.append(suite_data)
        
        return JsonResponse({'suites': suites})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["GET"])
def test_dashboard_suite_detail_api(request, ticket_id):
    """Get full test plan for a suite"""
    try:
        from .utils.test_helpers import calculate_suite_summary, group_test_cases_by_category
        
        ticket = SupportTicket.objects.get(id=ticket_id)
        
        if not ticket.test_plan:
            return JsonResponse({'error': 'No test plan found'}, status=404)
        
        # Calculate summary
        summary = calculate_suite_summary(ticket.test_plan)
        
        # Group test cases by category
        grouped_cases = group_test_cases_by_category(ticket.test_plan)
        
        return JsonResponse({
            'ticket': {
                'id': ticket.id,
                'subject': ticket.subject,
                'description': ticket.description,
                'qa_status': ticket.qa_status or 'NOT_TESTED',
                'priority': ticket.priority,
                'created_at': ticket.created_at.isoformat(),
                'updated_at': ticket.updated_at.isoformat()
            },
            'test_plan': ticket.test_plan,
            'summary': summary,
            'grouped_cases': grouped_cases
        })
        
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["PATCH"])
@csrf_exempt
def test_dashboard_test_case_update(request, ticket_id, test_id):
    """Update a single test case"""
    try:
        from .utils.test_helpers import update_test_case_status, determine_qa_status
        
        ticket = SupportTicket.objects.get(id=ticket_id)
        
        if not ticket.test_plan:
            return JsonResponse({'error': 'No test plan found'}, status=404)
        
        # Parse request data
        data = json.loads(request.body)
        
        # Update test case
        updated_plan = update_test_case_status(
            ticket.test_plan,
            test_id,
            data.get('status'),
            tested_by=data.get('tested_by'),
            actual_result=data.get('actual_result'),
            failure_reason=data.get('failure_reason')
        )
        
        # Save updated plan
        ticket.test_plan = updated_plan
        ticket.qa_status = determine_qa_status(updated_plan)
        ticket.save(update_fields=['test_plan', 'qa_status'])
        
        return JsonResponse({
            'test_plan': ticket.test_plan,
            'qa_status': ticket.qa_status,
            'message': 'Test case updated successfully'
        })
        
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def test_dashboard_test_case_execute(request, ticket_id, test_id):
    """Mark test case as in progress"""
    try:
        from .utils.test_helpers import update_test_case_status, determine_qa_status
        from django.utils import timezone
        
        ticket = SupportTicket.objects.get(id=ticket_id)
        
        if not ticket.test_plan:
            return JsonResponse({'error': 'No test plan found'}, status=404)
        
        # Mark test as in progress
        updated_plan = update_test_case_status(
            ticket.test_plan,
            test_id,
            'IN_PROGRESS',
            tested_by=request.user.email if request.user.is_authenticated else 'system'
        )
        
        # Save updated plan
        ticket.test_plan = updated_plan
        ticket.qa_status = determine_qa_status(updated_plan)
        ticket.save(update_fields=['test_plan', 'qa_status'])
        
        return JsonResponse({
            'test_plan': ticket.test_plan,
            'qa_status': ticket.qa_status,
            'message': 'Test case marked as in progress'
        })
        
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@staff_member_required
@require_http_methods(["POST"])
@csrf_exempt
def test_dashboard_suite_recalculate(request, ticket_id):
    """Force recalculation of suite summary stats"""
    try:
        from .utils.test_helpers import calculate_suite_summary, determine_qa_status
        
        ticket = SupportTicket.objects.get(id=ticket_id)
        
        if not ticket.test_plan:
            return JsonResponse({'error': 'No test plan found'}, status=404)
        
        # Recalculate summary
        ticket.test_plan['summary'] = calculate_suite_summary(ticket.test_plan)
        ticket.qa_status = determine_qa_status(ticket.test_plan)
        ticket.save(update_fields=['test_plan', 'qa_status'])
        
        return JsonResponse({
            'test_plan': ticket.test_plan,
            'qa_status': ticket.qa_status,
            'message': 'Suite summary recalculated'
        })
        
    except SupportTicket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
