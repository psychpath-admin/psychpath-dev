import { useState, useEffect, useCallback } from 'react'
import configurationService from '@/services/configurationService'

interface UseConfigurationOptions {
  configName?: string
  userRole?: string
  context?: string
  autoLoad?: boolean
}

interface UseConfigurationReturn {
  configuration: any
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  getValue: (key: string, defaultValue?: any) => any
  getIcons: () => Record<string, string>
  getMessages: () => Record<string, Record<string, string>>
  getStyling: () => Record<string, string>
  getWorkflows: () => Record<string, any>
  getMessage: (category: string, type: string, defaultValue?: string) => string
  getIcon: (iconName: string, defaultValue?: string) => string
}

export function useConfiguration(options: UseConfigurationOptions = {}): UseConfigurationReturn {
  const {
    configName = 'main_system_config',
    userRole,
    context,
    autoLoad = true
  } = options

  const [configuration, setConfiguration] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadConfiguration = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const config = await configurationService.loadConfiguration(configName, userRole, context)
      setConfiguration(config)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load configuration'
      setError(errorMessage)
      console.error('Configuration loading error:', err)
    } finally {
      setLoading(false)
    }
  }, [configName, userRole, context])

  const refresh = useCallback(async () => {
    configurationService.clearCache(configName)
    await loadConfiguration()
  }, [loadConfiguration, configName])

  const getValue = useCallback((key: string, defaultValue?: any) => {
    return configurationService.getValue(configName, key, defaultValue)
  }, [configName])

  const getIcons = useCallback(() => {
    return configurationService.getIcons(configName)
  }, [configName])

  const getMessages = useCallback(() => {
    return configurationService.getMessages(configName)
  }, [configName])

  const getStyling = useCallback(() => {
    return configurationService.getStyling(configName)
  }, [configName])

  const getWorkflows = useCallback(() => {
    return configurationService.getWorkflows(configName)
  }, [configName])

  const getMessage = useCallback((category: string, type: string, defaultValue?: string) => {
    return configurationService.getMessage(configName, category, type, defaultValue)
  }, [configName])

  const getIcon = useCallback((iconName: string, defaultValue?: string) => {
    return configurationService.getIcon(configName, iconName, defaultValue)
  }, [configName])

  useEffect(() => {
    if (autoLoad) {
      loadConfiguration()
    }
  }, [loadConfiguration, autoLoad])

  return {
    configuration,
    loading,
    error,
    refresh,
    getValue,
    getIcons,
    getMessages,
    getStyling,
    getWorkflows,
    getMessage,
    getIcon
  }
}

// Specialized hooks for common use cases
export function useIcons(configName: string = 'main_system_config') {
  const { getIcons, loading, error } = useConfiguration({ configName, autoLoad: true })
  return {
    icons: getIcons(),
    loading,
    error
  }
}

export function useMessages(configName: string = 'main_system_config') {
  const { getMessages, getMessage, loading, error } = useConfiguration({ configName, autoLoad: true })
  return {
    messages: getMessages(),
    getMessage,
    loading,
    error
  }
}

export function useStyling(configName: string = 'main_system_config') {
  const { getStyling, loading, error } = useConfiguration({ configName, autoLoad: true })
  return {
    styling: getStyling(),
    loading,
    error
  }
}

export function useWorkflows(configName: string = 'main_system_config') {
  const { getWorkflows, loading, error } = useConfiguration({ configName, autoLoad: true })
  return {
    workflows: getWorkflows(),
    loading,
    error
  }
}
