from django.contrib import admin
from .models import UserProfile, EPA, Milestone, Reflection, SupervisionAssignment, AuditLog


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role")
    search_fields = ("user__username", "user__email")


@admin.register(EPA)
class EPAAdmin(admin.ModelAdmin):
    list_display = ("code", "title")
    search_fields = ("code", "title")


@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin):
    list_display = ("epa", "code")
    search_fields = ("epa__code", "code")
    list_filter = ("epa",)


@admin.register(Reflection)
class ReflectionAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "epa", "milestone", "created_at")
    search_fields = ("title", "author__username")
    list_filter = ("epa", "milestone")


@admin.register(SupervisionAssignment)
class SupervisionAssignmentAdmin(admin.ModelAdmin):
    list_display = ("provisional", "supervisor_name", "supervisor_email", "role", "status", "created_at")
    search_fields = ("provisional__username", "supervisor_name", "supervisor_email")
    list_filter = ("role", "status", "created_at")
    readonly_fields = ("created_at",)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("user", "action", "resource_type", "result", "ip_address", "created_at")
    list_filter = ("action", "resource_type", "result", "created_at")
    search_fields = ("user__email", "resource_id", "ip_address")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
    
    def has_add_permission(self, request):
        return False  # Audit logs should only be created programmatically
    
    def has_change_permission(self, request, obj=None):
        return False  # Audit logs should not be modified
    
    def has_delete_permission(self, request, obj=None):
        return False  # Audit logs should not be deleted

# Register your models here.
