from django.contrib import admin
from .models import Competency


@admin.register(Competency)
class CompetencyAdmin(admin.ModelAdmin):
    list_display = ['code', 'title', 'created_at']
    list_filter = ['created_at']
    search_fields = ['code', 'title', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['code']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('code', 'title', 'description')
        }),
        ('Descriptors', {
            'fields': ('descriptors',),
            'description': 'JSON array of competency descriptors'
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
