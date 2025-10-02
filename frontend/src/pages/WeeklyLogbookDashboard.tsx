import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  MessageCircle,
  Edit,
  Lock,
  ChevronDown,
  ChevronUp,
  FileText,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'

interface LogbookEntry {
  id: number | null
  week_start_date: string
  week_end_date: string
  week_display: string
  week_starting_display: string
  status: 'ready' | 'submitted' | 'approved' | 'rejected'
  rag_status: 'red' | 'amber' | 'green'
  is_overdue: boolean
  has_supervisor_comments: boolean
  is_editable: boolean
  supervisor_comments?: string
  submitted_at: string | null
  reviewed_at?: string
  reviewed_by_name?: string
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
}

type SortOption = 'date-asc' | 'date-desc' | 'status-overdue' | 'status-rejected' | 'status-ready' | 'status-submitted' | 'status-approved'
type FilterOption = 'all' | 'ready' | 'submitted' | 'approved' | 'rejected' | 'overdue' | 'new'

export default function WeeklyLogbookDashboard() {
  const navigate = useNavigate()
  const [logbooks, setLogbooks] = useState<LogbookEntry[]>([])
  const [selectedLogbook, setSelectedLogbook] = useState<LogbookEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [headerExpanded, setHeaderExpanded] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('date-asc') // Default: oldest to newest
  const [filterBy, setFilterBy] = useState<FilterOption>('all')

  useEffect(() => {
    fetchLogbooks()
  }, [])

  const fetchLogbooks = async () => {
    try {
      const response = await apiFetch('/api/logbook/dashboard/')
      if (response.ok) {
        const data = await response.json()
        setLogbooks(data)
        // Select the first logbook by default
        if (data.length > 0) {
          setSelectedLogbook(data[0])
        }
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

  const getRAGStatusColor = (ragStatus: string) => {
    switch (ragStatus) {
      case 'red':
        return 'bg-red-500'
      case 'amber':
        return 'bg-yellow-500'
      case 'green':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getRAGStatusIcon = (ragStatus: string) => {
    switch (ragStatus) {
      case 'red':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'amber':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'green':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Submitted</Badge>
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>
      default:
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Ready</Badge>
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

  const formatDateDDMMYYYY = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const getFilteredAndSortedLogbooks = () => {
    let filtered = [...logbooks]

    // Apply filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(logbook => {
        switch (filterBy) {
          case 'ready':
            return logbook.status === 'ready' && !logbook.has_logbook
          case 'submitted':
            return logbook.status === 'submitted'
          case 'approved':
            return logbook.status === 'approved'
          case 'rejected':
            return logbook.status === 'rejected'
          case 'overdue':
            return logbook.is_overdue
          case 'new':
            return !logbook.has_logbook
          default:
            return true
        }
      })
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.week_start_date).getTime() - new Date(b.week_start_date).getTime()
        case 'date-desc':
          return new Date(b.week_start_date).getTime() - new Date(a.week_start_date).getTime()
        case 'status-overdue':
          return (b.is_overdue ? 1 : 0) - (a.is_overdue ? 1 : 0)
        case 'status-rejected':
          return (b.status === 'rejected' ? 1 : 0) - (a.status === 'rejected' ? 1 : 0)
        case 'status-ready':
          return (b.status === 'ready' ? 1 : 0) - (a.status === 'ready' ? 1 : 0)
        case 'status-submitted':
          return (b.status === 'submitted' ? 1 : 0) - (a.status === 'submitted' ? 1 : 0)
        case 'status-approved':
          return (b.status === 'approved' ? 1 : 0) - (a.status === 'approved' ? 1 : 0)
        default:
          return 0
      }
    })

    return filtered
  }

  const getSortIcon = () => {
    switch (sortBy) {
      case 'date-asc':
        return <ArrowUp className="h-4 w-4" />
      case 'date-desc':
        return <ArrowDown className="h-4 w-4" />
      default:
        return <ArrowUpDown className="h-4 w-4" />
    }
  }

  const handleViewLogbook = (logbook: LogbookEntry) => {
    navigate(`/logbook/week/${logbook.week_start_date}`)
  }

  const handleCreateLogbook = (logbook: LogbookEntry) => {
    navigate(`/logbook/week/${logbook.week_start_date}`)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Weekly Logbook Dashboard</h1>
            <p className="text-muted-foreground">View and manage your weekly logbooks</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8">Loading logbooks...</div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8">Loading content...</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Weekly Logbook Dashboard
          </h1>
          <p className="text-muted-foreground">View and manage your weekly logbooks for supervisor review</p>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Available Weekly Logbooks
                </div>
                {logbooks.length > 0 && (
                  <span className="text-xs text-gray-500 font-normal">
                    {getFilteredAndSortedLogbooks().length} of {logbooks.length}
                  </span>
                )}
              </CardTitle>
              
              {/* Sort and Filter Controls */}
              <div className="space-y-3 mt-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                      <SelectTrigger className="h-8 text-xs">
                        <div className="flex items-center gap-1">
                          {getSortIcon()}
                          <SelectValue placeholder="Sort by" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                        <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                        <SelectItem value="status-overdue">Overdue First</SelectItem>
                        <SelectItem value="status-rejected">Rejected First</SelectItem>
                        <SelectItem value="status-ready">Ready First</SelectItem>
                        <SelectItem value="status-submitted">Submitted First</SelectItem>
                        <SelectItem value="status-approved">Approved First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={filterBy} onValueChange={(value: FilterOption) => setFilterBy(value)}>
                      <SelectTrigger className="h-8 text-xs">
                        <div className="flex items-center gap-1">
                          <Filter className="h-3 w-3" />
                          <SelectValue placeholder="Filter by" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Logbooks</SelectItem>
                        <SelectItem value="new">New (No Logbook)</SelectItem>
                        <SelectItem value="ready">Ready</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {logbooks.length === 0 ? (
                <div className="p-6 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No Logbooks Yet</h3>
                  <p className="text-gray-600">
                    You haven't created any weekly logbooks yet.
                  </p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {getFilteredAndSortedLogbooks().length === 0 ? (
                    <div className="p-6 text-center">
                      <Filter className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">No logbooks match the current filter</p>
                    </div>
                  ) : (
                    getFilteredAndSortedLogbooks().map((logbook, index) => (
                    <div
                      key={logbook.id || `week-${logbook.week_start_date}-${index}`}
                      className={`p-4 border-b cursor-pointer transition-colors hover:bg-gray-50 ${
                        selectedLogbook?.id === logbook.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => setSelectedLogbook(logbook)}
                    >
                      <div className="flex items-start gap-3">
                        {/* RAG Status Indicator */}
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-3 h-3 rounded-full ${getRAGStatusColor(logbook.rag_status)}`} />
                          {getRAGStatusIcon(logbook.rag_status)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm mb-1">{logbook.week_starting_display}</h4>
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusBadge(logbook.status)}
                            {!logbook.has_logbook && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                New
                              </Badge>
                            )}
                            {logbook.has_supervisor_comments && (
                              <div title="Has supervisor comments">
                                <MessageCircle className="h-4 w-4 text-blue-500" />
                              </div>
                            )}
                            {logbook.is_overdue && (
                              <div title="Overdue">
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-600">
                            Total: {logbook.section_totals.total.weekly_hours}h
                          </div>
                        </div>
                      </div>
                    </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Content View */}
        <div className="lg:col-span-2">
          {selectedLogbook ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {selectedLogbook.week_starting_display}
                  </div>
                  <div className="flex items-center gap-2">
                    {getRAGStatusIcon(selectedLogbook.rag_status)}
                    {getStatusBadge(selectedLogbook.status)}
                  </div>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Expandable Header with Weekly Stats */}
                <div className="border rounded-lg">
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-4 h-auto"
                    onClick={() => setHeaderExpanded(!headerExpanded)}
                  >
                    <div className="text-left">
                      <h3 className="font-semibold">Weekly Summary</h3>
                      <p className="text-sm text-gray-600">Click to expand detailed statistics</p>
                    </div>
                    {headerExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                  
                  {headerExpanded && (
                    <div className="px-4 pb-4 border-t bg-gray-50">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {selectedLogbook.section_totals.section_a.weekly_hours}h
                          </div>
                          <div className="text-sm text-gray-600">DCC + CRA</div>
                          <div className="text-xs text-gray-500">
                            Total: {selectedLogbook.section_totals.section_a.cumulative_hours}h
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {selectedLogbook.section_totals.section_c.weekly_hours}h
                          </div>
                          <div className="text-sm text-gray-600">Supervision</div>
                          <div className="text-xs text-gray-500">
                            Total: {selectedLogbook.section_totals.section_c.cumulative_hours}h
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {selectedLogbook.section_totals.section_b.weekly_hours}h
                          </div>
                          <div className="text-sm text-gray-600">Professional Development</div>
                          <div className="text-xs text-gray-500">
                            Total: {selectedLogbook.section_totals.section_b.cumulative_hours}h
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-800">
                            {selectedLogbook.section_totals.total.weekly_hours}h
                          </div>
                          <div className="text-sm text-gray-600">Total Weekly</div>
                          <div className="text-xs text-gray-500">
                            Total: {selectedLogbook.section_totals.total.cumulative_hours}h
                          </div>
                        </div>
                      </div>
                      
                      {/* Logbook Status and Feedback */}
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Logbook Status:</span>
                          {getStatusBadge(selectedLogbook.status)}
                        </div>
                        
                        {selectedLogbook.has_supervisor_comments && (
                          <div className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium">Supervisor Feedback Available</span>
                          </div>
                        )}
                        
                        {selectedLogbook.active_unlock && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-orange-700">
                              <Lock className="h-4 w-4" />
                              <span className="text-sm font-medium">Logbook Unlocked</span>
                            </div>
                            <p className="text-xs text-orange-600 mt-1">
                              {selectedLogbook.active_unlock.remaining_minutes} minutes remaining
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Supervisor Comments */}
                {selectedLogbook.supervisor_comments && (
                  <Alert>
                    <MessageCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Supervisor Comments:</strong> {selectedLogbook.supervisor_comments}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                {selectedLogbook.has_logbook && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewLogbook(selectedLogbook)}
                      title="Open logbook editor"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Open Logbook
                    </Button>
                    
                    {selectedLogbook.is_editable ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewLogbook(selectedLogbook)}
                        title="Edit logbook"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        title="Logbook is locked and cannot be edited"
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Locked
                      </Button>
                    )}
                  </div>
                )}

                {/* Timestamps */}
                {selectedLogbook.has_logbook && (
                  <div className="text-sm text-gray-600 space-y-1">
                    {selectedLogbook.submitted_at && (
                      <div>Submitted: {formatDate(selectedLogbook.submitted_at)}</div>
                    )}
                    {selectedLogbook.reviewed_at && (
                      <div>Reviewed: {formatDate(selectedLogbook.reviewed_at)}</div>
                    )}
                    {selectedLogbook.reviewed_by_name && (
                      <div>Reviewed by: {selectedLogbook.reviewed_by_name}</div>
                    )}
                  </div>
                )}

                {/* New Logbook Message */}
                {!selectedLogbook.has_logbook && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-700 mb-2">
                      <FileText className="h-5 w-5" />
                      <span className="font-medium">Ready to Create Logbook</span>
                    </div>
                    <p className="text-sm text-blue-600">
                      This week has recorded entries and is ready for logbook creation. 
                      Click "Create Logbook" to begin the submission process.
                    </p>
                    <div className="mt-3">
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleCreateLogbook(selectedLogbook)}
                      >
                        Create Logbook
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No Logbook Selected</h3>
                  <p className="text-gray-600">
                    Select a logbook from the sidebar to view its details.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
