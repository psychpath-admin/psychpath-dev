import React from 'react'
import { useConfiguration } from '@/hooks/useConfiguration'

interface ConfigurationMessageProps {
  category: string
  type: string
  defaultValue?: string
  configName?: string
  className?: string
  as?: 'span' | 'div' | 'p' | 'strong' | 'em'
  children?: React.ReactNode
}

const ConfigurationMessage: React.FC<ConfigurationMessageProps> = ({
  category,
  type,
  defaultValue,
  configName = 'main_system_config',
  className = '',
  as: Component = 'span',
  children
}) => {
  const { getMessage } = useConfiguration({ configName, autoLoad: true })
  
  // Get the message from configuration
  const message = getMessage(category, type, defaultValue)
  
  // If children are provided, use them as the message content
  const content = children || message
  
  return (
    <Component className={className}>
      {content}
    </Component>
  )
}

export default ConfigurationMessage
