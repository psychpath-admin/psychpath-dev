import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover'
import { Bell, Clock, CheckCircle, AlertCircle, MessageSquare, Unlock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useWebSocket } from '@/context/WebSocketContext'

interface Notification {
  id: number
  notification_type: string
  type_display: string
  payload: Record<string, any>
  read: boolean
  created_at: string
  message: string
  action_url?: string
}

interface NotificationStats {
  total: number
  unread: number
  by_type: Record<string, number>
}

export default function HeaderNotificationBell() {
  const { notifications: wsNotifications, connected } = useWebSocket()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0, by_type: {} })
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetchNotificationStats()
    if (open) {
      fetchNotifications()
    }
  }, [open])

  // Merge WebSocket notifications with fetched ones
  useEffect(() => {
    if (wsNotifications.length > 0) {
      setNotifications(prev => {
        const merged = [...wsNotifications, ...prev]
        const unique = merged.filter((notif, index, self) => 
          index === self.findIndex(n => n.id === notif.id)
        )
        return unique.slice(0, 50)
      })
      
      // Update unread count
      setStats(prev => ({
        ...prev,
        unread: prev.unread + wsNotifications.filter(n => !n.read).length
      }))
    }
  }, [wsNotifications])

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchNotificationStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotificationStats = async () => {
    try {
      const response = await apiFetch('/api/logbook/notifications/stats/')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching notification stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchNotifications = async () => {
    try {
      const response = await apiFetch('/api/logbook/notifications/?limit=10')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
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
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast.error('Failed to mark notification as read')
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'logbook_submitted':
      case 'logbook_status_updated':
        return <CheckCircle className="h-4 w-4 text-blue-600" />
      case 'comment_added':
        return <MessageSquare className="h-4 w-4 text-green-600" />
      case 'unlock_requested':
      case 'unlock_approved':
      case 'unlock_denied':
      case 'unlock_expiry_warning':
        return <Unlock className="h-4 w-4 text-orange-600" />
      case 'supervision_invite_pending':
        return <AlertCircle className="h-4 w-4 text-purple-600" />
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative p-2 hover:bg-gray-100"
        >
          <Bell className="h-5 w-5" />
          {stats.unread > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {stats.unread > 99 ? '99+' : stats.unread}
            </Badge>
          )}
          {connected && (
            <div className="w-2 h-2 bg-green-500 rounded-full absolute top-0 right-0" 
                 title="Connected" />
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {stats.unread > 0 && (
              <span className="text-sm text-gray-600">
                {stats.unread} unread
              </span>
            )}
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-600">
              <Clock className="h-6 w-6 mx-auto mb-2 animate-spin" />
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-600">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification, index) => (
                <div
                  key={notification.id || `notification-${index}`}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${
                    !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => {
                    if (notification.action_url) {
                      setOpen(false)
                      // Navigate to action URL
                      window.location.href = notification.action_url
                    }
                    if (!notification.read) {
                      markAsRead(notification.id)
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.notification_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {notification.type_display}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(notification.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {notification.message}
                      </p>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {notifications.length > 0 && (
          <div className="p-3 border-t bg-gray-50">
            <Link
              to="/notifications"
              className="block w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
              onClick={() => setOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
