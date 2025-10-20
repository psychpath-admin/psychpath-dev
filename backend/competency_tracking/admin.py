from django.contrib import admin
from .models import CompetencyDefinition, CompetencyEvidence, CompetencyRating

@admin.register(CompetencyDefinition)
class CompetencyDefinitionAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'order', 'is_active']
    list_filter = ['is_active']
    ordering = ['order', 'code']
    search_fields = ['code', 'name']

@admin.register(CompetencyEvidence)
class CompetencyEvidenceAdmin(admin.ModelAdmin):
    list_display = ['competency', 'trainee', 'evidence_type', 'milestone_level', 'date', 'supervisor_validated']
    list_filter = ['evidence_type', 'milestone_level', 'supervisor_validated', 'competency']
    search_fields = ['trainee__user__first_name', 'trainee__user__last_name', 'competency__code']
    date_hierarchy = 'date'
    ordering = ['-date', '-created_at']

@admin.register(CompetencyRating)
class CompetencyRatingAdmin(admin.ModelAdmin):
    list_display = ['trainee', 'competency', 'current_milestone', 'evidence_count', 'last_updated']
    list_filter = ['current_milestone', 'competency']
    search_fields = ['trainee__user__first_name', 'trainee__user__last_name', 'competency__code']
    ordering = ['trainee', 'competency__order']