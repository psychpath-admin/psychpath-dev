import React from 'react'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatusType = 
  | 'success' | 'error' | 'pending' | 'warning' | 'loading'
  | 'approved' | 'rejected' | 'submitted' | 'draft'
  | 'invited' | 'failed' | 'accepted' | 'declined'

export interface StatusBadgeProps {
  status: StatusType
  label?: string
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const statusConfig: Record<StatusType, {
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  icon: React.ReactNode
  className: string
  defaultLabel: string
}> = {
  success: {
    variant: 'default',
    icon: <CheckCircle className="h-4 w-4" />,
    className: 'bg-green-100 text-green-800 border-green-200',
    defaultLabel: 'Success'
  },
  approved: {
    variant: 'default',
    icon: <CheckCircle className="h-4 w-4" />,
    className: 'bg-green-100 text-green-800 border-green-200',
    defaultLabel: 'Approved'
  },
  invited: {
    variant: 'default',
    icon: <CheckCircle className="h-4 w-4" />,
    className: 'bg-green-100 text-green-800 border-green-200',
    defaultLabel: 'Invited'
  },
  accepted: {
    variant: 'default',
    icon: <CheckCircle className="h-4 w-4" />,
    className: 'bg-green-100 text-green-800 border-green-200',
    defaultLabel: 'Accepted'
  },
  error: {
    variant: 'destructive',
    icon: <XCircle className="h-4 w-4" />,
    className: 'bg-red-100 text-red-800 border-red-200',
    defaultLabel: 'Error'
  },
  rejected: {
    variant: 'destructive',
    icon: <XCircle className="h-4 w-4" />,
    className: 'bg-red-100 text-red-800 border-red-200',
    defaultLabel: 'Rejected'
  },
  failed: {
    variant: 'destructive',
    icon: <XCircle className="h-4 w-4" />,
    className: 'bg-red-100 text-red-800 border-red-200',
    defaultLabel: 'Failed'
  },
  declined: {
    variant: 'destructive',
    icon: <XCircle className="h-4 w-4" />,
    className: 'bg-red-100 text-red-800 border-red-200',
    defaultLabel: 'Declined'
  },
  pending: {
    variant: 'secondary',
    icon: <Clock className="h-4 w-4" />,
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    defaultLabel: 'Pending'
  },
  submitted: {
    variant: 'default',
    icon: <Clock className="h-4 w-4" />,
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    defaultLabel: 'Submitted'
  },
  draft: {
    variant: 'secondary',
    icon: <AlertCircle className="h-4 w-4" />,
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    defaultLabel: 'Draft'
  },
  warning: {
    variant: 'outline',
    icon: <AlertCircle className="h-4 w-4" />,
    className: 'bg-amber-100 text-amber-800 border-amber-200',
    defaultLabel: 'Warning'
  },
  loading: {
    variant: 'secondary',
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    defaultLabel: 'Loading'
  }
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  showIcon = true,
  size = 'md',
  className = ''
}) => {
  const config = statusConfig[status]
  const displayLabel = label || config.defaultLabel

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1'
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
      {showIcon && config.icon}
      {displayLabel}
    </Badge>
  )
}

