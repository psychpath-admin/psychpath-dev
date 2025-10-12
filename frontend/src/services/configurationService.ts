import { apiFetch } from '@/lib/api'

interface ConfigurationItem {
  key: string
  value: any
  display_name: string
  description: string
  value_type: 'STRING' | 'INTEGER' | 'BOOLEAN' | 'JSON' | 'CHOICE' | 'MULTI_CHOICE' | 'COLOR' | 'ICON'
  user_roles: string[]
  contexts: string[]
}

interface SystemConfiguration {
  id: number
  name: string
  description: string
  items: Record<string, ConfigurationItem>
}

interface ConfigurationCache {
  data: SystemConfiguration
  timestamp: number
}

class ConfigurationService {
  private static instance: ConfigurationService
  private cache: Map<string, ConfigurationCache> = new Map()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService()
    }
    return ConfigurationService.instance
  }

  /**
   * Load configuration for a specific name with optional filtering
   */
  async loadConfiguration(
    configName: string, 
    userRole?: string, 
    context?: string
  ): Promise<SystemConfiguration | null> {
    const cacheKey = `${configName}_${userRole || 'all'}_${context || 'all'}`
    const cached = this.cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }

    try {
      const params = new URLSearchParams()
      if (userRole) params.append('user_role', userRole)
      if (context) params.append('context', context)
      
      const queryString = params.toString()
      const url = `/api/config/configurations/${configName}/get_filtered/${queryString ? `?${queryString}` : ''}`
      
      const response = await apiFetch(url)
      if (!response.ok) {
        throw new Error(`Failed to load configuration: ${response.statusText}`)
      }
      
      const data = await response.json()
      const configuration: SystemConfiguration = {
        id: data.configuration.id,
        name: data.configuration.name,
        description: data.configuration.description,
        items: data.items
      }
      
      this.cache.set(cacheKey, { data: configuration, timestamp: Date.now() })
      return configuration
    } catch (error) {
      console.error(`Failed to load configuration ${configName}:`, error)
      return this.getDefaultConfiguration(configName)
    }
  }

  /**
   * Get a specific configuration value by key
   */
  getValue(configName: string, key: string, defaultValue?: any): any {
    const cacheKey = `${configName}_all_all`
    const cached = this.cache.get(cacheKey)
    
    if (!cached) {
      return defaultValue
    }

    const item = cached.data.items[key]
    if (!item) {
      return defaultValue
    }

    return item.value
  }

  /**
   * Get configuration values filtered by type (e.g., all icons, all messages)
   */
  getConfigurationByType(configName: string, type: string): Record<string, any> {
    const cacheKey = `${configName}_all_all`
    const cached = this.cache.get(cacheKey)
    
    if (!cached) {
      return {}
    }

    const result: Record<string, any> = {}
    Object.entries(cached.data.items).forEach(([key, item]) => {
      if (key.startsWith(`${type}.`)) {
        const subKey = key.replace(`${type}.`, '')
        result[subKey] = item.value
      }
    })

    return result
  }

  /**
   * Get all icons from configuration
   */
  getIcons(configName: string = 'main_system_config'): Record<string, string> {
    return this.getConfigurationByType(configName, 'icons')
  }

  /**
   * Get all messages from configuration
   */
  getMessages(configName: string = 'main_system_config'): Record<string, Record<string, string>> {
    const cacheKey = `${configName}_all_all`
    const cached = this.cache.get(cacheKey)
    
    if (!cached) {
      return {}
    }

    const messages: Record<string, Record<string, string>> = {}
    Object.entries(cached.data.items).forEach(([key, item]) => {
      if (key.startsWith('messages.')) {
        const parts = key.split('.')
        if (parts.length >= 3) {
          const category = parts[1]
          const type = parts[2]
          
          if (!messages[category]) {
            messages[category] = {}
          }
          messages[category][type] = item.value
        }
      }
    })

    return messages
  }

  /**
   * Get styling configuration
   */
  getStyling(configName: string = 'main_system_config'): Record<string, string> {
    return this.getConfigurationByType(configName, 'styling')
  }

  /**
   * Get workflow configuration
   */
  getWorkflows(configName: string = 'main_system_config'): Record<string, any> {
    return this.getConfigurationByType(configName, 'workflows')
  }

  /**
   * Get a specific message by category and type
   */
  getMessage(configName: string, category: string, type: string, defaultValue?: string): string {
    const messages = this.getMessages(configName)
    return messages[category]?.[type] || defaultValue || `${category}_${type}`
  }

  /**
   * Get a specific icon by name
   */
  getIcon(configName: string, iconName: string, defaultValue?: string): string {
    const icons = this.getIcons(configName)
    return icons[iconName] || defaultValue || 'Settings'
  }

  /**
   * Clear cache for a specific configuration or all configurations
   */
  clearCache(configName?: string): void {
    if (configName) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(configName))
      keysToDelete.forEach(key => this.cache.delete(key))
    } else {
      this.cache.clear()
    }
  }

  /**
   * Get default configuration when API fails
   */
  private getDefaultConfiguration(configName: string): SystemConfiguration | null {
    if (configName === 'main_system_config') {
      return {
        id: 0,
        name: 'main_system_config',
        description: 'Default configuration',
        items: {
          'icons.add': { key: 'icons.add', value: 'Plus', display_name: 'Add Entry Icon', description: '', value_type: 'ICON', user_roles: [], contexts: [] },
          'icons.edit': { key: 'icons.edit', value: 'Edit3', display_name: 'Edit Entry Icon', description: '', value_type: 'ICON', user_roles: [], contexts: [] },
          'icons.delete': { key: 'icons.delete', value: 'Trash2', display_name: 'Delete Entry Icon', description: '', value_type: 'ICON', user_roles: [], contexts: [] },
          'icons.view': { key: 'icons.view', value: 'Eye', display_name: 'View Entry Icon', description: '', value_type: 'ICON', user_roles: [], contexts: [] },
          'icons.submit': { key: 'icons.submit', value: 'Send', display_name: 'Submit Icon', description: '', value_type: 'ICON', user_roles: [], contexts: [] },
          'icons.approve': { key: 'icons.approve', value: 'CheckCircle', display_name: 'Approve Icon', description: '', value_type: 'ICON', user_roles: [], contexts: [] },
          'icons.reject': { key: 'icons.reject', value: 'XCircle', display_name: 'Reject Icon', description: '', value_type: 'ICON', user_roles: [], contexts: [] },
          'icons.pending': { key: 'icons.pending', value: 'Clock', display_name: 'Pending Icon', description: '', value_type: 'ICON', user_roles: [], contexts: [] },
          'icons.user': { key: 'icons.user', value: 'User', display_name: 'User Icon', description: '', value_type: 'ICON', user_roles: [], contexts: [] },
          'icons.logbook': { key: 'icons.logbook', value: 'BookOpen', display_name: 'Logbook Icon', description: '', value_type: 'ICON', user_roles: [], contexts: [] },
          'icons.supervision': { key: 'icons.supervision', value: 'Users', display_name: 'Supervision Icon', description: '', value_type: 'ICON', user_roles: [], contexts: [] },
          'icons.notification': { key: 'icons.notification', value: 'Bell', display_name: 'Notification Icon', description: '', value_type: 'ICON', user_roles: [], contexts: [] },
          'messages.success.save': { key: 'messages.success.save', value: 'Entry saved successfully!', display_name: 'Success Save Message', description: '', value_type: 'STRING', user_roles: [], contexts: [] },
          'messages.success.submit': { key: 'messages.success.submit', value: 'Logbook submitted successfully!', display_name: 'Success Submit Message', description: '', value_type: 'STRING', user_roles: [], contexts: [] },
          'messages.success.approve': { key: 'messages.success.approve', value: 'Logbook approved successfully!', display_name: 'Success Approve Message', description: '', value_type: 'STRING', user_roles: [], contexts: [] },
          'messages.error.save': { key: 'messages.error.save', value: 'Failed to save entry. Please try again.', display_name: 'Error Save Message', description: '', value_type: 'STRING', user_roles: [], contexts: [] },
          'messages.error.submit': { key: 'messages.error.submit', value: 'Failed to submit logbook. Please try again.', display_name: 'Error Submit Message', description: '', value_type: 'STRING', user_roles: [], contexts: [] },
          'messages.error.network': { key: 'messages.error.network', value: 'Network error. Please check your connection.', display_name: 'Network Error Message', description: '', value_type: 'STRING', user_roles: [], contexts: [] },
          'styling.primary_color': { key: 'styling.primary_color', value: '#3B82F6', display_name: 'Primary Color', description: '', value_type: 'COLOR', user_roles: [], contexts: [] },
          'styling.secondary_color': { key: 'styling.secondary_color', value: '#6B7280', display_name: 'Secondary Color', description: '', value_type: 'COLOR', user_roles: [], contexts: [] },
          'styling.accent_color': { key: 'styling.accent_color', value: '#10B981', display_name: 'Accent Color', description: '', value_type: 'COLOR', user_roles: [], contexts: [] },
          'styling.section_a_color': { key: 'styling.section_a_color', value: '#3B82F6', display_name: 'Section A Color', description: '', value_type: 'COLOR', user_roles: [], contexts: [] },
          'styling.section_b_color': { key: 'styling.section_b_color', value: '#10B981', display_name: 'Section B Color', description: '', value_type: 'COLOR', user_roles: [], contexts: [] },
          'styling.section_c_color': { key: 'styling.section_c_color', value: '#8B5CF6', display_name: 'Section C Color', description: '', value_type: 'COLOR', user_roles: [], contexts: [] }
        }
      }
    }
    return null
  }
}

export default ConfigurationService.getInstance()
