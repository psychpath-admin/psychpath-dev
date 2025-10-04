import subprocess
import os
import signal
import psutil
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Control Django and frontend servers'

    def add_arguments(self, parser):
        parser.add_argument('action', choices=['start', 'stop', 'restart', 'status'], help='Action to perform')
        parser.add_argument('--server', choices=['django', 'frontend', 'both'], default='both', help='Which server to control')

    def handle(self, *args, **options):
        action = options['action']
        server = options['server']
        
        if action == 'start':
            self.start_servers(server)
        elif action == 'stop':
            self.stop_servers(server)
        elif action == 'restart':
            self.stop_servers(server)
            self.start_servers(server)
        elif action == 'status':
            self.check_status()

    def start_servers(self, server):
        """Start the specified servers"""
        if server in ['django', 'both']:
            self.start_django()
        if server in ['frontend', 'both']:
            self.start_frontend()

    def stop_servers(self, server):
        """Stop the specified servers"""
        if server in ['django', 'both']:
            self.stop_django()
        if server in ['frontend', 'both']:
            self.stop_frontend()

    def start_django(self):
        """Start Django server"""
        try:
            # Check if Django is already running
            if self.is_django_running():
                self.stdout.write(self.style.WARNING('Django server is already running'))
                return
            
            # Start Django server in background
            django_cmd = [
                'python', 'manage.py', 'runserver', '0.0.0.0:8000'
            ]
            
            # Change to backend directory
            backend_dir = os.path.join(settings.BASE_DIR)
            os.chdir(backend_dir)
            
            # Start process
            process = subprocess.Popen(
                django_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                preexec_fn=os.setsid
            )
            
            # Save PID
            with open('django.pid', 'w') as f:
                f.write(str(process.pid))
            
            self.stdout.write(self.style.SUCCESS('Django server started successfully'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error starting Django server: {str(e)}'))

    def start_frontend(self):
        """Start frontend server"""
        try:
            # Check if frontend is already running
            if self.is_frontend_running():
                self.stdout.write(self.style.WARNING('Frontend server is already running'))
                return
            
            # Start frontend server in background
            frontend_cmd = ['npm', 'run', 'dev']
            
            # Change to frontend directory
            frontend_dir = os.path.join(settings.BASE_DIR, '..', 'frontend')
            os.chdir(frontend_dir)
            
            # Start process
            process = subprocess.Popen(
                frontend_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                preexec_fn=os.setsid
            )
            
            # Save PID
            with open('frontend.pid', 'w') as f:
                f.write(str(process.pid))
            
            self.stdout.write(self.style.SUCCESS('Frontend server started successfully'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error starting frontend server: {str(e)}'))

    def stop_django(self):
        """Stop Django server"""
        try:
            if os.path.exists('django.pid'):
                with open('django.pid', 'r') as f:
                    pid = int(f.read().strip())
                
                try:
                    os.killpg(os.getpgid(pid), signal.SIGTERM)
                    self.stdout.write(self.style.SUCCESS('Django server stopped'))
                except ProcessLookupError:
                    self.stdout.write(self.style.WARNING('Django server was not running'))
                
                os.remove('django.pid')
            else:
                self.stdout.write(self.style.WARNING('No Django PID file found'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error stopping Django server: {str(e)}'))

    def stop_frontend(self):
        """Stop frontend server"""
        try:
            frontend_pid_file = os.path.join(settings.BASE_DIR, '..', 'frontend', 'frontend.pid')
            if os.path.exists(frontend_pid_file):
                with open(frontend_pid_file, 'r') as f:
                    pid = int(f.read().strip())
                
                try:
                    os.killpg(os.getpgid(pid), signal.SIGTERM)
                    self.stdout.write(self.style.SUCCESS('Frontend server stopped'))
                except ProcessLookupError:
                    self.stdout.write(self.style.WARNING('Frontend server was not running'))
                
                os.remove(frontend_pid_file)
            else:
                self.stdout.write(self.style.WARNING('No frontend PID file found'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error stopping frontend server: {str(e)}'))

    def is_django_running(self):
        """Check if Django server is running"""
        try:
            if os.path.exists('django.pid'):
                with open('django.pid', 'r') as f:
                    pid = int(f.read().strip())
                return psutil.pid_exists(pid)
        except:
            pass
        return False

    def is_frontend_running(self):
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

    def check_status(self):
        """Check status of both servers"""
        django_status = "Running" if self.is_django_running() else "Stopped"
        frontend_status = "Running" if self.is_frontend_running() else "Stopped"
        
        self.stdout.write(f"Django Server: {django_status}")
        self.stdout.write(f"Frontend Server: {frontend_status}")

