from rest_framework import serializers
from .models import (
    ConfigurationCategory,
    SystemConfiguration,
    ConfigurationItem,
    ConfigurationPreset,
    ConfigurationAuditLog
)


class ConfigurationCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfigurationCategory
        fields = ['id', 'name', 'display_name', 'description', 'icon', 'order']


class ConfigurationItemSerializer(serializers.ModelSerializer):
    parsed_value = serializers.SerializerMethodField()
    
    class Meta:
        model = ConfigurationItem
        fields = [
            'id', 'key', 'display_name', 'description', 'value_type', 'value',
            'default_value', 'user_roles', 'contexts', 'validation_rules',
            'is_required', 'is_readonly', 'ui_component', 'placeholder',
            'help_text', 'order', 'parsed_value'
        ]
    
    def get_parsed_value(self, obj):
        return obj.get_parsed_value()


class SystemConfigurationSerializer(serializers.ModelSerializer):
    items = ConfigurationItemSerializer(many=True, read_only=True)
    category_names = serializers.SerializerMethodField()
    
    class Meta:
        model = SystemConfiguration
        fields = [
            'id', 'name', 'description', 'is_active', 'created_at', 'updated_at',
            'items', 'category_names'
        ]
    
    def get_category_names(self, obj):
        return list(obj.items.values_list('category__display_name', flat=True).distinct())


class ConfigurationPresetSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfigurationPreset
        fields = [
            'id', 'name', 'description', 'category', 'preset_data',
            'is_default', 'created_by', 'created_at'
        ]


class ConfigurationAuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()
    
    class Meta:
        model = ConfigurationAuditLog
        fields = [
            'id', 'configuration', 'user_email', 'action', 'changes', 'timestamp'
        ]
    
    def get_user_email(self, obj):
        return obj.user.email if obj.user else 'System'


class ConfigurationUpdateSerializer(serializers.Serializer):
    """Serializer for updating configuration items"""
    items = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of configuration items to update"
    )
    
    def validate_items(self, value):
        """Validate that all items have required fields"""
        for item in value:
            if 'key' not in item:
                raise serializers.ValidationError("Each item must have a 'key' field")
            if 'value' not in item:
                raise serializers.ValidationError("Each item must have a 'value' field")
        return value


class ConfigurationFilterSerializer(serializers.Serializer):
    """Serializer for filtering configurations by role and context"""
    user_role = serializers.CharField(required=False, allow_blank=True)
    context = serializers.CharField(required=False, allow_blank=True)
    category = serializers.CharField(required=False, allow_blank=True)
