from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum, Q, Count
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

from .models import CPDCategory, CPDActivity, CPDPlan, CPDRequirement, CPDComplianceReport
from .serializers import (
    CPDCategorySerializer, CPDActivitySerializer, CPDPlanSerializer,
    CPDRequirementSerializer, CPDComplianceReportSerializer,
    CPDDashboardStatsSerializer, CPDActivitySummarySerializer
)
from api.models import UserProfile

class CPDCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only viewset for CPD categories"""
    queryset = CPDCategory.objects.filter(is_active=True)
    serializer_class = CPDCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

class CPDActivityViewSet(viewsets.ModelViewSet):
    """ViewSet for CPD activities"""
    queryset = CPDActivity.objects.all()
    serializer_class = CPDActivitySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter activities by current user"""
        return CPDActivity.objects.filter(user=self.request.user).order_by('-activity_date')
    
    def perform_create(self, serializer):
        """Set user and user_profile on creation"""
        serializer.save(
            user=self.request.user,
            user_profile=self.request.user.profile
        )
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get summary list of activities"""
        activities = self.get_queryset()
        serializer = CPDActivitySummarySerializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Get activities grouped by type"""
        activities = self.get_queryset()
        by_type = {}
        for activity in activities:
            activity_type = activity.activity_type
            if activity_type not in by_type:
                by_type[activity_type] = []
            by_type[activity_type].append(CPDActivitySummarySerializer(activity).data)
        return Response(by_type)
    
    @action(detail=False, methods=['get'])
    def by_year(self, request):
        """Get activities grouped by year"""
        year = request.query_params.get('year', date.today().year)
        activities = self.get_queryset().filter(activity_date__year=year)
        serializer = CPDActivitySummarySerializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active_cpd_only(self, request):
        """Get only active CPD activities"""
        activities = self.get_queryset().filter(is_active_cpd=True)
        serializer = CPDActivitySummarySerializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def peer_consultation(self, request):
        """Get peer consultation activities"""
        activities = self.get_queryset().filter(is_peer_consultation=True)
        serializer = CPDActivitySummarySerializer(activities, many=True)
        return Response(serializer.data)

class CPDPlanViewSet(viewsets.ModelViewSet):
    """ViewSet for CPD plans"""
    queryset = CPDPlan.objects.all()
    serializer_class = CPDPlanSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter plans by current user"""
        return CPDPlan.objects.filter(user=self.request.user).order_by('-year')
    
    def perform_create(self, serializer):
        """Set user and user_profile on creation"""
        serializer.save(
            user=self.request.user,
            user_profile=self.request.user.profile
        )
    
    @action(detail=False, methods=['get'])
    def current_year(self, request):
        """Get current year's plan"""
        current_year = date.today().year
        try:
            plan = self.get_queryset().get(year=current_year)
            serializer = self.get_serializer(plan)
            return Response(serializer.data)
        except CPDPlan.DoesNotExist:
            return Response({'detail': 'No plan found for current year'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit plan for approval"""
        plan = self.get_object()
        if plan.status != 'DRAFT':
            return Response(
                {'detail': 'Plan can only be submitted from draft status'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        plan.status = 'SUBMITTED'
        plan.submitted_at = timezone.now()
        plan.save()
        
        serializer = self.get_serializer(plan)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve plan (admin/supervisor only)"""
        plan = self.get_object()
        if plan.status != 'SUBMITTED':
            return Response(
                {'detail': 'Plan must be submitted before approval'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        plan.status = 'APPROVED'
        plan.approved_at = timezone.now()
        plan.approved_by = request.user
        plan.save()
        
        serializer = self.get_serializer(plan)
        return Response(serializer.data)

class CPDRequirementViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only viewset for CPD requirements"""
    queryset = CPDRequirement.objects.filter(is_active=True)
    serializer_class = CPDRequirementSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def for_role(self, request):
        """Get requirements for specific role and year"""
        role = request.query_params.get('role')
        year = request.query_params.get('year', date.today().year)
        
        if not role:
            return Response(
                {'detail': 'Role parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            requirement = self.get_queryset().get(role=role, year=int(year))
            serializer = self.get_serializer(requirement)
            return Response(serializer.data)
        except CPDRequirement.DoesNotExist:
            return Response(
                {'detail': f'No requirements found for {role} in {year}'}, 
                status=status.HTTP_404_NOT_FOUND
            )

class CPDComplianceReportViewSet(viewsets.ModelViewSet):
    """ViewSet for CPD compliance reports"""
    queryset = CPDComplianceReport.objects.all()
    serializer_class = CPDComplianceReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter reports by current user"""
        return CPDComplianceReport.objects.filter(user=self.request.user).order_by('-year')
    
    def perform_create(self, serializer):
        """Set user and user_profile on creation"""
        serializer.save(
            user=self.request.user,
            user_profile=self.request.user.profile
        )
    
    @action(detail=False, methods=['get'])
    def current_year(self, request):
        """Get current year's compliance report"""
        current_year = date.today().year
        try:
            report = self.get_queryset().get(year=current_year)
            serializer = self.get_serializer(report)
            return Response(serializer.data)
        except CPDComplianceReport.DoesNotExist:
            return Response({'detail': 'No compliance report found for current year'}, status=status.HTTP_404_NOT_FOUND)

class CPDDashboardViewSet(viewsets.ViewSet):
    """ViewSet for CPD dashboard statistics"""
    queryset = CPDActivity.objects.none()  # Empty queryset for router compatibility
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get comprehensive CPD dashboard statistics"""
        user = request.user
        current_year = date.today().year
        
        # Get user's role and requirements
        try:
            user_profile = user.profile
            role = user_profile.role
        except:
            return Response({'detail': 'User profile not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get CPD requirements for this role and year
        try:
            requirement = CPDRequirement.objects.get(role=role, year=current_year, is_active=True)
        except CPDRequirement.DoesNotExist:
            # Fallback to general requirements
            try:
                requirement = CPDRequirement.objects.get(role='GENERAL', year=current_year, is_active=True)
            except CPDRequirement.DoesNotExist:
                # Default requirements if none found
                requirement = type('Requirement', (), {
                    'total_hours_required': 30,
                    'active_cpd_percentage': Decimal('50.00'),
                    'peer_consultation_hours': 0,
                })()
        
        # Calculate current year stats
        current_year_activities = CPDActivity.objects.filter(
            user=user,
            activity_date__year=current_year,
            status='APPROVED'
        )
        
        total_hours_current_year = current_year_activities.aggregate(
            total=Sum('duration_hours')
        )['total'] or Decimal('0.00')
        
        active_cpd_hours_current_year = current_year_activities.filter(
            is_active_cpd=True
        ).aggregate(total=Sum('duration_hours'))['total'] or Decimal('0.00')
        
        peer_consultation_hours_current_year = current_year_activities.filter(
            is_peer_consultation=True
        ).aggregate(total=Sum('duration_hours'))['total'] or Decimal('0.00')
        
        # Calculate progress percentages
        total_hours_required = requirement.total_hours_required
        progress_percentage = float((total_hours_current_year / total_hours_required) * 100) if total_hours_required > 0 else 0
        
        active_cpd_percentage = float((active_cpd_hours_current_year / total_hours_current_year) * 100) if total_hours_current_year > 0 else 0
        
        peer_consultation_required = requirement.peer_consultation_hours
        peer_consultation_progress_percentage = float((peer_consultation_hours_current_year / peer_consultation_required) * 100) if peer_consultation_required > 0 else 100
        
        # Determine compliance status
        is_compliant = (
            total_hours_current_year >= total_hours_required and
            active_cpd_percentage >= float(requirement.active_cpd_percentage) and
            peer_consultation_hours_current_year >= peer_consultation_required
        )
        
        if is_compliant:
            compliance_status = 'compliant'
        elif progress_percentage >= 80:
            compliance_status = 'warning'
        else:
            compliance_status = 'non_compliant'
        
        # Get recent activities count
        recent_activities_count = current_year_activities.count()
        pending_activities_count = CPDActivity.objects.filter(
            user=user,
            status__in=['DRAFT', 'SUBMITTED', 'REQUIRES_REVISION']
        ).count()
        
        # Check for current year plan
        try:
            current_plan = CPDPlan.objects.get(user=user, year=current_year)
            has_approved_plan = current_plan.status == 'APPROVED'
            plan_status = current_plan.status
        except CPDPlan.DoesNotExist:
            has_approved_plan = False
            plan_status = 'no_plan'
        
        # Generate alerts
        alerts = []
        
        if total_hours_current_year < total_hours_required:
            deficit = total_hours_required - total_hours_current_year
            alerts.append(f"CPD hours deficit: {deficit:.1f} hours remaining")
        
        if active_cpd_percentage < float(requirement.active_cpd_percentage):
            alerts.append(f"Active CPD below required {requirement.active_cpd_percentage}%")
        
        if peer_consultation_required > 0 and peer_consultation_hours_current_year < peer_consultation_required:
            deficit = peer_consultation_required - peer_consultation_hours_current_year
            alerts.append(f"Peer consultation deficit: {deficit:.1f} hours remaining")
        
        if not has_approved_plan and requirement.requires_plan_approval:
            alerts.append("CPD plan requires approval")
        
        if pending_activities_count > 0:
            alerts.append(f"{pending_activities_count} activities pending review")
        
        # Build stats response
        stats = {
            'current_year': current_year,
            'total_hours_current_year': total_hours_current_year,
            'active_cpd_hours_current_year': active_cpd_hours_current_year,
            'peer_consultation_hours_current_year': peer_consultation_hours_current_year,
            'total_hours_required': total_hours_required,
            'active_cpd_percentage_required': requirement.active_cpd_percentage,
            'peer_consultation_hours_required': peer_consultation_required,
            'progress_percentage': progress_percentage,
            'active_cpd_percentage': active_cpd_percentage,
            'peer_consultation_progress_percentage': peer_consultation_progress_percentage,
            'is_compliant': is_compliant,
            'compliance_status': compliance_status,
            'recent_activities_count': recent_activities_count,
            'pending_activities_count': pending_activities_count,
            'alerts': alerts,
            'has_approved_plan': has_approved_plan,
            'plan_status': plan_status,
        }
        
        serializer = CPDDashboardStatsSerializer(stats)
        return Response(serializer.data)