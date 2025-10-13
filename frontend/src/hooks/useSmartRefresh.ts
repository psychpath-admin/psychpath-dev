import { useEffect, useCallback, useRef } from 'react'

export interface RefreshEvent {
  type: string
  payload?: any
}

export interface UseSmartRefreshOptions {
  debounceMs?: number
  enablePageVisibility?: boolean
}

/**
 * Custom hook for smart refresh functionality
 * - Subscribes to notification events
 * - Provides refresh callbacks for specific data types
 * - Uses Page Visibility API to refresh on tab focus
 * - Implements debouncing to prevent rapid refreshes
 */
export function useSmartRefresh(
  refreshCallback: () => void | Promise<void>,
  dependencies: string[] = [],
  options: UseSmartRefreshOptions = {}
) {
  const { debounceMs = 300, enablePageVisibility = true } = options
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastRefreshRef = useRef<number>(0)

  // Debounced refresh function
  const debouncedRefresh = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const now = Date.now()
      // Prevent refreshes more frequent than debounceMs
      if (now - lastRefreshRef.current >= debounceMs) {
        lastRefreshRef.current = now
        refreshCallback()
      }
    }, debounceMs)
  }, [refreshCallback, debounceMs])

  // Handle notification events
  const handleNotificationEvent = useCallback((event: CustomEvent<RefreshEvent>) => {
    const { type } = event.detail
    
    // Check if this refresh is relevant to our dependencies
    if (dependencies.length === 0 || dependencies.includes(type)) {
      debouncedRefresh()
    }
  }, [dependencies, debouncedRefresh])

  // Handle page visibility change
  const handleVisibilityChange = useCallback(() => {
    if (!document.hidden && enablePageVisibility) {
      debouncedRefresh()
    }
  }, [debouncedRefresh, enablePageVisibility])

  // Set up event listeners
  useEffect(() => {
    // Listen for custom refresh events
    const eventName = 'smart-refresh'
    document.addEventListener(eventName, handleNotificationEvent as EventListener)

    // Listen for page visibility changes
    if (enablePageVisibility) {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    return () => {
      document.removeEventListener(eventName, handleNotificationEvent as EventListener)
      if (enablePageVisibility) {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
      
      // Clear debounce timeout on cleanup
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [handleNotificationEvent, handleVisibilityChange, enablePageVisibility])

  // Manual refresh function
  const manualRefresh = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    refreshCallback()
  }, [refreshCallback])

  return {
    manualRefresh,
    triggerRefresh: (type: string, payload?: any) => {
      const event = new CustomEvent('smart-refresh', {
        detail: { type, payload }
      })
      document.dispatchEvent(event)
    }
  }
}

/**
 * Utility function to emit refresh events
 * Can be used from anywhere in the app
 */
export const emitRefreshEvent = (type: string, payload?: any) => {
  const event = new CustomEvent('smart-refresh', {
    detail: { type, payload }
  })
  document.dispatchEvent(event)
}
