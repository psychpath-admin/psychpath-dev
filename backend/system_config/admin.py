from django.contrib import admin
from django.utils.html import format_html
from django.db import models
from django.forms import Textarea
from .models import (
    ConfigurationCategory,
    SystemConfiguration,
    ConfigurationItem,
    ConfigurationPreset,
    ConfigurationAuditLog
)


@admin.register(ConfigurationCategory)
class ConfigurationCategoryAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'name', 'icon', 'order']
    list_editable = ['order']
    ordering = ['order', 'display_name']
    search_fields = ['name', 'display_name']


class ConfigurationItemInline(admin.TabularInline):
    model = ConfigurationItem
    extra = 0
    fields = ['key', 'display_name', 'value_type', 'value', 'order']
    ordering = ['order']


@admin.register(SystemConfiguration)
class SystemConfigurationAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'is_active', 'created_at', 'item_count']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    inlines = [ConfigurationItemInline]
    
    def item_count(self, obj):
        return obj.items.count()
    item_count.short_description = 'Items'


@admin.register(ConfigurationItem)
class ConfigurationItemAdmin(admin.ModelAdmin):
    list_display = [
        'key', 'display_name', 'configuration', 'category', 
        'value_type', 'value_preview', 'order'
    ]
    list_filter = ['value_type', 'category', 'configuration', 'is_required', 'is_readonly']
    search_fields = ['key', 'display_name', 'description']
    ordering = ['configuration__name', 'category__order', 'order']
    
    formfield_overrides = {
        models.TextField: {'widget': Textarea(attrs={'rows': 3, 'cols': 80})},
    }
    
    def value_preview(self, obj):
        """Show a preview of the value"""
        if len(obj.value) > 50:
            return obj.value[:50] + '...'
        return obj.value
    value_preview.short_description = 'Value Preview'


@admin.register(ConfigurationPreset)
class ConfigurationPresetAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'is_default', 'created_by', 'created_at']
    list_filter = ['category', 'is_default', 'created_at']
    search_fields = ['name', 'description']
    
    formfield_overrides = {
        models.TextField: {'widget': Textarea(attrs={'rows': 10, 'cols': 80})},
    }


@admin.register(ConfigurationAuditLog)
class ConfigurationAuditLogAdmin(admin.ModelAdmin):
    list_display = [
        'configuration', 'user_email', 'action', 'timestamp', 'changes_preview'
    ]
    list_filter = ['action', 'timestamp', 'configuration']
    search_fields = ['configuration__name', 'user__email']
    readonly_fields = ['configuration', 'user', 'action', 'changes', 'timestamp']
    ordering = ['-timestamp']
    
    def user_email(self, obj):
        return obj.user.email if obj.user else 'System'
    user_email.short_description = 'User'
    
    def changes_preview(self, obj):
        """Show a preview of the changes"""
        changes_str = str(obj.changes)
        if len(changes_str) > 50:
            return changes_str[:50] + '...'
        return changes_str
    changes_preview.short_description = 'Changes Preview'
    
    def has_add_permission(self, request):
        return False  # Audit logs should only be created programmatically