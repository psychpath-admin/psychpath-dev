import React from 'react'
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StatusType } from './StatusBadge'

export interface StatusIconProps {
  status: StatusType
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const iconConfig: Record<StatusType, { icon: React.ComponentType<any>; className: string }> = {
  success: { icon: CheckCircle, className: 'text-green-600' },
  approved: { icon: CheckCircle, className: 'text-green-600' },
  invited: { icon: CheckCircle, className: 'text-green-600' },
  accepted: { icon: CheckCircle, className: 'text-green-600' },
  error: { icon: XCircle, className: 'text-red-600' },
  rejected: { icon: XCircle, className: 'text-red-600' },
  failed: { icon: XCircle, className: 'text-red-600' },
  declined: { icon: XCircle, className: 'text-red-600' },
  pending: { icon: Clock, className: 'text-gray-600' },
  submitted: { icon: Clock, className: 'text-blue-600' },
  draft: { icon: Info, className: 'text-gray-600' },
  warning: { icon: AlertCircle, className: 'text-amber-600' },
  loading: { icon: Loader2, className: 'text-gray-600 animate-spin' }
}

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5'
}

export const StatusIcon: React.FC<StatusIconProps> = ({
  status,
  size = 'md',
  className = ''
}) => {
  const config = iconConfig[status]
  const Icon = config.icon

  return (
    <Icon className={cn(sizeClasses[size], config.className, className)} />
  )
}

