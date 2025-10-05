import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  BookOpen, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Eye,
  FileText,
  Unlock,
  TrendingUp,
  BarChart3,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  Send,
  Lock,
  Activity,
  Edit
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import LogbookAuditTrailModal from '@/components/LogbookAuditTrailModal'

interface LogbookEntry {
  id: number | null
  week_start_date: string
  week_end_date: string
  week_display: string
  week_starting_display: string
  status: 'draft' | 'submitted' | 'returned_for_edits' | 'approved' | 'rejected'
  rag_status: 'red' | 'amber' | 'green'
  is_overdue: boolean
  has_supervisor_comments: boolean
  is_editable: boolean
  supervisor_comments?: string
  submitted_at: string | null
  reviewed_at?: string
  reviewed_by_name?: string
  is_locked?: boolean
  regenerated?: boolean
  due_date?: string
  section_totals: {
    section_a: { weekly_hours: number; cumulative_hours: number }
    section_b: { weekly_hours: number; cumulative_hours: number }
    section_c: { weekly_hours: number; cumulative_hours: number }
    total: { weekly_hours: number; cumulative_hours: number }
  }
  active_unlock?: {
    unlock_expires_at: string
    duration_minutes: number
    remaining_minutes: number
  }
  has_logbook: boolean
  audit_log_count: number
}

interface LogbookMetrics {
  totalLogbooks: number
  submittedLogbooks: number
  approvedLogbooks: number
  lockedLogbooks: number
  regeneratedLogbooks: number
  overdueLogbooks: number
  avgReviewTime: number
  nextDueDate: string | null
  internshipWeeksEstimate: number
}

interface LogbookFilters {
  status: string
  isLocked: boolean
  regenerated: boolean
  weekRange: { start: string; end: string }
  searchTerm: string
}

type SortOption = 'date-asc' | 'date-desc' | 'status-asc' | 'status-desc' | 'submitted-asc' | 'submitted-desc' | 'reviewed-asc' | 'reviewed-desc'

export default function WeeklyLogbookDashboard() {
  const navigate = useNavigate()
  const [logbooks, setLogbooks] = useState<LogbookEntry[]>([])
  const [loading, setLoading] = useState(true)
  
  // New state for dashboard functionality
  const [metrics, setMetrics] = useState<LogbookMetrics | null>(null)
  const [filters, setFilters] = useState<LogbookFilters>({
    status: '',
    isLocked: false,
    regenerated: false,
    weekRange: { start: '', end: '' },
    searchTerm: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  
  // Audit trail modal state
  const [auditModalOpen, setAuditModalOpen] = useState(false)
  const [selectedLogbookId, setSelectedLogbookId] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [showTooltips, setShowTooltips] = useState(true)

  useEffect(() => {
    fetchLogbooks()
  }, [])

  const fetchLogbooks = async () => {
    try {
      const response = await apiFetch('/api/logbook/dashboard/')
      if (response.ok) {
        const data = await response.json()
        setLogbooks(data)
        calculateMetrics(data)
      } else {
        toast.error('Failed to fetch logbooks')
      }
    } catch (error) {
      console.error('Error fetching logbooks:', error)
      toast.error('Error fetching logbooks')
    } finally {
      setLoading(false)
    }
  }

  const calculateMetrics = (logbookData: LogbookEntry[]) => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    const totalLogbooks = logbookData.length
    const submittedLogbooks = logbookData.filter(l => l.status === 'submitted').length
    const approvedLogbooks = logbookData.filter(l => l.status === 'approved').length
    const lockedLogbooks = logbookData.filter(l => l.is_locked).length
    const regeneratedLogbooks = logbookData.filter(l => l.regenerated).length
    const overdueLogbooks = logbookData.filter(l => {
      if (!l.week_start_date) return false
      
      // Calculate the week ending date (week start + 6 days)
      const weekEndDate = new Date(l.week_start_date)
      weekEndDate.setDate(weekEndDate.getDate() + 6)
      
      // Calculate the overdue threshold (week end + 2 weeks = 14 days)
      const overdueThreshold = new Date(weekEndDate)
      overdueThreshold.setDate(overdueThreshold.getDate() + 14)
      
      // Convert to YYYY-MM-DD format for comparison
      const overdueThresholdStr = overdueThreshold.toISOString().split('T')[0]
      
      // A logbook is overdue if:
      // 1. More than 2 weeks have passed since the week ended, AND
      // 2. The logbook is not approved/finalized (not locked)
      return overdueThresholdStr < today && !l.is_locked
    }).length
    
    // Calculate average review time
    const reviewedLogbooks = logbookData.filter(l => l.submitted_at && l.reviewed_at)
    const avgReviewTime = reviewedLogbooks.length > 0 
      ? reviewedLogbooks.reduce((sum, l) => {
          const submitted = new Date(l.submitted_at!)
          const reviewed = new Date(l.reviewed_at!)
          const diffTime = Math.abs(reviewed.getTime() - submitted.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          return sum + diffDays
        }, 0) / reviewedLogbooks.length
      : 0
    
    // Find next due date (any logbook with a future due date)
    const upcomingLogbooks = logbookData.filter(l => {
      if (!l.due_date) return false
      return l.due_date >= today
    }).sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    
    const nextDueDate = upcomingLogbooks.length > 0 ? upcomingLogbooks[0].due_date || null : null
    
    setMetrics({
      totalLogbooks,
      submittedLogbooks,
      approvedLogbooks,
      lockedLogbooks,
      regeneratedLogbooks,
      overdueLogbooks,
      avgReviewTime: Math.round(avgReviewTime * 10) / 10,
      nextDueDate,
      internshipWeeksEstimate: 52 // Default estimate, could be from user profile
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Draft</Badge>
      case 'submitted':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Waiting for Review</Badge>
      case 'returned_for_edits':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Returned for Edits</Badge>
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
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

  // Filter and sort logbooks
  const filteredLogbooks = logbooks.filter(logbook => {
    if (filters.status && logbook.status !== filters.status) return false
    if (filters.isLocked && !logbook.is_locked) return false
    if (filters.regenerated && !logbook.regenerated) return false
    if (filters.searchTerm && !logbook.week_display.toLowerCase().includes(filters.searchTerm.toLowerCase())) return false
    if (filters.weekRange.start && logbook.week_start_date < filters.weekRange.start) return false
    if (filters.weekRange.end && logbook.week_start_date > filters.weekRange.end) return false
            return true
  }).sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.week_start_date).getTime() - new Date(b.week_start_date).getTime()
        case 'date-desc':
          return new Date(b.week_start_date).getTime() - new Date(a.week_start_date).getTime()
      case 'status-asc':
        return (a.status || '').localeCompare(b.status || '')
      case 'status-desc':
        return (b.status || '').localeCompare(a.status || '')
      case 'submitted-asc':
        return new Date(a.submitted_at || 0).getTime() - new Date(b.submitted_at || 0).getTime()
      case 'submitted-desc':
        return new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime()
      case 'reviewed-asc':
        return new Date(a.reviewed_at || 0).getTime() - new Date(b.reviewed_at || 0).getTime()
      case 'reviewed-desc':
        return new Date(b.reviewed_at || 0).getTime() - new Date(a.reviewed_at || 0).getTime()
      default:
        return new Date(b.week_start_date).getTime() - new Date(a.week_start_date).getTime()
    }
  })

  // Pagination
  const totalPages = Math.ceil(filteredLogbooks.length / pageSize)
  const paginatedLogbooks = filteredLogbooks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const handleViewLogbook = (logbook: LogbookEntry) => {
    navigate(`/logbook/week/${logbook.week_start_date}`)
  }

  const handleViewAuditTrail = (logbook: LogbookEntry) => {
    if (logbook.id) {
      setSelectedLogbookId(logbook.id)
      setAuditModalOpen(true)
    }
  }

  const handleSubmit = async (logbookId: number) => {
    try {
      const response = await apiFetch(`/api/logbook/${logbookId}/submit/`, {
        method: 'POST',
      })
      
      if (response.ok) {
        toast.success('Logbook submitted successfully')
        fetchLogbooks() // Refresh the list
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to submit logbook')
      }
    } catch (error) {
      console.error('Error submitting logbook:', error)
      toast.error('Failed to submit logbook')
    }
  }


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Weekly Logbook Status Dashboard</h1>
            <p className="text-muted-foreground">Monitor your administrative progress and logbook workflow readiness</p>
          </div>
        </div>
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8">Loading logbooks...</div>
              </CardContent>
            </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-8 text-white">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Weekly Logbook Status Dashboard
          </h1>
            <p className="text-blue-100">
              Monitor your administrative progress and logbook workflow readiness
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => {/* TODO: Create logbook functionality */}}
              className="border-white text-white hover:bg-white hover:text-blue-600 font-semibold rounded-lg bg-white/10 backdrop-blur-sm"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create New Logbook
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {/* TODO: Export functionality */}}
              className="border-white text-white hover:bg-white hover:text-blue-600 font-semibold rounded-lg bg-white/10 backdrop-blur-sm"
            >
              <Download className="h-5 w-5 mr-2" />
              Export Data
            </Button>
          </div>
        </div>
      </div>

      {/* Tooltip Toggle */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-sm border border-gray-200">
          <span className="text-sm text-gray-600 font-medium">Show Tooltips</span>
          <button
            onClick={() => setShowTooltips(!showTooltips)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              showTooltips ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showTooltips ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Logbooks Created */}
          <Card className="relative group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Logbooks Created</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.totalLogbooks}</p>
                  <p className="text-xs text-gray-500">Target: {metrics.internshipWeeksEstimate}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4">
                <Progress 
                  value={(metrics.totalLogbooks / metrics.internshipWeeksEstimate) * 100} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round((metrics.totalLogbooks / metrics.internshipWeeksEstimate) * 100)}% complete
                </p>
              </div>
              
              {/* Tooltip */}
              <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg transition-opacity duration-200 pointer-events-none z-50 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                <div className="font-semibold mb-1">Logbooks Created</div>
                <div className="text-gray-300 mb-2">Total number of weekly logbooks created out of your internship target</div>
                <div className="text-xs text-gray-400">
                  <div>Current: {metrics.totalLogbooks} logbooks</div>
                  <div>Target: {metrics.internshipWeeksEstimate} weeks</div>
                  <div>Progress: {Math.round((metrics.totalLogbooks / metrics.internshipWeeksEstimate) * 100)}% complete</div>
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </CardContent>
          </Card>

          {/* Submitted Logbooks */}
          <Card className="relative group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Submitted</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.submittedLogbooks}</p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Send className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              
              {/* Tooltip */}
              <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg transition-opacity duration-200 pointer-events-none z-50 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                <div className="font-semibold mb-1">Submitted Logbooks</div>
                <div className="text-gray-300 mb-2">Number of logbooks submitted for supervisor review</div>
                <div className="text-xs text-gray-400">
                  <div>Status: Waiting for supervisor review</div>
                  <div>Total: {metrics.submittedLogbooks} logbooks</div>
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </CardContent>
          </Card>

          {/* Approved Logbooks */}
          <Card className="relative group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.approvedLogbooks}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
              
              {/* Tooltip */}
              <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg transition-opacity duration-200 pointer-events-none z-50 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                <div className="font-semibold mb-1">Approved Logbooks</div>
                <div className="text-gray-300 mb-2">Number of logbooks approved by your supervisor</div>
                <div className="text-xs text-gray-400">
                  <div>Status: Supervisor approved</div>
                  <div>Total: {metrics.approvedLogbooks} logbooks</div>
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
            </CardContent>
          </Card>

          {/* Locked Logbooks */}
          <Card className="relative group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Finalised (Locked)</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.lockedLogbooks}</p>
                </div>
                <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Lock className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
                
              {/* Tooltip */}
              <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg transition-opacity duration-200 pointer-events-none z-50 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                <div className="font-semibold mb-1">Finalised (Locked) Logbooks</div>
                <div className="text-gray-300 mb-2">Number of logbooks that have been locked and cannot be edited</div>
                <div className="text-xs text-gray-400">
                  <div>Status: Permanently locked</div>
                  <div>Total: {metrics.lockedLogbooks} logbooks</div>
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
            </CardContent>
          </Card>

          {/* Regenerated Logbooks */}
          <Card className="relative group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Regenerated</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.regeneratedLogbooks}</p>
                  </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              
              {/* Tooltip */}
              <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg transition-opacity duration-200 pointer-events-none z-50 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                <div className="font-semibold mb-1">Regenerated Logbooks</div>
                <div className="text-gray-300 mb-2">Number of logbooks that have been regenerated after changes</div>
                <div className="text-xs text-gray-400">
                  <div>Status: Updated/regenerated</div>
                  <div>Total: {metrics.regeneratedLogbooks} logbooks</div>
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </CardContent>
          </Card>

          {/* Overdue Logbooks */}
          <Card className="relative group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.overdueLogbooks}</p>
                  <p className="text-xs text-gray-500">Due but not approved</p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                        </div>
                        
              {/* Tooltip */}
              <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg transition-opacity duration-200 pointer-events-none z-50 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                <div className="font-semibold mb-1">Overdue Logbooks</div>
                <div className="text-gray-300 mb-2">Logbooks that are more than 2 weeks past their week ending date and not yet finalized</div>
                <div className="text-xs text-gray-400">
                  <div>Grace Period: 2 weeks after week end</div>
                  <div>Total: {metrics.overdueLogbooks} logbooks</div>
                  <div>Action: Requires immediate attention</div>
                              </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                              </div>
            </CardContent>
          </Card>

          {/* Avg Review Time */}
          <Card className="relative group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Review Time</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.avgReviewTime}</p>
                  <p className="text-xs text-gray-500">days</p>
                          </div>
                <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-indigo-600" />
                          </div>
                        </div>
              
              {/* Tooltip */}
              <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg transition-opacity duration-200 pointer-events-none z-50 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                <div className="font-semibold mb-1">Average Review Time</div>
                <div className="text-gray-300 mb-2">Average number of days between logbook submission and supervisor review</div>
                <div className="text-xs text-gray-400">
                  <div>Current: {metrics.avgReviewTime} days</div>
                  <div>Target: &lt; 5 days</div>
                  <div>Status: {metrics.avgReviewTime < 5 ? 'On track' : 'Needs improvement'}</div>
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </CardContent>
          </Card>

          {/* Next Due Date */}
          <Card className="relative group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Next Due Date</p>
                  <p className="text-lg font-bold text-gray-900">
                    {metrics.nextDueDate ? new Date(metrics.nextDueDate).toLocaleDateString('en-AU') : 'None'}
                  </p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
              
              {/* Tooltip */}
              <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg transition-opacity duration-200 pointer-events-none z-50 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                <div className="font-semibold mb-1">Next Due Date</div>
                <div className="text-gray-300 mb-2">The next upcoming due date for any logbook</div>
                <div className="text-xs text-gray-400">
                  <div>Next Due: {metrics.nextDueDate ? new Date(metrics.nextDueDate).toLocaleDateString('en-AU') : 'None scheduled'}</div>
                  <div>Status: {metrics.nextDueDate ? 'Upcoming deadline' : 'No pending deadlines'}</div>
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters & Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search logbooks..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Status Filter */}
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="ready">Ready</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              {/* Locked Filter */}
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.isLocked}
                  onChange={(e) => setFilters(prev => ({ ...prev, isLocked: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Locked only</span>
              </label>

              {/* Regenerated Filter */}
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.regenerated}
                  onChange={(e) => setFilters(prev => ({ ...prev, regenerated: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show Regenerated</span>
              </label>

              {/* Sort Options */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700 font-medium">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="date-desc">Date (Newest First)</option>
                  <option value="date-asc">Date (Oldest First)</option>
                  <option value="status-asc">Status (A-Z)</option>
                  <option value="status-desc">Status (Z-A)</option>
                  <option value="submitted-desc">Submitted (Newest First)</option>
                  <option value="submitted-asc">Submitted (Oldest First)</option>
                  <option value="reviewed-desc">Reviewed (Newest First)</option>
                  <option value="reviewed-asc">Reviewed (Oldest First)</option>
                </select>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap gap-2 mt-4">
              {filters.status && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Status: {filters.status}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, status: '' }))}
                    className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {filters.isLocked && (
                <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                  Locked only
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, isLocked: false }))}
                    className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {filters.regenerated && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  Regenerated
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, regenerated: false }))}
                    className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {filters.searchTerm && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Search: "{filters.searchTerm}"
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, searchTerm: '' }))}
                    className="ml-1 hover:bg-green-200 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Logbook Status Overview Table */}
            <Card>
              <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Logbook Status Overview
            </CardTitle>
                  <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Showing {paginatedLogbooks.length} of {filteredLogbooks.length} logbooks
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogbooks.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No Logbooks Found</h3>
              <p className="text-gray-600 mb-4">
                {logbooks.length === 0 
                  ? "You haven't created any weekly logbooks yet. Create your first logbook to get started."
                  : "No logbooks match your current filters. Try adjusting your search criteria."
                }
              </p>
              {logbooks.length === 0 && (
                <Button onClick={() => {/* TODO: Create logbook */}} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Logbook
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 rounded-lg font-medium text-sm text-gray-700">
                <div className="col-span-2 flex items-center gap-1">
                  Week
                  {sortBy === 'date-asc' && <span className="text-blue-600">↑</span>}
                  {sortBy === 'date-desc' && <span className="text-blue-600">↓</span>}
                </div>
                <div className="col-span-1 flex items-center gap-1">
                  Status
                  {sortBy === 'status-asc' && <span className="text-blue-600">↑</span>}
                  {sortBy === 'status-desc' && <span className="text-blue-600">↓</span>}
                </div>
                <div className="col-span-2 flex items-center gap-1">
                  Submitted
                  {sortBy === 'submitted-asc' && <span className="text-blue-600">↑</span>}
                  {sortBy === 'submitted-desc' && <span className="text-blue-600">↓</span>}
                </div>
                <div className="col-span-2 flex items-center gap-1">
                  Reviewed
                  {sortBy === 'reviewed-asc' && <span className="text-blue-600">↑</span>}
                  {sortBy === 'reviewed-desc' && <span className="text-blue-600">↓</span>}
                </div>
                <div className="col-span-1">Locked</div>
                <div className="col-span-1">Regenerated</div>
                <div className="col-span-2">Comments</div>
                <div className="col-span-1">Actions</div>
              </div>

              {/* Table Rows */}
              {paginatedLogbooks.map((logbook, index) => (
                <div key={logbook.id || `week-${logbook.week_start_date}-${index}`} className="grid grid-cols-12 gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  {/* Week */}
                  <div className="col-span-2">
                    <div className="font-medium text-gray-900">{logbook.week_display}</div>
                    <div className="text-sm text-gray-500">{logbook.week_start_date}</div>
                  </div>

                  {/* Status */}
                  <div className="col-span-1">
                    {getStatusBadge(logbook.status)}
                  </div>

                  {/* Submitted */}
                  <div className="col-span-2">
                    <div className="text-sm text-gray-900">
                      {logbook.submitted_at ? formatDate(logbook.submitted_at) : 'Not submitted'}
                    </div>
                  </div>

                  {/* Reviewed */}
                  <div className="col-span-2">
                    <div className="text-sm text-gray-900">
                      {logbook.reviewed_at ? formatDate(logbook.reviewed_at) : 'Not reviewed'}
                    </div>
                    {logbook.reviewed_by_name && (
                      <div className="text-xs text-gray-500">by {logbook.reviewed_by_name}</div>
                    )}
                  </div>

                  {/* Locked */}
                  <div className="col-span-1">
                    <div className="flex items-center justify-center">
                      {logbook.is_locked ? (
                        <Lock className="h-4 w-4 text-gray-600" />
                      ) : (
                        <Unlock className="h-4 w-4 text-gray-400" />
                      )}
                          </div>
                        </div>

                  {/* Regenerated */}
                  <div className="col-span-1">
                    <div className="flex items-center justify-center">
                      {logbook.regenerated ? (
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                          </div>
                        </div>

                  {/* Comments */}
                  <div className="col-span-2">
                    <div className="text-sm text-gray-900">
                      {logbook.supervisor_comments ? (
                        <div className="max-w-xs truncate" title={logbook.supervisor_comments}>
                          {logbook.supervisor_comments}
                        </div>
                      ) : (
                        <span className="text-gray-400">No comments</span>
                      )}
                          </div>
                        </div>

                  {/* Actions */}
                  <div className="col-span-1">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleViewLogbook(logbook)}
                        title="View Logbook"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {logbook.status === 'rejected' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => navigate(`/logbook/${logbook.id}/edit`)}
                          title="Edit Rejected Logbook"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleViewAuditTrail(logbook)}
                        title={logbook.audit_log_count > 0 ? `View Audit Trail (${logbook.audit_log_count} entries)` : "No audit trail available yet"}
                      >
                        <Activity className="h-4 w-4" />
                      </Button>
                      
                      {(logbook.status === 'draft' || logbook.status === 'returned_for_edits' || logbook.status === 'rejected') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title={logbook.status === 'rejected' ? 'Resubmit' : 'Submit'}
                          onClick={() => logbook.id && handleSubmit(logbook.id)}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {logbook.status === 'approved' && !logbook.is_locked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Lock"
                        >
                              <Lock className="h-4 w-4" />
                        </Button>
                        )}
                      </div>
                    </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                      <Button
                        variant="outline"
                        size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      </Button>
                  </div>
                </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

      {/* Compliance Checklist */}
            <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Compliance Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics && (
              <>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">All weeks have created logbooks</span>
                  <Badge variant={metrics.totalLogbooks >= metrics.internshipWeeksEstimate ? "default" : "secondary"}>
                    {metrics.totalLogbooks}/{metrics.internshipWeeksEstimate}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">≥ 90% logbooks submitted</span>
                  <Badge variant={metrics.submittedLogbooks >= metrics.totalLogbooks * 0.9 ? "default" : "secondary"}>
                    {Math.round((metrics.submittedLogbooks / metrics.totalLogbooks) * 100)}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">≥ 80% logbooks reviewed</span>
                  <Badge variant={metrics.approvedLogbooks >= metrics.totalLogbooks * 0.8 ? "default" : "secondary"}>
                    {Math.round((metrics.approvedLogbooks / metrics.totalLogbooks) * 100)}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Timely submissions (≤ 2 overdue)</span>
                  <Badge variant={metrics.overdueLogbooks <= 2 ? "default" : "destructive"}>
                    {metrics.overdueLogbooks}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Review times &lt; 5 days</span>
                  <Badge variant={metrics.avgReviewTime < 5 ? "default" : "secondary"}>
                    {metrics.avgReviewTime} days
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">All approved logbooks locked</span>
                  <Badge variant={metrics.lockedLogbooks >= metrics.approvedLogbooks ? "default" : "secondary"}>
                    {metrics.lockedLogbooks}/{metrics.approvedLogbooks}
                  </Badge>
                </div>
              </>
            )}
                </div>
              </CardContent>
            </Card>

      {/* Audit Trail Modal */}
      <LogbookAuditTrailModal
        logbookId={selectedLogbookId}
        isOpen={auditModalOpen}
        onClose={() => {
          setAuditModalOpen(false)
          setSelectedLogbookId(null)
        }}
      />
    </div>
  )
}
