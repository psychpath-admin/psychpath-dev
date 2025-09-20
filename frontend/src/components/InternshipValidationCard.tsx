import React from 'react'
import { useInternshipValidation } from '@/hooks/useInternshipValidation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, AlertTriangle, XCircle, Clock, Target, Users, BookOpen, Eye } from 'lucide-react'

interface InternshipValidationCardProps {
  className?: string
}

export function InternshipValidationCard({ className = '' }: InternshipValidationCardProps) {
  const { progress, alerts, loading, error } = useInternshipValidation()

  console.log('InternshipValidationCard render:', { progress, loading, error })

  if (loading) {
    return (
      <div className={`rounded-lg border bg-white p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error || !progress) {
    return (
      <div className={`rounded-lg border bg-white p-4 ${className}`}>
        <div className="text-sm text-gray-500">
          {error || 'No internship data available'}
        </div>
      </div>
    )
  }

  // Check if user is not enrolled in internship program
  if (progress.error) {
    return (
      <div className={`rounded-lg border bg-white p-4 ${className}`}>
        <div className="text-center">
          <div className="text-sm text-gray-500 mb-2">
            {progress.error}
          </div>
          <div className="text-xs text-gray-400">
            User role: {progress.user_role}
          </div>
        </div>
      </div>
    )
  }

  const getProgressPercentage = (current: number, required: number) => {
    return Math.min(100, Math.round((current / required) * 100))
  }

  const getStatusIcon = (current: number, required: number, isMax = false) => {
    if (isMax && current > required) {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
    if (current >= required) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    return <Clock className="h-4 w-4 text-amber-500" />
  }

  const getStatusColor = (current: number, required: number, isMax = false) => {
    if (isMax && current > required) {
      return 'text-red-500'
    }
    if (current >= required) {
      return 'text-green-500'
    }
    return 'text-amber-500'
  }

  return (
    <div className={`rounded-lg border bg-white p-4 ${className}`}>
      <div className="mb-4">
        <h3 className="font-semibold text-lg text-gray-900 mb-1">
          {progress.program.name}
        </h3>
        <p className="text-sm text-gray-500">
          Version {progress.program.version} • Week {progress.progress.weeks_completed} of {progress.progress.target_weeks}
        </p>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {progress.progress.weeks_completed}
          </div>
          <div className="text-sm text-gray-500">Weeks Completed</div>
          <div className="text-xs text-gray-400">
            Min: {progress.progress.minimum_weeks}
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(progress.hours.total.current)}h
          </div>
          <div className="text-sm text-gray-500">Total Hours</div>
          <div className="text-xs text-gray-400">
            Target: {progress.hours.total.required}h
          </div>
        </div>
      </div>

      {/* Category Progress */}
      <div className="space-y-4">
        {/* DCC Hours */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Direct Client Contact</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(progress.hours.dcc.current, progress.hours.dcc.required)}
              <span className={`text-sm font-medium ${getStatusColor(progress.hours.dcc.current, progress.hours.dcc.required)}`}>
                {Math.round(progress.hours.dcc.current)}h / {progress.hours.dcc.required}h
              </span>
            </div>
          </div>
          <Progress 
            value={getProgressPercentage(progress.hours.dcc.current, progress.hours.dcc.required)} 
            className="h-2"
          />
          {progress.hours.dcc.simulated > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Simulated: {Math.round(progress.hours.dcc.simulated)}h / {progress.hours.dcc.simulated_max}h
            </div>
          )}
        </div>

        {/* Practice Hours */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Practice (DCC + CRA)</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(progress.hours.practice.current, progress.hours.practice.required)}
              <span className={`text-sm font-medium ${getStatusColor(progress.hours.practice.current, progress.hours.practice.required)}`}>
                {Math.round(progress.hours.practice.current)}h / {progress.hours.practice.required}h
              </span>
            </div>
          </div>
          <Progress 
            value={getProgressPercentage(progress.hours.practice.current, progress.hours.practice.required)} 
            className="h-2"
          />
        </div>

        {/* Supervision Hours */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Supervision</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(progress.hours.supervision.current, progress.hours.supervision.required)}
              <span className={`text-sm font-medium ${getStatusColor(progress.hours.supervision.current, progress.hours.supervision.required)}`}>
                {Math.round(progress.hours.supervision.current)}h / {progress.hours.supervision.required}h
              </span>
            </div>
          </div>
          <Progress 
            value={getProgressPercentage(progress.hours.supervision.current, progress.hours.supervision.required)} 
            className="h-2"
          />
          <div className="text-xs text-gray-500 mt-1">
            Ratio: 1:{Math.round(progress.hours.supervision.ratio)} (Required: 1:{progress.hours.supervision.required_ratio})
          </div>
        </div>

        {/* Professional Development */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Professional Development</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(progress.hours.pd.current, progress.hours.pd.required)}
              <span className={`text-sm font-medium ${getStatusColor(progress.hours.pd.current, progress.hours.pd.required)}`}>
                {Math.round(progress.hours.pd.current)}h / {progress.hours.pd.required}h
              </span>
            </div>
          </div>
          <Progress 
            value={getProgressPercentage(progress.hours.pd.current, progress.hours.pd.required)} 
            className="h-2"
          />
        </div>
      </div>

      {/* Validation Status */}
      <div className="mt-6 pt-4 border-t">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Validation Status</span>
          <div className="flex items-center gap-2">
            {progress.validation.weekly_passed && progress.validation.category_passed ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
            <span className={`text-sm ${progress.validation.weekly_passed && progress.validation.category_passed ? 'text-green-500' : 'text-amber-500'}`}>
              {progress.validation.weekly_passed && progress.validation.category_passed ? 'On Track' : 'Needs Attention'}
            </span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mt-4 space-y-2">
          {alerts.slice(0, 3).map((alert) => (
            <Alert key={alert.id} className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {alert.message}
              </AlertDescription>
            </Alert>
          ))}
          {alerts.length > 3 && (
            <div className="text-xs text-gray-500 text-center">
              +{alerts.length - 3} more alerts
            </div>
          )}
        </div>
      )}
    </div>
  )
}
