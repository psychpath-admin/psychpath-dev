from django.contrib import admin
from .models import (
    RegistrarProgramConfig, RegistrarProfile, PracticeLog, CPDActivity, LeaveRecord,
    ProgressReport, EndorsementApplication, ObservationRecord
)


@admin.register(RegistrarProgramConfig)
class RegistrarProgramConfigAdmin(admin.ModelAdmin):
    list_display = ['track', 'version', 'duration_years', 'supervision_hours_required', 'is_active']
    list_filter = ['is_active', 'track']
    fieldsets = [
        ('Program', {'fields': ['track', 'version', 'is_active']}),
        ('Core Requirements', {'fields': ['duration_years', 'total_hours_required', 'direct_contact_annual_hours', 'supervision_hours_required', 'cpd_hours_required']}),
        ('Supervision Rules', {'fields': ['principal_supervisor_min_percentage', 'individual_supervision_min_percentage', 'short_session_max_hours', 'direct_supervision_hours_per_fte']}),
        ('Observation', {'fields': ['observation_frequency_days', 'observation_warning_days']}),
    ]


@admin.register(RegistrarProfile)
class RegistrarProfileAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'aope_area', 'program_track', 'enrollment_date', 
        'expected_completion_date', 'status', 'fte_fraction'
    ]
    list_filter = ['aope_area', 'program_track', 'status', 'enrollment_date']
    search_fields = ['user__first_name', 'user__last_name', 'user__email']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'aope_area', 'program_track', 'status')
        }),
        ('Program Dates', {
            'fields': ('enrollment_date', 'expected_completion_date', 'fte_fraction')
        }),
        ('Supervisors', {
            'fields': ('principal_supervisor', 'secondary_supervisor')
        }),
        ('Requirements', {
            'fields': (
                'direct_contact_requirement', 'board_variation_enabled', 
                'board_variation_doc', 'total_weeks_required',
                'supervision_hours_required', 'cpd_hours_required'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(PracticeLog)
class PracticeLogAdmin(admin.ModelAdmin):
    list_display = [
        'registrar', 'date', 'practice_type', 'duration_hours',
        'aope_alignment', 'supervisor_reviewed'
    ]
    list_filter = ['practice_type', 'aope_alignment', 'supervisor_reviewed', 'date']
    search_fields = ['registrar__user__first_name', 'registrar__user__last_name', 'activity_description']
    readonly_fields = ['created_at', 'updated_at', 'reviewed_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('registrar', 'date', 'duration_hours', 'practice_type')
        }),
        ('Activity Details', {
            'fields': ('activity_description', 'setting', 'aope_alignment', 'competencies')
        }),
        ('Reflection', {
            'fields': ('reflection_text',)
        }),
        ('Supervisor Review', {
            'fields': ('supervisor_reviewed', 'supervisor_feedback', 'reviewed_by', 'reviewed_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CPDActivity)
class CPDActivityAdmin(admin.ModelAdmin):
    list_display = [
        'registrar', 'title', 'date', 'duration_hours', 'activity_type',
        'is_active', 'supervisor_approval'
    ]
    list_filter = ['activity_type', 'is_active', 'is_peer_consultation', 'supervisor_approval', 'date']
    search_fields = ['registrar__user__first_name', 'registrar__user__last_name', 'title', 'provider']
    readonly_fields = ['created_at', 'updated_at', 'approved_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('registrar', 'title', 'provider', 'date', 'duration_hours', 'activity_type')
        }),
        ('AHPRA Requirements', {
            'fields': ('is_active', 'supervisor_set_task', 'aope_alignment', 'is_peer_consultation')
        }),
        ('Learning Details', {
            'fields': ('learning_objectives', 'competencies', 'reflection', 'evidence_file')
        }),
        ('Supervisor Approval', {
            'fields': ('supervisor_approval', 'approved_by', 'approved_at', 'supervisor_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(LeaveRecord)
class LeaveRecordAdmin(admin.ModelAdmin):
    list_display = [
        'registrar', 'leave_type', 'start_date', 'end_date',
        'duration_days', 'approved_by_supervisor'
    ]
    list_filter = ['leave_type', 'approved_by_supervisor', 'start_date']
    search_fields = ['registrar__user__first_name', 'registrar__user__last_name', 'notes']
    readonly_fields = ['created_at', 'updated_at', 'approved_at', 'duration_days']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('registrar', 'leave_type', 'start_date', 'end_date', 'duration_days')
        }),
        ('Approval', {
            'fields': ('approved_by_supervisor', 'approved_by', 'approved_at', 'notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ProgressReport)
class ProgressReportAdmin(admin.ModelAdmin):
    list_display = [
        'registrar', 'report_type', 'created_at', 'is_signed'
    ]
    list_filter = ['report_type', 'created_at']
    search_fields = ['registrar__user__first_name', 'registrar__user__last_name']
    readonly_fields = ['created_at', 'updated_at', 'signed_at', 'is_signed']
    
    def is_signed(self, obj):
        return bool(obj.registrar_signature and obj.supervisor_signature and obj.signed_at)
    is_signed.boolean = True
    is_signed.short_description = 'Signed'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('registrar', 'report_type')
        }),
        ('Competency Ratings', {
            'fields': ('competency_ratings',)
        }),
        ('Feedback', {
            'fields': ('supervisor_feedback', 'action_plan')
        }),
        ('Signatures', {
            'fields': ('registrar_signature', 'supervisor_signature', 'signed_at', 'is_signed')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(EndorsementApplication)
class EndorsementApplicationAdmin(admin.ModelAdmin):
    list_display = [
        'registrar', 'status', 'submission_date', 'completion_date'
    ]
    list_filter = ['status', 'submission_date', 'completion_date']
    search_fields = ['registrar__user__first_name', 'registrar__user__last_name']
    readonly_fields = ['created_at', 'updated_at', 'submission_date']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('registrar', 'status', 'submission_date', 'completion_date')
        }),
        ('Summary Data', {
            'fields': ('total_hours', 'supervision_summary', 'cpd_summary', 'competency_attestation')
        }),
        ('Declarations', {
            'fields': ('supervisor_declaration', 'registrar_declaration')
        }),
        ('Export', {
            'fields': ('exported_pdf_path',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ObservationRecord)
class ObservationRecordAdmin(admin.ModelAdmin):
    list_display = [
        'registrar', 'observation_date', 'method', 'supervisor',
        'consent_confirmed', 'privacy_confirmed'
    ]
    list_filter = ['method', 'consent_confirmed', 'privacy_confirmed', 'observation_date']
    search_fields = ['registrar__user__first_name', 'registrar__user__last_name', 'feedback_text']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('registrar', 'supervision_session', 'observation_date', 'method')
        }),
        ('Consent & Privacy', {
            'fields': ('consent_confirmed', 'privacy_confirmed')
        }),
        ('Feedback', {
            'fields': ('feedback_text', 'supervisor')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )