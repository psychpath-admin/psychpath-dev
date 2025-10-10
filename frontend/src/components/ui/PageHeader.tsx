import React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export interface PageHeaderProps {
  title: string
  description?: string
  badge?: string
  actions?: React.ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  actions,
  breadcrumbs,
  className = ''
}) => {
  return (
    <div className={cn('space-y-4 mb-6', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-sm text-gray-600">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span>/</span>}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-gray-900">
                  {crumb.label}
                </a>
              ) : (
                <span className="text-gray-900 font-medium">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">
              {title}
            </h1>
            {badge && (
              <Badge variant="secondary">{badge}</Badge>
            )}
          </div>
          {description && (
            <p className="text-gray-600 mt-2 max-w-3xl">
              {description}
            </p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

