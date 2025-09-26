import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'

export interface Notification {
  id: number
  notification_type: string
  type_display: string
  payload: Record<string, any>
  read: boolean
  created_at: string
  message: string
  action_url?: string
}

export interface NotificationStats {
  total: number
  unread: number
  by_type: Record<string, number>
}

export function useNotifications(limit: number = 10) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0, by_type: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pollMs, setPollMs] = useState(5000) // start at 5s and backoff on errors

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiFetch(`/api/logbook/notifications/?limit=${limit}`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
        // reset backoff on success
        if (pollMs !== 10000) setPollMs(10000)
      } else {
        console.error('Failed to fetch notifications:', response.status)
        setError('Failed to fetch notifications')
        // backoff on error up to 60s
        setPollMs(prev => Math.min(prev * 2, 60000))
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError('Error fetching notifications')
      // backoff on error up to 60s
      setPollMs(prev => Math.min(prev * 2, 60000))
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await apiFetch('/api/logbook/notifications/stats/')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Error fetching notification stats:', err)
    }
  }

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await apiFetch(`/api/logbook/notifications/${notificationId}/read/`, {
        method: 'PATCH'
      })
      
      if (response.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId ? { ...notif, read: true } : notif
          )
        )
        setStats(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1)
        }))
        return true
      }
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
    return false
  }

  const refresh = () => {
    fetchNotifications()
    fetchStats()
  }

  useEffect(() => {
    fetchNotifications()
    fetchStats()
  }, [limit])

  // Auto-refresh notifications + stats on interval (skip work when tab hidden)
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      refresh()
    }, pollMs)
    return () => clearInterval(intervalId)
  }, [pollMs, limit])

  // Refresh immediately on focus or when tab becomes visible
  useEffect(() => {
    const onFocus = () => refresh()
    const onVisibilityChange = () => {
      if (!document.hidden) refresh()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return {
    notifications,
    stats,
    loading,
    error,
    markAsRead,
    refresh
  }
}
