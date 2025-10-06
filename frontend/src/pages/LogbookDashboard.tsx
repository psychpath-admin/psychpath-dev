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
  Edit
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import LogbookCreationModal from '@/components/LogbookCreationModal'
import LogbookPreview from '@/components/LogbookPreview'
import StructuredLogbookDisplay from '@/components/StructuredLogbookDisplay'
import { useFilterPersistence, useSimpleFilterPersistence } from '@/hooks/useFilterPersistence'

interface Logbook {
  id: number
  trainee_name: string
  week_start_date: string
  week_end_date: string
  week_display: string
  status: 'draft' | 'submitted' | 'under_review' | 'returned_for_edits' | 'approved' | 'rejected' | 'locked'
  supervisor_name?: string
  reviewed_by_name?: string
  submitted_at: string
  reviewed_at?: string
  supervisor_comments?: string
  is_locked?: boolean
  regenerated?: boolean
  due_date?: string
  section_totals: {
    section_a: { 
      weekly_hours: number
      cumulative_hours: number
      dcc?: { weekly_hours: number; cumulative_hours: number }
      cra?: { weekly_hours: number; cumulative_hours: number }
    }
    section_b: { weekly_hours: number; cumulative_hours: number }
    section_c: { weekly_hours: number; cumulative_hours: number }
    total: { weekly_hours: number; cumulative_hours: number }
  }
  active_unlock?: {
    unlock_expires_at: string
    duration_minutes: number
  }
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

export default function LogbookDashboard() {
  const navigate = useNavigate()
  const [logbooks, setLogbooks] = useState<Logbook[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreationModal, setShowCreationModal] = useState(false)
  const [previewLogbook, setPreviewLogbook] = useState<Logbook | null>(null)
  const [structuredLogbook, setStructuredLogbook] = useState<Logbook | null>(null)
  
  // New state for dashboard functionality
  const [metrics, setMetrics] = useState<LogbookMetrics | null>(null)
  
  // Persistent filters - defaults to oldest first for provisional users
  const [filters, setFilters, clearFilters] = useFilterPersistence<LogbookFilters>('logbook-dashboard', {
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
  }, [])

  const fetchLogbooks = async () => {
    try {
      const response = await apiFetch('/api/logbook/')
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

  const calculateMetrics = (logbookData: Logbook[]) => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    const totalLogbooks = logbookData.length
    const submittedLogbooks = logbookData.filter(l => l.status === 'submitted').length
    const approvedLogbooks = logbookData.filter(l => l.status === 'approved').length
    const lockedLogbooks = logbookData.filter(l => l.is_locked).length
    const regeneratedLogbooks = logbookData.filter(l => l.regenerated).length
    const overdueLogbooks = logbookData.filter(l => {
      if (!l.due_date) return false
      return l.due_date < today && ['draft', 'submitted'].includes(l.status)
    }).length
    
    // Calculate average review time
    const reviewedLogbooks = logbookData.filter(l => l.submitted_at && l.reviewed_at)
    const avgReviewTime = reviewedLogbooks.length > 0 
      ? reviewedLogbooks.reduce((sum, l) => {
          const submitted = new Date(l.submitted_at)
          const reviewed = new Date(l.reviewed_at!)
          const diffTime = Math.abs(reviewed.getTime() - submitted.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          return sum + diffDays
        }, 0) / reviewedLogbooks.length
      : 0
    
    // Find next due date
    const upcomingLogbooks = logbookData.filter(l => {
      if (!l.due_date) return false
      return l.due_date >= today && ['draft', 'submitted'].includes(l.status)
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
      case 'submitted':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Waiting for Review</Badge>
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

  const handleLogbookCreated = () => {
    fetchLogbooks()
    setShowCreationModal(false)
  }

  const handlePreviewLogbook = (logbook: Logbook) => {
    // Show the AHPRA-style structured display directly instead of the preview
    setStructuredLogbook(logbook)
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
              onClick={() => setShowCreationModal(true)}
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
                <Button onClick={() => setShowCreationModal(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Logbook
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 rounded-lg font-medium text-sm text-gray-700">
                <div className="col-span-2">Week</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-2">Submitted</div>
                <div className="col-span-2">Reviewed</div>
                <div className="col-span-1">Locked</div>
                <div className="col-span-1">Regenerated</div>
                <div className="col-span-2">Comments</div>
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
                  <div className="col-span-1">
                    {getStatusBadge(logbook.status)}
                  </div>

                  {/* Submitted */}
                  <div className="col-span-2">
                    <div className="text-sm text-gray-900">{formatDate(logbook.submitted_at)}</div>
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
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreviewLogbook(logbook)}
                        title="View Logbook"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {logbook.status === 'rejected' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/logbook/${logbook.id}/edit`)}
                          title="Edit Rejected Logbook"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {logbook.status === 'draft' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Submit"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {logbook.status === 'approved' && !logbook.is_locked && (
                        <Button
                          variant="ghost"
                          size="sm"
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
          logbook={structuredLogbook}
          onClose={() => setStructuredLogbook(null)}
          onRegenerate={() => {
            setStructuredLogbook(null)
            fetchLogbooks() // Refresh the logbook list
          }}
        />
      )}

    </div>
  )
}
