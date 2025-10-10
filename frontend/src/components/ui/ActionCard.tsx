import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface CardAction {
  label: string
  onClick: () => void
  icon?: React.ReactNode
  variant?: 'default' | 'destructive'
}

export interface ActionCardProps {
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  actions?: React.ReactNode
  icon?: React.ReactNode
  badge?: React.ReactNode
  className?: string
  onClick?: () => void
}

export const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  children,
  footer,
  actions,
  icon,
  badge,
  className,
  onClick
}) => {
  return (
    <Card 
      className={cn(
        onClick && 'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            {icon && <div className="flex-shrink-0">{icon}</div>}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="truncate">{title}</CardTitle>
                {badge}
              </div>
              {description && (
                <CardDescription className="mt-1">{description}</CardDescription>
              )}
            </div>
          </div>
          
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {children}
      </CardContent>
      
      {footer && (
        <CardFooter>
          {footer}
        </CardFooter>
      )}
    </Card>
  )
}

