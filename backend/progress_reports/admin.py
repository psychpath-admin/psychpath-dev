from django.contrib import admin
from .models import ProgressReportConfig, ProgressReport


@admin.register(ProgressReportConfig)
class ProgressReportConfigAdmin(admin.ModelAdmin):
    list_display = [
        'program_type', 'report_type', 'report_label', 
        'is_required', 'supervisor_approval_required'
    ]
    list_filter = ['program_type', 'is_required', 'supervisor_approval_required']
    search_fields = ['report_label', 'report_type']
    ordering = ['program_type', 'report_type']


@admin.register(ProgressReport)
class ProgressReportAdmin(admin.ModelAdmin):
    list_display = [
        'trainee', 'report_config', 'status', 
        'due_date', 'submission_date', 'is_overdue'
    ]
    list_filter = [
        'status', 'report_config__program_type', 
        'report_config__report_type', 'created_at'
    ]
    search_fields = [
        'trainee__first_name', 'trainee__last_name',
        'supervisor__first_name', 'supervisor__last_name'
    ]
    readonly_fields = ['created_at', 'updated_at', 'is_overdue']
    ordering = ['-created_at']
    
    def is_overdue(self, obj):
        return obj.is_overdue
    is_overdue.boolean = True
    is_overdue.short_description = 'Overdue'