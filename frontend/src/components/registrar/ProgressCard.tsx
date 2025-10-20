import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

interface ProgressCardProps {
  current: number
  required: number
  label: string
  color?: 'purple' | 'blue' | 'green' | 'orange' | 'red'
  trafficLight?: 'red' | 'amber' | 'green'
  compact?: boolean
  unit?: string
  className?: string
}

const colorClasses = {
  purple: 'from-purple-500 to-purple-600',
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
  orange: 'from-orange-500 to-orange-600',
  red: 'from-red-500 to-red-600',
}

const trafficLightClasses = {
  red: 'text-red-600 bg-red-50 border-red-200',
  amber: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  green: 'text-green-600 bg-green-50 border-green-200',
}

const trafficLightIcons = {
  red: XCircle,
  amber: AlertTriangle,
  green: CheckCircle,
}

export function ProgressCard({ 
  current, 
  required, 
  label, 
  color = 'blue', 
  trafficLight,
  compact = false,
  unit = 'hours',
  className = ''
}: ProgressCardProps) {
  const percentage = required > 0 ? Math.min((current / required) * 100, 100) : 0
  const isComplete = current >= required
  const isOver = current > required
  
  const TrafficLightIcon = trafficLight ? trafficLightIcons[trafficLight] : null

  return (
    <Card className={`${compact ? 'p-4' : 'p-6'} ${className}`}>
      <CardContent className="p-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-medium text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>
            {label}
          </h3>
          {trafficLight && TrafficLightIcon && (
            <Badge 
              variant="outline" 
              className={`${trafficLightClasses[trafficLight]} ${compact ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1'}`}
            >
              <TrafficLightIcon className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} />
              {trafficLight.toUpperCase()}
            </Badge>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={`font-semibold ${compact ? 'text-lg' : 'text-2xl'} text-gray-900`}>
              {current.toFixed(1)} / {required.toFixed(1)}
            </span>
            <span className={`text-gray-600 ${compact ? 'text-sm' : 'text-base'}`}>
              {unit}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isOver 
                  ? 'bg-gradient-to-r from-red-500 to-red-600'
                  : isComplete
                    ? 'bg-gradient-to-r from-green-500 to-green-600'
                    : `bg-gradient-to-r ${colorClasses[color]}`
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{percentage.toFixed(1)}% complete</span>
            {isComplete && (
              <span className="text-green-600 font-medium">
                ✓ Target reached
              </span>
            )}
            {isOver && (
              <span className="text-red-600 font-medium">
                ⚠️ Over target
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
