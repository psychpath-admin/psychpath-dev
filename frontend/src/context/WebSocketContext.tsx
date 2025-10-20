import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { toast } from 'sonner'

interface Notification {
  id: string
  title: string
  body: string
  notification_type: string
  actor_name: string
  related_object_type: string | null
  related_object_id: string | null
  read: boolean
  created_at: string
}

interface WebSocketContextType {
  connected: boolean
  notifications: Notification[]
  addNotification: (notification: Notification) => void
  clearNotifications: () => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [connected, setConnected] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const pingIntervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!user) {
      disconnectWebSocket()
      return
    }

    connectWebSocket()

    return () => {
      disconnectWebSocket()
    }
  }, [user])

  const connectWebSocket = () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const wsUrl = `ws://localhost:8000/ws/notifications/?token=${token}`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket connected')
      setConnected(true)
      
      // Start ping interval to keep connection alive
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 30000)
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      if (data.type === 'notification') {
        addNotification(data.notification)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setConnected(false)
      
      // Clear ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }
      
      // Attempt reconnection after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Attempting to reconnect...')
        connectWebSocket()
      }, 5000)
    }

    wsRef.current = ws
  }

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
    }
  }

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50))
    
    // Show toast for important notifications
    if (['logbook_approved', 'logbook_rejected', 'comment_added'].includes(notification.notification_type)) {
      toast.info(notification.title, {
        description: notification.body,
        duration: 5000,
      })
    }
  }

  const clearNotifications = () => {
    setNotifications([])
  }

  return (
    <WebSocketContext.Provider value={{ connected, notifications, addNotification, clearNotifications }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider')
  }
  return context
}
