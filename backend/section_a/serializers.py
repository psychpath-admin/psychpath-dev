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
    reflections_on_experience = serializers.SerializerMethodField()
    
    class Meta:
        model = SectionAEntry
        fields = [
            'id', 'trainee', 'entry_type', 'parent_dcc_entry', 'simulated', 'client_id', 'session_date', 'week_starting',
            'place_of_practice', 'client_age', 'presenting_issues', 'session_activity_types',
            'session_activity_type', 'duration_minutes', 'reflections_on_experience',
            # Legacy fields
            'client_pseudonym', 'activity_description', 'duration_hours', 'reflection',
            # CRA-specific fields
            'activity_type', 'custom_activity_type',
            # Logbook integration
            'locked', 'supervisor_comment', 'trainee_response',
            'created_at', 'updated_at',
            # Calculated fields
            'total_sessions', 'total_duration_minutes', 'total_duration_display',
            # Related entries
            'cra_entries',
            # Simulated hours tracking
            'simulated_hours_info'
        ]
        read_only_fields = ['id', 'trainee', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate the entry data"""
        entry_type = data.get('entry_type')
        session_activity_types = data.get('session_activity_types', [])
        client_id = data.get('client_id')
        session_date = data.get('session_date')
        simulated = data.get('simulated', False)
        trainee = self.context.get('request').user if self.context.get('request') else None
        
        # For DCC entries (client_contact), require at least one activity type
        if entry_type in ['client_contact', 'simulated_contact'] and not session_activity_types:
            raise serializers.ValidationError({
                'session_activity_types': 'At least one session activity type is required for client contact entries.'
            })
        
        # Prevent multiple DCC records for the same client on the same day unless simulated
        if (entry_type in ['client_contact', 'simulated_contact'] and 
            client_id and session_date and trainee and not simulated):
            
            # Check for existing entries for the same client on the same date
            existing_entries = SectionAEntry.objects.filter(
                trainee=trainee,
                client_id=client_id,
                session_date=session_date,
                entry_type__in=['client_contact', 'simulated_contact'],
                simulated=False
            )
            
            # Exclude current instance if updating
            if self.instance:
                existing_entries = existing_entries.exclude(id=self.instance.id)
            
            if existing_entries.exists():
                raise serializers.ValidationError({
                    'session_date': f'A non-simulated DCC entry already exists for client {client_id} on {session_date}. Multiple sessions on the same day are only allowed for simulated contacts.'
                })
        
        # CRA/ICRA cross-week validation and warning
        if entry_type == 'cra' and data.get('parent_dcc_entry') and session_date:
            try:
                # parent_dcc_entry could be an ID (int) or a model instance
                parent_dcc_entry = data['parent_dcc_entry']
                if isinstance(parent_dcc_entry, int):
                    parent_entry = SectionAEntry.objects.get(id=parent_dcc_entry)
                else:
                    parent_entry = parent_dcc_entry
                    
                if parent_entry.session_date:
                    from .models import SectionAEntry as Model
                    parent_week = Model.calculate_week_starting(parent_entry.session_date)
                    cra_week = Model.calculate_week_starting(session_date)
                    
                    if parent_week != cra_week:
                        # This will be automatically converted to ICRA in the model save()
                        # Add a warning to the response
                        pass  # The model will handle the conversion
            except (SectionAEntry.DoesNotExist, AttributeError):
                pass
        
        return data
    
    def create(self, validated_data):
        """Create entry with cross-week CRA to ICRA conversion feedback"""
        entry_type = validated_data.get('entry_type')
        parent_dcc_entry = validated_data.get('parent_dcc_entry')
        session_date = validated_data.get('session_date')
        
        # Check if this will be converted from CRA to ICRA
        converted_to_icra = False
        if (entry_type == 'cra' and parent_dcc_entry and session_date):
            try:
                # parent_dcc_entry could be an ID (int) or a model instance
                if isinstance(parent_dcc_entry, int):
                    parent_entry = SectionAEntry.objects.get(id=parent_dcc_entry)
                else:
                    parent_entry = parent_dcc_entry
                    
                if parent_entry.session_date:
                    parent_week = SectionAEntry.calculate_week_starting(parent_entry.session_date)
                    cra_week = SectionAEntry.calculate_week_starting(session_date)
                    converted_to_icra = parent_week != cra_week
            except (SectionAEntry.DoesNotExist, AttributeError):
                pass
        
        # Create the entry (model will handle conversion)
        entry = super().create(validated_data)
        
        # Add conversion info to the response if applicable
        if converted_to_icra:
            # Store conversion info in a custom field for frontend feedback
            entry._conversion_info = {
                'converted': True,
                'original_type': 'cra',
                'new_type': 'independent_activity',
                'reason': 'Activity date is in a different week than the parent DCC session'
            }
        
        return entry
    
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
    
    def get_reflections_on_experience(self, obj):
        """Get reflections with appended CRA reflections if this is a DCC entry"""
        base_reflection = obj.reflections_on_experience or ""
        
        # Only append CRA reflections for DCC entries (client_contact or simulated_contact)
        if obj.entry_type in ['client_contact', 'simulated_contact']:
            # Get all CRA entries related to this DCC entry
            cra_entries = SectionAEntry.objects.filter(
                parent_dcc_entry=obj.id,
                entry_type='cra',
                reflection__isnull=False
            ).exclude(reflection__exact='')
            
            if cra_entries.exists():
                cra_reflections = []
                for cra_entry in cra_entries:
                    if cra_entry.reflection.strip():
                        cra_reflections.append(cra_entry.reflection.strip())
                
                if cra_reflections:
                    # Build the combined reflection
                    combined_reflection = base_reflection
                    if combined_reflection:
                        combined_reflection += "\n\n"
                    
                    combined_reflection += "Client Related Reflection:\n"
                    combined_reflection += "\n".join(cra_reflections)
                    
                    return combined_reflection
        
        return base_reflection
    
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
