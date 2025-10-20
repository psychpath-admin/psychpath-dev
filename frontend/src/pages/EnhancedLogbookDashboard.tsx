/**
 * Enhanced Logbook Dashboard
 * Implements the comprehensive logbook review process with modern UI
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  Eye, 
  Edit, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Lock, 
  Unlock,
  Bell,
  Filter,
  Search,
  Calendar,
  User,
  FileText,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'

interface Logbook {
  id: string
  owner: {
    id: number
    email: string
    first_name: string
    last_name: string
  }
  supervisor: {
    id: number
    email: string
    first_name: string
    last_name: string
  } | null
  week_start_date: string
  status: 'draft' | 'submitted' | 'under_review' | 'changes_requested' | 'approved' | 'locked'
  total_dcc_hours: number
  total_cra_hours: number
  total_pd_hours: number
  total_supervision_hours: number
  created_at: string
  updated_at: string
  submitted_at: string | null
  approved_at: string | null
  is_locked: boolean
  can_edit: boolean
  can_submit: boolean
  can_approve: boolean
  can_reject: boolean
  can_request_unlock: boolean
  can_grant_unlock: boolean
}

interface Notification {
  id: string
  title: string
  body: string
  notification_type: string
  read: boolean
  created_at: string
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  changes_requested: 'bg-orange-100 text-orange-800',
  approved: 'bg-green-100 text-green-800',
  locked: 'bg-purple-100 text-purple-800',
}

const statusIcons = {
  draft: Edit,
  submitted: Clock,
  under_review: Eye,
  changes_requested: XCircle,
  approved: CheckCircle,
  locked: Lock,
}

export default function EnhancedLogbookDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [logbooks, setLogbooks] = useState<Logbook[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => {
    fetchLogbooks()
    fetchNotifications()
  }, [currentPage, pageSize, searchTerm, statusFilter])

  const fetchLogbooks = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: pageSize.toString(),
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : '',
      })
      
      const response = await apiFetch(`/api/enhanced-logbooks/?${params}`)
      setLogbooks(response.results || response)
      setTotalPages(response.total_pages || 1)
    } catch (error) {
      console.error('Error fetching logbooks:', error)
      toast.error('Failed to load logbooks')
    } finally {
      setLoading(false)
    }
  }

  const fetchNotifications = async () => {
    try {
      const response = await apiFetch('/api/enhanced-logbooks/notifications/')
      setNotifications(response.results || response)
      setUnreadCount(response.filter((n: Notification) => !n.read).length)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const handleCreateLogbook = () => {
    navigate('/enhanced-logbooks/create')
  }

  const handleViewLogbook = (logbookId: string) => {
    navigate(`/enhanced-logbooks/${logbookId}`)
  }

  const handleStatusAction = async (logbookId: string, action: string, data?: any) => {
    try {
      await apiFetch(`/api/enhanced-logbooks/${logbookId}/${action}/`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      })
      
      toast.success(`Logbook ${action} successful`)
      fetchLogbooks()
      fetchNotifications()
    } catch (error) {
      console.error(`Error ${action} logbook:`, error)
      toast.error(`Failed to ${action} logbook`)
    }
  }

  const markNotificationRead = async (notificationId: string) => {
    try {
      await apiFetch(`/api/enhanced-logbooks/notifications/${notificationId}/read/`, {
        method: 'POST',
      })
      fetchNotifications()
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllNotificationsRead = async () => {
    try {
      await apiFetch('/api/enhanced-logbooks/notifications/read-all/', {
        method: 'POST',
      })
      fetchNotifications()
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getStatusDisplay = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getTotalHours = (logbook: Logbook) => {
    return logbook.total_dcc_hours + logbook.total_cra_hours + 
           logbook.total_pd_hours + logbook.total_supervision_hours
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Enhanced Logbooks</h1>
              <p className="text-gray-600 mt-2">Comprehensive logbook review and management system</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Notifications</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={markAllNotificationsRead}
                        >
                          Mark all read
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-gray-500 text-center">No notifications</div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                              !notification.read ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => markNotificationRead(notification.id)}
                          >
                            <div className="font-medium text-sm">{notification.title}</div>
                            <div className="text-xs text-gray-600 mt-1">{notification.body}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              {formatDate(notification.created_at)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <Button onClick={handleCreateLogbook} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                New Logbook
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search logbooks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="changes_requested">Changes Requested</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="locked">Locked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logbooks List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading logbooks...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logbooks.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No logbooks found</h3>
                  <p className="text-gray-600 mb-4">Get started by creating your first logbook</p>
                  <Button onClick={handleCreateLogbook}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Logbook
                  </Button>
                </CardContent>
              </Card>
            ) : (
              logbooks.map((logbook) => {
                const StatusIcon = statusIcons[logbook.status]
                const totalHours = getTotalHours(logbook)
                
                return (
                  <Card key={logbook.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <StatusIcon className="h-5 w-5 text-gray-600" />
                            <h3 className="text-lg font-semibold text-gray-900">
                              Week of {formatDate(logbook.week_start_date)}
                            </h3>
                            <Badge className={statusColors[logbook.status]}>
                              {getStatusDisplay(logbook.status)}
                            </Badge>
                            {logbook.is_locked && (
                              <Badge variant="outline" className="text-purple-600 border-purple-600">
                                <Lock className="h-3 w-3 mr-1" />
                                Locked
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>Owner: {logbook.owner.first_name} {logbook.owner.last_name}</span>
                            </div>
                            {logbook.supervisor && (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>Supervisor: {logbook.supervisor.first_name} {logbook.supervisor.last_name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>Total: {totalHours.toFixed(1)}h</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>Updated: {formatDate(logbook.updated_at)}</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">DCC:</span>
                              <span className="ml-1 font-medium">{logbook.total_dcc_hours}h</span>
                            </div>
                            <div>
                              <span className="text-gray-500">CRA:</span>
                              <span className="ml-1 font-medium">{logbook.total_cra_hours}h</span>
                            </div>
                            <div>
                              <span className="text-gray-500">PD:</span>
                              <span className="ml-1 font-medium">{logbook.total_pd_hours}h</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Supervision:</span>
                              <span className="ml-1 font-medium">{logbook.total_supervision_hours}h</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewLogbook(logbook.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          
                          {logbook.can_edit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewLogbook(logbook.id)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          )}
                          
                          {logbook.can_submit && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusAction(logbook.id, 'submit')}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Submit
                            </Button>
                          )}
                          
                          {logbook.can_approve && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusAction(logbook.id, 'approve')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          )}
                          
                          {logbook.can_reject && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusAction(logbook.id, 'reject')}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          )}
                          
                          {logbook.can_request_unlock && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusAction(logbook.id, 'request-edit')}
                            >
                              <Unlock className="h-4 w-4 mr-1" />
                              Request Edit
                            </Button>
                          )}
                          
                          {logbook.can_grant_unlock && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusAction(logbook.id, 'grant-edit')}
                            >
                              <Unlock className="h-4 w-4 mr-1" />
                              Grant Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
