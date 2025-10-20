from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from .models import CompetencyDefinition, CompetencyEvidence, CompetencyRating
from .serializers import *

class CompetencyDefinitionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CompetencyDefinition.objects.filter(is_active=True).order_by('order')
    serializer_class = CompetencyDefinitionSerializer
    permission_classes = [permissions.IsAuthenticated]

class CompetencyEvidenceViewSet(viewsets.ModelViewSet):
    queryset = CompetencyEvidence.objects.all()
    serializer_class = CompetencyEvidenceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.profile.role == 'SUPERVISOR':
            # Supervisors see evidence for their trainees
            return CompetencyEvidence.objects.filter(trainee__principal_supervisor=user.profile)
        else:
            # Trainees see only their own
            return CompetencyEvidence.objects.filter(trainee=user.profile)
    
    def perform_create(self, serializer):
        serializer.save(trainee=self.request.user.profile)
    
    @action(detail=False, methods=['get'])
    def by_competency(self, request):
        """Get evidence grouped by competency for current user"""
        competency_code = request.query_params.get('competency')
        evidence = self.get_queryset()
        
        if competency_code:
            evidence = evidence.filter(competency__code=competency_code)
        
        serializer = self.get_serializer(evidence, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """Validate evidence entry (supervisor only)"""
        if request.user.profile.role != 'SUPERVISOR':
            return Response(
                {'detail': 'Only supervisors can validate evidence'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        evidence = self.get_object()
        comment = request.data.get('comment', '')
        
        evidence.supervisor_validated = True
        evidence.supervisor_comment = comment
        evidence.validated_by = request.user.profile
        evidence.save()
        
        # Update competency rating
        self._update_competency_rating(evidence)
        
        serializer = self.get_serializer(evidence)
        return Response(serializer.data)
    
    def _update_competency_rating(self, evidence):
        """Update the competency rating based on evidence"""
        rating, created = CompetencyRating.objects.get_or_create(
            trainee=evidence.trainee,
            competency=evidence.competency,
            defaults={'current_milestone': evidence.milestone_level, 'evidence_count': 0}
        )
        
        # Count evidence for this competency
        evidence_count = CompetencyEvidence.objects.filter(
            trainee=evidence.trainee,
            competency=evidence.competency,
            supervisor_validated=True
        ).count()
        
        # Update milestone based on highest validated evidence
        highest_milestone = CompetencyEvidence.objects.filter(
            trainee=evidence.trainee,
            competency=evidence.competency,
            supervisor_validated=True
        ).order_by('-milestone_level').first()
        
        if highest_milestone:
            rating.current_milestone = highest_milestone.milestone_level
        
        rating.evidence_count = evidence_count
        rating.save()

class CompetencyRatingViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CompetencyRating.objects.all()
    serializer_class = CompetencyRatingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.profile.role == 'SUPERVISOR':
            trainee_id = self.request.query_params.get('trainee_id')
            if trainee_id:
                return CompetencyRating.objects.filter(trainee_id=trainee_id)
            return CompetencyRating.objects.filter(trainee__principal_supervisor=user.profile)
        else:
            return CompetencyRating.objects.filter(trainee=user.profile)
    
    @action(detail=False, methods=['get'])
    def progress_summary(self, request):
        """Get detailed progress summary with evidence breakdown by milestone"""
        trainee_id = request.query_params.get('trainee_id')
        
        if request.user.profile.role == 'SUPERVISOR' and trainee_id:
            trainee_profile_id = trainee_id
        else:
            trainee_profile_id = request.user.profile.id
        
        # Get all competencies with evidence counts by milestone
        competencies = CompetencyDefinition.objects.filter(is_active=True).order_by('order')
        progress_data = []
        
        for comp in competencies:
            rating = CompetencyRating.objects.filter(
                trainee_id=trainee_profile_id, 
                competency=comp
            ).first()
            
            evidence_counts = CompetencyEvidence.objects.filter(
                trainee_id=trainee_profile_id,
                competency=comp
            ).aggregate(
                m1=Count('id', filter=Q(milestone_level='M1')),
                m2=Count('id', filter=Q(milestone_level='M2')),
                m3=Count('id', filter=Q(milestone_level='M3')),
                m4=Count('id', filter=Q(milestone_level='M4')),
            )
            
            progress_data.append({
                'competency_code': comp.code,
                'competency_name': comp.name,
                'current_milestone': rating.current_milestone if rating else 'M1',
                'evidence_count': rating.evidence_count if rating else 0,
                'last_updated': rating.last_updated if rating else None,
                'm1_count': evidence_counts['m1'],
                'm2_count': evidence_counts['m2'],
                'm3_count': evidence_counts['m3'],
                'm4_count': evidence_counts['m4'],
            })
        
        return Response(progress_data)