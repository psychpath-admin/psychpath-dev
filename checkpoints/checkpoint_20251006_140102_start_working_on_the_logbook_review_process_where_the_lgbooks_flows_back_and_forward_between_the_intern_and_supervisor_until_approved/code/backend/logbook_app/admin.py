from django.contrib import admin
from .models import WeeklyLogbook, LogbookAuditLog, LogbookMessage, CommentThread, CommentMessage, UnlockRequest, Notification


@admin.register(WeeklyLogbook)
class WeeklyLogbookAdmin(admin.ModelAdmin):
    list_display = [
        'trainee', 'week_start_date', 'week_end_date', 'status', 'supervisor', 'created_at'
    ]
    list_filter = ['status', 'week_start_date', 'trainee']
    search_fields = ['trainee__email', 'trainee__profile__first_name', 'trainee__profile__last_name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('trainee', 'week_start_date', 'week_end_date', 'week_number', 'status')
        }),
        ('Entry References', {
            'fields': ('section_a_entry_ids', 'section_b_entry_ids', 'section_c_entry_ids')
        }),
        ('Supervision', {
            'fields': ('supervisor', 'submitted_at', 'reviewed_by', 'reviewed_at', 'supervisor_comments')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(LogbookMessage)
class LogbookMessageAdmin(admin.ModelAdmin):
    list_display = ['logbook', 'author', 'author_role', 'created_at']
    list_filter = ['author_role', 'created_at']
    search_fields = ['message', 'logbook__trainee__email']
    readonly_fields = ['created_at']


@admin.register(CommentThread)
class CommentThreadAdmin(admin.ModelAdmin):
    list_display = ['logbook', 'thread_type', 'entry_id', 'created_at']
    list_filter = ['thread_type', 'created_at']
    search_fields = ['logbook__trainee__email', 'entry_id']


@admin.register(CommentMessage)
class CommentMessageAdmin(admin.ModelAdmin):
    list_display = ['thread', 'author', 'author_role', 'created_at', 'locked']
    list_filter = ['author_role', 'locked', 'created_at']
    search_fields = ['message', 'thread__logbook__trainee__email']
    readonly_fields = ['created_at', 'updated_at', 'seen_by']


@admin.register(UnlockRequest)
class UnlockRequestAdmin(admin.ModelAdmin):
    list_display = ['logbook', 'requester', 'status', 'duration_minutes', 'created_at']
    list_filter = ['status', 'requester_role', 'reviewer_role', 'created_at']
    search_fields = ['logbook__trainee__email', 'reason', 'admin_comment']
    readonly_fields = ['created_at']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['recipient', 'type', 'read', 'created_at']
    list_filter = ['type', 'read', 'created_at']
    search_fields = ['recipient__email', 'message']
    readonly_fields = ['created_at']


@admin.register(LogbookAuditLog)
class LogbookAuditLogAdmin(admin.ModelAdmin):
    list_display = ['logbook', 'action', 'user', 'timestamp', 'previous_status', 'new_status']
    list_filter = ['action', 'timestamp', 'previous_status', 'new_status']
    search_fields = ['logbook__trainee__email', 'comments']
    readonly_fields = ['timestamp']
    
    def has_add_permission(self, request):
        return False  # Audit logs should only be created programmatically