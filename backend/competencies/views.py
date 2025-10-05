from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Competency
from .serializers import CompetencySerializer


class CompetencyViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for AHPRA 8 Core Competencies (read-only)
    
    Provides access to the official AHPRA competencies for general registration
    effective December 1, 2025. Used for reflection tagging, EPA linking,
    self-assessments, and supervisor reporting.
    """
    queryset = Competency.objects.all()
    serializer_class = CompetencySerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'code'

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get a summary of all competencies (code, title only)
        Useful for dropdowns and quick reference
        """
        competencies = Competency.objects.values('code', 'title').order_by('code')
        return Response(list(competencies))

    @action(detail=True, methods=['get'])
    def descriptors(self, request, code=None):
        """
        Get detailed descriptors for a specific competency
        """
        try:
            competency = self.get_object()
            return Response({
                'code': competency.code,
                'title': competency.title,
                'descriptors': competency.descriptors
            })
        except Competency.DoesNotExist:
            return Response(
                {'error': f'Competency with code {code} not found'}, 
                status=404
            )
