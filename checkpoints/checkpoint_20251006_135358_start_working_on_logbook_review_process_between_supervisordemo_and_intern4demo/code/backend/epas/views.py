from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import EPA
from .serializers import EPASerializer


class EPAViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Entrustable Professional Activities (EPAs)
    
    Provides read-only access to EPAs with search and filtering capabilities.
    EPAs are linked to competency descriptors to show how specific activities
    demonstrate particular aspects of professional competence.
    """
    queryset = EPA.objects.all()
    serializer_class = EPASerializer
    lookup_field = 'code'

    def get_queryset(self):
        queryset = EPA.objects.all()
        
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | 
                Q(description__icontains=search) |
                Q(code__icontains=search)
            )
        
        # Filter by competency
        competency = self.request.query_params.get('competency', None)
        if competency and competency != 'All':
            # Filter EPAs that have descriptors starting with the competency code
            # e.g., competency='C1' matches descriptors like '1.1', '1.2', etc.
            competency_num = competency[1:]  # Remove 'C' prefix
            queryset = queryset.filter(descriptors__contains=competency_num)
        
        return queryset.order_by('code')

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get a summary of all EPAs (code, title only)
        Useful for dropdowns and quick reference
        """
        epas = EPA.objects.values('code', 'title').order_by('code')
        return Response(list(epas))

    @action(detail=False, methods=['get'])
    def by_descriptor(self, request):
        """
        Get EPAs that demonstrate a specific descriptor
        Query param: descriptor (e.g., '1.2')
        """
        descriptor = request.query_params.get('descriptor')
        if not descriptor:
            return Response({'error': 'descriptor parameter required'}, status=400)
        
        epas = EPA.objects.filter(descriptors__contains=descriptor).order_by('code')
        serializer = self.get_serializer(epas, many=True)
        return Response(serializer.data)
