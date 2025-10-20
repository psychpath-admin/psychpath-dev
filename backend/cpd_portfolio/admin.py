from django.contrib import admin
from .models import CPDCategory, CPDActivity, CPDPlan, CPDRequirement, CPDComplianceReport

@admin.register(CPDCategory)
class CPDCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['name']

@admin.register(CPDActivity)
class CPDActivityAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'user', 'activity_type', 'activity_date', 
        'duration_hours', 'is_active_cpd', 'status', 'created_at'
    ]
    list_filter = [
        'activity_type', 'is_active_cpd', 'is_peer_consultation', 
        'status', 'activity_date', 'created_at'
    ]
    search_fields = ['title', 'user__first_name', 'user__last_name', 'user__email']
    readonly_fields = ['created_at', 'updated_at', 'reviewed_at']
    date_hierarchy = 'activity_date'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'user_profile', 'title', 'activity_type', 'category')
        }),
        ('Activity Details', {
            'fields': ('description', 'activity_date', 'duration_hours', 'delivery_mode')
        }),
        ('Learning Outcomes', {
            'fields': ('learning_outcomes', 'skills_developed', 'application_to_practice')
        }),
        ('Evidence', {
            'fields': ('evidence_type', 'evidence_description', 'evidence_file')
        }),
        ('CPD Classification', {
            'fields': ('is_active_cpd', 'is_peer_consultation', 'is_supervision')
        }),
        ('Professional Development', {
            'fields': ('professional_areas', 'competencies_addressed')
        }),
        ('Quality & Reflection', {
            'fields': ('quality_rating', 'reflection')
        }),
        ('Status & Review', {
            'fields': ('status', 'reviewer', 'reviewer_comments', 'reviewed_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(CPDPlan)
class CPDPlanAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'user', 'year', 'status', 'total_hours_planned',
        'total_hours_completed', 'progress_percentage', 'created_at'
    ]
    list_filter = ['year', 'status', 'created_at']
    search_fields = ['title', 'user__first_name', 'user__last_name', 'user__email']
    readonly_fields = ['created_at', 'updated_at', 'submitted_at', 'approved_at', 'progress_percentage', 'active_cpd_percentage']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'user_profile', 'year', 'title', 'description')
        }),
        ('Goals & Objectives', {
            'fields': ('learning_goals', 'professional_areas', 'competencies_to_develop')
        }),
        ('Planned Hours', {
            'fields': ('total_hours_planned', 'active_cpd_hours_planned', 'peer_consultation_hours_planned')
        }),
        ('Status & Approval', {
            'fields': ('status', 'submitted_at', 'approved_at', 'approved_by')
        }),
        ('Progress Tracking', {
            'fields': ('total_hours_completed', 'active_cpd_hours_completed', 'peer_consultation_hours_completed', 'progress_percentage', 'active_cpd_percentage')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(CPDRequirement)
class CPDRequirementAdmin(admin.ModelAdmin):
    list_display = [
        'role', 'year', 'total_hours_required', 'active_cpd_percentage',
        'peer_consultation_hours', 'is_active'
    ]
    list_filter = ['role', 'year', 'is_active', 'requires_plan_approval', 'requires_evidence']
    search_fields = ['role', 'year']
    ordering = ['-year', 'role']
    
    fieldsets = (
        ('Role & Year', {
            'fields': ('role', 'year', 'is_active')
        }),
        ('Requirements', {
            'fields': ('total_hours_required', 'active_cpd_percentage', 'peer_consultation_hours')
        }),
        ('Additional Requirements', {
            'fields': ('requires_plan_approval', 'requires_evidence')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(CPDComplianceReport)
class CPDComplianceReportAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'year', 'total_hours_completed', 'total_hours_required',
        'is_compliant', 'status', 'created_at'
    ]
    list_filter = ['year', 'is_compliant', 'status', 'created_at']
    search_fields = ['user__first_name', 'user__last_name', 'user__email']
    readonly_fields = ['created_at', 'updated_at', 'submitted_at', 'approved_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'user_profile', 'year', 'report_period_start', 'report_period_end')
        }),
        ('Completed Hours', {
            'fields': ('total_hours_completed', 'active_cpd_hours', 'peer_consultation_hours')
        }),
        ('Requirements', {
            'fields': ('total_hours_required', 'active_cpd_percentage_required', 'peer_consultation_hours_required')
        }),
        ('Compliance', {
            'fields': ('is_compliant', 'compliance_notes')
        }),
        ('Status & Approval', {
            'fields': ('status', 'submitted_at', 'approved_at', 'approved_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )