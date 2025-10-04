import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api'

export interface InternshipProgress {
  program: {
    name: string
    type: string
    version: string
  }
  progress: {
    weeks_completed: number
    minimum_weeks: number
    target_weeks: number
    is_completed: boolean
  }
  hours: {
    dcc: {
      current: number
      required: number
      simulated: number
      simulated_max: number
    }
    cra: {
      current: number
    }
    practice: {
      current: number
      required: number
    }
    supervision: {
      current: number
      required: number
      ratio: number
      required_ratio: number
    }
    pd: {
      current: number
      required: number
    }
    total: {
      current: number
      required: number
    }
  }
  validation: {
    weekly_passed: boolean
    category_passed: boolean
    can_complete: boolean
  }
}

export interface ValidationAlert {
  id: number
  type: string
  message: string
  created_at: string
}

export interface WeeklyBreakdown {
  week_number: number
  hours: {
    dcc_hours: number
    dcc_simulated_hours: number
    cra_hours: number
    pd_hours: number
    supervision_hours: number
  }
  total_hours: number
  meets_minimum: boolean
  validation_message: string
}

export interface ProgramRequirements {
  program: {
    name: string
    type: string
    version: string
    requirements: {
      total_hours: number
      practice_hours: number
      dcc_minimum: number
      dcc_simulated_maximum: number
      supervision_minimum: number
      pd_required: number
      minimum_weeks: number
      minimum_weekly_hours: number
      supervision_ratio: number
    }
  }
}

export function useInternshipValidation() {
  const [progress, setProgress] = useState<InternshipProgress | null>(null)
  const [alerts, setAlerts] = useState<ValidationAlert[]>([])
  const [weeklyBreakdown, setWeeklyBreakdown] = useState<WeeklyBreakdown[]>([])
  const [requirements, setRequirements] = useState<ProgramRequirements | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProgress = useCallback(async () => {
    try {
      const response = await apiFetch('/api/internship/progress/')
      console.log('Internship progress response:', response.status, response.ok)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Progress data:', data)
        setProgress(data)
        setError(null)
      } else {
        const data = await response.json()
        console.log('Error response data:', data)
        if (data.error) {
          // Handle specific error messages from the API
          setProgress({ error: data.error, user_role: data.user_role } as any)
          setError(null)
        } else {
          setError('Unable to load your internship progress. Please refresh the page and try again.')
        }
      }
    } catch (err) {
      console.error('Error fetching progress:', err)
      setError('Unable to load your internship progress. Please check your internet connection and try again.')
    }
  }, [])

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await apiFetch('/api/internship/alerts/')
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts)
      } else {
        // For non-intern users, just set empty alerts
        setAlerts([])
      }
    } catch (err) {
      console.error('Error fetching alerts:', err)
      setAlerts([])
    }
  }, [])

  const fetchWeeklyBreakdown = useCallback(async (weeks: number = 12) => {
    try {
      const response = await apiFetch(`/api/internship/weekly-breakdown/?weeks=${weeks}`)
      if (response.ok) {
        const data = await response.json()
        setWeeklyBreakdown(data.weekly_breakdown)
      } else {
        // For non-intern users, just set empty breakdown
        setWeeklyBreakdown([])
      }
    } catch (err) {
      console.error('Error fetching weekly breakdown:', err)
      setWeeklyBreakdown([])
    }
  }, [])

  const fetchRequirements = useCallback(async () => {
    try {
      const response = await apiFetch('/api/internship/requirements/')
      if (response.ok) {
        const data = await response.json()
        setRequirements(data)
      }
    } catch (err) {
      console.error('Error fetching requirements:', err)
    }
  }, [])

  const validateEntry = useCallback(async (entryData: any) => {
    try {
      const response = await apiFetch('/api/internship/validate-entry/', {
        method: 'POST',
        body: JSON.stringify(entryData)
      })
      
      if (response.ok) {
        const data = await response.json()
        return { isValid: data.is_valid, errors: data.errors }
      } else {
        const data = await response.json()
        return { isValid: false, errors: [data.error || 'Validation failed'] }
      }
    } catch (err) {
      return { isValid: false, errors: ['Network error during validation'] }
    }
  }, [])

  const dismissAlert = useCallback(async (alertId: number) => {
    try {
      const response = await apiFetch('/api/internship/dismiss-alert/', {
        method: 'POST',
        body: JSON.stringify({ alert_id: alertId })
      })
      
      if (response.ok) {
        setAlerts(prev => prev.filter(alert => alert.id !== alertId))
      }
    } catch (err) {
      console.error('Error dismissing alert:', err)
    }
  }, [])

  const checkCompletionEligibility = useCallback(async () => {
    try {
      const response = await apiFetch('/api/internship/check-completion/')
      if (response.ok) {
        const data = await response.json()
        return { canComplete: data.can_complete, errors: data.errors }
      } else {
        const data = await response.json()
        return { canComplete: false, errors: [data.error || 'Check failed'] }
      }
    } catch (err) {
      return { canComplete: false, errors: ['Network error'] }
    }
  }, [])

  const completeInternship = useCallback(async () => {
    try {
      const response = await apiFetch('/api/internship/complete/', {
        method: 'POST'
      })
      
      if (response.ok) {
        const data = await response.json()
        await fetchProgress() // Refresh progress
        return { success: true, completionDate: data.completion_date }
      } else {
        const data = await response.json()
        return { success: false, errors: data.errors || [data.error] }
      }
    } catch (err) {
      return { success: false, errors: ['Network error'] }
    }
  }, [fetchProgress])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await Promise.all([
          fetchProgress(),
          fetchAlerts(),
          fetchWeeklyBreakdown(),
          fetchRequirements()
        ])
      } catch (err) {
        setError('Failed to load validation data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [fetchProgress, fetchAlerts, fetchWeeklyBreakdown, fetchRequirements])

  return {
    progress,
    alerts,
    weeklyBreakdown,
    requirements,
    loading,
    error,
    validateEntry,
    dismissAlert,
    checkCompletionEligibility,
    completeInternship,
    refreshProgress: fetchProgress,
    refreshAlerts: fetchAlerts,
    refreshWeeklyBreakdown: fetchWeeklyBreakdown,
  }
}
