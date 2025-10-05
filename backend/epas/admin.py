from django.contrib import admin
from .models import EPA


@admin.register(EPA)
class EPAAdmin(admin.ModelAdmin):
    list_display = ['code', 'title', 'tag', 'created_at']
    list_filter = ['created_at']
    search_fields = ['code', 'title', 'description', 'tag']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['code']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('code', 'title', 'description', 'tag')
        }),
        ('Competency Links', {
            'fields': ('descriptors',),
            'description': 'JSON array of competency descriptors (e.g., ["5.1", "5.3"])'
        }),
        ('Milestones & Behaviours', {
            'fields': ('milestones', 'm3_behaviours'),
            'description': 'Milestone levels and observable behaviours'
        }),
        ('Reflection & Assessment', {
            'fields': ('prompt',),
            'description': 'Reflection prompt for supervisee or self-assessment'
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
