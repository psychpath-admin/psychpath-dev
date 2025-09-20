from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404, render
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Q
try:
    from weasyprint import HTML, CSS
    from weasyprint.text.fonts import FontConfiguration
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False
from .models import WeeklyLogbook, DCCEntry, CRAEntry, PDEntry, SUPEntry, LogbookAuditLog
from .serializers import (
    WeeklyLogbookSerializer, WeeklyLogbookListSerializer, DCCEntrySerializer,
    CRAEntrySerializer, PDEntrySerializer, SUPEntrySerializer, LogbookAuditLogSerializer,
    LogbookSubmitSerializer, LogbookApproveSerializer
)


class IsTraineeOrSupervisor(permissions.BasePermission):
    """Allow trainees to access their own logbooks, supervisors to access their supervisees' logbooks"""
    
    def has_object_permission(self, request, view, obj):
        if request.user == obj.trainee:
            return True
        
        # Check if user is a supervisor of this trainee
        from api.models import Supervision
        return Supervision.objects.filter(
            supervisor=request.user,
            supervisee=obj.trainee
        ).exists()


class IsSupervisorOfTrainee(permissions.BasePermission):
    """Allow supervisors to access their supervisees' logbooks"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Allow all authenticated users for now - we'll check object-level permissions
        return True
    
    def has_object_permission(self, request, view, obj):
        if request.user == obj.trainee:
            return True
        
        # Check if user is a supervisor of this trainee
        from api.models import Supervision
        return Supervision.objects.filter(
            supervisor=request.user,
            supervisee=obj.trainee
        ).exists()


class WeeklyLogbookViewSet(viewsets.ModelViewSet):
    """ViewSet for managing weekly logbooks"""
    
    serializer_class = WeeklyLogbookSerializer
    permission_classes = [permissions.IsAuthenticated, IsSupervisorOfTrainee]
    
    def get_queryset(self):
        user = self.request.user
        
        # Get user's role
        try:
            role = user.userprofile.role
        except:
            role = None
        
        if role == 'ORG_ADMIN':
            # Org admins can see all logbooks in their organization
            try:
                return WeeklyLogbook.objects.filter(
                    trainee__userprofile__organization=user.userprofile.organization
                ).order_by('-week_start_date')
            except:
                return WeeklyLogbook.objects.none()
        elif role == 'SUPERVISOR':
            # Supervisors can see their supervisees' logbooks
            from api.models import Supervision
            supervisee_ids = Supervision.objects.filter(
                supervisor=user
            ).values_list('supervisee_id', flat=True)
            return WeeklyLogbook.objects.filter(
                Q(trainee=user) | Q(trainee_id__in=supervisee_ids)
            ).order_by('-week_start_date')
        else:
            # Trainees can only see their own logbooks
            return WeeklyLogbook.objects.filter(trainee=user).order_by('-week_start_date')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return WeeklyLogbookListSerializer
        return WeeklyLogbookSerializer
    
    def perform_create(self, serializer):
        serializer.save(trainee=self.request.user)
        self._create_audit_log(serializer.instance, 'created')
    
    def perform_update(self, serializer):
        old_status = serializer.instance.status
        serializer.save()
        if old_status != serializer.instance.status:
            self._create_audit_log(
                serializer.instance, 'updated',
                previous_status=old_status,
                new_status=serializer.instance.status
            )
    
    def _create_audit_log(self, logbook, action, previous_status='', new_status='', comments=''):
        LogbookAuditLog.objects.create(
            logbook=logbook,
            action=action,
            user=self.request.user,
            previous_status=previous_status,
            new_status=new_status,
            comments=comments
        )
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit logbook to supervisor"""
        logbook = self.get_object()
        
        if logbook.status != 'draft':
            return Response(
                {'error': 'Only draft logbooks can be submitted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = LogbookSubmitSerializer(data=request.data)
        if serializer.is_valid():
            # Calculate totals before submission
            logbook.calculate_totals()
            
            # Set supervisor (first available supervisor for this trainee)
            from api.models import Supervision
            supervision = Supervision.objects.filter(
                supervisee=logbook.trainee,
                primary=True
            ).first()
            
            if supervision:
                logbook.supervisor = supervision.supervisor
            
            logbook.status = 'submitted'
            logbook.submitted_at = timezone.now()
            logbook.save()
            
            self._create_audit_log(
                logbook, 'submitted',
                previous_status='draft',
                new_status='submitted',
                comments=serializer.validated_data.get('comments', '')
            )
            
            return Response({'status': 'submitted'})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve or reject logbook (supervisor only)"""
        logbook = self.get_object()
        
        if logbook.status != 'submitted':
            return Response(
                {'error': 'Only submitted logbooks can be approved/rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = LogbookApproveSerializer(data=request.data)
        if serializer.is_valid():
            action_type = serializer.validated_data['action']
            comments = serializer.validated_data.get('comments', '')
            
            if action_type == 'approve':
                logbook.status = 'approved'
                logbook.reviewed_by = request.user
                logbook.reviewed_at = timezone.now()
                logbook.supervisor_comments = comments
                logbook.save()
                
                # Update cumulative totals
                logbook.update_cumulative_totals()
                
                self._create_audit_log(
                    logbook, 'approved',
                    previous_status='submitted',
                    new_status='approved',
                    comments=comments
                )
                
                return Response({'status': 'approved'})
            
            elif action_type == 'reject':
                logbook.status = 'rejected'
                logbook.reviewed_by = request.user
                logbook.reviewed_at = timezone.now()
                logbook.supervisor_comments = comments
                logbook.save()
                
                self._create_audit_log(
                    logbook, 'rejected',
                    previous_status='submitted',
                    new_status='rejected',
                    comments=comments
                )
                
                return Response({'status': 'rejected'})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def audit_log(self, request, pk=None):
        """Get audit log for a logbook"""
        logbook = self.get_object()
        audit_logs = logbook.audit_logs.all()
        serializer = LogbookAuditLogSerializer(audit_logs, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Generate AHPRA PDF for a logbook"""
        if not WEASYPRINT_AVAILABLE:
            return Response(
                {'error': 'PDF generation not available. WeasyPrint is not installed.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        logbook = self.get_object()
        
        # Render the HTML template
        html_string = render(request, 'logbook/ahpra_logbook.html', {
            'logbook': logbook
        }).content.decode('utf-8')
        
        # Create PDF using WeasyPrint
        font_config = FontConfiguration()
        html_doc = HTML(string=html_string)
        
        try:
            pdf_bytes = html_doc.write_pdf(font_config=font_config)
            
            # Create HTTP response
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="logbook_{logbook.week_start_date}_{logbook.trainee.email}.pdf"'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': f'PDF generation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LogbookEntryViewSet(viewsets.ModelViewSet):
    """Base ViewSet for logbook entries"""
    
    permission_classes = [permissions.IsAuthenticated, IsSupervisorOfTrainee]
    
    def get_queryset(self):
        logbook_id = self.kwargs.get('logbook_pk')
        logbook = get_object_or_404(WeeklyLogbook, pk=logbook_id)
        
        # Check permissions
        if not self.request.user == logbook.trainee:
            from api.models import Supervision
            if not Supervision.objects.filter(supervisor=self.request.user, supervisee=logbook.trainee).exists():
                return self.model.objects.none()
        
        return self.model.objects.filter(logbook=logbook)
    
    def perform_create(self, serializer):
        logbook_id = self.kwargs.get('logbook_pk')
        logbook = get_object_or_404(WeeklyLogbook, pk=logbook_id)
        serializer.save(logbook=logbook)
        
        # Recalculate totals
        logbook.calculate_totals()
    
    def perform_update(self, serializer):
        serializer.save()
        
        # Recalculate totals
        logbook_id = self.kwargs.get('logbook_pk')
        logbook = get_object_or_404(WeeklyLogbook, pk=logbook_id)
        logbook.calculate_totals()
    
    def perform_destroy(self, instance):
        logbook = instance.logbook
        instance.delete()
        
        # Recalculate totals
        logbook.calculate_totals()


class DCCEntryViewSet(LogbookEntryViewSet):
    """ViewSet for DCC entries"""
    serializer_class = DCCEntrySerializer
    model = DCCEntry


class CRAEntryViewSet(LogbookEntryViewSet):
    """ViewSet for CRA entries"""
    serializer_class = CRAEntrySerializer
    model = CRAEntry


class PDEntryViewSet(LogbookEntryViewSet):
    """ViewSet for PD entries"""
    serializer_class = PDEntrySerializer
    model = PDEntry


class SUPEntryViewSet(LogbookEntryViewSet):
    """ViewSet for SUP entries"""
    serializer_class = SUPEntrySerializer
    model = SUPEntry


class LogbookStatsView(APIView):
    """View for logbook statistics"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        try:
            role = user.userprofile.role
        except:
            role = None
        
        if role == 'ORG_ADMIN':
            # Org admin stats
            from api.models import Supervision
            org_users = user.userprofile.organization.users.all()
            logbooks = WeeklyLogbook.objects.filter(trainee__in=org_users)
        elif role == 'SUPERVISOR':
            # Supervisor stats
            from api.models import Supervision
            supervisee_ids = Supervision.objects.filter(supervisor=user).values_list('supervisee_id', flat=True)
            logbooks = WeeklyLogbook.objects.filter(
                Q(trainee=user) | Q(trainee_id__in=supervisee_ids)
            )
        else:
            # Trainee stats
            logbooks = WeeklyLogbook.objects.filter(trainee=user)
        
        stats = {
            'total_logbooks': logbooks.count(),
            'draft_logbooks': logbooks.filter(status='draft').count(),
            'submitted_logbooks': logbooks.filter(status='submitted').count(),
            'approved_logbooks': logbooks.filter(status='approved').count(),
            'rejected_logbooks': logbooks.filter(status='rejected').count(),
            'total_hours': sum(logbook.total_weekly_hours for logbook in logbooks.filter(status='approved')),
        }
        
        return Response(stats)