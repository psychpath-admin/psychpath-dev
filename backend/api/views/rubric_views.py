from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from api.models import Rubric, RubricScore, RubricSummary, EPA, Competency, Milestone
from api.serializers import (
    RubricSerializer, RubricScoreSerializer, RubricScoreCreateSerializer,
    RubricSummarySerializer, RubricSummaryCreateSerializer, CompetencySerializer,
    EPASerializer, MilestoneSerializer
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_rubric_for_epa(request, epa_code):
    """GET /api/rubrics/epa/:epa_code/ - Get rubric for specific EPA"""
    epa = get_object_or_404(EPA, code=epa_code)
    rubrics = Rubric.objects.filter(epa=epa, is_active=True)
    serializer = RubricSerializer(rubrics, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_rubric_by_id(request, rubric_id):
    """GET /api/rubrics/:id/ - Get specific rubric details"""
    rubric = get_object_or_404(Rubric, id=rubric_id)
    serializer = RubricSerializer(rubric)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_rubric_score(request):
    """POST /api/rubrics/score/ - Submit individual criterion score"""
    serializer = RubricScoreCreateSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_rubric_summary(request):
    """POST /api/rubrics/summary/ - Submit complete rubric evaluation"""
    serializer = RubricSummaryCreateSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        summary = serializer.save()
        return Response(RubricSummarySerializer(summary).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_supervisee_rubric_summaries(request, supervisee_id):
    """GET /api/rubrics/supervisee/:id/ - Get all rubric summaries for supervisee"""
    summaries = RubricSummary.objects.filter(supervisee_id=supervisee_id)
    serializer = RubricSummarySerializer(summaries, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_rubric_summaries(request):
    """GET /api/rubrics/my-progress/ - Get current user's rubric summaries"""
    summaries = RubricSummary.objects.filter(supervisee=request.user)
    serializer = RubricSummarySerializer(summaries, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_competencies(request):
    """GET /api/competencies/ - Get all AHPRA competencies"""
    competencies = Competency.objects.filter(is_active=True)
    serializer = CompetencySerializer(competencies, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_competency_epas(request, competency_code):
    """GET /api/competencies/:code/epas/ - Get all EPAs for a competency"""
    competency = get_object_or_404(Competency, code=competency_code)
    epas = EPA.objects.filter(competency=competency)
    serializer = EPASerializer(epas, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_epa_milestones(request, epa_code):
    """GET /api/epas/:code/milestones/ - Get all milestones for an EPA"""
    epa = get_object_or_404(EPA, code=epa_code)
    milestones = Milestone.objects.filter(epa=epa)
    serializer = MilestoneSerializer(milestones, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_rubric_scores(request, rubric_id, supervisee_id):
    """GET /api/rubrics/:id/scores/:supervisee_id/ - Get scores for specific rubric and supervisee"""
    rubric = get_object_or_404(Rubric, id=rubric_id)
    scores = RubricScore.objects.filter(
        rubric=rubric,
        supervisee_id=supervisee_id,
        supervisor=request.user
    )
    serializer = RubricScoreSerializer(scores, many=True)
    return Response(serializer.data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_rubric_score(request, score_id):
    """PUT /api/rubrics/scores/:id/ - Update existing rubric score"""
    score = get_object_or_404(RubricScore, id=score_id, supervisor=request.user)
    serializer = RubricScoreSerializer(score, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_rubric_score(request, score_id):
    """DELETE /api/rubrics/scores/:id/ - Delete rubric score"""
    score = get_object_or_404(RubricScore, id=score_id, supervisor=request.user)
    score.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
