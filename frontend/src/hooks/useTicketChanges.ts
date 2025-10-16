import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '@/lib/api'

interface UseTicketChangesOptions {
  ticketId: number
  enabled?: boolean
  intervalMs?: number
  onChangesDetected?: () => void
}

export function useTicketChanges({
  ticketId,
  enabled = true,
  intervalMs = 600000, // 10 minutes default
  onChangesDetected
}: UseTicketChangesOptions) {
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState<boolean>(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isActiveRef = useRef<boolean>(false)

  const checkForChanges = async () => {
    if (!enabled || !ticketId) return

    try {
      const url = lastCheckTime 
        ? `/support/api/tickets/${ticketId}/changes/?last_check=${encodeURIComponent(lastCheckTime)}`
        : `/support/api/tickets/${ticketId}/changes/`
      
      const response = await apiFetch(url)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Change detection result:', data)
        
        if (data.has_changes) {
          setHasChanges(true)
          if (onChangesDetected) {
            onChangesDetected()
          }
        } else {
          setHasChanges(false)
        }
        
        // Update last check time
        setLastCheckTime(new Date().toISOString())
      }
    } catch (error) {
      console.error('Failed to check for ticket changes:', error)
    }
  }

  useEffect(() => {
    if (!enabled || !ticketId) return

    console.log(`Starting database-driven change detection for ticket ${ticketId} (every ${intervalMs / 1000}s)`)
    
    // Initial check
    checkForChanges()
    
    // Set up interval
    intervalRef.current = setInterval(checkForChanges, intervalMs)
    isActiveRef.current = true

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      isActiveRef.current = false
      console.log(`Stopped database-driven change detection for ticket ${ticketId}`)
    }
  }, [ticketId, enabled, intervalMs])

  const resetChanges = () => {
    setHasChanges(false)
  }

  return {
    hasChanges,
    resetChanges,
    checkForChanges,
    isActive: isActiveRef.current
  }
}
