/**
 * Weekly Logbook Review Dashboard
 * Main dashboard for creating, reviewing, and managing weekly logbooks
 * Supports both Provisional/Registrar and Supervisor roles
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Plus, 
  Eye, 
  Edit, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Lock, 
  Unlock,
  FileText,
  Download,
  Search,
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'

interface Logbook {
  id: string
  week_start_date: string
  status: 'draft' | 'submitted' | 'under_review' | 'changes_requested' | 'approved' | 'locked'
  total_dcc_hours: number
  total_cra_hours: number
  total_pd_hours: number
  total_supervision_hours: number
  total_hours: number
  owner: {
    id: number
    first_name: string
    last_name: string
    email: string
  }
  supervisor: {
    id: number
    first_name: string
    last_name: string
    email: string
  } | null
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
  pdf_url: string | null
}

interface PaginationInfo {
  current_page: number
  total_pages: number
  total_records: number
  records_per_page: number
}

const statusConfig = {
  draft: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: Edit
  },
  submitted: {
    label: 'Submitted',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Clock
  },
  under_review: {
    label: 'Under Review',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Eye
  },
  changes_requested: {
    label: 'Changes Requested',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: XCircle
  },
  approved: {
    label: 'Approved',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle
  },
  locked: {
    label: 'Locked',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Lock
  }
}

export default function LogbookReviewDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [logbooks, setLogbooks] = useState<Logbook[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<PaginationInfo>({
    current_page: 1,
    total_pages: 1,
    total_records: 0,
    records_per_page: 20
  })
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('updated_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Determine user role
  const isSupervisor = user?.profile?.role === 'SUPERVISOR'
  const isProvisional = user?.profile?.role === 'PROVISIONAL' || user?.profile?.role === 'REGISTRAR'

  useEffect(() => {
    fetchLogbooks()
  }, [pagination.current_page, pagination.records_per_page, searchTerm, statusFilter, sortBy, sortOrder])

  const fetchLogbooks = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.current_page.toString(),
        page_size: pagination.records_per_page.toString(),
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : '',
        ordering: sortOrder === 'desc' ? `-${sortBy}` : sortBy
      })
      
      const endpoint = isSupervisor 
        ? '/api/enhanced-logbooks/supervisor/'
        : '/api/enhanced-logbooks/'
      
      const response = await apiFetch(`${endpoint}?${params}`)
      
      if (response && typeof response === 'object' && 'results' in response) {
        setLogbooks(response.results as Logbook[])
        setPagination(prev => ({
          ...prev,
          current_page: (response as any).current_page || 1,
          total_pages: (response as any).total_pages || 1,
          total_records: (response as any).total_records || 0
        }))
      } else {
        setLogbooks(response as unknown as Logbook[])
      }
    } catch (error) {
      console.error('Error fetching logbooks:', error)
      toast.error('Failed to load logbooks')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLogbook = () => {
    navigate('/logbooks/create')
  }

  const handleViewLogbook = (logbookId: string) => {
    navigate(`/logbooks/${logbookId}`)
  }

  const handleStatusAction = async (logbookId: string, action: string, data?: any) => {
    try {
      await apiFetch(`/api/enhanced-logbooks/${logbookId}/${action}/`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      })
      
      toast.success(`Logbook ${action} successful`)
      fetchLogbooks()
    } catch (error: any) {
      console.error(`Error ${action} logbook:`, error)
      const errorMessage = error.response?.data?.error || `Failed to ${action} logbook`
      toast.error(errorMessage)
    }
  }

  const handleDownloadPDF = async (logbookId: string) => {
    try {
      const response = await apiFetch(`/api/enhanced-logbooks/${logbookId}/pdf/`, {
        method: 'POST',
      })
      
      if ((response as any).pdf_url) {
        window.open((response as any).pdf_url, '_blank')
      } else {
        toast.error('PDF generation failed')
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTotalHours = (logbook: Logbook) => {
    return logbook.total_dcc_hours + logbook.total_cra_hours + 
           logbook.total_pd_hours + logbook.total_supervision_hours
  }

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig]
    const Icon = config.icon
    
    return (
      <Badge className={`${config.color} border`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const getActionButtons = (logbook: Logbook) => {
    const buttons = []

    // View button - always available
    buttons.push(
      <Button
        key="view"
        variant="outline"
        size="sm"
        onClick={() => handleViewLogbook(logbook.id)}
      >
        <Eye className="h-4 w-4 mr-1" />
        View
      </Button>
    )

    // Role-based actions
    if (isProvisional) {
      if (logbook.can_edit) {
        buttons.push(
          <Button
            key="edit"
            variant="outline"
            size="sm"
            onClick={() => handleViewLogbook(logbook.id)}
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )
      }

      if (logbook.can_submit) {
        buttons.push(
          <Button
            key="submit"
            size="sm"
            onClick={() => handleStatusAction(logbook.id, 'submit')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Submit
          </Button>
        )
      }

      if (logbook.can_request_unlock) {
        buttons.push(
          <Button
            key="request-unlock"
            variant="outline"
            size="sm"
            onClick={() => handleStatusAction(logbook.id, 'request-edit')}
          >
            <Unlock className="h-4 w-4 mr-1" />
            Request Unlock
          </Button>
        )
      }
    }

    if (isSupervisor) {
      if (logbook.can_approve) {
        buttons.push(
          <Button
            key="approve"
            size="sm"
            onClick={() => handleStatusAction(logbook.id, 'approve')}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve
          </Button>
        )
      }

      if (logbook.can_reject) {
        buttons.push(
          <Button
            key="reject"
            size="sm"
            onClick={() => handleStatusAction(logbook.id, 'reject')}
            className="bg-red-600 hover:bg-red-700"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Reject
          </Button>
        )
      }

      if (logbook.can_grant_unlock) {
        buttons.push(
          <Button
            key="grant-unlock"
            variant="outline"
            size="sm"
            onClick={() => handleStatusAction(logbook.id, 'grant-edit')}
          >
            <Unlock className="h-4 w-4 mr-1" />
            Grant Unlock
          </Button>
        )
      }
    }

    // PDF download - available for approved/locked logbooks
    if (logbook.status === 'approved' || logbook.status === 'locked') {
      buttons.push(
        <Button
          key="pdf"
          variant="outline"
          size="sm"
          onClick={() => handleDownloadPDF(logbook.id)}
        >
          <Download className="h-4 w-4 mr-1" />
          PDF
        </Button>
      )
    }

    return buttons
  }

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, current_page: page }))
  }

  const handlePageSizeChange = (size: string) => {
    setPagination(prev => ({ 
      ...prev, 
      records_per_page: parseInt(size),
      current_page: 1 
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isSupervisor ? 'Supervisor Dashboard' : 'Weekly Logbooks'}
              </h1>
              <p className="text-gray-600 mt-2">
                {isSupervisor 
                  ? 'Review and manage trainee logbooks'
                  : 'Track your weekly professional practice and development'
                }
              </p>
            </div>
            {isProvisional && (
              <Button onClick={handleCreateLogbook} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                New Logbook
              </Button>
            )}
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

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_at">Last Updated</SelectItem>
                  <SelectItem value="week_start_date">Week Start</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="total_hours">Total Hours</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logbooks Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {isSupervisor ? 'Trainee Logbooks' : 'Your Logbooks'}
              </CardTitle>
              <div className="text-sm text-gray-500">
                {pagination.total_records} total logbooks
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading logbooks...</p>
              </div>
            ) : logbooks.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No logbooks found</h3>
                <p className="text-gray-600 mb-4">
                  {isSupervisor 
                    ? 'No logbooks are currently assigned to you for review'
                    : 'Get started by creating your first logbook'
                  }
                </p>
                {isProvisional && (
                  <Button onClick={handleCreateLogbook}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Logbook
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Week Beginning</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Status</TableHead>
                      {isSupervisor && <TableHead>Trainee</TableHead>}
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logbooks.map((logbook) => (
                      <TableRow key={logbook.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {formatDate(logbook.week_start_date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">
                              {getTotalHours(logbook).toFixed(1)}h
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            DCC: {logbook.total_dcc_hours}h | 
                            CRA: {logbook.total_cra_hours}h | 
                            PD: {logbook.total_pd_hours}h | 
                            Sup: {logbook.total_supervision_hours}h
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(logbook.status)}
                            {logbook.is_locked && (
                              <Badge variant="outline" className="text-purple-600 border-purple-600">
                                <Lock className="h-3 w-3 mr-1" />
                                Locked
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        {isSupervisor && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <div>
                                <div className="font-medium">
                                  {logbook.owner.first_name} {logbook.owner.last_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {logbook.owner.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="text-sm">
                            {formatDateTime(logbook.updated_at)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {getActionButtons(logbook)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Showing {((pagination.current_page - 1) * pagination.records_per_page) + 1} to{' '}
                {Math.min(pagination.current_page * pagination.records_per_page, pagination.total_records)} of{' '}
                {pagination.total_records} logbooks
              </div>
              
              <Select value={pagination.records_per_page.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.current_page - 1)}
                disabled={pagination.current_page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                  let pageNum
                  if (pagination.total_pages <= 5) {
                    pageNum = i + 1
                  } else if (pagination.current_page <= 3) {
                    pageNum = i + 1
                  } else if (pagination.current_page >= pagination.total_pages - 2) {
                    pageNum = pagination.total_pages - 4 + i
                  } else {
                    pageNum = pagination.current_page - 2 + i
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pagination.current_page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.current_page + 1)}
                disabled={pagination.current_page === pagination.total_pages}
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
