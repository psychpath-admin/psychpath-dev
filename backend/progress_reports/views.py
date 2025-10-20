from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q
from datetime import datetime, timedelta

from .models import ProgressReportConfig, ProgressReport
from .serializers import (
    ProgressReportConfigSerializer, 
    ProgressReportSerializer, 
    ProgressReportListSerializer,
    ProgressReportCreateSerializer,
    ProgressReportReviewSerializer
)

User = get_user_model()


class IsSupervisor(permissions.BasePermission):
    """Custom permission to only allow supervisors to review reports"""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'profile') and 
            request.user.profile.role == 'SUPERVISOR'
        )


class ProgressReportConfigViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for progress report configurations"""
    
    queryset = ProgressReportConfig.objects.all()
    serializer_class = ProgressReportConfigSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter configs by user's program type"""
        user_role = self.request.user.profile.role
        return self.queryset.filter(program_type=user_role)


class ProgressReportViewSet(viewsets.ModelViewSet):
    """ViewSet for progress reports with custom actions"""
    
    queryset = ProgressReport.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return ProgressReportListSerializer
        elif self.action == 'create':
            return ProgressReportCreateSerializer
        elif self.action in ['review', 'approve', 'request_revision']:
            return ProgressReportReviewSerializer
        return ProgressReportSerializer
    
    def get_queryset(self):
        """Filter reports based on user role"""
        user = self.request.user
        user_role = user.profile.role
        
        if user_role == 'SUPERVISOR':
            # Supervisors see reports they need to review
            return self.queryset.filter(
                Q(supervisor=user) | Q(supervisor__isnull=True)
            ).distinct()
        else:
            # Trainees see their own reports
            return self.queryset.filter(trainee=user)
    
    def perform_create(self, serializer):
        """Set trainee and supervisor when creating report"""
        trainee = self.request.user
        serializer.save(trainee=trainee)
        
        # Set supervisor if available
        if hasattr(trainee, 'profile') and hasattr(trainee.profile, 'supervisor'):
            report = serializer.instance
            report.supervisor = trainee.profile.supervisor
            report.save()
    
    @action(detail=False, methods=['get'])
    def available_reports(self, request):
        """Get report types available for current user based on config"""
        user_role = request.user.profile.role
        configs = ProgressReportConfig.objects.filter(
            program_type=user_role,
            is_required=True
        )
        
        # TODO: Add logic to check trigger conditions
        # For now, return all configs for the user's role
        serializer = ProgressReportConfigSerializer(configs, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit report for supervisor review"""
        report = self.get_object()
        
        if not report.can_be_submitted:
            return Response(
                {'error': 'Report cannot be submitted in current state'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate all required fields are completed
        if report.report_config.requires_all_competencies:
            competencies = report.competency_ratings.keys()
            if len(competencies) < 8:  # Assuming 8 AHPRA competencies
                return Response(
                    {'error': 'All competencies must be rated before submission'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Update status and submission date
        report.status = 'SUBMITTED'
        report.submission_date = timezone.now()
        report.save()
        
        serializer = self.get_serializer(report)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def save_draft(self, request, pk=None):
        """Save report as draft (auto-save endpoint)"""
        report = self.get_object()
        
        if not report.can_be_edited:
            return Response(
                {'error': 'Report cannot be edited in current state'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update fields from request data
        for field in ['competency_ratings', 'achievements', 'challenges', 
                     'learning_goals', 'support_needed', 'additional_comments']:
            if field in request.data:
                setattr(report, field, request.data[field])
        
        report.save()
        
        serializer = self.get_serializer(report)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsSupervisor])
    def review(self, request, pk=None):
        """Supervisor adds feedback"""
        report = self.get_object()
        
        if report.status not in ['SUBMITTED', 'UNDER_REVIEW']:
            return Response(
                {'error': 'Report is not in a reviewable state'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update supervisor feedback
        serializer = self.get_serializer(report, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            
            # Update status to under review
            report.status = 'UNDER_REVIEW'
            report.save()
            
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], permission_classes=[IsSupervisor])
    def approve(self, request, pk=None):
        """Supervisor approves report"""
        report = self.get_object()
        
        if report.status not in ['SUBMITTED', 'UNDER_REVIEW']:
            return Response(
                {'error': 'Report is not in an approvable state'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update supervisor feedback if provided
        if request.data:
            serializer = self.get_serializer(report, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Approve the report
        report.status = 'APPROVED'
        report.reviewed_at = timezone.now()
        report.save()
        
        serializer = ProgressReportSerializer(report)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsSupervisor])
    def request_revision(self, request, pk=None):
        """Supervisor requests changes"""
        report = self.get_object()
        
        if report.status not in ['SUBMITTED', 'UNDER_REVIEW']:
            return Response(
                {'error': 'Report is not in a revisable state'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update supervisor feedback
        serializer = self.get_serializer(report, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            
            # Request revision
            report.status = 'REQUIRES_REVISION'
            report.reviewed_at = timezone.now()
            report.save()
            
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Get dashboard statistics for progress reports"""
        user = request.user
        user_role = user.profile.role
        
        if user_role == 'SUPERVISOR':
            # Supervisor dashboard stats
            pending_reviews = self.get_queryset().filter(
                status__in=['SUBMITTED', 'UNDER_REVIEW']
            ).count()
            
            overdue_reviews = self.get_queryset().filter(
                status__in=['SUBMITTED', 'UNDER_REVIEW'],
                due_date__lt=timezone.now().date()
            ).count()
            
            return Response({
                'pending_reviews': pending_reviews,
                'overdue_reviews': overdue_reviews,
            })
        else:
            # Trainee dashboard stats
            draft_reports = self.get_queryset().filter(status='DRAFT').count()
            submitted_reports = self.get_queryset().filter(status='SUBMITTED').count()
            approved_reports = self.get_queryset().filter(status='APPROVED').count()
            overdue_reports = self.get_queryset().filter(
                status__in=['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REQUIRES_REVISION'],
                due_date__lt=timezone.now().date()
            ).count()
            
            return Response({
                'draft_reports': draft_reports,
                'submitted_reports': submitted_reports,
                'approved_reports': approved_reports,
                'overdue_reports': overdue_reports,
            })