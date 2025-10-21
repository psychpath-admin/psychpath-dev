from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import SectionAEntry, CustomSessionActivityType
from .serializers import SectionAEntrySerializer, CustomSessionActivityTypeSerializer
from .quality_validator import ClinicalQualityValidator
from .writing_prompts import WritingPrompts
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
    
    @action(detail=False, methods=['get'])
    def place_autocomplete(self, request):
        """Get unique places of practice for autocomplete"""
        query = request.query_params.get('q', '')
        queryset = self.get_queryset()
        
        if query:
            queryset = queryset.filter(place_of_practice__icontains=query)
        
        # Get unique places using Python set for reliable deduplication
        places = set()
        for entry in queryset:
            if entry.place_of_practice and entry.place_of_practice.strip():
                # Normalize by stripping and ensuring case-insensitive uniqueness
                places.add(entry.place_of_practice.strip())
        
        # Convert to sorted list and limit
        unique_places = sorted(list(places))[:20]
        
        return Response(unique_places)
    
    @action(detail=False, methods=['get'])
    def presenting_issues_autocomplete(self, request):
        """Get presenting issues from selected client's previous sessions"""
        query = request.query_params.get('q', '')
        client_id = request.query_params.get('client_id', '')
        
        if not client_id:
            return Response([])
        
        queryset = self.get_queryset().filter(
            Q(client_id=client_id) | Q(client_pseudonym=client_id)
        )
        
        if query:
            queryset = queryset.filter(presenting_issues__icontains=query)
        
        # Get unique presenting issues for this client
        issues = queryset.values_list('presenting_issues', flat=True).distinct()
        issues = [i for i in issues if i]  # Filter out empty strings
        
        return Response(list(issues)[:10])  # Limit to 10 suggestions
    
    @action(detail=False, methods=['get'])
    def check_duplicate_pseudonym(self, request):
        """Check if pseudonym already used today"""
        pseudonym = request.query_params.get('pseudonym', '')
        date = request.query_params.get('date', '')
        
        if not pseudonym or not date:
            return Response({'duplicate': False})
        
        # Check for entries with same pseudonym on same date
        exists = self.get_queryset().filter(
            Q(client_id=pseudonym) | Q(client_pseudonym=pseudonym),
            session_date=date
        ).exists()
        
        suggestions = []
        if exists:
            # Generate suggestions: pseudonym-2, pseudonym-A, pseudonym-B
            suggestions = [
                f"{pseudonym}-2",
                f"{pseudonym}-A", 
                f"{pseudonym}-B"
            ]
        
        return Response({
            'duplicate': exists,
            'suggestions': suggestions
        })
    
    @action(detail=False, methods=['get'])
    def client_session_count(self, request):
        """Get the session count for a specific client pseudonym"""
        client_id = request.query_params.get('client_id', '')
        
        if not client_id:
            return Response({'count': 0})
        
        count = self.get_queryset().filter(
            Q(client_id=client_id) | Q(client_pseudonym=client_id),
            entry_type__in=['client_contact', 'simulated_contact']
        ).count()
        
        return Response({'count': count})
    
    @action(detail=False, methods=['post'])
    def check_quality(self, request):
        """
        Check quality of presenting issues or reflection text without saving.
        Returns quality assessment, score, feedback, and helpful prompts.
        """
        text = request.data.get('text', '')
        field_type = request.data.get('field_type', 'presenting_issues')
        
        # Validate field_type
        if field_type not in ['presenting_issues', 'reflection']:
            return Response(
                {'error': 'field_type must be "presenting_issues" or "reflection"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Run quality validation
        if field_type == 'presenting_issues':
            result = ClinicalQualityValidator.validate_presenting_issues(text)
            prompts = WritingPrompts.get_presenting_issues_prompts(
                result['quality'],
                result.get('missing_elements', [])
            )
        else:  # reflection
            result = ClinicalQualityValidator.validate_reflection(text)
            prompts = WritingPrompts.get_reflection_prompts(
                result['quality'],
                result.get('missing_elements', [])
            )
        
        return Response({
            'quality': result['quality'],
            'score': result['score'],
            'feedback': result['feedback'],
            'prompts': prompts
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