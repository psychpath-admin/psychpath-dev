from django.contrib import admin
from .models import WeeklyLogbook, DCCEntry, CRAEntry, PDEntry, SUPEntry, LogbookAuditLog


@admin.register(WeeklyLogbook)
class WeeklyLogbookAdmin(admin.ModelAdmin):
    list_display = [
        'trainee', 'week_start_date', 'week_end_date', 'status', 
        'total_weekly_hours', 'cumulative_total_hours', 'supervisor'
    ]
    list_filter = ['status', 'week_start_date', 'trainee']
    search_fields = ['trainee__email', 'trainee__first_name', 'trainee__last_name']
    readonly_fields = [
        'total_dcc_hours', 'total_cra_hours', 'total_pd_hours', 'total_sup_hours',
        'total_weekly_hours', 'cumulative_dcc_hours', 'cumulative_cra_hours',
        'cumulative_pd_hours', 'cumulative_sup_hours', 'cumulative_total_hours',
        'created_at', 'updated_at'
    ]
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('trainee', 'week_start_date', 'week_end_date', 'status')
        }),
        ('Weekly Totals', {
            'fields': ('total_dcc_hours', 'total_cra_hours', 'total_pd_hours', 'total_sup_hours', 'total_weekly_hours')
        }),
        ('Cumulative Totals', {
            'fields': ('cumulative_dcc_hours', 'cumulative_cra_hours', 'cumulative_pd_hours', 'cumulative_sup_hours', 'cumulative_total_hours')
        }),
        ('Supervision', {
            'fields': ('supervisor', 'submitted_at', 'reviewed_by', 'reviewed_at', 'supervisor_comments')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


class LogbookEntryAdmin(admin.ModelAdmin):
    list_display = ['logbook', 'date', 'client_age', 'client_issue', 'duration_hours']
    list_filter = ['date', 'logbook__trainee']
    search_fields = ['client_issue', 'activity_description', 'reflection']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(DCCEntry)
class DCCEntryAdmin(LogbookEntryAdmin):
    pass


@admin.register(CRAEntry)
class CRAEntryAdmin(LogbookEntryAdmin):
    pass


@admin.register(PDEntry)
class PDEntryAdmin(LogbookEntryAdmin):
    pass


@admin.register(SUPEntry)
class SUPEntryAdmin(LogbookEntryAdmin):
    pass


@admin.register(LogbookAuditLog)
class LogbookAuditLogAdmin(admin.ModelAdmin):
    list_display = ['logbook', 'action', 'user', 'timestamp', 'previous_status', 'new_status']
    list_filter = ['action', 'timestamp', 'previous_status', 'new_status']
    search_fields = ['logbook__trainee__email', 'comments']
    readonly_fields = ['timestamp']
    
    def has_add_permission(self, request):
        return False  # Audit logs should only be created programmatically