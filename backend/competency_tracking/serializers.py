from rest_framework import serializers
from .models import CompetencyDefinition, CompetencyEvidence, CompetencyRating

class CompetencyDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompetencyDefinition
        fields = '__all__'

class CompetencyEvidenceSerializer(serializers.ModelSerializer):
    competency_name = serializers.CharField(source='competency.name', read_only=True)
    competency_code = serializers.CharField(source='competency.code', read_only=True)
    trainee_name = serializers.CharField(source='trainee.user.get_full_name', read_only=True)
    validated_by_name = serializers.CharField(source='validated_by.user.get_full_name', read_only=True)
    
    class Meta:
        model = CompetencyEvidence
        fields = '__all__'
        read_only_fields = ['trainee', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate that at least one evidence source is provided for non-manual entries"""
        evidence_type = data.get('evidence_type')
        
        if evidence_type != 'MANUAL':
            has_linked_entry = any([
                data.get('section_a_entry'),
                data.get('section_b_entry'),
                data.get('section_c_entry')
            ])
            
            if not has_linked_entry:
                raise serializers.ValidationError(
                    f"For {evidence_type} evidence, you must link to an existing entry."
                )
        
        return data

class CompetencyRatingSerializer(serializers.ModelSerializer):
    competency_code = serializers.CharField(source='competency.code', read_only=True)
    competency_name = serializers.CharField(source='competency.name', read_only=True)
    trainee_name = serializers.CharField(source='trainee.user.get_full_name', read_only=True)
    
    class Meta:
        model = CompetencyRating
        fields = '__all__'

class CompetencyProgressSerializer(serializers.Serializer):
    """Summary of trainee's competency progress"""
    competency_code = serializers.CharField()
    competency_name = serializers.CharField()
    current_milestone = serializers.CharField()
    evidence_count = serializers.IntegerField()
    last_updated = serializers.DateTimeField()
    m1_count = serializers.IntegerField()
    m2_count = serializers.IntegerField()
    m3_count = serializers.IntegerField()
    m4_count = serializers.IntegerField()
