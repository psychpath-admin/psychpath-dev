from django.contrib import admin
from .models import EPA


@admin.register(EPA)
class EPAAdmin(admin.ModelAdmin):
    list_display = ['code', 'title', 'created_at']
    list_filter = ['created_at']
    search_fields = ['code', 'title', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['code']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('code', 'title', 'description')
        }),
        ('Competency Links', {
            'fields': ('descriptors',),
            'description': 'JSON array of competency descriptors (e.g., ["1.2", "4.5"])'
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
