from rest_framework import serializers
from .models import EPA


class EPASerializer(serializers.ModelSerializer):
    """Serializer for EPA model"""
    
    class Meta:
        model = EPA
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
