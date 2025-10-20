import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

interface ComplianceCardProps {
  title: string
  status: 'red' | 'amber' | 'green'
  compact?: boolean
  children?: React.ReactNode
  className?: string
}

const statusClasses = {
  red: {
    border: 'border-l-red-500',
    icon: 'text-red-600',
    badge: 'text-red-600 bg-red-50 border-red-200',
  },
  amber: {
    border: 'border-l-yellow-500',
    icon: 'text-yellow-600',
    badge: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  },
  green: {
    border: 'border-l-green-500',
    icon: 'text-green-600',
    badge: 'text-green-600 bg-green-50 border-green-200',
  },
}

const statusIcons = {
  red: XCircle,
  amber: AlertTriangle,
  green: CheckCircle,
}

const statusLabels = {
  red: 'NON-COMPLIANT',
  amber: 'WARNING',
  green: 'COMPLIANT',
}

export function ComplianceCard({ 
  title, 
  status, 
  compact = false, 
  children, 
  className = '' 
}: ComplianceCardProps) {
  const StatusIcon = statusIcons[status]
  const statusClass = statusClasses[status]

  return (
    <Card className={`${statusClass.border} border-l-4 ${compact ? 'p-4' : 'p-6'} ${className}`}>
      <CardHeader className={`${compact ? 'pb-3' : 'pb-4'}`}>
        <div className="flex items-center justify-between">
          <CardTitle className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-gray-900`}>
            {title}
          </CardTitle>
          <Badge 
            variant="outline" 
            className={`${statusClass.badge} ${compact ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1'}`}
          >
            <StatusIcon className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} />
            {statusLabels[status]}
          </Badge>
        </div>
      </CardHeader>
      {children && (
        <CardContent className={`${compact ? 'pt-0' : 'pt-0'}`}>
          {children}
        </CardContent>
      )}
    </Card>
  )
}
