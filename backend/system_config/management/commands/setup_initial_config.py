from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from system_config.models import (
    ConfigurationCategory,
    SystemConfiguration,
    ConfigurationItem
)


class Command(BaseCommand):
    help = 'Set up initial configuration categories and items'

    def handle(self, *args, **options):
        self.stdout.write('Setting up initial configuration data...')
        
        # Create categories
        categories = self.create_categories()
        
        # Create main system configuration
        config = self.create_system_configuration()
        
        # Create configuration items
        self.create_configuration_items(config, categories)
        
        self.stdout.write(
            self.style.SUCCESS('Successfully set up initial configuration data!')
        )

    def create_categories(self):
        """Create configuration categories"""
        categories_data = [
            {
                'name': 'icons',
                'display_name': 'Icons',
                'description': 'Icon configuration for UI elements',
                'icon': 'icons',
                'order': 1
            },
            {
                'name': 'messages',
                'display_name': 'Messages',
                'description': 'User-facing messages and notifications',
                'icon': 'message-square',
                'order': 2
            },
            {
                'name': 'styling',
                'display_name': 'Styling',
                'description': 'Colors, themes, and visual styling',
                'icon': 'palette',
                'order': 3
            },
            {
                'name': 'workflows',
                'display_name': 'Workflows',
                'description': 'User workflow and process configuration',
                'icon': 'workflow',
                'order': 4
            }
        ]
        
        categories = {}
        for cat_data in categories_data:
            category, created = ConfigurationCategory.objects.get_or_create(
                name=cat_data['name'],
                defaults=cat_data
            )
            categories[cat_data['name']] = category
            if created:
                self.stdout.write(f'Created category: {category.display_name}')
            else:
                self.stdout.write(f'Category already exists: {category.display_name}')
        
        return categories

    def create_system_configuration(self):
        """Create main system configuration"""
        config, created = SystemConfiguration.objects.get_or_create(
            name='main_system_config',
            defaults={
                'description': 'Main system configuration for consistency across the application',
                'is_active': True
            }
        )
        
        if created:
            self.stdout.write('Created main system configuration')
        else:
            self.stdout.write('Main system configuration already exists')
        
        return config

    def create_configuration_items(self, config, categories):
        """Create configuration items"""
        items_data = [
            # Icon configurations
            {
                'key': 'icons.add',
                'display_name': 'Add Entry Icon',
                'description': 'Icon used for adding new entries',
                'category': categories['icons'],
                'value_type': 'ICON',
                'value': 'Plus',
                'ui_component': 'iconpicker',
                'order': 1
            },
            {
                'key': 'icons.edit',
                'display_name': 'Edit Entry Icon',
                'description': 'Icon used for editing entries',
                'category': categories['icons'],
                'value_type': 'ICON',
                'value': 'Edit3',
                'ui_component': 'iconpicker',
                'order': 2
            },
            {
                'key': 'icons.delete',
                'display_name': 'Delete Entry Icon',
                'description': 'Icon used for deleting entries',
                'category': categories['icons'],
                'value_type': 'ICON',
                'value': 'Trash2',
                'ui_component': 'iconpicker',
                'order': 3
            },
            {
                'key': 'icons.view',
                'display_name': 'View Entry Icon',
                'description': 'Icon used for viewing entries',
                'category': categories['icons'],
                'value_type': 'ICON',
                'value': 'Eye',
                'ui_component': 'iconpicker',
                'order': 4
            },
            {
                'key': 'icons.submit',
                'display_name': 'Submit Icon',
                'description': 'Icon used for submitting forms',
                'category': categories['icons'],
                'value_type': 'ICON',
                'value': 'Send',
                'ui_component': 'iconpicker',
                'order': 5
            },
            {
                'key': 'icons.approve',
                'display_name': 'Approve Icon',
                'description': 'Icon used for approval actions',
                'category': categories['icons'],
                'value_type': 'ICON',
                'value': 'CheckCircle',
                'ui_component': 'iconpicker',
                'order': 6
            },
            {
                'key': 'icons.reject',
                'display_name': 'Reject Icon',
                'description': 'Icon used for rejection actions',
                'category': categories['icons'],
                'value_type': 'ICON',
                'value': 'XCircle',
                'ui_component': 'iconpicker',
                'order': 7
            },
            {
                'key': 'icons.pending',
                'display_name': 'Pending Icon',
                'description': 'Icon used for pending status',
                'category': categories['icons'],
                'value_type': 'ICON',
                'value': 'Clock',
                'ui_component': 'iconpicker',
                'order': 8
            },
            {
                'key': 'icons.user',
                'display_name': 'User Icon',
                'description': 'Icon used for user-related actions',
                'category': categories['icons'],
                'value_type': 'ICON',
                'value': 'User',
                'ui_component': 'iconpicker',
                'order': 9
            },
            {
                'key': 'icons.logbook',
                'display_name': 'Logbook Icon',
                'description': 'Icon used for logbook-related actions',
                'category': categories['icons'],
                'value_type': 'ICON',
                'value': 'BookOpen',
                'ui_component': 'iconpicker',
                'order': 10
            },
            {
                'key': 'icons.supervision',
                'display_name': 'Supervision Icon',
                'description': 'Icon used for supervision-related actions',
                'category': categories['icons'],
                'value_type': 'ICON',
                'value': 'Users',
                'ui_component': 'iconpicker',
                'order': 11
            },
            {
                'key': 'icons.notification',
                'display_name': 'Notification Icon',
                'description': 'Icon used for notifications',
                'category': categories['icons'],
                'value_type': 'ICON',
                'value': 'Bell',
                'ui_component': 'iconpicker',
                'order': 12
            },
            
            # Message configurations
            {
                'key': 'messages.success.save',
                'display_name': 'Success Save Message',
                'description': 'Message shown when an entry is successfully saved',
                'category': categories['messages'],
                'value_type': 'STRING',
                'value': 'Entry saved successfully!',
                'ui_component': 'input',
                'order': 1
            },
            {
                'key': 'messages.success.submit',
                'display_name': 'Success Submit Message',
                'description': 'Message shown when a logbook is successfully submitted',
                'category': categories['messages'],
                'value_type': 'STRING',
                'value': 'Logbook submitted successfully!',
                'ui_component': 'input',
                'order': 2
            },
            {
                'key': 'messages.success.approve',
                'display_name': 'Success Approve Message',
                'description': 'Message shown when a logbook is approved',
                'category': categories['messages'],
                'value_type': 'STRING',
                'value': 'Logbook approved successfully!',
                'ui_component': 'input',
                'order': 3
            },
            {
                'key': 'messages.error.save',
                'display_name': 'Error Save Message',
                'description': 'Message shown when saving fails',
                'category': categories['messages'],
                'value_type': 'STRING',
                'value': 'Failed to save entry. Please try again.',
                'ui_component': 'input',
                'order': 4
            },
            {
                'key': 'messages.error.submit',
                'display_name': 'Error Submit Message',
                'description': 'Message shown when submission fails',
                'category': categories['messages'],
                'value_type': 'STRING',
                'value': 'Failed to submit logbook. Please try again.',
                'ui_component': 'input',
                'order': 5
            },
            {
                'key': 'messages.error.network',
                'display_name': 'Network Error Message',
                'description': 'Message shown for network errors',
                'category': categories['messages'],
                'value_type': 'STRING',
                'value': 'Network error. Please check your connection.',
                'ui_component': 'input',
                'order': 6
            },
            
            # Styling configurations
            {
                'key': 'styling.primary_color',
                'display_name': 'Primary Color',
                'description': 'Primary brand color used throughout the application',
                'category': categories['styling'],
                'value_type': 'COLOR',
                'value': '#3B82F6',
                'ui_component': 'colorpicker',
                'order': 1
            },
            {
                'key': 'styling.secondary_color',
                'display_name': 'Secondary Color',
                'description': 'Secondary brand color',
                'category': categories['styling'],
                'value_type': 'COLOR',
                'value': '#6B7280',
                'ui_component': 'colorpicker',
                'order': 2
            },
            {
                'key': 'styling.accent_color',
                'display_name': 'Accent Color',
                'description': 'Accent color for highlights and special elements',
                'category': categories['styling'],
                'value_type': 'COLOR',
                'value': '#10B981',
                'ui_component': 'colorpicker',
                'order': 3
            },
            {
                'key': 'styling.section_a_color',
                'display_name': 'Section A Color',
                'description': 'Color for Section A (Direct Client Contact)',
                'category': categories['styling'],
                'value_type': 'COLOR',
                'value': '#3B82F6',
                'ui_component': 'colorpicker',
                'order': 4
            },
            {
                'key': 'styling.section_b_color',
                'display_name': 'Section B Color',
                'description': 'Color for Section B (Professional Development)',
                'category': categories['styling'],
                'value_type': 'COLOR',
                'value': '#10B981',
                'ui_component': 'colorpicker',
                'order': 5
            },
            {
                'key': 'styling.section_c_color',
                'display_name': 'Section C Color',
                'description': 'Color for Section C (Supervision)',
                'category': categories['styling'],
                'value_type': 'COLOR',
                'value': '#8B5CF6',
                'ui_component': 'colorpicker',
                'order': 6
            },
            
            # Workflow configurations
            {
                'key': 'workflows.auto_save_interval',
                'display_name': 'Auto-save Interval',
                'description': 'Interval in seconds for auto-saving forms',
                'category': categories['workflows'],
                'value_type': 'INTEGER',
                'value': '30',
                'ui_component': 'input',
                'order': 1
            },
            {
                'key': 'workflows.session_timeout',
                'display_name': 'Session Timeout',
                'description': 'Session timeout in minutes',
                'category': categories['workflows'],
                'value_type': 'INTEGER',
                'value': '60',
                'ui_component': 'input',
                'order': 2
            },
            {
                'key': 'workflows.enable_notifications',
                'display_name': 'Enable Notifications',
                'description': 'Enable push notifications for users',
                'category': categories['workflows'],
                'value_type': 'BOOLEAN',
                'value': 'true',
                'ui_component': 'checkbox',
                'order': 3
            }
        ]
        
        for item_data in items_data:
            item, created = ConfigurationItem.objects.get_or_create(
                configuration=config,
                key=item_data['key'],
                defaults=item_data
            )
            if created:
                self.stdout.write(f'Created configuration item: {item.display_name}')
            else:
                self.stdout.write(f'Configuration item already exists: {item.display_name}')
