"""
Report generation service for registrar programs
Generates PREA-76 (midpoint) and AECR-76 (final) reports
"""

from django.db.models import Sum, Q
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal
import json
import csv
from io import StringIO
import zipfile
from io import BytesIO

from .models import (
    RegistrarProgram, RegistrarPracticeEntry, RegistrarSupervisionEntry,
    RegistrarCpdEntry, CompetencyFramework, ProgressSnapshot
)
from .serializers import RegistrarValidationService


class RegistrarReportGenerator:
    """Service for generating registrar program reports"""
    
    @staticmethod
    def generate_midpoint_report(program_id):
        """Generate PREA-76 midpoint report"""
        try:
            program = RegistrarProgram.objects.get(id=program_id)
        except RegistrarProgram.DoesNotExist:
            return {'error': 'Program not found'}
        
        # Get compliance summary
        compliance = RegistrarValidationService.get_program_compliance_summary(program_id)
        
        # Get detailed breakdowns
        practice_entries = RegistrarPracticeEntry.objects.filter(program=program)
        supervision_entries = RegistrarSupervisionEntry.objects.filter(program=program)
        cpd_entries = RegistrarCpdEntry.objects.filter(program=program)
        
        # Practice hours breakdown
        practice_by_setting = {}
        practice_by_client_group = {}
        dcc_hours = 0
        
        for entry in practice_entries:
            setting = entry.setting
            client_group = entry.client_group
            
            if setting not in practice_by_setting:
                practice_by_setting[setting] = 0
            if client_group not in practice_by_client_group:
                practice_by_client_group[client_group] = 0
            
            hours = float(entry.hours)
            practice_by_setting[setting] += hours
            practice_by_client_group[client_group] += hours
            
            if entry.is_dcc:
                dcc_hours += hours
        
        # Supervision breakdown
        supervision_by_mode = {}
        supervision_by_type = {}
        supervision_by_supervisor = {}
        
        for entry in supervision_entries:
            mode = entry.mode
            type_supervision = entry.type
            supervisor = f"{entry.supervisor.profile.first_name} {entry.supervisor.profile.last_name}"
            
            if mode not in supervision_by_mode:
                supervision_by_mode[mode] = 0
            if type_supervision not in supervision_by_type:
                supervision_by_type[type_supervision] = 0
            if supervisor not in supervision_by_supervisor:
                supervision_by_supervisor[supervisor] = 0
            
            hours = entry.duration_minutes / 60
            supervision_by_mode[mode] += hours
            supervision_by_type[type_supervision] += hours
            supervision_by_supervisor[supervisor] += hours
        
        # CPD breakdown
        cpd_by_provider = {}
        active_cpd_hours = 0
        
        for entry in cpd_entries:
            provider = entry.provider
            if provider not in cpd_by_provider:
                cpd_by_provider[provider] = 0
            
            hours = float(entry.hours)
            cpd_by_provider[provider] += hours
            
            if entry.is_active_cpd:
                active_cpd_hours += hours
        
        # Competency mapping
        competency_tags = set()
        for entry in practice_entries:
            competency_tags.update(entry.competency_tags)
        
        # Generate report data
        report_data = {
            'report_type': 'PREA-76',
            'generated_date': date.today().isoformat(),
            'program_info': {
                'registrar_name': f"{program.user.profile.first_name} {program.user.profile.last_name}",
                'aope': program.get_aope_display(),
                'qualification_tier': program.get_qualification_tier_display(),
                'fte_fraction': float(program.fte_fraction),
                'start_date': program.start_date.isoformat(),
                'expected_end_date': program.expected_end_date.isoformat(),
                'report_date': date.today().isoformat()
            },
            'hour_totals': {
                'practice_hours': {
                    'total': compliance['progress']['practice_hours']['current'],
                    'target': compliance['progress']['practice_hours']['target'],
                    'percentage': compliance['progress']['practice_hours']['percentage']
                },
                'dcc_hours': {
                    'total': dcc_hours,
                    'per_fte_year': compliance['progress']['dcc_hours']['per_fte_year'],
                    'minimum_required': 176
                },
                'supervision_hours': {
                    'total': compliance['progress']['supervision_hours']['current'],
                    'target': compliance['progress']['supervision_hours']['target'],
                    'percentage': compliance['progress']['supervision_hours']['percentage']
                },
                'cpd_hours': {
                    'total': compliance['progress']['cpd_hours']['current'],
                    'active_cpd': active_cpd_hours,
                    'target': compliance['progress']['cpd_hours']['target'],
                    'percentage': compliance['progress']['cpd_hours']['percentage']
                }
            },
            'supervision_mix': {
                'percentages': compliance['compliance']['supervision_mix']['percentages'],
                'compliance_status': 'compliant' if compliance['compliance']['supervision_mix']['valid'] else 'non_compliant',
                'warnings': compliance['compliance']['supervision_mix']['warnings'],
                'errors': compliance['compliance']['supervision_mix']['errors']
            },
            'breakdowns': {
                'practice_by_setting': practice_by_setting,
                'practice_by_client_group': practice_by_client_group,
                'supervision_by_mode': supervision_by_mode,
                'supervision_by_type': supervision_by_type,
                'supervision_by_supervisor': supervision_by_supervisor,
                'cpd_by_provider': cpd_by_provider
            },
            'competencies': {
                'tags_used': list(competency_tags),
                'total_competencies': len(competency_tags)
            },
            'compliance_summary': {
                'all_targets_met': compliance['compliance']['targets_met'],
                'supervision_compliant': compliance['compliance']['supervision_mix']['valid'],
                'dcc_compliant': compliance['compliance']['dcc_minimum']['valid']
            }
        }
        
        return report_data
    
    @staticmethod
    def generate_final_report(program_id):
        """Generate AECR-76 final report"""
        try:
            program = RegistrarProgram.objects.get(id=program_id)
        except RegistrarProgram.DoesNotExist:
            return {'error': 'Program not found'}
        
        # Get midpoint snapshot if available
        midpoint_snapshot = ProgressSnapshot.objects.filter(
            program=program, type='midpoint'
        ).order_by('-created_at').first()
        
        # Generate current compliance summary
        compliance = RegistrarValidationService.get_program_compliance_summary(program_id)
        
        # Get detailed breakdowns (same as midpoint)
        practice_entries = RegistrarPracticeEntry.objects.filter(program=program)
        supervision_entries = RegistrarSupervisionEntry.objects.filter(program=program)
        cpd_entries = RegistrarCpdEntry.objects.filter(program=program)
        
        # Calculate program completion metrics
        actual_end_date = program.expected_end_date
        if program.status in ['final_submitted', 'endorsed']:
            # Use the most recent entry date as actual completion
            last_practice = practice_entries.order_by('-date').first()
            last_supervision = supervision_entries.order_by('-date').first()
            last_cpd = cpd_entries.order_by('-date').first()
            
            dates = [d.date for d in [last_practice, last_supervision, last_cpd] if d]
            if dates:
                actual_end_date = max(dates)
        
        # Generate final report data
        report_data = {
            'report_type': 'AECR-76',
            'generated_date': date.today().isoformat(),
            'program_info': {
                'registrar_name': f"{program.user.profile.first_name} {program.user.profile.last_name}",
                'aope': program.get_aope_display(),
                'qualification_tier': program.get_qualification_tier_display(),
                'fte_fraction': float(program.fte_fraction),
                'start_date': program.start_date.isoformat(),
                'expected_end_date': program.expected_end_date.isoformat(),
                'actual_end_date': actual_end_date.isoformat() if actual_end_date else None,
                'program_status': program.get_status_display(),
                'report_date': date.today().isoformat()
            },
            'hour_totals': {
                'practice_hours': {
                    'total': compliance['progress']['practice_hours']['current'],
                    'target': compliance['progress']['practice_hours']['target'],
                    'percentage': compliance['progress']['practice_hours']['percentage'],
                    'met_target': compliance['progress']['practice_hours']['current'] >= compliance['progress']['practice_hours']['target']
                },
                'dcc_hours': {
                    'total': compliance['progress']['dcc_hours']['current'],
                    'per_fte_year': compliance['progress']['dcc_hours']['per_fte_year'],
                    'minimum_required': 176,
                    'met_minimum': compliance['compliance']['dcc_minimum']['valid']
                },
                'supervision_hours': {
                    'total': compliance['progress']['supervision_hours']['current'],
                    'target': compliance['progress']['supervision_hours']['target'],
                    'percentage': compliance['progress']['supervision_hours']['percentage'],
                    'met_target': compliance['progress']['supervision_hours']['current'] >= compliance['progress']['supervision_hours']['target']
                },
                'cpd_hours': {
                    'total': compliance['progress']['cpd_hours']['current'],
                    'target': compliance['progress']['cpd_hours']['target'],
                    'percentage': compliance['progress']['cpd_hours']['percentage'],
                    'met_target': compliance['progress']['cpd_hours']['current'] >= compliance['progress']['cpd_hours']['target']
                }
            },
            'supervision_mix': {
                'percentages': compliance['compliance']['supervision_mix']['percentages'],
                'compliance_status': 'compliant' if compliance['compliance']['supervision_mix']['valid'] else 'non_compliant',
                'warnings': compliance['compliance']['supervision_mix']['warnings'],
                'errors': compliance['compliance']['supervision_mix']['errors']
            },
            'midpoint_comparison': {
                'available': midpoint_snapshot is not None,
                'midpoint_data': midpoint_snapshot.snapshot_json if midpoint_snapshot else None
            },
            'final_assessment': {
                'all_requirements_met': compliance['compliance']['targets_met'],
                'supervision_compliant': compliance['compliance']['supervision_mix']['valid'],
                'dcc_compliant': compliance['compliance']['dcc_minimum']['valid'],
                'ready_for_endorsement': (
                    compliance['compliance']['targets_met'] and
                    compliance['compliance']['supervision_mix']['valid'] and
                    compliance['compliance']['dcc_minimum']['valid']
                )
            }
        }
        
        return report_data
    
    @staticmethod
    def export_report_csv(program_id, report_type='midpoint'):
        """Export report data as CSV"""
        if report_type == 'midpoint':
            report_data = RegistrarReportGenerator.generate_midpoint_report(program_id)
        else:
            report_data = RegistrarReportGenerator.generate_final_report(program_id)
        
        if 'error' in report_data:
            return None
        
        # Create CSV content
        output = StringIO()
        writer = csv.writer(output)
        
        # Program info
        writer.writerow(['REPORT TYPE', report_data['report_type']])
        writer.writerow(['GENERATED DATE', report_data['generated_date']])
        writer.writerow([])
        
        program_info = report_data['program_info']
        writer.writerow(['PROGRAM INFORMATION'])
        writer.writerow(['Registrar Name', program_info['registrar_name']])
        writer.writerow(['Area of Practice Endorsement', program_info['aope']])
        writer.writerow(['Qualification Tier', program_info['qualification_tier']])
        writer.writerow(['FTE Fraction', program_info['fte_fraction']])
        writer.writerow(['Start Date', program_info['start_date']])
        writer.writerow(['Expected End Date', program_info['expected_end_date']])
        if 'actual_end_date' in program_info and program_info['actual_end_date']:
            writer.writerow(['Actual End Date', program_info['actual_end_date']])
        writer.writerow([])
        
        # Hour totals
        writer.writerow(['HOUR TOTALS'])
        hour_totals = report_data['hour_totals']
        
        for category, data in hour_totals.items():
            writer.writerow([category.replace('_', ' ').title()])
            for key, value in data.items():
                writer.writerow([f'  {key.replace("_", " ").title()}', value])
            writer.writerow([])
        
        # Supervision mix
        writer.writerow(['SUPERVISION MIX'])
        supervision_mix = report_data['supervision_mix']
        writer.writerow(['Compliance Status', supervision_mix['compliance_status']])
        for category, percentage in supervision_mix['percentages'].items():
            writer.writerow([f'{category.replace("_", " ").title()}', f'{percentage:.1f}%'])
        writer.writerow([])
        
        # Compliance summary
        if 'compliance_summary' in report_data:
            writer.writerow(['COMPLIANCE SUMMARY'])
            compliance = report_data['compliance_summary']
            for key, value in compliance.items():
                writer.writerow([key.replace('_', ' ').title(), value])
        
        if 'final_assessment' in report_data:
            writer.writerow(['FINAL ASSESSMENT'])
            assessment = report_data['final_assessment']
            for key, value in assessment.items():
                writer.writerow([key.replace('_', ' ').title(), value])
        
        return output.getvalue()
    
    @staticmethod
    def create_report_zip(program_id, report_type='midpoint'):
        """Create a ZIP file with all report data"""
        try:
            program = RegistrarProgram.objects.get(id=program_id)
        except RegistrarProgram.DoesNotExist:
            return None
        
        # Generate report data
        if report_type == 'midpoint':
            report_data = RegistrarReportGenerator.generate_midpoint_report(program_id)
        else:
            report_data = RegistrarReportGenerator.generate_final_report(program_id)
        
        if 'error' in report_data:
            return None
        
        # Create ZIP file in memory
        zip_buffer = BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Add JSON report
            json_filename = f"{report_type}_report_{program_id}_{date.today().isoformat()}.json"
            zip_file.writestr(json_filename, json.dumps(report_data, indent=2))
            
            # Add CSV report
            csv_content = RegistrarReportGenerator.export_report_csv(program_id, report_type)
            if csv_content:
                csv_filename = f"{report_type}_report_{program_id}_{date.today().isoformat()}.csv"
                zip_file.writestr(csv_filename, csv_content)
            
            # Add individual entry exports
            practice_entries = RegistrarPracticeEntry.objects.filter(program=program)
            supervision_entries = RegistrarSupervisionEntry.objects.filter(program=program)
            cpd_entries = RegistrarCpdEntry.objects.filter(program=program)
            
            # Practice entries CSV
            practice_csv = StringIO()
            practice_writer = csv.writer(practice_csv)
            practice_writer.writerow([
                'Date', 'Start Time', 'End Time', 'Hours', 'DCC', 'Setting', 
                'Client Group', 'Description', 'Competency Tags'
            ])
            
            for entry in practice_entries:
                practice_writer.writerow([
                    entry.date.isoformat(),
                    entry.start_time.isoformat() if entry.start_time else '',
                    entry.end_time.isoformat() if entry.end_time else '',
                    entry.hours,
                    'Yes' if entry.is_dcc else 'No',
                    entry.get_setting_display(),
                    entry.get_client_group_display(),
                    entry.description,
                    ', '.join(entry.competency_tags)
                ])
            
            zip_file.writestr('practice_entries.csv', practice_csv.getvalue())
            
            # Supervision entries CSV
            supervision_csv = StringIO()
            supervision_writer = csv.writer(supervision_csv)
            supervision_writer.writerow([
                'Date', 'Duration (Minutes)', 'Mode', 'Type', 'Supervisor', 
                'Supervisor Category', 'Topics', 'Observed', 'Notes'
            ])
            
            for entry in supervision_entries:
                supervisor_name = f"{entry.supervisor.profile.first_name} {entry.supervisor.profile.last_name}"
                supervision_writer.writerow([
                    entry.date.isoformat(),
                    entry.duration_minutes,
                    entry.get_mode_display(),
                    entry.get_type_display(),
                    supervisor_name,
                    entry.get_supervisor_category_display(),
                    entry.topics,
                    'Yes' if entry.observed else 'No',
                    entry.notes
                ])
            
            zip_file.writestr('supervision_entries.csv', supervision_csv.getvalue())
            
            # CPD entries CSV
            cpd_csv = StringIO()
            cpd_writer = csv.writer(cpd_csv)
            cpd_writer.writerow([
                'Date', 'Provider', 'Title', 'Hours', 'Active CPD', 
                'Learning Goal', 'Reflection'
            ])
            
            for entry in cpd_entries:
                cpd_writer.writerow([
                    entry.date.isoformat(),
                    entry.provider,
                    entry.title,
                    entry.hours,
                    'Yes' if entry.is_active_cpd else 'No',
                    entry.learning_goal,
                    entry.reflection
                ])
            
            zip_file.writestr('cpd_entries.csv', cpd_csv.getvalue())
        
        zip_buffer.seek(0)
        return zip_buffer
