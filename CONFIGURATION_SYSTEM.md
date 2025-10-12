# Configuration-Driven Consistency System

## Overview

The Configuration-Driven Consistency System provides a centralized way to manage icons, messages, styling, and workflows across the entire application. This allows support admins to maintain consistency without requiring code changes.

## Features

- ✅ **Icon Management** - Centralized icon configuration with fallbacks
- ✅ **Message Management** - Standardized user-facing messages
- ✅ **Styling Management** - Consistent colors and themes
- ✅ **Workflow Management** - Configurable workflows and processes
- ✅ **Support Admin Interface** - Web-based configuration management
- ✅ **API-Driven** - RESTful API for configuration management
- ✅ **Caching** - Intelligent caching for performance
- ✅ **Fallbacks** - Graceful degradation when configuration is unavailable

## Architecture

### Backend Components

1. **Models** (`system_config/models.py`)
   - `ConfigurationCategory` - Organizes configurations into categories
   - `SystemConfiguration` - Main configuration container
   - `ConfigurationItem` - Individual configuration items
   - `ConfigurationPreset` - Predefined configuration sets
   - `ConfigurationAuditLog` - Audit trail for changes

2. **API** (`system_config/views.py`)
   - RESTful endpoints for CRUD operations
   - Filtered endpoints for role/context-specific configurations
   - Admin-only endpoints for management

3. **Management Commands**
   - `setup_initial_config` - Sets up default configuration data

### Frontend Components

1. **Services** (`services/configurationService.ts`)
   - Singleton service for configuration management
   - Caching and fallback mechanisms
   - TypeScript interfaces for type safety

2. **Hooks** (`hooks/useConfiguration.ts`)
   - React hooks for easy component integration
   - Specialized hooks for common use cases
   - Loading states and error handling

3. **Components**
   - `ConfigurationIcon` - Icon component with configuration support
   - `ConfigurationMessage` - Message component with configuration support
   - `ConfigurableStatusBadge` - Status badge with configurable icons

4. **Admin Interface** (`pages/ConfigurationManagement.tsx`)
   - Web-based configuration management
   - Real-time preview and editing
   - Category-based organization

## Usage

### Basic Usage

#### Using the Configuration Service

```typescript
import configurationService from '@/services/configurationService'

// Load configuration
const config = await configurationService.loadConfiguration('main_system_config')

// Get specific values
const addIcon = configurationService.getIcon('main_system_config', 'add', 'Plus')
const saveMessage = configurationService.getMessage('main_system_config', 'success', 'save', 'Saved!')

// Get all icons
const icons = configurationService.getIcons('main_system_config')
```

#### Using React Hooks

```typescript
import { useConfiguration, useIcons, useMessages } from '@/hooks/useConfiguration'

// Full configuration hook
const { getIcon, getMessage, loading, error } = useConfiguration({
  configName: 'main_system_config',
  userRole: 'PROVISIONAL',
  context: 'dashboard'
})

// Specialized hooks
const { icons } = useIcons('main_system_config')
const { messages, getMessage } = useMessages('main_system_config')
```

#### Using Configuration Components

```tsx
import ConfigurationIcon from '@/components/ConfigurationIcon'
import ConfigurationMessage from '@/components/ConfigurationMessage'
import { ConfigurableStatusBadge } from '@/components/status/ConfigurableStatusBadge'

// Icon with configuration
<ConfigurationIcon 
  iconName="add" 
  size={20} 
  fallback="Plus" 
/>

// Message with configuration
<ConfigurationMessage 
  category="success" 
  type="save" 
  defaultValue="Saved!" 
/>

// Status badge with configurable icon
<ConfigurableStatusBadge 
  status="approved" 
  useConfig={true}
  showIcon={true}
/>
```

### Advanced Usage

#### Custom Configuration Names

```typescript
// Create organization-specific configurations
const orgConfig = await configurationService.loadConfiguration(
  'org_specific_config',
  'PROVISIONAL',
  'logbook'
)
```

#### Role-Based Configuration

```typescript
// Different configurations for different roles
const supervisorConfig = await configurationService.loadConfiguration(
  'main_system_config',
  'SUPERVISOR',
  'dashboard'
)

const provisionalConfig = await configurationService.loadConfiguration(
  'main_system_config',
  'PROVISIONAL',
  'dashboard'
)
```

#### Context-Aware Configuration

```typescript
// Different configurations for different contexts
const dashboardConfig = await configurationService.loadConfiguration(
  'main_system_config',
  'PROVISIONAL',
  'dashboard'
)

const formConfig = await configurationService.loadConfiguration(
  'main_system_config',
  'PROVISIONAL',
  'forms'
)
```

## Configuration Management

### Accessing the Admin Interface

1. Navigate to `/admin/configuration` (requires ORG_ADMIN role)
2. Select the configuration to manage
3. Edit values using the category tabs
4. Save changes to apply immediately

### Available Categories

1. **Icons** - UI icons for actions and status
2. **Messages** - User-facing messages and notifications
3. **Styling** - Colors, themes, and visual styling
4. **Workflows** - Process and workflow configurations

### Configuration Items

Each configuration item has:
- **Key** - Unique identifier (e.g., `icons.add`)
- **Display Name** - Human-readable name
- **Value Type** - STRING, INTEGER, BOOLEAN, JSON, COLOR, ICON
- **UI Component** - Input type for editing
- **User Roles** - Which roles this applies to
- **Contexts** - Which UI contexts this applies to
- **Validation Rules** - Custom validation logic

## API Endpoints

### Public Endpoints (Authenticated Users)

```
GET /api/config/configurations/{id}/get_filtered/
```
Get filtered configuration for specific user role and context.

### Admin Endpoints (Admin Users Only)

```
GET /api/config/configurations/
POST /api/config/configurations/{id}/update_items/
POST /api/config/configurations/{id}/publish/
GET /api/config/categories/
GET /api/config/items/
GET /api/config/presets/
GET /api/config/audit-logs/
```

## Migration Guide

### From Hardcoded Values to Configuration

#### Before (Hardcoded)
```tsx
import { Plus } from 'lucide-react'

<Button>
  <Plus className="h-4 w-4 mr-2" />
  Add Entry
</Button>
```

#### After (Configuration-Driven)
```tsx
import ConfigurationIcon from '@/components/ConfigurationIcon'

<Button>
  <ConfigurationIcon iconName="add" size={16} className="mr-2" />
  Add Entry
</Button>
```

#### Before (Hardcoded Messages)
```tsx
toast.success('Entry saved successfully!')
```

#### After (Configuration-Driven)
```tsx
import { useMessages } from '@/hooks/useConfiguration'

const { getMessage } = useMessages()
toast.success(getMessage('success', 'save'))
```

### Gradual Migration

1. **Phase 1**: Use configuration components alongside existing hardcoded values
2. **Phase 2**: Replace hardcoded values with configuration components
3. **Phase 3**: Remove hardcoded fallbacks and rely entirely on configuration

## Best Practices

### Component Design

1. **Always provide fallbacks** - Components should work even if configuration fails
2. **Use TypeScript** - Leverage type safety for configuration keys
3. **Cache intelligently** - Use the built-in caching mechanisms
4. **Handle loading states** - Show appropriate loading indicators

### Configuration Management

1. **Use descriptive keys** - Make configuration keys self-documenting
2. **Organize by category** - Group related configurations together
3. **Test changes** - Always test configuration changes in development first
4. **Document changes** - Use the audit log to track changes

### Performance

1. **Cache configurations** - The service automatically caches for 5 minutes
2. **Load selectively** - Only load configurations you need
3. **Use specialized hooks** - Use `useIcons()`, `useMessages()` instead of full `useConfiguration()`
4. **Clear cache when needed** - Use `clearCache()` after updates

## Troubleshooting

### Common Issues

1. **Configuration not loading**
   - Check API endpoint accessibility
   - Verify authentication tokens
   - Check network connectivity

2. **Icons not displaying**
   - Verify icon names exist in Lucide React
   - Check fallback icons are properly configured
   - Ensure icon names match configuration keys

3. **Messages not appearing**
   - Check message category and type keys
   - Verify default values are provided
   - Ensure message components are properly imported

### Debug Mode

Enable debug logging by setting:
```typescript
localStorage.setItem('debug_configuration', 'true')
```

## Future Enhancements

### Phase 2: Multi-Tenancy
- Organization-specific configurations
- White-label branding support
- Custom domains and subdomains

### Phase 3: Advanced Features
- Configuration versioning
- A/B testing support
- Real-time configuration updates
- Configuration templates and presets

## Support

For questions or issues with the configuration system:
1. Check this documentation
2. Review the configuration admin interface
3. Check the audit logs for recent changes
4. Contact the development team
