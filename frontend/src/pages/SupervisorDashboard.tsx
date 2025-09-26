import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import SupervisionManagement from '@/components/SupervisionManagement'
import { useNotifications } from '@/hooks/useNotifications'
import { 
  Users, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  MessageSquare,
  Plus,
  UserPlus,
  Clock,
  TrendingUp,
  Bell,
  Settings,
  BarChart3
} from 'lucide-react'

interface Supervisee {
  id: string
  name: string
  status: 'on-track' | 'overdue' | 'at-risk'
  role: string
  supervisionId?: number
  email?: string
  progress: {
    directClient: { current: number; target: number }
    clientRelated: { current: number; target: number }
    supervision: { current: number; target: number }
    pd: { current: number; target: number }
    individualSupervision: { current: number }
  }
  overdueDates: string[]
  lastSubmission: string
}

interface DashboardStats {
  totalSupervisees: number
  pendingReviews: number
  overdueLogbooks: number
  onTrack: number
}

export default function SupervisorDashboard() {
  console.log('SupervisorDashboard: Component starting')
  const [selectedSupervisee, setSelectedSupervisee] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    totalSupervisees: 0,
    pendingReviews: 0,
    overdueLogbooks: 0,
    onTrack: 0
  })
  const [supervisees, setSupervisees] = useState<Supervisee[]>([])
  const [loading, setLoading] = useState(true)
  
  // Notification data
  const { notifications, stats: notificationStats, loading: notificationsLoading, markAsRead } = useNotifications(5)

  // Function to trigger dashboard refresh
  const handleSupervisionUpdate = () => {
    fetchSupervisorData()
  }

  // Function to remove a supervisee
  const removeSupervisee = async (supervisionId: number, superviseeEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${superviseeEmail} from your supervision stable? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/supervisions/${supervisionId}/remove/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // Refresh the dashboard data
        await fetchSupervisorData()
        // Show success message
        alert('Supervisee removed successfully')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to remove supervisee')
      }
    } catch (error) {
      console.error('Error removing supervisee:', error)
      alert('Error removing supervisee')
    }
  }

  // Fetch real supervisor data from API
  const fetchSupervisorData = async () => {
    try {
      setLoading(true)
      
      // Fetch supervision relationships (both pending and accepted)
      const superviseesResponse = await fetch('/api/supervisions/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (superviseesResponse.ok) {
        const superviseesData = await superviseesResponse.json()
        console.log('SupervisorDashboard: /api/supervisions payload:', superviseesData)
        // Transform API data to match Supervisee interface (use Supervision serializer fields)
        const transformed = superviseesData.map((item: any, index: number) => {
          const isPrimaryAccepted = (item?.status === 'ACCEPTED') && (item?.role === 'PRIMARY')
          return {
            id: (item.id ?? index).toString(),
            name: item.supervisee_name || item.supervisee_email || 'Unknown User',
            status: isPrimaryAccepted ? 'on-track' : 'pending',
            role: 'Provisional Psychologist',
            supervisionId: item.id,
            email: item.supervisee_email,
            progress: {
              directClient: { current: 0, target: 15.16 },
              clientRelated: { current: 0, target: 41.21 },
              supervision: { current: 0, target: 2.42 },
              pd: { current: 0, target: 1.81 },
              individualSupervision: { current: 0 }
            },
            overdueDates: [],
            lastSubmission: 'Never'
          }
        })

        // Only accepted PRIMARY supervisions are active
        const active = transformed.filter((s: any) => s.status === 'on-track')
        console.log('SupervisorDashboard: transformed items:', transformed)
        console.log('SupervisorDashboard: active items:', active)
        setSupervisees(active)

        // Update stats based on active supervisions
        const totalSupervisees = active.length
        const pendingReviews = 0
        const onTrack = active.length
        const overdueLogbooks = 0
        
        // Prefer backend stats so header matches Supervision Management
        try {
          const statsRes = await fetch('/api/supervisions/stats/', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
              'Content-Type': 'application/json',
            },
          })
          if (statsRes.ok) {
            const s = await statsRes.json()
            setStats({
              totalSupervisees: (s.primary_supervisions || 0),
              pendingReviews,
              overdueLogbooks,
              onTrack: (s.primary_supervisions || 0)
            })
          } else {
            setStats({ totalSupervisees, pendingReviews, overdueLogbooks, onTrack })
          }
        } catch {
          setStats({ totalSupervisees, pendingReviews, overdueLogbooks, onTrack })
        }
      } else {
        // If no supervisees, show empty state
        setSupervisees([])
        setStats({
          totalSupervisees: 0,
          pendingReviews: 0,
          overdueLogbooks: 0,
          onTrack: 0
        })
      }
    } catch (error) {
      console.error('Error fetching supervisor data:', error)
      // Show empty state on error
      setSupervisees([])
      setStats({
        totalSupervisees: 0,
        pendingReviews: 0,
        overdueLogbooks: 0,
        onTrack: 0
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch data on component mount
  useEffect(() => {
    fetchSupervisorData()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'at-risk':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on-track':
        return <CheckCircle className="h-4 w-4" />
      case 'overdue':
        return <AlertTriangle className="h-4 w-4" />
      case 'at-risk':
        return <Clock className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const selectedSuperviseeData = selectedSupervisee 
    ? supervisees.find(s => s.id === selectedSupervisee)
    : supervisees[0]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading supervisor data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Supervisor Dashboard</h1>
              <p className="text-gray-600 mt-1">
                {supervisees.length > 0 ? `${supervisees.length} supervisee${supervisees.length === 1 ? '' : 's'}` : 'No supervisees yet'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Reports
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
          
          {/* Quick Stats Bar */}
          <div className="grid grid-cols-4 gap-6 pb-6">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSupervisees}</p>
              <p className="text-sm text-gray-600">Total Supervisees</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-2">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingReviews}</p>
              <p className="text-sm text-gray-600">Pending Reviews</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-lg mx-auto mb-2">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.overdueLogbooks}</p>
              <p className="text-sm text-gray-600">Overdue Logbooks</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.onTrack}</p>
              <p className="text-sm text-gray-600">On Track</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Layout - 2 Column */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Left Column - Active Supervisees (40%) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Active Supervisees List */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Active Supervisees
                  </span>
                  <Badge variant="outline">{supervisees.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {supervisees.length > 0 ? (
                  supervisees.map((supervisee) => (
                    <div 
                      key={supervisee.id} 
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedSupervisee === supervisee.id 
                          ? 'border-blue-300 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedSupervisee(supervisee.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{supervisee.name}</p>
                            <p className="text-xs text-gray-500">{supervisee.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(supervisee.status)}>
                            {getStatusIcon(supervisee.status)}
                            <span className="ml-1 capitalize">{supervisee.status.replace('-', ' ')}</span>
                          </Badge>
                          {supervisee.supervisionId && supervisee.email && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeSupervisee(supervisee.supervisionId!, supervisee.email!)
                              }}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">No supervisees yet</p>
                    <p className="text-sm text-gray-400">Supervisees will appear here once they request supervision</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Enrol New Supervisee
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Meeting
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  View Reports
                </Button>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                  {notificationStats.unread > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {notificationStats.unread}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {notificationsLoading ? (
                  <div className="space-y-3">
                    <div className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded-lg"></div>
                      <div className="h-16 bg-gray-200 rounded-lg mt-3"></div>
                    </div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No notifications</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.slice(0, 3).map((notification) => {
                      const isUrgent = notification.notification_type.includes('overdue') || 
                                      notification.notification_type.includes('expiry') ||
                                      notification.notification_type.includes('denied')
                      const isInfo = notification.notification_type.includes('approved') ||
                                   notification.notification_type.includes('meeting') ||
                                   notification.notification_type.includes('submitted')
                      
                      return (
                        <div
                          key={notification.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow ${
                            isUrgent 
                              ? 'bg-red-50 border-red-200' 
                              : isInfo 
                                ? 'bg-blue-50 border-blue-200' 
                                : 'bg-gray-50 border-gray-200'
                          } ${!notification.read ? 'ring-2 ring-blue-200' : ''}`}
                          onClick={() => {
                            if (notification.action_url) {
                              window.location.href = notification.action_url
                            }
                            if (!notification.read) {
                              markAsRead(notification.id)
                            }
                          }}
                        >
                          {isUrgent ? (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          ) : isInfo ? (
                            <Clock className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Bell className="h-4 w-4 text-gray-600" />
                          )}
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              isUrgent ? 'text-red-800' : isInfo ? 'text-blue-800' : 'text-gray-800'
                            }`}>
                              {notification.type_display}
                            </p>
                            <p className={`text-xs ${
                              isUrgent ? 'text-red-600' : isInfo ? 'text-blue-600' : 'text-gray-600'
                            }`}>
                              {notification.message}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      )
                    })}
                    {notifications.length > 3 && (
                      <div className="text-center pt-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => window.location.href = '/notifications'}
                        >
                          View all notifications ({notifications.length})
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Meetings */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Meetings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6 text-gray-500">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No upcoming meetings</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => window.location.href = '/calendar'}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Meeting
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Main Content (60%) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Supervision Management - Primary Focus */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Supervision Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SupervisionManagement onUpdate={handleSupervisionUpdate} />
              </CardContent>
            </Card>

            {/* Selected Supervisee Progress Overview */}
            {selectedSuperviseeData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      {selectedSuperviseeData.name} - Progress Overview
                    </span>
                    <Badge className={getStatusColor(selectedSuperviseeData.status)}>
                      {getStatusIcon(selectedSuperviseeData.status)}
                      <span className="ml-1 capitalize">{selectedSuperviseeData.status.replace('-', ' ')}</span>
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Direct Client Contact</span>
                          <span className="text-sm text-gray-500">
                            {selectedSuperviseeData.progress.directClient.current}h / {selectedSuperviseeData.progress.directClient.target}h
                          </span>
                        </div>
                        <Progress 
                          value={(selectedSuperviseeData.progress.directClient.current / selectedSuperviseeData.progress.directClient.target) * 100} 
                          className="h-2" 
                        />
                        <div className="flex items-center gap-1 mt-1">
                          {selectedSuperviseeData.progress.directClient.current >= selectedSuperviseeData.progress.directClient.target ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-xs text-gray-500">
                            {selectedSuperviseeData.progress.directClient.current >= selectedSuperviseeData.progress.directClient.target ? 'Target Met' : 'Below Target'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Client Related Activities</span>
                          <span className="text-sm text-gray-500">
                            {selectedSuperviseeData.progress.clientRelated.current}h / {selectedSuperviseeData.progress.clientRelated.target}h
                          </span>
                        </div>
                        <Progress 
                          value={(selectedSuperviseeData.progress.clientRelated.current / selectedSuperviseeData.progress.clientRelated.target) * 100} 
                          className="h-2" 
                        />
                        <div className="flex items-center gap-1 mt-1">
                          {selectedSuperviseeData.progress.clientRelated.current >= selectedSuperviseeData.progress.clientRelated.target ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-xs text-gray-500">
                            {selectedSuperviseeData.progress.clientRelated.current >= selectedSuperviseeData.progress.clientRelated.target ? 'Target Met' : 'Below Target'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Supervision Hours</span>
                          <span className="text-sm text-gray-500">
                            {selectedSuperviseeData.progress.supervision.current}h / {selectedSuperviseeData.progress.supervision.target}h
                          </span>
                        </div>
                        <Progress 
                          value={(selectedSuperviseeData.progress.supervision.current / selectedSuperviseeData.progress.supervision.target) * 100} 
                          className="h-2" 
                        />
                        <div className="flex items-center gap-1 mt-1">
                          {selectedSuperviseeData.progress.supervision.current >= selectedSuperviseeData.progress.supervision.target ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-xs text-gray-500">
                            {selectedSuperviseeData.progress.supervision.current >= selectedSuperviseeData.progress.supervision.target ? 'Target Met' : 'Below Target'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Professional Development</span>
                          <span className="text-sm text-gray-500">
                            {selectedSuperviseeData.progress.pd.current}h / {selectedSuperviseeData.progress.pd.target}h
                          </span>
                        </div>
                        <Progress 
                          value={(selectedSuperviseeData.progress.pd.current / selectedSuperviseeData.progress.pd.target) * 100} 
                          className="h-2" 
                        />
                        <div className="flex items-center gap-1 mt-1">
                          {selectedSuperviseeData.progress.pd.current >= selectedSuperviseeData.progress.pd.target ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-xs text-gray-500">
                            {selectedSuperviseeData.progress.pd.current >= selectedSuperviseeData.progress.pd.target ? 'Target Met' : 'Below Target'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedSuperviseeData.overdueDates.length > 0 && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="font-medium text-red-800">Overdue Logbook Entries</span>
                      </div>
                      <p className="text-sm text-red-600">
                        Dates: {selectedSuperviseeData.overdueDates.join(', ')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}