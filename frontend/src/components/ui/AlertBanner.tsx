import React from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AlertBannerProps {
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
}

const variantConfig = {
  info: {
    icon: <Info className="h-4 w-4" />,
    className: 'border-blue-200 bg-blue-50 text-blue-900'
  },
  success: {
    icon: <CheckCircle className="h-4 w-4" />,
    className: 'border-green-200 bg-green-50 text-green-900'
  },
  warning: {
    icon: <AlertCircle className="h-4 w-4" />,
    className: 'border-amber-200 bg-amber-50 text-amber-900'
  },
  error: {
    icon: <XCircle className="h-4 w-4" />,
    className: 'border-red-200 bg-red-50 text-red-900'
  }
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  variant = 'info',
  title,
  message,
  action,
  dismissible = false,
  onDismiss,
  className
}) => {
  const config = variantConfig[variant]

  return (
    <Alert className={cn(config.className, 'relative', className)}>
      {config.icon}
      <div className="flex-1">
        {title && <AlertTitle>{title}</AlertTitle>}
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>{message}</span>
          {action && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={action.onClick}
              className="flex-shrink-0"
            >
              {action.label}
            </Button>
          )}
        </AlertDescription>
      </div>
      {dismissible && onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </Alert>
  )
}

