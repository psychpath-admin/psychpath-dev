from rest_framework import serializers
from .models import Competency


class CompetencySerializer(serializers.ModelSerializer):
    """Serializer for AHPRA Competency model"""
    
    class Meta:
        model = Competency
        fields = [
            'id',
            'code',
            'title',
            'description',
            'descriptors',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
