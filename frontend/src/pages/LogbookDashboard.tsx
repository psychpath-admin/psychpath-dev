import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSmartRefresh } from '@/hooks/useSmartRefresh'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  BookOpen, 
  Calendar, 
  AlertCircle,
  Eye,
  FileText,
  Unlock,
  Lock,
  Send,
  TrendingUp,
  BarChart3,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Settings,
  Plus,
  RefreshCw,
  Activity
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import LogbookCreationModal from '@/components/LogbookCreationModal'
import LogbookPreview from '@/components/LogbookPreview'
import StructuredLogbookDisplay from '@/components/StructuredLogbookDisplay'
import UnlockRequestModal from '@/components/UnlockRequestModal'
import LogbookAuditTree from '@/components/LogbookAuditTree'
import { StatusBadge } from '@/components/status'
import { useFilterPersistence, useSimpleFilterPersistence } from '@/hooks/useFilterPersistence'
import UserNameDisplay from '@/components/UserNameDisplay'

interface Logbook {
  id: number
  trainee_name: string
  week_start_date: string
  week_end_date: string
  week_display: string
  status: 'draft' | 'ready' | 'submitted' | 'returned_for_edits' | 'approved' | 'rejected' | 'locked' | 'unlocked_for_edits'
  supervisor_name?: string
  reviewed_by_name?: string
  active_unlock?: {
    unlock_expires_at: string
    duration_minutes: number
  } | null
  submitted_at: string
  audit_log_count: number
  reviewed_at?: string
  supervisor_comments?: string
  is_locked?: boolean
  regenerated?: boolean
  due_date?: string
  section_totals: {
    section_a: { 
      weekly_hours: string
      cumulative_hours: string
      dcc?: { weekly_hours: string; cumulative_hours: string }
      cra?: { weekly_hours: string; cumulative_hours: string }
    }
    section_b: { weekly_hours: string; cumulative_hours: string }
    section_c: { weekly_hours: string; cumulative_hours: string }
    total: { weekly_hours: string; cumulative_hours: string }
  }
}

interface LogbookMetrics {
  totalLogbooks: number
  submittedLogbooks: number
  approvedLogbooks: number
  lockedLogbooks: number
  regeneratedLogbooks: number
  overdueLogbooks: number
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

export default function LogbookDashboard() {
  const navigate = useNavigate()
  const [logbooks, setLogbooks] = useState<Logbook[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreationModal, setShowCreationModal] = useState(false)
  const [previewLogbook, setPreviewLogbook] = useState<Logbook | null>(null)
  const [structuredLogbook, setStructuredLogbook] = useState<Logbook | null>(null)
  const [showTooltips, setShowTooltips] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [unlockRequestModal, setUnlockRequestModal] = useState<{ isOpen: boolean; logbook: Logbook | null }>({ 
    isOpen: false, 
    logbook: null 
  })
  const [auditTrailModal, setAuditTrailModal] = useState<{ isOpen: boolean; logbookId: number | null }>({ 
    isOpen: false, 
    logbookId: null 
  })
  
  // New state for dashboard functionality
  const [metrics, setMetrics] = useState<LogbookMetrics | null>(null)
  const [targetLogbooks, setTargetLogbooks] = useState(52) // Default fallback
  const [submissionDeadlineDays, setSubmissionDeadlineDays] = useState(14) // Default 2 weeks

  // Smart refresh hook for notification-based updates
  const { manualRefresh } = useSmartRefresh(
    () => fetchLogbooks(true, false), // Silent refresh
    ['logbook_submitted', 'logbook_status_updated', 'logbook_approved', 'logbook_rejected', 'unlock_requested', 'unlock_approved', 'unlock_denied']
  )
  
  // Persistent filters - defaults to oldest first for provisional users
  const [filters, setFilters] = useFilterPersistence<LogbookFilters>('logbook-dashboard', {
    status: '',
    isLocked: false,
    regenerated: false,
    weekRange: { start: '', end: '' },
    searchTerm: ''
  })
  
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useSimpleFilterPersistence<'week_start_date' | 'status' | 'submitted_at'>('logbook-sort-by', 'week_start_date')
  const [sortOrder, setSortOrder] = useSimpleFilterPersistence<'asc' | 'desc'>('logbook-sort-order', 'asc') // Default to oldest first
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useSimpleFilterPersistence<number>('logbook-page-size', 10)

  useEffect(() => {
    fetchLogbooks()
    fetchLogbookConfig()
  }, [])

  // Refresh when component becomes visible (e.g., returning from navigation)
  useEffect(() => {
    const handlePageShow = () => {
      fetchLogbooks()
    }

    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  // Refresh when returning to the page (e.g., from Section A/B/C forms)
  useEffect(() => {
    const handleFocus = () => {
      fetchLogbooks()
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchLogbooks()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const fetchLogbooks = async (isRefresh = false, showToast = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      
      console.log('Fetching logbooks...')
      const response = await apiFetch('/api/logbook/')
      if (response.ok) {
        const data = await response.json()
        console.log('Logbooks fetched:', data.length, 'logbooks')
        // Avoid unnecessary rerenders: only update state if data changed
        const dataString = JSON.stringify(data)
        const currentString = JSON.stringify(logbooks)
        if (dataString !== currentString) {
          setLogbooks(data)
        }
        calculateMetrics(data)
        // Only show toast for explicit manual refreshes
        if (showToast) toast.success('Logbooks updated')
      } else {
        console.error('Failed to fetch logbooks:', response.status)
        toast.error('Failed to fetch logbooks')
      }
    } catch (error) {
      console.error('Error fetching logbooks:', error)
      toast.error('Error fetching logbooks')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchLogbookConfig = async () => {
    try {
      const response = await apiFetch('/api/config/logbook-config/')
      if (response.ok) {
        const data = await response.json()
        setTargetLogbooks(data.target_count || 52)
        setSubmissionDeadlineDays(data.submission_deadline_days || 14)
      }
    } catch (error) {
      console.error('Failed to fetch config:', error)
      // Keep defaults
    }
  }

  const calculateMetrics = (logbookData: Logbook[]) => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    const totalLogbooks = logbookData.length
    const submittedLogbooks = logbookData.filter(l => l.status === 'submitted').length
    const approvedLogbooks = logbookData.filter(l => l.status === 'approved').length
    const lockedLogbooks = logbookData.filter(l => l.is_locked || l.status === 'approved').length
    const regeneratedLogbooks = logbookData.filter(l => l.regenerated).length
    // Calculate overdue logbooks: week_start_date + deadline_days < today AND not submitted/approved/rejected
    const overdueLogbooks = logbookData.filter(l => {
      if (!l.week_start_date) return false
      
      // Calculate deadline date
      const weekStartDate = new Date(l.week_start_date)
      const deadlineDate = new Date(weekStartDate)
      deadlineDate.setDate(weekStartDate.getDate() + submissionDeadlineDays)
      
      const deadlineDateStr = deadlineDate.toISOString().split('T')[0]
      
      // Check if past deadline AND not in submitted/approved/rejected status
      return deadlineDateStr < today && !['submitted', 'approved', 'rejected'].includes(l.status)
    }).length
    
    // Find next due date: next upcoming submission deadline
    let nextDueDate = null
    
    // Check existing logbooks with future deadlines first
    const existingDeadlines = logbookData
      .filter(l => l.week_start_date)
      .map(l => {
        // Calculate submission deadline for each logbook
        const weekStartDate = new Date(l.week_start_date!)
        const deadlineDate = new Date(weekStartDate)
        deadlineDate.setDate(weekStartDate.getDate() + submissionDeadlineDays)
        
        return {
          ...l,
          submissionDeadline: deadlineDate.toISOString().split('T')[0]
        }
      })
      .filter(l => l.submissionDeadline >= today) // Only future deadlines
      .sort((a, b) => new Date(a.submissionDeadline).getTime() - new Date(b.submissionDeadline).getTime()) // Sort by deadline date
    
    if (existingDeadlines.length > 0) {
      // Use existing logbook deadline
      nextDueDate = existingDeadlines[0].submissionDeadline
    } else {
      // Calculate next expected deadline based on current date
      // Check multiple weeks to find the next upcoming deadline
      const currentDate = new Date()
      const currentWeekStart = new Date(currentDate)
      currentWeekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1) // Monday of current week
      
      // Check current week and several previous/next weeks
      const weeksToCheck = [-2, -1, 0, 1, 2] // Check 2 weeks before, 1 week before, current, 1 week after, 2 weeks after
      let upcomingDeadlines = []
      
      for (const weekOffset of weeksToCheck) {
        const weekStart = new Date(currentWeekStart)
        weekStart.setDate(currentWeekStart.getDate() + (weekOffset * 7))
        
        const deadline = new Date(weekStart)
        deadline.setDate(weekStart.getDate() + submissionDeadlineDays)
        
        // Only include deadlines that are in the future (not today)
        if (deadline.toISOString().split('T')[0] > today) {
          upcomingDeadlines.push({
            weekStart: weekStart.toISOString().split('T')[0],
            deadline: deadline.toISOString().split('T')[0]
          })
        }
      }
      
      // Sort by deadline date and take the earliest
      upcomingDeadlines.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      
      if (upcomingDeadlines.length > 0) {
        nextDueDate = upcomingDeadlines[0].deadline
      }
    }
    
    setMetrics({
      totalLogbooks,
      submittedLogbooks,
      approvedLogbooks,
      lockedLogbooks,
      regeneratedLogbooks,
      overdueLogbooks,
      nextDueDate,
      internshipWeeksEstimate: 52 // Default estimate, could be from user profile
    })
  }


  const getStatusBadge = (logbook: Logbook) => {
    // Map logbook statuses to StatusBadge component statuses
    const statusMap: Record<string, 'submitted' | 'approved' | 'rejected' | 'draft' | 'pending'> = {
      'submitted': 'submitted',
      'approved': 'approved',
      'rejected': 'rejected',
      'returned_for_edits': 'pending',  // Use pending with custom label
      'draft': 'draft',
      'ready': 'draft',  // Ready status maps to draft style
      'unlocked_for_edits': 'pending'  // Only show "Unlocked for Editing" if status is actually unlocked_for_edits
    }
    
    const statusLabels: Record<string, string> = {
      'submitted': 'Waiting for Review',
      'returned_for_edits': 'Returned for Edits',
      'ready': 'Ready for Submission',
      'unlocked_for_edits': 'Unlocked for Editing'
    }
    
    const mappedStatus = statusMap[logbook.status] || 'draft'
    const label = statusLabels[logbook.status] || logbook.status
    
    return <StatusBadge status={mappedStatus} label={label} size="sm" />
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

  const handleLogbookCreated = () => {
    fetchLogbooks(true, false)
    setShowCreationModal(false)
  }

  // Helper function to check if logbook can be edited
  const canEditLogbook = (logbook: Logbook) => {
    return logbook.status === 'returned_for_edits' || 
           logbook.status === 'rejected' || 
           logbook.status === 'draft' ||
           logbook.status === 'ready' ||
           logbook.active_unlock !== null
  }

  // Helper function to check if unlock can be requested
  const canRequestUnlock = (logbook: Logbook) => {
    return logbook.is_locked || logbook.status === 'approved'
  }

  // Handle unlock request modal
  const handleOpenUnlockRequest = (logbook: Logbook) => {
    setUnlockRequestModal({ isOpen: true, logbook })
  }

  const handleCloseUnlockRequest = () => {
    setUnlockRequestModal({ isOpen: false, logbook: null })
  }

  const handleOpenAuditTrail = (logbookId: number) => {
    setAuditTrailModal({ isOpen: true, logbookId })
  }

  const handleCloseAuditTrail = () => {
    setAuditTrailModal({ isOpen: false, logbookId: null })
  }

  const handleUnlockRequestSuccess = () => {
    toast.success('Unlock request submitted successfully')
    fetchLogbooks(true, false)
    handleCloseUnlockRequest()
  }

  // Helper function to handle adding new records
  const handleAddNewRecord = (section: 'a' | 'b' | 'c', logbook: Logbook) => {
    const returnTo = '/logbook' // Return to the dashboard to see all logbooks
    const state = {
      returnTo,
      logbookWeek: logbook.week_start_date,
      logbookId: logbook.id,
      openCreate: true
    }
    if (section === 'a') {
      navigate('/section-a/create', { state })
    } else if (section === 'b') {
      navigate('/section-b', { state })
    } else {
      navigate('/section-c', { state })
    }
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
    let aValue: any, bValue: any
    
    switch (sortBy) {
      case 'week_start_date':
        aValue = new Date(a.week_start_date).getTime()
        bValue = new Date(b.week_start_date).getTime()
        break
      case 'status':
        aValue = a.status
        bValue = b.status
        break
      case 'submitted_at':
        aValue = new Date(a.submitted_at).getTime()
        bValue = new Date(b.submitted_at).getTime()
        break
      default:
        aValue = a.week_start_date
        bValue = b.week_start_date
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  // Pagination
  const totalPages = Math.ceil(filteredLogbooks.length / pageSize)
  const paginatedLogbooks = filteredLogbooks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Weekly Logbooks</h1>
            <p className="text-muted-foreground">Manage your weekly logbook submissions</p>
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
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-4 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">
              Weekly Logbook Status Dashboard
            </h1>
            <p className="text-blue-100 text-base">
              Monitor your administrative progress and logbook workflow readiness
            </p>
          </div>
          <div className="flex flex-col items-end">
            <div className="mb-3">
              <UserNameDisplay 
                className="" 
                variant="default" 
                showRole={true}
              />
            </div>
            <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/section-a')}
              className="border-white text-white hover:bg-white hover:text-blue-600 font-semibold rounded-lg bg-white/10 backdrop-blur-sm"
            >
              <FileText className="h-5 w-5 mr-2" />
              Section A
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/section-b')}
              className="border-white text-white hover:bg-white hover:text-blue-600 font-semibold rounded-lg bg-white/10 backdrop-blur-sm"
            >
              <FileText className="h-5 w-5 mr-2" />
              Section B
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/section-c')}
              className="border-white text-white hover:bg-white hover:text-blue-600 font-semibold rounded-lg bg-white/10 backdrop-blur-sm"
            >
              <FileText className="h-5 w-5 mr-2" />
              Section C
            </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tooltip Toggle */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5" />
                Logbook Summary Metrics
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTooltips(!showTooltips)}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                {showTooltips ? 'Hide' : 'Show'} Tooltips
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Logbooks Created */}
              <Card className={`relative group ${showTooltips ? 'cursor-help' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Logbooks Created</p>
                      <p className="text-2xl font-bold text-gray-900">{metrics?.totalLogbooks || 0}</p>
                      <p className="text-xs text-gray-500">Target: {targetLogbooks}</p>
                      {targetLogbooks > 0 && (
                        <>
                          <Progress 
                            value={Math.round(((metrics?.totalLogbooks || 0) / targetLogbooks) * 100)} 
                            className="mt-2 h-2"
                          />
                          <p className="text-xs text-blue-600 mt-1">
                            {Math.round(((metrics?.totalLogbooks || 0) / targetLogbooks) * 100)}% complete
                          </p>
                        </>
                      )}
                    </div>
                    <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  {showTooltips && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                      Total number of logbooks created out of your target. Progress bar shows completion percentage.
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Submitted */}
              <Card className={`relative group ${showTooltips ? 'cursor-help' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Submitted</p>
                      <p className="text-2xl font-bold text-gray-900">{metrics?.submittedLogbooks || 0}</p>
                    </div>
                    <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Send className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                  {showTooltips && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                      Logbooks currently submitted and awaiting supervisor review.
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Approved */}
              <Card className={`relative group ${showTooltips ? 'cursor-help' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Approved</p>
                      <p className="text-2xl font-bold text-gray-900">{metrics?.approvedLogbooks || 0}</p>
                    </div>
                    <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Eye className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  {showTooltips && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                      Logbooks that have been approved by your supervisor and are now locked.
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Regenerated */}
              <Card className={`relative group ${showTooltips ? 'cursor-help' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Regenerated</p>
                      <p className="text-2xl font-bold text-gray-900">{metrics?.regeneratedLogbooks || 0}</p>
                    </div>
                    <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  {showTooltips && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                      Logbooks that were regenerated due to corrections or updates.
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Overdue */}
              <Card className={`relative group ${showTooltips ? 'cursor-help' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Overdue</p>
                      <p className="text-2xl font-bold text-gray-900">{metrics?.overdueLogbooks || 0}</p>
                      <p className="text-xs text-gray-500">Past {submissionDeadlineDays}-day deadline</p>
                    </div>
                    <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                  {showTooltips && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                      Logbooks past their {submissionDeadlineDays}-day submission deadline but not yet submitted or approved.
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Next Due Date */}
              <Card className={`relative group ${showTooltips ? 'cursor-help' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Next Due Date</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {metrics?.nextDueDate ? new Date(metrics.nextDueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : 'None'}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                  {showTooltips && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                      The next upcoming submission deadline (week start + {submissionDeadlineDays} days). Helps you plan ahead.
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>


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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
                <option value="draft">Draft</option>
                <option value="ready">Ready for Submission</option>
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
            </div>

            {/* Sort Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'week_start_date' | 'status' | 'submitted_at')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="week_start_date">Week Start Date</option>
                  <option value="status">Status</option>
                  <option value="submitted_at">Submitted Date</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => manualRefresh()}
                disabled={refreshing}
                className="flex items-center gap-2"
                title="Refresh logbooks"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
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
            </div>
          ) : (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 rounded-lg font-medium text-sm text-gray-700">
                <div className="col-span-2">Week</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Submitted</div>
                <div className="col-span-2">Reviewed</div>
                <div className="col-span-1">Locked</div>
                <div className="col-span-1">Regenerated</div>
                <div className="col-span-1">Comments</div>
                <div className="col-span-1">Actions</div>
              </div>

              {/* Table Rows */}
              {paginatedLogbooks.map((logbook) => (
                <div key={logbook.id} className="grid grid-cols-12 gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  {/* Week */}
                  <div className="col-span-2">
                    <div className="font-medium text-gray-900">{logbook.week_display}</div>
                    <div className="text-sm text-gray-500">{logbook.week_start_date}</div>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <div className="flex flex-col gap-2">
                      {getStatusBadge(logbook)}
                      {canEditLogbook(logbook) && (
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddNewRecord('a', logbook)}
                            className="text-xs px-2 py-1 h-6"
                            title="Add Section A Record"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            A
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddNewRecord('b', logbook)}
                            className="text-xs px-2 py-1 h-6"
                            title="Add Section B Record"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            B
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddNewRecord('c', logbook)}
                            className="text-xs px-2 py-1 h-6"
                            title="Add Section C Record"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            C
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submitted */}
                  <div className="col-span-2">
                    <div className="text-sm text-gray-900">
                      {logbook.submitted_at && new Date(logbook.submitted_at).getTime() > 0 
                        ? formatDate(logbook.submitted_at) 
                        : 'Not submitted'
                      }
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
                  <div className="col-span-1">
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
                    <div className="flex flex-col gap-1 items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStructuredLogbook(logbook)}
                        title="View Logbook"
                        className="h-7 w-7 p-0"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      {logbook.audit_log_count > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAuditTrail(logbook.id)}
                          title="View Status History"
                          className="h-7 px-1 text-xs min-w-0 flex-shrink relative"
                        >
                          <Activity className="h-2.5 w-2.5" />
                          {logbook.audit_log_count > 0 && (
                            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 text-xs p-0 flex items-center justify-center">
                              {logbook.audit_log_count}
                            </Badge>
                          )}
                        </Button>
                      )}
                      {canRequestUnlock(logbook) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenUnlockRequest(logbook)}
                          title="Request Unlock"
                          className="h-7 px-1 text-xs min-w-0 flex-shrink"
                        >
                          <Unlock className="h-2.5 w-2.5" />
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


      {/* Modals */}
      {showCreationModal && (
        <LogbookCreationModal
          onClose={() => setShowCreationModal(false)}
          onLogbookCreated={handleLogbookCreated}
        />
      )}

      {previewLogbook && (
        <LogbookPreview
          logbook={previewLogbook}
          onClose={() => setPreviewLogbook(null)}
        />
      )}

      {structuredLogbook && (
        <StructuredLogbookDisplay
          logbook={structuredLogbook as any}
          onClose={() => setStructuredLogbook(null)}
          onRegenerate={() => {
            setStructuredLogbook(null)
            fetchLogbooks(true) // Refresh the logbook list
          }}
          onResubmit={() => {
            setStructuredLogbook(null)
            fetchLogbooks(true) // Refresh the logbook list after resubmit
          }}
          onNavigateToHelp={(errorDetails) => {
            console.log('LogbookDashboard onNavigateToHelp called', errorDetails)
            setStructuredLogbook(null) // Close the dialog
            const params = new URLSearchParams()
            if (errorDetails.summary) params.set('summary', errorDetails.summary)
            if (errorDetails.explanation) params.set('explanation', errorDetails.explanation)
            if (errorDetails.userAction) params.set('userAction', errorDetails.userAction)
            const helpUrl = params.toString() ? `/help/errors?${params.toString()}` : '/help/errors'
            console.log('Navigating to:', helpUrl)
            navigate(helpUrl)
          }}
        />
      )}

      {/* Unlock Request Modal */}
      {unlockRequestModal.logbook && (
        <UnlockRequestModal
          isOpen={unlockRequestModal.isOpen}
          onClose={handleCloseUnlockRequest}
          logbookId={unlockRequestModal.logbook.id}
          logbookWeekDisplay={unlockRequestModal.logbook.week_display}
          onSuccess={handleUnlockRequestSuccess}
        />
      )}

      <LogbookAuditTree
        logbookId={auditTrailModal.logbookId}
        isOpen={auditTrailModal.isOpen}
        onClose={handleCloseAuditTrail}
      />

    </div>
  )
}
