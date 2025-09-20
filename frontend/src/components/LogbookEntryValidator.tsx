import React, { useState, useEffect } from 'react'
import { useInternshipValidation } from '@/hooks/useInternshipValidation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react'

interface LogbookEntryValidatorProps {
  entryData: {
    entry_type: string
    duration_minutes: number
    simulated?: boolean
    [key: string]: any
  }
  onValidationChange?: (isValid: boolean, errors: string[]) => void
  showDetails?: boolean
  className?: string
}

export function LogbookEntryValidator({ 
  entryData, 
  onValidationChange, 
  showDetails = false,
  className = '' 
}: LogbookEntryValidatorProps) {
  const { validateEntry } = useInternshipValidation()
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean
    errors: string[]
  } | null>(null)

  useEffect(() => {
    const performValidation = async () => {
      if (!entryData.entry_type || !entryData.duration_minutes) {
        setValidationResult({ isValid: true, errors: [] })
        onValidationChange?.(true, [])
        return
      }

      setIsValidating(true)
      try {
        const result = await validateEntry(entryData)
        setValidationResult(result)
        onValidationChange?.(result.isValid, result.errors)
      } catch (error) {
        console.error('Validation error:', error)
        setValidationResult({ isValid: false, errors: ['Validation failed'] })
        onValidationChange?.(false, ['Validation failed'])
      } finally {
        setIsValidating(false)
      }
    }

    // Debounce validation to avoid excessive API calls
    const timeoutId = setTimeout(performValidation, 500)
    return () => clearTimeout(timeoutId)
  }, [entryData.entry_type, entryData.duration_minutes, entryData.simulated, validateEntry, onValidationChange])

  if (!validationResult) {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-500 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Validating...</span>
      </div>
    )
  }

  const getStatusIcon = () => {
    if (isValidating) {
      return <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
    }
    if (validationResult.isValid) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    return <XCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusText = () => {
    if (isValidating) return 'Validating...'
    if (validationResult.isValid) return 'Valid'
    return 'Validation failed'
  }

  const getStatusColor = () => {
    if (isValidating) return 'text-gray-500'
    if (validationResult.isValid) return 'text-green-500'
    return 'text-red-500'
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2 text-sm">
        {getStatusIcon()}
        <span className={getStatusColor()}>
          {getStatusText()}
        </span>
      </div>

      {showDetails && validationResult.errors.length > 0 && (
        <div className="mt-2 space-y-1">
          {validationResult.errors.map((error, index) => (
            <Alert key={index} className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {error}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {showDetails && validationResult.isValid && entryData.entry_type === 'client_contact' && entryData.simulated && (
        <div className="mt-2">
          <Alert className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Simulated client contact hours count towards DCC requirements but are capped at 60 hours total.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}

interface ValidationSummaryProps {
  entryData: {
    entry_type: string
    duration_minutes: number
    simulated?: boolean
    [key: string]: any
  }
  className?: string
}

export function ValidationSummary({ entryData, className = '' }: ValidationSummaryProps) {
  const { requirements } = useInternshipValidation()
  const [showDetails, setShowDetails] = useState(false)

  if (!requirements || entryData.entry_type !== 'client_contact') {
    return null
  }

  const entryHours = (entryData.duration_minutes || 0) / 60
  const isSimulated = entryData.simulated || false

  return (
    <div className={`text-sm ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-gray-600">
          {isSimulated ? 'Simulated DCC' : 'Direct Client Contact'}
        </span>
        <span className="font-medium">
          +{entryHours.toFixed(1)}h
        </span>
      </div>
      
      {isSimulated && (
        <div className="text-xs text-amber-600 mt-1">
          Max: {requirements.program.requirements.dcc_simulated_maximum}h simulated
        </div>
      )}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDetails(!showDetails)}
        className="mt-2 h-6 px-2 text-xs"
      >
        {showDetails ? 'Hide' : 'Show'} Requirements
      </Button>
      
      {showDetails && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs space-y-1">
          <div>DCC Minimum: {requirements.program.requirements.dcc_minimum}h</div>
          <div>Simulated Max: {requirements.program.requirements.dcc_simulated_maximum}h</div>
          <div>Practice Total: {requirements.program.requirements.practice_hours}h</div>
          <div>Supervision Min: {requirements.program.requirements.supervision_minimum}h</div>
          <div>PD Required: {requirements.program.requirements.pd_required}h</div>
        </div>
      )}
    </div>
  )
}

