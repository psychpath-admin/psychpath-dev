from django.contrib import admin
from .models import ProfessionalDevelopmentEntry, PDCompetency, PDWeeklySummary


@admin.register(ProfessionalDevelopmentEntry)
class ProfessionalDevelopmentEntryAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'trainee', 'activity_type', 'date_of_activity', 
        'duration_minutes', 'is_active_activity', 'week_starting',
        'supervisor_initials', 'reviewed_in_supervision', 'created_at'
    ]
    list_filter = [
        'activity_type', 'is_active_activity', 'reviewed_in_supervision',
        'week_starting', 'created_at'
    ]
    search_fields = [
        'trainee__username', 'trainee__email', 'activity_details', 
        'topics_covered', 'supervisor_initials'
    ]
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'date_of_activity'
    
    fieldsets = (
        ('Activity Information', {
            'fields': (
                'trainee', 'activity_type', 'date_of_activity', 
                'duration_minutes', 'is_active_activity'
            )
        }),
        ('Activity Details', {
            'fields': (
                'activity_details', 'topics_covered', 'competencies_covered',
                'reflection'
            )
        }),
        ('Supervision', {
            'fields': (
                'supervisor_initials', 'reviewed_in_supervision'
            )
        }),
        ('Logbook Integration', {
            'fields': (
                'locked', 'supervisor_comment', 'trainee_response'
            )
        }),
        ('System', {
            'fields': ('week_starting', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(PDCompetency)
class PDCompetencyAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at']


@admin.register(PDWeeklySummary)
class PDWeeklySummaryAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'trainee', 'week_starting', 'week_total_display',
        'cumulative_total_display', 'created_at'
    ]
    list_filter = ['week_starting', 'created_at']
    search_fields = ['trainee__username', 'trainee__email']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'week_starting'
