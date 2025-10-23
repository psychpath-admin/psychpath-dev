from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q
from datetime import date, timedelta

from .models import MySupervisionAgenda, AgendaItem, SectionCImport
from .serializers import (
    MySupervisionAgendaSerializer, 
    AgendaItemSerializer, 
    AgendaItemCreateSerializer,
    AgendaItemUpdateSerializer,
    SectionCImportSerializer
)
from .permissions import IsAgendaOwner
from api.models import UserProfile


class MySupervisionAgendaViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing supervision agendas.
    Only trainees can access their own agendas.
    """
    serializer_class = MySupervisionAgendaSerializer
    permission_classes = [IsAuthenticated, IsAgendaOwner]
    
    def get_queryset(self):
        """Return only agendas for the current trainee"""
        try:
            trainee = UserProfile.objects.get(user=self.request.user)
            return MySupervisionAgenda.objects.filter(trainee=trainee).order_by('-week_starting', '-created_at')
        except UserProfile.DoesNotExist:
            return MySupervisionAgenda.objects.none()
    
    def perform_create(self, serializer):
        """Get or create agenda for current trainee"""
        trainee = UserProfile.objects.get(user=self.request.user)
        week_starting = serializer.validated_data.get('week_starting')
        
        # Use get_or_create to avoid duplicate key errors
        agenda, created = MySupervisionAgenda.objects.get_or_create(
            trainee=trainee,
            week_starting=week_starting,
            defaults=serializer.validated_data
        )
        
        # Return the agenda (whether created or existing)
        serializer.instance = agenda
    
    @action(detail=False, methods=['get'])
    def current_week(self, request):
        """Get or create agenda for current week"""
        try:
            trainee = UserProfile.objects.get(user=request.user)
            
            # Get current week's Monday
            today = date.today()
            current_week_start = today - timedelta(days=today.weekday())
            
            # Try to get existing agenda for this week
            agenda, created = MySupervisionAgenda.objects.get_or_create(
                trainee=trainee,
                week_starting=current_week_start,
                defaults={'week_starting': current_week_start}
            )
            
            serializer = self.get_serializer(agenda)
            return Response(serializer.data)
            
        except UserProfile.DoesNotExist:
            return Response({'error': 'User profile not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        """Add a new item to this agenda"""
        agenda = self.get_object()
        serializer = AgendaItemCreateSerializer(
            data=request.data, 
            context={'agenda': agenda, 'request': request}
        )
        
        if serializer.is_valid():
            item = serializer.save()
            response_serializer = AgendaItemSerializer(item)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AgendaItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing individual agenda items.
    Only trainees can access items from their own agendas.
    """
    permission_classes = [IsAuthenticated, IsAgendaOwner]
    
    def get_queryset(self):
        """Return only items from current trainee's agendas"""
        try:
            trainee = UserProfile.objects.get(user=self.request.user)
            return AgendaItem.objects.filter(agenda__trainee=trainee).order_by('-created_at')
        except UserProfile.DoesNotExist:
            return AgendaItem.objects.none()
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'create':
            return AgendaItemCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return AgendaItemUpdateSerializer
        return AgendaItemSerializer
    
    def perform_create(self, serializer):
        """Create item with agenda from URL or context"""
        agenda_id = self.request.data.get('agenda_id') or self.request.data.get('agenda')
        if not agenda_id:
            return Response({'error': 'agenda_id required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            trainee = UserProfile.objects.get(user=self.request.user)
            agenda = get_object_or_404(MySupervisionAgenda, id=agenda_id, trainee=trainee)
            # Ensure serializer has agenda in context because AgendaItemCreateSerializer.create
            # expects it there (not via kwargs)
            serializer.context.update({'agenda': agenda})
            serializer.save()
        except UserProfile.DoesNotExist:
            return Response({'error': 'User profile not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def mark_discussed(self, request, pk=None):
        """Mark item as discussed"""
        item = self.get_object()
        item.status = 'discussed'
        item.discussed_on = date.today()
        item.save()
        
        serializer = self.get_serializer(item)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_ready_for_section_c(self, request, pk=None):
        """Mark item as ready for Section C import"""
        item = self.get_object()
        item.imported_to_section_c = True
        item.save()
        
        serializer = self.get_serializer(item)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_reflection(self, request, pk=None):
        """Add reflection to item"""
        item = self.get_object()
        reflection = request.data.get('reflection', '')
        
        if not reflection:
            return Response({'error': 'Reflection text required'}, status=status.HTTP_400_BAD_REQUEST)
        
        item.my_reflection = reflection
        item.save()
        
        serializer = self.get_serializer(item)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def ready_for_import(self, request):
        """Get items ready for Section C import"""
        queryset = self.get_queryset().filter(imported_to_section_c=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class SectionCImportViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Section C import records.
    These are immutable snapshots of agenda items imported to Section C.
    """
    serializer_class = SectionCImportSerializer
    permission_classes = [IsAuthenticated, IsAgendaOwner]
    
    def get_queryset(self):
        """Return only imports from current trainee's agenda items"""
        try:
            trainee = UserProfile.objects.get(user=self.request.user)
            return SectionCImport.objects.filter(
                agenda_item__agenda__trainee=trainee
            ).order_by('-created_at')
        except UserProfile.DoesNotExist:
            return SectionCImport.objects.none()
    
    @action(detail=False, methods=['post'])
    def import_items(self, request):
        """Import selected agenda items to Section C"""
        section_c_id = request.data.get('section_c_id')
        item_ids = request.data.get('item_ids', [])
        entry_type = request.data.get('entry_type', 'discussion_point')
        
        if not section_c_id or not item_ids:
            return Response(
                {'error': 'section_c_id and item_ids required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            trainee = UserProfile.objects.get(user=request.user)
            items = AgendaItem.objects.filter(
                id__in=item_ids,
                agenda__trainee=trainee,
                imported_to_section_c=True
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
                
                import_record = SectionCImport.objects.create(
                    section_c_id=section_c_id,
                    agenda_item=item,
                    entry_type=entry_type,
                    rendered_text=rendered_text
                )
                imports.append(import_record)
            
            # Mark items as discussed and remove from ready list
            items.update(
                status='discussed',
                discussed_on=date.today(),
                imported_to_section_c=False
            )
            
            serializer = self.get_serializer(imports, many=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except UserProfile.DoesNotExist:
            return Response({'error': 'User profile not found'}, status=status.HTTP_404_NOT_FOUND)