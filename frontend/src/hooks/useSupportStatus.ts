import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '@/lib/api'

interface SupportStatus {
  is_online: boolean
  support_name?: string
}

interface UseSupportStatusProps {
  pollInterval?: number // in milliseconds
  enabled?: boolean
}

interface UseSupportStatusReturn {
  isOnline: boolean
  supportName: string | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useSupportStatus({ 
  pollInterval = 30000, // 30 seconds default
  enabled = true 
}: UseSupportStatusProps = {}): UseSupportStatusReturn {
  const [status, setStatus] = useState<SupportStatus>({ is_online: false })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchStatus = async () => {
    if (!enabled) return

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await apiFetch('/support/api/chat/online-status/')
      
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      } else {
        throw new Error('Failed to fetch support status')
      }
    } catch (err) {
      console.error('Failed to fetch support status:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch support status')
    } finally {
      setIsLoading(false)
    }
  }

  const refetch = () => {
    fetchStatus()
  }

  useEffect(() => {
    if (enabled) {
      // Fetch immediately
      fetchStatus()
      
      // Set up polling
      intervalRef.current = setInterval(fetchStatus, pollInterval)
    } else {
      // Clear interval if disabled
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, pollInterval])

  return {
    isOnline: status.is_online,
    supportName: status.support_name || null,
    isLoading,
    error,
    refetch
  }
}
