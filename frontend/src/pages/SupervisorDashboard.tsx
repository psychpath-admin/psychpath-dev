import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/status'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useNotifications } from '@/hooks/useNotifications'
import NotificationBell from '@/components/NotificationBell'
import { apiFetch } from '@/lib/api'
import { 
  Users, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Plus,
  UserPlus,
  Settings,
  BarChart3,
  ClipboardCheck,
  Eye,
  User,
  Mail,
  Info,
  ToggleLeft,
  ToggleRight
} from 'lucide-react'

interface Supervisee {
  id: string
  name: string
  email: string
  status: 'on-track' | 'overdue' | 'at-risk'
  role: string
  supervisionId?: number
  supervision_type: 'PRIMARY' | 'SECONDARY'
  rag_status: 'green' | 'amber' | 'red'
  last_logbook_status: string
  last_logbook_date: string
  total_hours_logged: number
  target_hours: number
  supervision_ratio: number
  next_epa_due: string
}

interface LogbookForReview {
  id: number
  trainee_name: string
  trainee_email: string
  week_start_date: string
  week_end_date: string
  week_display: string
  status: string
  submitted_at: string
  reviewed_at?: string
  resubmitted_at?: string
  section_totals: any
  message_count: number
}

interface SupervisionInvitation {
  id: number
  name: string
  email: string
  type: string
  status: string
  expires: string
}

interface DashboardStats {
  superviseesOnTrack: number
  logbooksNeedingReview: number
  overdueLogbooks: number
  totalActiveSupervisees: number
}

export default function SupervisorDashboard() {
  console.log('SupervisorDashboard: Component starting')
  const [stats, setStats] = useState<DashboardStats>({
    superviseesOnTrack: 0,
    logbooksNeedingReview: 0,
    overdueLogbooks: 0,
    totalActiveSupervisees: 0
  })
  const [supervisees, setSupervisees] = useState<Supervisee[]>([])
  const [logbooksForReview, setLogbooksForReview] = useState<LogbookForReview[]>([])
  const [supervisionInvitations, setSupervisionInvitations] = useState<SupervisionInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [invitationFilter, setInvitationFilter] = useState('All')
  const [unlockRequestCount, setUnlockRequestCount] = useState(0)
  const [tooltipsEnabled, setTooltipsEnabled] = useState(true)
  
  // Notification data
  const { } = useNotifications(5)

  // Fetch supervisees data
  const fetchSupervisees = async () => {
    try {
      const response = await fetch('/api/supervisions/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const superviseesData = await response.json()
        const active = superviseesData.filter((item: any) => item.status === 'ACCEPTED')
        
        const transformed = active.map((item: any) => ({
          id: item.id.toString(),
          name: item.supervisee_name || item.supervisee_email || 'Unknown User',
          email: item.supervisee_email,
          status: 'on-track' as const,
          role: item.supervisee_role || 'Registrar',
          supervisionId: item.id,
          supervision_type: item.role,
          rag_status: 'green' as const, // TODO: Calculate actual RAG status
          last_logbook_status: 'No submissions',
          last_logbook_date: 'Never',
          total_hours_logged: 0, // TODO: Calculate from logbooks
          target_hours: 1500,
          supervision_ratio: 1,
          next_epa_due: 'TBD'
        }))
        
        setSupervisees(transformed)
        return transformed
      }
    } catch (error) {
      console.error('Error fetching supervisees:', error)
    }
    return []
  }

  // Fetch logbooks for review
  const fetchLogbooksForReview = async () => {
    try {
      const response = await fetch('/api/logbook/supervisor/?status=submitted', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setLogbooksForReview(data)
        return data
      }
    } catch (error) {
      console.error('Error fetching logbooks for review:', error)
    }
    return []
  }

  // Fetch supervision invitations
  const fetchSupervisionInvitations = async () => {
    try {
      // This would need to be implemented in the backend
      // For now, return empty array
      setSupervisionInvitations([])
      return []
    } catch (error) {
      console.error('Error fetching supervision invitations:', error)
    }
    return []
  }

  // Calculate dashboard stats
  const calculateStats = async () => {
    const superviseesData = await fetchSupervisees()
    const logbooksData = await fetchLogbooksForReview()
    
    // Only count logbooks that need review (submitted and either never reviewed or submitted after review)
    const logbooksNeedingReview = logbooksData.filter((logbook: LogbookForReview) => {
      if (logbook.status !== 'submitted') return false
      if (!logbook.reviewed_at) return true // Never reviewed
      // If submitted after review, it needs review again
      return logbook.submitted_at && new Date(logbook.submitted_at) > new Date(logbook.reviewed_at)
    })
    
    const stats = {
      superviseesOnTrack: superviseesData.length, // All active supervisees are considered on track for now
      logbooksNeedingReview: logbooksNeedingReview.length,
      overdueLogbooks: 0, // TODO: Calculate overdue logbooks
      totalActiveSupervisees: superviseesData.length
    }
    
    setStats(stats)
  }

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        calculateStats(),
        fetchLogbooksForReview(),
        fetchSupervisionInvitations()
      ])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUnlockRequestCount = async () => {
    try {
      const response = await apiFetch('/api/logbook/unlock-requests/queue/')
      if (response.ok) {
        const data = await response.json()
        setUnlockRequestCount(data.length)
      }
    } catch (error) {
      console.error('Error fetching unlock request count:', error)
    }
  }

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData()
    fetchUnlockRequestCount()
  }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData()
      fetchUnlockRequestCount()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const getRAGColor = (status: string) => {
    switch (status) {
      case 'green': return 'bg-green-100 text-green-800 border-green-200'
      case 'amber': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'red': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'approved': return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      case 'returned_for_edits': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'Never') return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  // Tooltip component
  const Tooltip = ({ children, content, enabled }: { children: React.ReactNode, content: string, enabled: boolean }) => {
    if (!enabled) return <>{children}</>
    
    return (
      <div className="relative group">
        {children}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 w-64 text-center">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    )
  }

  const filteredInvitations = supervisionInvitations.filter(invitation => {
    if (invitationFilter === 'All') return true
    return invitation.status.toLowerCase() === invitationFilter.toLowerCase()
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading supervisor dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                👥 Supervisor Overview
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your supervisees and review their progress
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/logbook/'}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Reports
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Unlock Request Notification */}
        {unlockRequestCount > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-orange-900">
                      Unlock Request{unlockRequestCount > 1 ? 's' : ''} Pending Review
                    </h3>
                    <p className="text-orange-700 mt-1">
                      You have <strong>{unlockRequestCount}</strong> unlock request{unlockRequestCount > 1 ? 's' : ''} waiting for your review.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => window.location.href = '/logbook/'}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Review Requests
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Header with Tooltip Toggle and Notification Bell */}
        <div className="flex justify-between items-center">
          <div></div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTooltipsEnabled(!tooltipsEnabled)}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
            >
              {tooltipsEnabled ? (
                <ToggleRight className="h-4 w-4 text-green-600" />
              ) : (
                <ToggleLeft className="h-4 w-4 text-gray-400" />
              )}
              <Info className="h-4 w-4" />
              Tooltips {tooltipsEnabled ? 'On' : 'Off'}
            </Button>
          </div>
        </div>
        
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Tooltip 
            content="Supervisees who have submitted a logbook within the past 7 days, indicating they are actively engaged and on track with their supervision requirements."
            enabled={tooltipsEnabled}
          >
            <Card className="hover:shadow-md transition-shadow cursor-pointer" 
                  onClick={() => window.location.href = '/supervisees?filter=onTrack'}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Supervisees On Track</p>
                    <p className="text-3xl font-bold text-green-600">{stats.superviseesOnTrack}</p>
                    <p className="text-xs text-gray-500 mt-1">Supervisees who submitted a logbook in the past 7 days</p>
                  </div>
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </Tooltip>

          <Tooltip 
            content="Logbooks that have been submitted by supervisees and are awaiting your review and feedback. These require your attention to provide guidance and ensure quality supervision."
            enabled={tooltipsEnabled}
          >
            <Card className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => window.location.href = '/supervisor/logbook-review'}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Logbooks Needing Review</p>
                    <p className="text-3xl font-bold text-amber-600">{stats.logbooksNeedingReview}</p>
                    <p className="text-xs text-gray-500 mt-1">Logbooks submitted but not yet reviewed</p>
                  </div>
                  <ClipboardCheck className="h-12 w-12 text-amber-600" />
                </div>
              </CardContent>
            </Card>
          </Tooltip>

          <Tooltip 
            content="Supervisees who have not submitted their weekly logbooks within the expected timeframe (7+ days). These require immediate attention and follow-up to ensure compliance with supervision requirements."
            enabled={tooltipsEnabled}
          >
            <Card className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => window.location.href = '/supervisees?filter=overdue'}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Overdue Logbooks</p>
                    <p className="text-3xl font-bold text-red-600">{stats.overdueLogbooks}</p>
                    <p className="text-xs text-gray-500 mt-1">Supervisees who haven't submitted logbooks within 7 days</p>
                  </div>
                  <AlertTriangle className="h-12 w-12 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </Tooltip>

          <Tooltip 
            content="The total number of supervisees who have an active, accepted supervision agreement with you. This includes both primary and secondary supervision relationships."
            enabled={tooltipsEnabled}
          >
            <Card className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => window.location.href = '/supervisees'}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Active Supervisees</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.totalActiveSupervisees}</p>
                    <p className="text-xs text-gray-500 mt-1">All supervisees with an accepted, active supervision agreement</p>
                  </div>
                  <Users className="h-12 w-12 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </Tooltip>
        </div>

        {/* This Week's Logbook Review Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📋 This Week's Logbook Review Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logbooksForReview.filter(logbook => {
              if (logbook.status !== 'submitted') return false
              if (!logbook.reviewed_at) return true // Never reviewed
              // If submitted after review, it needs review again
              return logbook.submitted_at && new Date(logbook.submitted_at) > new Date(logbook.reviewed_at)
            }).length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Week Beginning</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logbooksForReview.filter(logbook => {
                    if (logbook.status !== 'submitted') return false
                    if (!logbook.reviewed_at) return true // Never reviewed
                    // If submitted after review, it needs review again
                    return logbook.submitted_at && new Date(logbook.submitted_at) > new Date(logbook.reviewed_at)
                  }).map((logbook) => (
                    <TableRow key={logbook.id}>
                      <TableCell className="font-medium">{logbook.trainee_name}</TableCell>
                      <TableCell>{logbook.week_display}</TableCell>
                      <TableCell>
                        {logbook.section_totals ? 
                          `${(logbook.section_totals.total_hours || 0).toFixed(1)}h` : 
                          '0.0h'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(logbook.status)}>
                          {logbook.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          onClick={() => window.location.href = `/logbooks/${logbook.id}/review`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-lg font-medium">All caught up!</p>
                <p>No logbooks currently need review.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supervisee Tracker */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🧑‍🎓 Supervisee Tracker
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {supervisees.map((supervisee) => (
                <Card key={supervisee.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{supervisee.name}</h3>
                        <p className="text-sm text-gray-600">{supervisee.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <StatusBadge status="pending" label={supervisee.supervision_type} size="sm" />
                        <Badge className={getRAGColor(supervisee.rag_status)}>
                          {supervisee.rag_status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <p>Last Logbook: {supervisee.last_logbook_status} on {formatDate(supervisee.last_logbook_date)}</p>
                      <p>Total Hours: {supervisee.total_hours_logged} / {supervisee.target_hours}</p>
                      <p>Supervision Ratio: 1:{supervisee.supervision_ratio}</p>
                      <p>Next EPA Checkpoint: {formatDate(supervisee.next_epa_due)}</p>
                    </div>
                    
                    <div className="flex gap-2">
       <Button 
         size="sm" 
         className="bg-blue-600 hover:bg-blue-700 text-white"
         onClick={() => window.location.href = `/logbooks/${supervisee.id}/review`}
       >
         <FileText className="h-4 w-4 mr-2" />
         Review Logbook
       </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                        onClick={() => window.location.href = `/supervisees/${supervisee.id}`}
                      >
                        <User className="h-4 w-4 mr-2" />
                        View Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {supervisees.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Supervisees Yet</h3>
                <p className="text-gray-600 mb-4">Start by inviting supervisees to join your supervision program.</p>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Supervisee
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supervision Invitations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                📬 Supervision Invitations
              </CardTitle>
              <Select value={invitationFilter} onValueChange={setInvitationFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Accepted">Accepted</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredInvitations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">{invitation.name}</TableCell>
                      <TableCell>{invitation.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{invitation.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invitation.status)}>
                          {invitation.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(invitation.expires)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="bg-white hover:bg-gray-50 text-gray-700 border-gray-300">
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Invitations</h3>
                <p className="text-gray-600 mb-4">No supervision invitations found.</p>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Send Invitation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}