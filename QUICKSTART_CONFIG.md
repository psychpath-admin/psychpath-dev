# Configuration System - Quick Start Guide

## 🚀 Accessing the System

### 1. Admin Configuration Interface
**URL**: `http://localhost:5174/admin/configuration`
**Requirements**: Must be logged in as ORG_ADMIN

**What you can do**:
- Edit icons used throughout the app
- Change user-facing messages
- Modify colors and styling
- Configure workflows and processes
- All changes apply immediately!

### 2. Demo Page
**URL**: `http://localhost:5174/config-demo`
**Requirements**: Any authenticated user

**What you'll see**:
- Live demonstration of all configured icons
- All configured messages
- Color palette
- Interactive examples with toast notifications
- Raw configuration data

### 3. Django Admin Interface
**URL**: `http://localhost:8001/admin/`
**Requirements**: Django superuser account

**What you can do**:
- Advanced configuration management
- Create new configuration categories
- Set up presets
- View audit logs
- Manage configuration items in detail

## 📋 Pre-configured Items (27 total)

### Icons (12 items)
- `icons.add` → Plus
- `icons.edit` → Edit3
- `icons.delete` → Trash2
- `icons.view` → Eye
- `icons.submit` → Send
- `icons.approve` → CheckCircle
- `icons.reject` → XCircle
- `icons.pending` → Clock
- `icons.user` → User
- `icons.logbook` → BookOpen
- `icons.supervision` → Users
- `icons.notification` → Bell

### Messages (6 items)
- `messages.success.save` → "Entry saved successfully!"
- `messages.success.submit` → "Logbook submitted successfully!"
- `messages.success.approve` → "Logbook approved successfully!"
- `messages.error.save` → "Failed to save entry. Please try again."
- `messages.error.submit` → "Failed to submit logbook. Please try again."
- `messages.error.network` → "Network error. Please check your connection."

### Styling (6 items)
- `styling.primary_color` → #3B82F6 (Blue)
- `styling.secondary_color` → #6B7280 (Gray)
- `styling.accent_color` → #10B981 (Green)
- `styling.section_a_color` → #3B82F6 (Blue)
- `styling.section_b_color` → #10B981 (Green)
- `styling.section_c_color` → #8B5CF6 (Purple)

### Workflows (3 items)
- `workflows.auto_save_interval` → 30 seconds
- `workflows.session_timeout` → 60 minutes
- `workflows.enable_notifications` → true

## 🧪 Testing the System

### Step 1: View the Demo
```
1. Log in to the application
2. Navigate to http://localhost:5174/config-demo
3. See all configured values displayed
4. Click "Test Success Message" and "Test Error Message" buttons
5. See how configured messages appear in toast notifications
```

### Step 2: Change a Configuration
```
1. Log in as ORG_ADMIN
2. Navigate to http://localhost:5174/admin/configuration
3. Select "main_system_config" from the dropdown
4. Go to "Icons" tab
5. Change "Add Entry Icon" from "Plus" to "PlusCircle"
6. Click "Save Changes"
7. Return to /config-demo and see the icon has changed!
```

### Step 3: Test API Directly
```bash
# Get a user token first
curl -X POST http://localhost:8001/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}'

# Use the token to get configuration
curl -X GET "http://localhost:8001/api/config/configurations/1/get_filtered/" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 💡 Quick Examples

### Using in React Components

```tsx
// Example 1: Using Configuration Icons
import ConfigurationIcon from '@/components/ConfigurationIcon'

function MyComponent() {
  return (
    <button>
      <ConfigurationIcon iconName="add" size={20} />
      Add Entry
    </button>
  )
}

// Example 2: Using Configuration Messages
import ConfigurationMessage from '@/components/ConfigurationMessage'
import { useMessages } from '@/hooks/useConfiguration'
import { toast } from 'sonner'

function MyForm() {
  const { getMessage } = useMessages()
  
  const handleSave = async () => {
    try {
      // Save logic...
      toast.success(getMessage('success', 'save'))
    } catch (error) {
      toast.error(getMessage('error', 'save'))
    }
  }
  
  return <button onClick={handleSave}>Save</button>
}

// Example 3: Using Configuration Styling
import { useStyling } from '@/hooks/useConfiguration'

function MyComponent() {
  const { styling } = useStyling()
  
  return (
    <div style={{ backgroundColor: styling.section_a_color }}>
      Section A Content
    </div>
  )
}

// Example 4: Using Configurable Status Badge
import { ConfigurableStatusBadge } from '@/components/status/ConfigurableStatusBadge'

function LogbookStatus({ status }) {
  return (
    <ConfigurableStatusBadge 
      status={status}
      useConfig={true}
      showIcon={true}
    />
  )
}
```

## 🔧 Maintenance

### Resetting to Defaults
If you need to reset all configurations to defaults:

```bash
cd /Users/macdemac/Local\ Sites/PsychPATH/backend
source venv/bin/activate
python manage.py shell

# In the Django shell:
from system_config.models import ConfigurationItem, SystemConfiguration
ConfigurationItem.objects.all().delete()
SystemConfiguration.objects.all().delete()
exit()

# Re-run the setup command
python manage.py setup_initial_config
```

### Adding New Configuration Items

```bash
cd /Users/macdemac/Local\ Sites/PsychPATH/backend
source venv/bin/activate
python manage.py shell

# In the Django shell:
from system_config.models import SystemConfiguration, ConfigurationItem, ConfigurationCategory

config = SystemConfiguration.objects.get(name='main_system_config')
category = ConfigurationCategory.objects.get(name='icons')

ConfigurationItem.objects.create(
    configuration=config,
    category=category,
    key='icons.new_action',
    display_name='New Action Icon',
    description='Icon for new action',
    value_type='ICON',
    value='Zap',
    ui_component='iconpicker',
    order=99
)
```

## 🐛 Troubleshooting

### Issue: Configuration not loading in frontend
**Solution**: 
1. Check browser console for errors
2. Verify you're logged in
3. Check API endpoint: `http://localhost:8001/api/config/configurations/1/get_filtered/`
4. Clear browser cache and reload

### Issue: Changes not appearing
**Solution**:
1. Wait 5 minutes for cache to expire, OR
2. Clear cache in code: `configurationService.clearCache()`
3. Hard refresh browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

### Issue: Icons not displaying
**Solution**:
1. Verify icon name exists in Lucide React icon library
2. Check fallback icon is specified
3. View console for warnings

### Issue: 404 on configuration endpoint
**Solution**:
1. Ensure Django server is running on port 8001
2. Check that `system_config` app is in INSTALLED_APPS
3. Run migrations: `python manage.py migrate system_config`

## 📚 Next Steps

1. **Explore the Admin Interface** - Change some values and see them update
2. **Review the Documentation** - See `CONFIGURATION_SYSTEM.md` for detailed docs
3. **Integrate in Your Components** - Start using configuration components
4. **Share with Support Team** - Train support admins on the interface
5. **Plan Phase 2** - Consider multi-tenancy and white-label features

## 🎯 Key Benefits

✅ **Consistency** - Single source of truth for all UI elements
✅ **Flexibility** - Change without code deployments
✅ **Maintainability** - Easy to understand and manage
✅ **Scalability** - Ready for multi-tenancy
✅ **Reliability** - Graceful fallbacks ensure stability

---

**Need Help?** Check the full documentation in `CONFIGURATION_SYSTEM.md` or review the example component at `/config-demo`.
