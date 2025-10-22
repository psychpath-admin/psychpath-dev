from django.contrib import admin
from .models import MySupervisionAgenda, AgendaItem, SectionCImport

@admin.register(MySupervisionAgenda)
class MySupervisionAgendaAdmin(admin.ModelAdmin):
    list_display = ['trainee', 'week_starting', 'created_at']
    list_filter = ['week_starting', 'created_at']
    search_fields = ['trainee__user__email', 'trainee__first_name', 'trainee__last_name']
    readonly_fields = ['created_at', 'updated_at']
    
    def get_queryset(self, request):
        # Only show agendas for the current user's trainees (if supervisor)
        qs = super().get_queryset(request)
        if hasattr(request.user, 'profile'):
            if request.user.profile.role == 'SUPERVISOR':
                # Supervisors can see their trainees' agendas
                trainee_ids = request.user.profile.supervising.values_list('id', flat=True)
                return qs.filter(trainee_id__in=trainee_ids)
            elif request.user.profile.role in ['PROVISIONAL', 'INTERN', 'REGISTRAR']:
                # Trainees can only see their own agendas
                return qs.filter(trainee=request.user.profile)
        return qs.none()

@admin.register(AgendaItem)
class AgendaItemAdmin(admin.ModelAdmin):
    list_display = ['title', 'agenda', 'priority', 'status', 'source_type', 'created_at']
    list_filter = ['priority', 'status', 'source_type', 'imported_to_section_c', 'created_at']
    search_fields = ['title', 'detail', 'agenda__trainee__user__email']
    readonly_fields = ['created_at', 'updated_at']
    
    def get_queryset(self, request):
        # Only show items for the current user's trainees (if supervisor)
        qs = super().get_queryset(request)
        if hasattr(request.user, 'profile'):
            if request.user.profile.role == 'SUPERVISOR':
                # Supervisors can see their trainees' agenda items
                trainee_ids = request.user.profile.supervising.values_list('id', flat=True)
                return qs.filter(agenda__trainee_id__in=trainee_ids)
            elif request.user.profile.role in ['PROVISIONAL', 'INTERN', 'REGISTRAR']:
                # Trainees can only see their own agenda items
                return qs.filter(agenda__trainee=request.user.profile)
        return qs.none()

@admin.register(SectionCImport)
class SectionCImportAdmin(admin.ModelAdmin):
    list_display = ['snapshot_title', 'section_c_entry_id', 'agenda_item', 'imported_at']
    list_filter = ['imported_at']
    search_fields = ['snapshot_title', 'snapshot_detail']
    readonly_fields = ['imported_at']
    
    def get_queryset(self, request):
        # Only show imports for the current user's trainees (if supervisor)
        qs = super().get_queryset(request)
        if hasattr(request.user, 'profile'):
            if request.user.profile.role == 'SUPERVISOR':
                # Supervisors can see their trainees' imports
                trainee_ids = request.user.profile.supervising.values_list('id', flat=True)
                return qs.filter(agenda_item__agenda__trainee_id__in=trainee_ids)
            elif request.user.profile.role in ['PROVISIONAL', 'INTERN', 'REGISTRAR']:
                # Trainees can only see their own imports
                return qs.filter(agenda_item__agenda__trainee=request.user.profile)
        return qs.none()