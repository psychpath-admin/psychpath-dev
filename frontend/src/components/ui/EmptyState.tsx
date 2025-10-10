import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FileQuestion, Inbox, Search, AlertCircle } from 'lucide-react'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  variant?: 'default' | 'search' | 'error' | 'inbox'
  className?: string
}

const variantConfig = {
  default: {
    icon: <FileQuestion className="h-12 w-12 text-gray-400" />,
    iconColor: 'text-gray-400'
  },
  search: {
    icon: <Search className="h-12 w-12 text-gray-400" />,
    iconColor: 'text-gray-400'
  },
  error: {
    icon: <AlertCircle className="h-12 w-12 text-red-400" />,
    iconColor: 'text-red-400'
  },
  inbox: {
    icon: <Inbox className="h-12 w-12 text-gray-400" />,
    iconColor: 'text-gray-400'
  }
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className = ''
}) => {
  const config = variantConfig[variant]
  const displayIcon = icon || config.icon

  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-8 text-center',
      className
    )}>
      <div className="mb-4">
        {displayIcon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-600 mb-6 max-w-md">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

