from rest_framework import serializers
from .models import MySupervisionAgenda, AgendaItem, SectionCImport
from api.models import UserProfile
from datetime import date


class AgendaItemSerializer(serializers.ModelSerializer):
    """Serializer for individual agenda items"""
    
    class Meta:
        model = AgendaItem
        fields = [
            'id', 'title', 'detail', 'priority', 'status', 'source_type',
            'source_entry_id', 'source_field', 'source_excerpt', 'my_reflection', 
            'discussed_on', 'imported_to_section_c', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_priority(self, value):
        """Validate priority field"""
        if value not in ['low', 'med', 'high']:
            raise serializers.ValidationError("Priority must be 'low', 'med', or 'high'")
        return value
    
    def validate_status(self, value):
        """Validate status field"""
        if value not in ['open', 'discussed', 'carried', 'discarded']:
            raise serializers.ValidationError("Status must be 'open', 'discussed', 'carried', or 'discarded'")
        return value
    
    def validate_source_type(self, value):
        """Validate source_type field"""
        if value not in ['A', 'B', 'FREE']:
            raise serializers.ValidationError("Source type must be 'A', 'B', or 'FREE'")
        return value


class MySupervisionAgendaSerializer(serializers.ModelSerializer):
    """Serializer for supervision agenda with nested items"""
    
    items = AgendaItemSerializer(many=True, read_only=True)
    trainee_email = serializers.CharField(source='trainee.user.email', read_only=True)
    week_starting_display = serializers.SerializerMethodField()
    
    class Meta:
        model = MySupervisionAgenda
        fields = [
            'id', 'trainee', 'trainee_email', 'week_starting', 'week_starting_display',
            'created_at', 'updated_at', 'items'
        ]
        read_only_fields = ['id', 'trainee', 'created_at', 'updated_at']
    
    def get_week_starting_display(self, obj):
        """Format week starting date for display"""
        if obj.week_starting:
            return obj.week_starting.strftime('%B %d, %Y')
        return None
    
    def create(self, validated_data):
        """Create agenda with trainee from request context"""
        # Get trainee from request context
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError("User must be authenticated")
        
        try:
            trainee = UserProfile.objects.get(user=request.user)
        except UserProfile.DoesNotExist:
            raise serializers.ValidationError("User profile not found")
        
        # Only trainees can create agendas
        if trainee.role not in ['PROVISIONAL', 'INTERN', 'REGISTRAR']:
            raise serializers.ValidationError("Only trainees can create supervision agendas")
        
        validated_data['trainee'] = trainee
        return super().create(validated_data)


class SectionCImportSerializer(serializers.ModelSerializer):
    """Serializer for Section C import records (immutable snapshots)"""
    
    class Meta:
        model = SectionCImport
        fields = [
            'id', 'section_c_id', 'agenda_item', 'entry_type', 'rendered_text',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def validate_entry_type(self, value):
        """Validate entry_type field"""
        if value not in ['question', 'comment', 'action']:
            raise serializers.ValidationError("Entry type must be 'question', 'comment', or 'action'")
        return value


class AgendaItemCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating agenda items"""
    
    class Meta:
        model = AgendaItem
        fields = [
            'title', 'detail', 'priority', 'source_type', 'source_entry_id',
            'source_field', 'source_excerpt'
        ]
    
    def create(self, validated_data):
        """Create agenda item with agenda from context"""
        agenda = self.context.get('agenda')
        if not agenda:
            raise serializers.ValidationError("Agenda context required")
        
        validated_data['agenda'] = agenda
        return super().create(validated_data)


class AgendaItemUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating agenda items (excludes source fields)"""
    
    class Meta:
        model = AgendaItem
        fields = [
            'title', 'detail', 'priority', 'status', 'my_reflection',
            'discussed_on', 'imported_to_section_c'
        ]
    
    def validate_discussed_on(self, value):
        """Validate discussed_on is not in the future"""
        if value and value > date.today():
            raise serializers.ValidationError("Discussion date cannot be in the future")
        return value
