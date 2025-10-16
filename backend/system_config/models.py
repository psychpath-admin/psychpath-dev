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
    
    # ============================================================================
    # AHPRA 5+1 Supervision Requirements Configuration
    # ============================================================================
    
    # Total Supervision Hours
    min_supervision_hours_total = models.PositiveIntegerField(
        default=80,
        validators=[MinValueValidator(1), MaxValueValidator(200)],
        help_text="Minimum total supervision hours required for 5+1 program"
    )
    min_practice_hours_per_supervision = models.PositiveIntegerField(
        default=17,
        validators=[MinValueValidator(1), MaxValueValidator(50)],
        help_text="Minimum practice hours for each supervision hour (1:17 ratio)"
    )
    
    # Supervision Type Breakdown
    min_individual_supervision_hours = models.PositiveIntegerField(
        default=50,
        validators=[MinValueValidator(1), MaxValueValidator(200)],
        help_text="Minimum individual supervision hours (typically 2/3 of total)"
    )
    min_individual_supervision_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=66.67,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Minimum percentage of individual supervision"
    )
    max_group_supervision_hours = models.PositiveIntegerField(
        default=30,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Maximum group supervision hours"
    )
    
    # Direct vs Indirect Supervision
    min_direct_supervision_hours = models.PositiveIntegerField(
        default=70,
        validators=[MinValueValidator(1), MaxValueValidator(200)],
        help_text="Minimum direct supervision hours (in-person, video, phone)"
    )
    max_phone_supervision_hours = models.PositiveIntegerField(
        default=20,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Maximum phone supervision hours"
    )
    max_indirect_supervision_hours = models.PositiveIntegerField(
        default=10,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Maximum indirect/asynchronous supervision hours"
    )
    
    # Observational Requirements
    required_assessment_observations = models.PositiveIntegerField(
        default=4,
        validators=[MinValueValidator(0), MaxValueValidator(20)],
        help_text="Required number of assessment observations"
    )
    required_intervention_observations = models.PositiveIntegerField(
        default=4,
        validators=[MinValueValidator(0), MaxValueValidator(20)],
        help_text="Required number of intervention observations"
    )
    total_required_observations = models.PositiveIntegerField(
        default=8,
        validators=[MinValueValidator(0), MaxValueValidator(40)],
        help_text="Total required observations (assessments + interventions)"
    )
    
    # Supervisor Requirements
    require_board_approved_supervisor = models.BooleanField(
        default=True,
        help_text="Require supervisor to be Board-approved"
    )
    allow_secondary_supervisor = models.BooleanField(
        default=True,
        help_text="Allow secondary supervisors"
    )
    
    # Cultural Supervision
    allow_cultural_supervision = models.BooleanField(
        default=True,
        help_text="Allow culturally-informed supervision for Indigenous trainees"
    )
    cultural_supervision_counts_toward_minimum = models.BooleanField(
        default=True,
        help_text="Count cultural supervision towards minimum hours requirement"
    )
    
    # Timing & Distribution
    require_regular_supervision_distribution = models.BooleanField(
        default=True,
        help_text="Require regular distribution of supervision throughout internship"
    )
    min_weeks_with_supervision = models.PositiveIntegerField(
        default=48,
        validators=[MinValueValidator(1), MaxValueValidator(104)],
        help_text="Minimum number of weeks that must have supervision logged"
    )
    supervision_frequency_warning_weeks = models.PositiveIntegerField(
        default=2,
        validators=[MinValueValidator(1), MaxValueValidator(12)],
        help_text="Alert if no supervision logged for this many weeks"
    )
    
    # ============================================================================
    # End AHPRA Configuration
    # ============================================================================
    
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
                'submission_deadline_days': 14,
                # AHPRA Supervision defaults
                'min_supervision_hours_total': 80,
                'min_practice_hours_per_supervision': 17,
                'min_individual_supervision_hours': 50,
                'min_individual_supervision_percentage': 66.67,
                'max_group_supervision_hours': 30,
                'min_direct_supervision_hours': 70,
                'max_phone_supervision_hours': 20,
                'max_indirect_supervision_hours': 10,
                'required_assessment_observations': 4,
                'required_intervention_observations': 4,
                'total_required_observations': 8,
                'require_board_approved_supervisor': True,
                'allow_secondary_supervisor': True,
                'allow_cultural_supervision': True,
                'cultural_supervision_counts_toward_minimum': True,
                'require_regular_supervision_distribution': True,
                'min_weeks_with_supervision': 48,
                'supervision_frequency_warning_weeks': 2,
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