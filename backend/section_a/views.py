from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import SectionAEntry, CustomSessionActivityType
from .serializers import SectionAEntrySerializer, CustomSessionActivityTypeSerializer
from permissions import DenyOrgAdmin


class SectionAEntryViewSet(viewsets.ModelViewSet):
    """ViewSet for Section A entries"""
    
    serializer_class = SectionAEntrySerializer
    permission_classes = [permissions.IsAuthenticated, DenyOrgAdmin]
    
    def get_queryset(self):
        """Return entries for the current user only"""
        queryset = SectionAEntry.objects.filter(trainee=self.request.user)
        
        # Filter by week_starting if provided
        week_starting = self.request.query_params.get('week_starting', None)
        if week_starting:
            queryset = queryset.filter(week_starting=week_starting)
        
        # Filter by locked status if provided
        include_locked = self.request.query_params.get('include_locked', 'false').lower() == 'true'
        if not include_locked:
            queryset = queryset.filter(locked=False)
        
        return queryset
    
    def perform_create(self, serializer):
        """Automatically set the trainee to the current user"""
        serializer.save(trainee=self.request.user)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search entries by client pseudonym"""
        query = request.query_params.get('q', '')
        queryset = self.get_queryset()
        
        if query:
            queryset = queryset.filter(
                Q(client_pseudonym__icontains=query) |
                Q(activity_description__icontains=query)
            )
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def logbook_eligibility(self, request):
        """Check if user can submit their logbook"""
        eligibility = SectionAEntry.can_submit_logbook(request.user)
        return Response(eligibility)
    
    @action(detail=False, methods=['get'])
    def sdcc_summary(self, request):
        """Get SDCC hours summary for the current user"""
        summary = SectionAEntry.get_sdcc_summary(request.user)
        return Response(summary)
    
    @action(detail=False, methods=['get'])
    def client_autocomplete(self, request):
        """Get unique client pseudonyms for autocomplete"""
        query = request.query_params.get('q', '')
        queryset = self.get_queryset()
        
        if query:
            queryset = queryset.filter(
                Q(client_id__icontains=query) | Q(client_pseudonym__icontains=query)
            )
        
        # Get unique client IDs/pseudonyms
        client_ids = set()
        for entry in queryset:
            if entry.client_id:
                client_ids.add(entry.client_id)
            elif entry.client_pseudonym:
                client_ids.add(entry.client_pseudonym)
        
        return Response(list(client_ids))
    
    @action(detail=False, methods=['get'])
    def last_session_data(self, request):
        """Get last session data for a specific client"""
        client_id = request.query_params.get('client_id', '')
        if not client_id:
            return Response({'error': 'client_id parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Find the most recent entry for this client
        last_entry = self.get_queryset().filter(
            Q(client_id=client_id) | Q(client_pseudonym=client_id)
        ).order_by('-session_date', '-created_at').first()
        
        if not last_entry:
            return Response({'error': 'No previous sessions found'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            'presenting_issues': last_entry.presenting_issues or '',
            'place_of_practice': last_entry.place_of_practice or '',
            'client_age': last_entry.client_age or '',
            'session_activity_types': last_entry.session_activity_types or [],
        })


class CustomSessionActivityTypeViewSet(viewsets.ModelViewSet):
    """ViewSet for custom session activity types"""
    
    serializer_class = CustomSessionActivityTypeSerializer
    permission_classes = [permissions.IsAuthenticated, DenyOrgAdmin]
    
    def get_queryset(self):
        """Return custom activity types for the current user only"""
        return CustomSessionActivityType.objects.filter(trainee=self.request.user)
    
    def perform_create(self, serializer):
        """Automatically set the trainee to the current user"""
        serializer.save(trainee=self.request.user)