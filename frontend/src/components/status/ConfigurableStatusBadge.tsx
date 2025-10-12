import React from 'react'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import ConfigurationIcon from '../ConfigurationIcon'
import { useConfiguration } from '@/hooks/useConfiguration'

export type StatusType = 
  | 'success' | 'error' | 'pending' | 'warning' | 'loading'
  | 'approved' | 'rejected' | 'submitted' | 'draft'
  | 'invited' | 'failed' | 'accepted' | 'declined'

export interface ConfigurableStatusBadgeProps {
  status: StatusType
  label?: string
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  useConfig?: boolean
  configName?: string
}

const defaultStatusConfig: Record<StatusType, {
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  iconName: string
  fallbackIcon: React.ReactNode
  className: string
  defaultLabel: string
}> = {
  success: {
    variant: 'default',
    iconName: 'approve',
    fallbackIcon: <CheckCircle className="h-4 w-4" />,
    className: 'bg-green-100 text-green-800 border-green-200',
    defaultLabel: 'Success'
  },
  approved: {
    variant: 'default',
    iconName: 'approve',
    fallbackIcon: <CheckCircle className="h-4 w-4" />,
    className: 'bg-green-100 text-green-800 border-green-200',
    defaultLabel: 'Approved'
  },
  invited: {
    variant: 'default',
    iconName: 'approve',
    fallbackIcon: <CheckCircle className="h-4 w-4" />,
    className: 'bg-green-100 text-green-800 border-green-200',
    defaultLabel: 'Invited'
  },
  accepted: {
    variant: 'default',
    iconName: 'approve',
    fallbackIcon: <CheckCircle className="h-4 w-4" />,
    className: 'bg-green-100 text-green-800 border-green-200',
    defaultLabel: 'Accepted'
  },
  error: {
    variant: 'destructive',
    iconName: 'reject',
    fallbackIcon: <XCircle className="h-4 w-4" />,
    className: 'bg-red-100 text-red-800 border-red-200',
    defaultLabel: 'Error'
  },
  rejected: {
    variant: 'destructive',
    iconName: 'reject',
    fallbackIcon: <XCircle className="h-4 w-4" />,
    className: 'bg-red-100 text-red-800 border-red-200',
    defaultLabel: 'Rejected'
  },
  failed: {
    variant: 'destructive',
    iconName: 'reject',
    fallbackIcon: <XCircle className="h-4 w-4" />,
    className: 'bg-red-100 text-red-800 border-red-200',
    defaultLabel: 'Failed'
  },
  declined: {
    variant: 'destructive',
    iconName: 'reject',
    fallbackIcon: <XCircle className="h-4 w-4" />,
    className: 'bg-red-100 text-red-800 border-red-200',
    defaultLabel: 'Declined'
  },
  pending: {
    variant: 'secondary',
    iconName: 'pending',
    fallbackIcon: <Clock className="h-4 w-4" />,
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    defaultLabel: 'Pending'
  },
  submitted: {
    variant: 'default',
    iconName: 'submit',
    fallbackIcon: <Clock className="h-4 w-4" />,
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    defaultLabel: 'Submitted'
  },
  draft: {
    variant: 'secondary',
    iconName: 'edit',
    fallbackIcon: <AlertCircle className="h-4 w-4" />,
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    defaultLabel: 'Draft'
  },
  warning: {
    variant: 'outline',
    iconName: 'notification',
    fallbackIcon: <AlertCircle className="h-4 w-4" />,
    className: 'bg-amber-100 text-amber-800 border-amber-200',
    defaultLabel: 'Warning'
  },
  loading: {
    variant: 'secondary',
    iconName: 'pending',
    fallbackIcon: <Loader2 className="h-4 w-4 animate-spin" />,
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    defaultLabel: 'Loading'
  }
}

export const ConfigurableStatusBadge: React.FC<ConfigurableStatusBadgeProps> = ({
  status,
  label,
  showIcon = true,
  size = 'md',
  className = '',
  useConfig = true,
  configName = 'main_system_config'
}) => {
  const config = defaultStatusConfig[status]
  const displayLabel = label || config.defaultLabel

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1'
  }

  const iconSize = {
    sm: 12,
    md: 16,
    lg: 20
  }

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        config.className,
        sizeClasses[size],
        'flex items-center gap-1 w-fit',
        className
      )}
    >
      {showIcon && (
        useConfig ? (
          <ConfigurationIcon
            iconName={config.iconName}
            size={iconSize[size]}
            fallback={config.fallbackIcon}
            configName={configName}
          />
        ) : (
          config.fallbackIcon
        )
      )}
      {displayLabel}
    </Badge>
  )
}
