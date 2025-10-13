from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator


class ConfigurationCategory(models.Model):
    """Categories for organizing configurations"""
    name = models.CharField(max_length=50, unique=True)
    display_name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, default='settings')
    order = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'config_categories'
        verbose_name = 'Configuration Category'
        verbose_name_plural = 'Configuration Categories'
        ordering = ['order', 'display_name']

    def __str__(self):
        return self.display_name


class SystemConfiguration(models.Model):
    """Main configuration container"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    target_logbooks_count = models.PositiveIntegerField(
        default=52,
        validators=[MinValueValidator(1), MaxValueValidator(104)],
        help_text="Target number of logbooks for trainees to complete"
    )
    submission_deadline_days = models.PositiveIntegerField(
        default=14,
        validators=[MinValueValidator(1), MaxValueValidator(30)],
        help_text="Number of days after week start date when logbook submission becomes overdue"
    )
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'system_configurations'
        verbose_name = 'System Configuration'
        verbose_name_plural = 'System Configurations'
        ordering = ['name']

    def __str__(self):
        return self.name
    
    @classmethod
    def get_config(cls):
        """Get or create the main system configuration"""
        config, created = cls.objects.get_or_create(
            name='main',
            defaults={
                'description': 'Main system configuration',
                'target_logbooks_count': 52,
                'submission_deadline_days': 14
            }
        )
        return config


class ConfigurationItem(models.Model):
    """Individual configuration items"""
    VALUE_TYPE_CHOICES = [
        ('STRING', 'Text'),
        ('INTEGER', 'Number'),
        ('BOOLEAN', 'Yes/No'),
        ('JSON', 'Complex Data'),
        ('CHOICE', 'Dropdown Selection'),
        ('MULTI_CHOICE', 'Multiple Selections'),
        ('COLOR', 'Color'),
        ('ICON', 'Icon'),
    ]
    
    UI_COMPONENT_CHOICES = [
        ('input', 'Text Input'),
        ('textarea', 'Text Area'),
        ('select', 'Dropdown'),
        ('multiselect', 'Multi-Select'),
        ('checkbox', 'Checkbox'),
        ('radio', 'Radio Buttons'),
        ('colorpicker', 'Color Picker'),
        ('iconpicker', 'Icon Picker'),
        ('jsoneditor', 'JSON Editor'),
    ]

    configuration = models.ForeignKey(SystemConfiguration, on_delete=models.CASCADE, related_name='items')
    category = models.ForeignKey(ConfigurationCategory, on_delete=models.CASCADE)
    
    # Item identification
    key = models.CharField(max_length=100, help_text="Unique identifier for this config")
    display_name = models.CharField(max_length=200, help_text="Human-readable name")
    description = models.TextField(blank=True)
    
    # Value and type
    value_type = models.CharField(max_length=20, choices=VALUE_TYPE_CHOICES)
    value = models.TextField(help_text="Configuration value (JSON for complex types)")
    default_value = models.TextField(blank=True)
    
    # Role/Context restrictions
    user_roles = models.JSONField(default=list, blank=True, help_text="User roles this applies to")
    contexts = models.JSONField(default=list, blank=True, help_text="UI contexts (dashboard, forms, etc.)")
    
    # Validation and constraints
    validation_rules = models.JSONField(default=dict, blank=True)
    is_required = models.BooleanField(default=False)
    is_readonly = models.BooleanField(default=False)
    
    # UI presentation
    ui_component = models.CharField(max_length=50, choices=UI_COMPONENT_CHOICES, default='input')
    placeholder = models.CharField(max_length=200, blank=True)
    help_text = models.TextField(blank=True)
    order = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'configuration_items'
        unique_together = ['configuration', 'key']
        verbose_name = 'Configuration Item'
        verbose_name_plural = 'Configuration Items'
        ordering = ['category__order', 'order', 'display_name']

    def __str__(self):
        return f"{self.configuration.name} - {self.display_name}"

    def get_parsed_value(self):
        """Parse the value based on its type"""
        if self.value_type == 'JSON':
            try:
                import json
                return json.loads(self.value)
            except json.JSONDecodeError:
                return {}
        elif self.value_type == 'INTEGER':
            try:
                return int(self.value)
            except (ValueError, TypeError):
                return 0
        elif self.value_type == 'BOOLEAN':
            return self.value.lower() in ('true', '1', 'yes', 'on')
        elif self.value_type == 'MULTI_CHOICE':
            try:
                import json
                return json.loads(self.value)
            except json.JSONDecodeError:
                return []
        else:
            return self.value


class ConfigurationPreset(models.Model):
    """Predefined configuration sets for quick setup"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    category = models.ForeignKey(ConfigurationCategory, on_delete=models.CASCADE)
    preset_data = models.JSONField(help_text="Complete configuration data")
    is_default = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'configuration_presets'
        verbose_name = 'Configuration Preset'
        verbose_name_plural = 'Configuration Presets'
        ordering = ['category__order', 'name']

    def __str__(self):
        return f"{self.category.display_name} - {self.name}"


class ConfigurationAuditLog(models.Model):
    """Audit log for configuration changes"""
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('deleted', 'Deleted'),
        ('published', 'Published'),
        ('reverted', 'Reverted'),
    ]

    configuration = models.ForeignKey(SystemConfiguration, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    changes = models.JSONField(default=dict, help_text="Details of what was changed")
    timestamp = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'configuration_audit_logs'
        verbose_name = 'Configuration Audit Log'
        verbose_name_plural = 'Configuration Audit Logs'
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.configuration.name} - {self.action} by {self.user.email if self.user else 'System'}"