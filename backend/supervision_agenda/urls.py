from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .views import MySupervisionAgendaViewSet, AgendaItemViewSet, SectionCImportViewSet

# Create router for ViewSets
router = DefaultRouter()
router.register(r'agendas', MySupervisionAgendaViewSet, basename='agenda')
router.register(r'items', AgendaItemViewSet, basename='agenda-item')
router.register(r'imports', SectionCImportViewSet, basename='section-c-import')

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_import(request):
    """Import selected agenda items to Section C supervision summary"""
    from api.models import UserProfile
    from .models import AgendaItem, SectionCImport
    from datetime import date
    
    section_c_id = request.data.get('section_c_uuid')  # Keep API contract, rename variable
    item_ids = request.data.get('item_ids', [])
    entry_type = request.data.get('entry_type', 'discussion_point')
    
    if not section_c_id or not item_ids:
        return Response(
            {'error': 'section_c_uuid and item_ids required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        trainee = UserProfile.objects.get(user=request.user)
        items = AgendaItem.objects.filter(
            id__in=item_ids,
            agenda__trainee=trainee,
            status='open'  # Only import open items
        )
        
        if not items.exists():
            return Response(
                {'error': 'No valid items found for import'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create import records
        imports = []
        for item in items:
            rendered_text = f"**{item.title}**\n\n{item.detail}"
            if item.my_reflection:
                rendered_text += f"\n\n*Reflection: {item.my_reflection}*"
            
            # Handle 'new-entry' case - use 0 as placeholder for new entries
            section_c_entry_id = 0
            if section_c_id and section_c_id != 'new-entry':
                try:
                    section_c_entry_id = int(section_c_id)
                except ValueError:
                    section_c_entry_id = 0
            
            import_record = SectionCImport.objects.create(
                section_c_entry_id=section_c_entry_id,
                agenda_item=item,
                snapshot_title=item.title,
                snapshot_detail=rendered_text
            )
            imports.append(import_record)
        
        # Mark items as discussed and imported
        items.update(
            status='discussed',
            discussed_on=date.today(),
            imported_to_section_c=True
        )
        
        # Return the rendered text for frontend to append to Section C
        rendered_texts = [imp.snapshot_detail for imp in imports]
        return Response({
            'imported_items': rendered_texts,
            'count': len(imports)
        }, status=status.HTTP_201_CREATED)
        
    except UserProfile.DoesNotExist:
        return Response({'error': 'User profile not found'}, status=status.HTTP_404_NOT_FOUND)

app_name = 'supervision_agenda'

urlpatterns = [
    # Include all ViewSet routes
    path('', include(router.urls)),
    # Test function-based view
    path('test-import/', test_import, name='test-import'),
]
