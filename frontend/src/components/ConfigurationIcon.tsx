import React from 'react'
import * as LucideIcons from 'lucide-react'
import { useConfiguration } from '@/hooks/useConfiguration'

interface ConfigurationIconProps {
  iconName: string
  size?: number | string
  className?: string
  fallback?: keyof typeof LucideIcons
  configName?: string
}

const ConfigurationIcon: React.FC<ConfigurationIconProps> = ({
  iconName,
  size = 16,
  className = '',
  fallback = 'Settings',
  configName = 'main_system_config'
}) => {
  const { getIcon } = useConfiguration({ configName, autoLoad: true })
  
  // Get the icon name from configuration
  const configuredIconName = getIcon(iconName, fallback)
  
  // Get the actual icon component from Lucide React
  const IconComponent = (LucideIcons as any)[configuredIconName]
  
  // If the configured icon doesn't exist, fall back to the fallback icon
  const FinalIconComponent = IconComponent || (LucideIcons as any)[fallback] || LucideIcons.Settings
  
  return <FinalIconComponent size={size} className={className} />
}

export default ConfigurationIcon
