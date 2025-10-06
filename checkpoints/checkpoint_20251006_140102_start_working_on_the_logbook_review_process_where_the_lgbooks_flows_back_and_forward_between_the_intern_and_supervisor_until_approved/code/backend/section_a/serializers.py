from rest_framework import serializers
from .models import SectionAEntry, CustomSessionActivityType


class CustomSessionActivityTypeSerializer(serializers.ModelSerializer):
    """Serializer for custom session activity types"""
    
    class Meta:
        model = CustomSessionActivityType
        fields = ['id', 'name', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        validated_data['trainee'] = self.context['request'].user
        return super().create(validated_data)

class SectionAEntrySerializer(serializers.ModelSerializer):
    """Serializer for Section A entries"""
    total_sessions = serializers.SerializerMethodField()
    total_duration_minutes = serializers.SerializerMethodField()
    total_duration_display = serializers.SerializerMethodField()
    cra_entries = serializers.SerializerMethodField()
    simulated_hours_info = serializers.SerializerMethodField()
    
    class Meta:
        model = SectionAEntry
        fields = [
            'id', 'trainee', 'entry_type', 'parent_dcc_entry', 'simulated', 'client_id', 'session_date', 'week_starting',
            'place_of_practice', 'client_age', 'presenting_issues', 'session_activity_types',
            'session_activity_type', 'duration_minutes', 'reflections_on_experience',
            # Legacy fields
            'client_pseudonym', 'activity_description', 'duration_hours', 'reflection',
            'created_at', 'updated_at',
            # Calculated fields
            'total_sessions', 'total_duration_minutes', 'total_duration_display',
            # Related entries
            'cra_entries',
            # Simulated hours tracking
            'simulated_hours_info'
        ]
        read_only_fields = ['id', 'trainee', 'created_at', 'updated_at']
    
    def get_total_sessions(self, obj):
        """Calculate total sessions for this client"""
        client_id = obj.client_id or obj.client_pseudonym
        if not client_id:
            return 0
        
        # Count all entries for this client (DCC and CRA)
        return SectionAEntry.objects.filter(
            trainee=obj.trainee,
            client_id=client_id
        ).count() + SectionAEntry.objects.filter(
            trainee=obj.trainee,
            client_pseudonym=client_id
        ).count()
    
    def get_total_duration_minutes(self, obj):
        """Calculate total duration in minutes for this client"""
        client_id = obj.client_id or obj.client_pseudonym
        if not client_id:
            return 0
        
        # Get all entries for this client
        entries = SectionAEntry.objects.filter(
            trainee=obj.trainee,
            client_id=client_id
        ) | SectionAEntry.objects.filter(
            trainee=obj.trainee,
            client_pseudonym=client_id
        )
        
        total_minutes = 0
        for entry in entries:
            if entry.duration_minutes:
                total_minutes += entry.duration_minutes
            elif entry.duration_hours:
                total_minutes += int(entry.duration_hours * 60)
        
        return total_minutes
    
    def get_total_duration_display(self, obj):
        """Format total duration as hours and minutes"""
        total_minutes = self.get_total_duration_minutes(obj)
        if total_minutes == 0:
            return "0m"
        
        hours = total_minutes // 60
        minutes = total_minutes % 60
        
        if hours > 0:
            return f"{hours}h {minutes}m" if minutes > 0 else f"{hours}h"
        else:
            return f"{minutes}m"
    
    def get_cra_entries(self, obj):
        """Get CRA entries for DCC entries"""
        if obj.entry_type in ['client_contact', 'simulated_contact']:
            cra_entries = obj.cra_entries.all().order_by('-session_date', '-created_at')
            return SectionAEntrySerializer(cra_entries, many=True, context=self.context).data
        return []
    
    def get_simulated_hours_info(self, obj):
        """Get simulated hours information for the trainee"""
        if obj.entry_type in ['client_contact', 'simulated_contact']:
            return SectionAEntry.get_simulated_hours_total(obj.trainee)
        return None
    
    def create(self, validated_data):
        # Automatically set the trainee to the current user
        validated_data['trainee'] = self.context['request'].user
        return super().create(validated_data)
