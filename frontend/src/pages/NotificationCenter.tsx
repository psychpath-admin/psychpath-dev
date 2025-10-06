import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Bell, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  MessageSquare, 
  Unlock, 
  Filter,
  CheckCheck,
  RefreshCw
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useSimpleFilterPersistence } from '@/hooks/useFilterPersistence'

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

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0, by_type: {} })
  const [loading, setLoading] = useState(true)
  const [markingAllRead, setMarkingAllRead] = useState(false)
  
  // Persistent filters
  const [readFilter, setReadFilter] = useSimpleFilterPersistence<'all' | 'read' | 'unread'>('notifications-read-filter', 'all')
  const [typeFilter, setTypeFilter] = useSimpleFilterPersistence<string>('notifications-type-filter', 'all')
  const [limit, setLimit] = useSimpleFilterPersistence<number>('notifications-limit', 50)

  useEffect(() => {
    fetchNotifications()
    fetchStats()
  }, [readFilter, typeFilter, limit])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (readFilter !== 'all') {
        params.append('read', readFilter === 'read' ? 'true' : 'false')
      }
      if (typeFilter !== 'all') {
        params.append('type', typeFilter)
      }
      params.append('limit', limit.toString())

      const response = await apiFetch(`/api/logbook/notifications/?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
      } else {
        console.error('Failed to fetch notifications:', response.status)
        setNotifications([])
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setNotifications([])
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
    } catch (error) {
      console.error('Error fetching notification stats:', error)
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
        // Update stats
        setStats(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1)
        }))
        toast.success('Notification marked as read')
      } else {
        toast.error('Failed to mark notification as read')
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast.error('Failed to mark notification as read')
    }
  }

  const markAllAsRead = async () => {
    setMarkingAllRead(true)
    try {
      const response = await apiFetch('/api/logbook/notifications/read-all/', {
        method: 'PATCH'
      })
      
      if (response.ok) {
        const data = await response.json()
        // Update local state
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, read: true }))
        )
        // Update stats
        setStats(prev => ({
          ...prev,
          unread: 0
        }))
        toast.success(`Marked ${data.updated_count} notifications as read`)
      } else {
        toast.error('Failed to mark all notifications as read')
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      toast.error('Failed to mark all notifications as read')
    } finally {
      setMarkingAllRead(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'logbook_submitted':
      case 'logbook_status_updated':
        return <CheckCircle className="h-5 w-5 text-blue-600" />
      case 'comment_added':
        return <MessageSquare className="h-5 w-5 text-green-600" />
      case 'unlock_requested':
      case 'unlock_approved':
      case 'unlock_denied':
      case 'unlock_expiry_warning':
        return <Unlock className="h-5 w-5 text-orange-600" />
      case 'supervision_invite_pending':
        return <AlertCircle className="h-5 w-5 text-purple-600" />
      default:
        return <Bell className="h-5 w-5 text-gray-600" />
    }
  }

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'logbook_submitted':
      case 'logbook_status_updated':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'comment_added':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'unlock_requested':
      case 'unlock_approved':
      case 'unlock_denied':
      case 'unlock_expiry_warning':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'supervision_invite_pending':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notifications
          </h1>
          <p className="text-muted-foreground">
            Manage your platform notifications
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchNotifications}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Notifications</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Unread</p>
                <p className="text-2xl font-bold text-red-600">{stats.unread}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Read</p>
                <p className="text-2xl font-bold text-green-600">{stats.total - stats.unread}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              
              <Select value={readFilter} onValueChange={(value: 'all' | 'read' | 'unread') => setReadFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="logbook_submitted">Logbook Submitted</SelectItem>
                  <SelectItem value="logbook_status_updated">Status Updated</SelectItem>
                  <SelectItem value="comment_added">Comments</SelectItem>
                  <SelectItem value="unlock_requested">Unlock Requests</SelectItem>
                  <SelectItem value="unlock_approved">Unlock Approved</SelectItem>
                  <SelectItem value="unlock_denied">Unlock Denied</SelectItem>
                  <SelectItem value="supervision_invite_pending">Supervision Invites</SelectItem>
                </SelectContent>
              </Select>

              <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {stats.unread > 0 && (
              <Button
                variant="outline"
                onClick={markAllAsRead}
                disabled={markingAllRead}
                className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                {markingAllRead ? 'Marking...' : `Mark All Read (${stats.unread})`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {notifications.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {notifications.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-gray-400" />
              <p className="text-gray-600">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No notifications found</h3>
              <p className="text-gray-600">
                {readFilter === 'unread' 
                  ? "You're all caught up! No unread notifications."
                  : "No notifications match your current filters."
                }
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification, index) => (
                <div
                  key={notification.id || `notification-${index}`}
                  className={`p-6 hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.notification_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={getNotificationTypeColor(notification.notification_type)}
                          >
                            {notification.type_display}
                          </Badge>
                          {!notification.read && (
                            <Badge variant="default" className="bg-blue-600 text-white">
                              New
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="h-8 w-8 p-0 hover:bg-green-100"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-gray-900 mb-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          {formatDate(notification.created_at)}
                        </span>
                        
                        {notification.action_url && (
                          <Link
                            to={notification.action_url}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View Details →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
