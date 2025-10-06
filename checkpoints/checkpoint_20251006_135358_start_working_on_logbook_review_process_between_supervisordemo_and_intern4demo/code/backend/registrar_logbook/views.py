from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Sum, Q
from django.contrib.auth.models import User
from datetime import datetime, timedelta, date
from decimal import Decimal
import json
import csv
from django.http import HttpResponse
from django.db import transaction

from .models import (
    RegistrarProgram, RegistrarPracticeEntry, RegistrarSupervisionEntry, 
    RegistrarCpdEntry, SupervisorProfile, CompetencyFramework, 
    ProgressSnapshot, AuditLog
)
from .serializers import (
    RegistrarProgramSerializer, RegistrarPracticeEntrySerializer,
    RegistrarSupervisionEntrySerializer, RegistrarCpdEntrySerializer,
    SupervisorProfileSerializer, CompetencyFrameworkSerializer,
    ProgressSnapshotSerializer, AuditLogSerializer,
    RegistrarProgramDashboardSerializer, RegistrarProgramSummarySerializer,
    RegistrarComplianceSummarySerializer
)
from .report_generator import RegistrarReportGenerator


class IsRegistrar(permissions.BasePermission):
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                hasattr(request.user, 'profile') and 
                getattr(request.user.profile, 'role', '').upper() == 'REGISTRAR')


class IsRegistrarOrSupervisor(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        role = getattr(request.user.profile, 'role', '').upper()
        return role in ['REGISTRAR', 'SUPERVISOR']

class IsPrincipalSupervisor(permissions.BasePermission):
    """Permission for Principal Supervisor actions (sign-offs, approvals)"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        role = getattr(request.user.profile, 'role', '').upper()
        if role != 'SUPERVISOR':
            return False
        
        # Check if user has supervisor profile and is approved for registrar programs
        try:
            supervisor_profile = request.user.supervisor_profile
            return supervisor_profile.is_BAS and supervisor_profile.is_registrar_principal_approved
        except:
            return False

class IsOrgAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        role = getattr(request.user.profile, 'role', '').upper()
        return role == 'ORG_ADMIN'


class RegistrarProgramViewSet(viewsets.ModelViewSet):
    """ViewSet for registrar programs"""
    serializer_class = RegistrarProgramSerializer
    permission_classes = [IsRegistrarOrSupervisor]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'profile') and user.profile.role == 'REGISTRAR':
            return RegistrarProgram.objects.filter(user=user).order_by('-created_at')
        elif hasattr(user, 'profile') and user.profile.role == 'SUPERVISOR':
            # Supervisors can see programs they supervise
            return RegistrarProgram.objects.filter(
                Q(supervision_entries__supervisor=user)
            ).distinct().order_by('-created_at')
        return RegistrarProgram.objects.none()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        """Get dashboard data for a registrar program"""
        program = self.get_object()
        serializer = RegistrarProgramDashboardSerializer(program)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """Get summary data for reports"""
        program = self.get_object()
        serializer = RegistrarProgramSummarySerializer(program)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def compliance(self, request, pk=None):
        """Get comprehensive compliance summary"""
        program = self.get_object()
        from .serializers import RegistrarValidationService
        compliance_data = RegistrarValidationService.get_program_compliance_summary(program.id)
        return Response(compliance_data)

    @action(detail=True, methods=['post'], permission_classes=[IsPrincipalSupervisor])
    def submit_midpoint(self, request, pk=None):
        """Submit midpoint report (PREA-76) - Principal Supervisor only"""
        program = self.get_object()
        
        if program.status not in ['active']:
            return Response(
                {'error': 'Program must be active to submit midpoint report'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate compliance before submission
        dashboard_data = RegistrarProgramDashboardSerializer(program).data
        
        if dashboard_data['supervision_compliance_status'] == 'non_compliant':
            return Response(
                {'error': 'Supervision mix compliance requirements not met'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create progress snapshot
        snapshot_data = RegistrarProgramSummarySerializer(program).data
        ProgressSnapshot.objects.create(
            program=program,
            type='midpoint',
            snapshot_json=snapshot_data
        )
        
        # Update program status
        program.status = 'midpoint_submitted'
        program.save(update_fields=['status'])
        
        # Log audit trail
        AuditLog.objects.create(
            actor=request.user,
            program=program,
            entity_type='program',
            entity_id=program.id,
            action='submit',
            metadata={'report_type': 'midpoint'}
        )
        
        return Response({'detail': 'Midpoint report submitted successfully'})

    @action(detail=True, methods=['post'], permission_classes=[IsPrincipalSupervisor])
    def submit_final(self, request, pk=None):
        """Submit final report (AECR-76) - Principal Supervisor only"""
        program = self.get_object()
        
        if program.status != 'midpoint_submitted':
            return Response(
                {'error': 'Midpoint report must be submitted before final report'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate all requirements are met
        dashboard_data = RegistrarProgramDashboardSerializer(program).data
        
        # Check hour targets
        if (dashboard_data['practice_hours_completed'] < program.targets_practice_hrs or
            dashboard_data['supervision_hours_completed'] < program.targets_supervision_hrs or
            dashboard_data['active_cpd_hours_completed'] < program.targets_cpd_hrs):
            return Response(
                {'error': 'Hour targets not yet met'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check compliance
        if dashboard_data['supervision_compliance_status'] == 'non_compliant':
            return Response(
                {'error': 'Supervision mix compliance requirements not met'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if dashboard_data['dcc_compliance_status'] == 'non_compliant':
            return Response(
                {'error': 'DCC minimum requirements not met'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create progress snapshot
        snapshot_data = RegistrarProgramSummarySerializer(program).data
        ProgressSnapshot.objects.create(
            program=program,
            type='final',
            snapshot_json=snapshot_data
        )
        
        # Update program status
        program.status = 'final_submitted'
        program.save(update_fields=['status'])
        
        # Log audit trail
        AuditLog.objects.create(
            actor=request.user,
            program=program,
            entity_type='program',
            entity_id=program.id,
            action='submit',
            metadata={'report_type': 'final'}
        )
        
        return Response({'detail': 'Final report submitted successfully'})

    @action(detail=True, methods=['get'])
    def generate_midpoint_report(self, request, pk=None):
        """Generate PREA-76 midpoint report"""
        program = self.get_object()
        report_data = RegistrarReportGenerator.generate_midpoint_report(program.id)
        
        if 'error' in report_data:
            return Response(report_data, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(report_data)

    @action(detail=True, methods=['get'])
    def generate_final_report(self, request, pk=None):
        """Generate AECR-76 final report"""
        program = self.get_object()
        report_data = RegistrarReportGenerator.generate_final_report(program.id)
        
        if 'error' in report_data:
            return Response(report_data, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(report_data)

    @action(detail=True, methods=['get'])
    def export_report_csv(self, request, pk=None):
        """Export report as CSV"""
        program = self.get_object()
        report_type = request.query_params.get('type', 'midpoint')
        
        csv_content = RegistrarReportGenerator.export_report_csv(program.id, report_type)
        
        if csv_content is None:
            return Response({'error': 'Failed to generate report'}, status=status.HTTP_400_BAD_REQUEST)
        
        response = HttpResponse(csv_content, content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{report_type}_report_{program.id}_{date.today().isoformat()}.csv"'
        
        return response

    @action(detail=True, methods=['get'])
    def export_report_zip(self, request, pk=None):
        """Export complete report package as ZIP"""
        program = self.get_object()
        report_type = request.query_params.get('type', 'midpoint')
        
        zip_buffer = RegistrarReportGenerator.create_report_zip(program.id, report_type)
        
        if zip_buffer is None:
            return Response({'error': 'Failed to generate report package'}, status=status.HTTP_400_BAD_REQUEST)
        
        response = HttpResponse(zip_buffer.getvalue(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="{report_type}_report_package_{program.id}_{date.today().isoformat()}.zip"'
        
        return response


class RegistrarPracticeEntryViewSet(viewsets.ModelViewSet):
    """ViewSet for registrar practice entries with comprehensive CRUD operations"""
    serializer_class = RegistrarPracticeEntrySerializer
    permission_classes = [IsRegistrarOrSupervisor]

    def get_queryset(self):
        user = self.request.user
        program_id = self.request.query_params.get('program_id')
        
        # Apply filters
        queryset = RegistrarPracticeEntry.objects.all()
        
        # Date range filter
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        # DCC filter
        dcc_only = self.request.query_params.get('dcc_only')
        if dcc_only == 'true':
            queryset = queryset.filter(dcc_minutes__gt=0)
        
        # Setting filter
        setting = self.request.query_params.get('setting')
        if setting:
            queryset = queryset.filter(setting=setting)
        
        # Modality filter
        modality = self.request.query_params.get('modality')
        if modality:
            queryset = queryset.filter(modality=modality)
        
        # Competency filter
        competency = self.request.query_params.get('competency')
        if competency:
            queryset = queryset.filter(competency_tags__contains=[competency])
        
        if hasattr(user, 'profile') and user.profile.role == 'REGISTRAR':
            if program_id:
                queryset = queryset.filter(
                    program__user=user, program_id=program_id
                )
            else:
                queryset = queryset.filter(program__user=user)
        elif hasattr(user, 'profile') and user.profile.role == 'SUPERVISOR':
            # Supervisors can see entries for programs they supervise
            if program_id:
                queryset = queryset.filter(program_id=program_id)
            else:
                # Filter by programs where user is a supervisor
                queryset = queryset.filter(
                    Q(program__supervision_entries__supervisor=user) |
                    Q(program__principal_supervisor=user)
                ).distinct()
        else:
            return RegistrarPracticeEntry.objects.none()
        
        return queryset.order_by('-date', '-start_time')

    def perform_create(self, serializer):
        """Create a new practice entry with audit logging"""
        entry = serializer.save()
        AuditLog.objects.create(
            actor=self.request.user,
            program=entry.program,
            entity_type='practice_entry',
            entity_id=str(entry.id),
            action='create',
            metadata={
                'duration_minutes': entry.duration_minutes,
                'dcc_minutes': entry.dcc_minutes,
                'client_code': entry.client_code,
                'setting': entry.setting
            }
        )

    def perform_update(self, serializer):
        """Update a practice entry with audit logging"""
        entry = serializer.save()
        AuditLog.objects.create(
            actor=self.request.user,
            program=entry.program,
            entity_type='practice_entry',
            entity_id=str(entry.id),
            action='update',
            metadata={
                'duration_minutes': entry.duration_minutes,
                'dcc_minutes': entry.dcc_minutes,
                'client_code': entry.client_code,
                'setting': entry.setting
            }
        )

    def perform_destroy(self, instance):
        """Delete a practice entry with audit logging"""
        program = instance.program
        entry_id = str(instance.id)
        metadata = {
            'duration_minutes': instance.duration_minutes,
            'dcc_minutes': instance.dcc_minutes,
            'client_code': instance.client_code,
            'setting': instance.setting
        }
        instance.delete()
        AuditLog.objects.create(
            actor=self.request.user,
            program=program,
            entity_type='practice_entry',
            entity_id=entry_id,
            action='delete',
            metadata=metadata
        )

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Export practice entries to CSV with comprehensive data"""
        entries = self.get_queryset()
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="practice_entries_{date.today().strftime("%Y%m%d")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Date', 'Start Time', 'End Time', 'Duration (min)', 'Duration (hrs)',
            'DCC (min)', 'DCC (hrs)', 'DCC %', 'DCC Categories', 'Setting',
            'Modality', 'Client Code', 'Client Age Band', 'Presenting Issue',
            'Tasks', 'Competency Tags', 'Observed', 'Follow-up Date',
            'Created At', 'Updated At'
        ])
        
        for entry in entries:
            writer.writerow([
                entry.date.strftime('%d/%m/%Y'),
                entry.start_time.strftime('%H:%M') if entry.start_time else '',
                entry.end_time.strftime('%H:%M') if entry.end_time else '',
                entry.duration_minutes,
                entry.duration_hours,
                entry.dcc_minutes,
                entry.dcc_hours,
                f"{entry.dcc_ratio}%",
                ', '.join(entry.dcc_categories),
                entry.get_setting_display(),
                entry.get_modality_display(),
                entry.client_code,
                entry.get_client_age_band_display(),
                entry.presenting_issue or '',
                entry.tasks,
                ', '.join(entry.competency_tags),
                'Yes' if entry.observed else 'No',
                entry.supervisor_followup_date.strftime('%d/%m/%Y') if entry.supervisor_followup_date else '',
                entry.created_at.strftime('%d/%m/%Y %H:%M'),
                entry.updated_at.strftime('%d/%m/%Y %H:%M')
            ])
        
        return response

    @action(detail=False, methods=['get'])
    def summary_stats(self, request):
        """Get summary statistics for practice entries"""
        entries = self.get_queryset()
        
        # Calculate totals
        total_duration = entries.aggregate(
            total=Sum('duration_minutes')
        )['total'] or 0
        
        total_dcc = entries.aggregate(
            total=Sum('dcc_minutes')
        )['total'] or 0
        
        # Count by setting
        settings = {}
        for setting_choice in RegistrarPracticeEntry.SETTING_CHOICES:
            count = entries.filter(setting=setting_choice[0]).count()
            if count > 0:
                settings[setting_choice[1]] = count
        
        # Count by DCC categories
        dcc_categories = {}
        for dcc_choice in RegistrarPracticeEntry.DCC_CATEGORIES:
            count = entries.filter(dcc_categories__contains=[dcc_choice[0]]).count()
            if count > 0:
                dcc_categories[dcc_choice[1]] = count
        
        # Competency distribution
        competency_counts = {}
        for entry in entries:
            for tag in entry.competency_tags:
                competency_counts[tag] = competency_counts.get(tag, 0) + 1
        
        return Response({
            'total_entries': entries.count(),
            'total_duration_minutes': total_duration,
            'total_duration_hours': round(total_duration / 60, 2),
            'total_dcc_minutes': total_dcc,
            'total_dcc_hours': round(total_dcc / 60, 2),
            'dcc_ratio': round((total_dcc / total_duration * 100) if total_duration > 0 else 0, 1),
            'settings_distribution': settings,
            'dcc_categories_distribution': dcc_categories,
            'competency_distribution': competency_counts,
            'date_range': {
                'start': entries.order_by('date').first().date if entries.exists() else None,
                'end': entries.order_by('-date').first().date if entries.exists() else None
            }
        })

    @action(detail=True, methods=['post'])
    def bulk_update_tags(self, request, pk=None):
        """Bulk update competency tags for a practice entry"""
        entry = self.get_object()
        new_tags = request.data.get('competency_tags', [])
        
        if not isinstance(new_tags, list):
            return Response(
                {'error': 'competency_tags must be a list'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate tags against framework
        try:
            valid_competencies = CompetencyFramework.objects.filter(
                aope=entry.program.aope
            ).values_list('label', flat=True)
            
            for tag in new_tags:
                if tag not in valid_competencies:
                    return Response(
                        {'error': f'Invalid competency tag: {tag}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            entry.competency_tags = new_tags
            entry.save()
            
            AuditLog.objects.create(
                actor=request.user,
                program=entry.program,
                entity_type='practice_entry',
                entity_id=str(entry.id),
                action='update',
                metadata={'updated_field': 'competency_tags', 'new_tags': new_tags}
            )
            
            return Response({'success': True, 'competency_tags': new_tags})
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class RegistrarSupervisionEntryViewSet(viewsets.ModelViewSet):
    """ViewSet for supervision entries"""
    serializer_class = RegistrarSupervisionEntrySerializer
    permission_classes = [IsRegistrarOrSupervisor]

    def get_queryset(self):
        user = self.request.user
        program_id = self.request.query_params.get('program_id')
        
        if hasattr(user, 'profile') and user.profile.role == 'REGISTRAR':
            if program_id:
                return RegistrarSupervisionEntry.objects.filter(
                    program__user=user, program_id=program_id
                ).order_by('-date', '-created_at')
            return RegistrarSupervisionEntry.objects.filter(
                program__user=user
            ).order_by('-date', '-created_at')
        elif hasattr(user, 'profile') and user.profile.role == 'SUPERVISOR':
            # Supervisors can see entries they provided
            if program_id:
                return RegistrarSupervisionEntry.objects.filter(
                    program_id=program_id, supervisor=user
                ).order_by('-date', '-created_at')
            return RegistrarSupervisionEntry.objects.filter(
                supervisor=user
            ).order_by('-date', '-created_at')
        
        return RegistrarSupervisionEntry.objects.none()

    def perform_create(self, serializer):
        entry = serializer.save()
        AuditLog.objects.create(
            actor=self.request.user,
            program=entry.program,
            entity_type='supervision_entry',
            entity_id=entry.id,
            action='create'
        )

    def perform_update(self, serializer):
        entry = serializer.save()
        AuditLog.objects.create(
            actor=self.request.user,
            program=entry.program,
            entity_type='supervision_entry',
            entity_id=entry.id,
            action='update'
        )

    def perform_destroy(self, instance):
        program = instance.program
        entry_id = instance.id
        instance.delete()
        AuditLog.objects.create(
            actor=self.request.user,
            program=program,
            entity_type='supervision_entry',
            entity_id=entry_id,
            action='delete'
        )

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Export supervision entries to CSV"""
        entries = self.get_queryset()
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="supervision_entries.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Date', 'Duration (min)', 'Mode', 'Type', 'Supervisor', 'Topics', 'Observed'
        ])
        
        for entry in entries:
            writer.writerow([
                entry.date.strftime('%d/%m/%Y'),
                entry.duration_minutes,
                entry.get_mode_display(),
                entry.get_type_display(),
                entry.supervisor.email,
                entry.topics,
                'Yes' if entry.observed else 'No'
            ])
        
        return response


class RegistrarCpdEntryViewSet(viewsets.ModelViewSet):
    """ViewSet for CPD entries"""
    serializer_class = RegistrarCpdEntrySerializer
    permission_classes = [IsRegistrarOrSupervisor]

    def get_queryset(self):
        user = self.request.user
        program_id = self.request.query_params.get('program_id')
        
        if hasattr(user, 'profile') and user.profile.role == 'REGISTRAR':
            if program_id:
                return RegistrarCpdEntry.objects.filter(
                    program__user=user, program_id=program_id
                ).order_by('-date', '-created_at')
            return RegistrarCpdEntry.objects.filter(
                program__user=user
            ).order_by('-date', '-created_at')
        elif hasattr(user, 'profile') and user.profile.role == 'SUPERVISOR':
            # Supervisors can see entries for programs they supervise
            if program_id:
                return RegistrarCpdEntry.objects.filter(
                    program_id=program_id
                ).order_by('-date', '-created_at')
            return RegistrarCpdEntry.objects.filter(
                program__supervision_entries__supervisor=user
            ).distinct().order_by('-date', '-created_at')
        
        return RegistrarCpdEntry.objects.none()

    def perform_create(self, serializer):
        entry = serializer.save()
        AuditLog.objects.create(
            actor=self.request.user,
            program=entry.program,
            entity_type='cpd_entry',
            entity_id=entry.id,
            action='create'
        )

    def perform_update(self, serializer):
        entry = serializer.save()
        AuditLog.objects.create(
            actor=self.request.user,
            program=entry.program,
            entity_type='cpd_entry',
            entity_id=entry.id,
            action='update'
        )

    def perform_destroy(self, instance):
        program = instance.program
        entry_id = instance.id
        instance.delete()
        AuditLog.objects.create(
            actor=self.request.user,
            program=program,
            entity_type='cpd_entry',
            entity_id=entry_id,
            action='delete'
        )

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Export CPD entries to CSV"""
        entries = self.get_queryset()
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="cpd_entries.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Date', 'Provider', 'Title', 'Hours', 'Active CPD', 'Learning Goal'
        ])
        
        for entry in entries:
            writer.writerow([
                entry.date.strftime('%d/%m/%Y'),
                entry.provider,
                entry.title,
                entry.hours,
                'Yes' if entry.is_active_cpd else 'No',
                entry.learning_goal
            ])
        
        return response


class SupervisorProfileViewSet(viewsets.ModelViewSet):
    """ViewSet for supervisor profiles"""
    serializer_class = SupervisorProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SupervisorProfile.objects.all().order_by('user__email')


class CompetencyFrameworkViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for competency framework (read-only)"""
    serializer_class = CompetencyFrameworkSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        aope = self.request.query_params.get('aope')
        if aope:
            return CompetencyFramework.objects.filter(aope=aope).order_by('category_code')
        return CompetencyFramework.objects.all().order_by('aope', 'category_code')


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for audit logs (read-only)"""
    serializer_class = AuditLogSerializer
    permission_classes = [IsRegistrarOrSupervisor]

    def get_queryset(self):
        program_id = self.request.query_params.get('program_id')
        if program_id:
            return AuditLog.objects.filter(program_id=program_id).order_by('-timestamp')
        return AuditLog.objects.none()


class RegistrarReportsAPIView(APIView):
    """API for generating registrar reports"""
    permission_classes = [IsRegistrarOrSupervisor]

    def get(self, request, program_id):
        """Generate comprehensive report for a program"""
        try:
            program = RegistrarProgram.objects.get(id=program_id)
            
            # Check permissions
            user = request.user
            if (hasattr(user, 'profile') and user.profile.role == 'REGISTRAR' and 
                program.user != user):
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
            elif (hasattr(user, 'profile') and user.profile.role == 'SUPERVISOR' and 
                  not program.supervision_entries.filter(supervisor=user).exists()):
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
            
            # Generate report data
            report_data = {
                'program': RegistrarProgramSummarySerializer(program).data,
                'practice_entries': RegistrarPracticeEntrySerializer(
                    program.practice_entries.all(), many=True
                ).data,
                'supervision_entries': RegistrarSupervisionEntrySerializer(
                    program.supervision_entries.all(), many=True
                ).data,
                'cpd_entries': RegistrarCpdEntrySerializer(
                    program.cpd_entries.all(), many=True
                ).data,
                'audit_log': AuditLogSerializer(
                    program.audit_logs.all()[:50], many=True  # Last 50 entries
                ).data
            }
            
            return Response(report_data)
            
        except RegistrarProgram.DoesNotExist:
            return Response({'error': 'Program not found'}, status=status.HTTP_404_NOT_FOUND)
