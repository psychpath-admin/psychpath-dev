/**
 * Logbook Detail Page
 * Comprehensive logbook review interface with sections, comments, and audit trail
 * Implements the exact component tree structure specified
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  ArrowLeft,
  Edit,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  Download,
  FileText,
  Clock,
  User,
  Calendar,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { CommentSidebar } from '@/components/logbook/CommentSidebar'
import { AuditTrailSidebar } from '@/components/logbook/AuditTrailSidebar'
import { SectionCommentThread } from '@/components/logbook/SectionCommentThread'

interface Logbook {
  id: string
  week_start_date: string
  status: 'draft' | 'submitted' | 'under_review' | 'changes_requested' | 'approved' | 'locked'
  total_dcc_hours: number
  total_cra_hours: number
  total_pd_hours: number
  total_supervision_hours: number
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
  locked_at: string | null
  pdf_url: string | null
  notes: string
  sections: LogbookSection[]
  comments: LogbookComment[]
  audit_entries: LogbookAudit[]
  is_locked: boolean
  can_edit: boolean
  can_submit: boolean
  can_approve: boolean
  can_reject: boolean
  can_request_unlock: boolean
  can_grant_unlock: boolean
}

interface LogbookSection {
  id: string
  section_type: 'A' | 'B' | 'C'
  title: string
  content_json: any
  is_locked: boolean
  created_at: string
  updated_at: string
}

interface LogbookComment {
  id: string
  logbook: string
  section: string | null
  record_id: string | null
  author: {
    id: number
    first_name: string
    last_name: string
    email: string
  }
  text: string
  scope: 'record' | 'section' | 'document'
  parent_comment: string | null
  created_at: string
  replies: LogbookComment[]
}

interface LogbookAudit {
  id: string
  logbook: string
  actor: {
    id: number
    first_name: string
    last_name: string
    email: string
  } | null
  action: string
  description: string
  timestamp: string
  diff_snapshot: any
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
    icon: AlertCircle
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

export default function LogbookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [logbook, setLogbook] = useState<Logbook | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Determine user role
  const isSupervisor = user?.profile?.role === 'SUPERVISOR'
  const isProvisional = user?.profile?.role === 'PROVISIONAL' || user?.profile?.role === 'REGISTRAR'

  useEffect(() => {
    if (id) {
      fetchLogbook()
    }
  }, [id])

  const fetchLogbook = async () => {
    try {
      setLoading(true)
      const response = await apiFetch(`/api/enhanced-logbooks/${id}/`)
      setLogbook(response as unknown as Logbook)
    } catch (error) {
      console.error('Error fetching logbook:', error)
      toast.error('Failed to load logbook')
      navigate('/logbooks')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusAction = async (action: string, data?: any) => {
    try {
      await apiFetch(`/api/enhanced-logbooks/${id}/${action}/`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      })
      
      toast.success(`Logbook ${action} successful`)
      fetchLogbook()
    } catch (error: any) {
      console.error(`Error ${action} logbook:`, error)
      const errorMessage = error.response?.data?.error || `Failed to ${action} logbook`
      toast.error(errorMessage)
    }
  }

  const handleGeneratePDF = async () => {
    try {
      const response = await apiFetch(`/api/enhanced-logbooks/${id}/pdf/`, {
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

  const getActionButtons = () => {
    if (!logbook) return []

    const buttons = []

    if (isProvisional) {
      if (logbook.can_edit) {
        buttons.push(
          <Button
            key="edit"
            variant="outline"
            onClick={() => {/* Navigate to edit mode */}}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )
      }

      if (logbook.can_submit) {
        buttons.push(
          <Button
            key="submit"
            onClick={() => handleStatusAction('submit')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Submit for Review
          </Button>
        )
      }

      if (logbook.can_request_unlock) {
        buttons.push(
          <Button
            key="request-unlock"
            variant="outline"
            onClick={() => handleStatusAction('request-edit')}
          >
            <Unlock className="h-4 w-4 mr-2" />
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
            onClick={() => handleStatusAction('approve')}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
        )
      }

      if (logbook.can_reject) {
        buttons.push(
          <Button
            key="reject"
            onClick={() => handleStatusAction('reject')}
            className="bg-red-600 hover:bg-red-700"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
        )
      }

      if (logbook.can_grant_unlock) {
        buttons.push(
          <Button
            key="grant-unlock"
            variant="outline"
            onClick={() => handleStatusAction('grant-edit')}
          >
            <Unlock className="h-4 w-4 mr-2" />
            Grant Unlock
          </Button>
        )
      }
    }

    // PDF download
    if (logbook.status === 'approved' || logbook.status === 'locked') {
      buttons.push(
        <Button
          key="pdf"
          variant="outline"
          onClick={handleGeneratePDF}
        >
          <Download className="h-4 w-4 mr-2" />
          Generate PDF
        </Button>
      )
    }

    return buttons
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading logbook...</p>
        </div>
      </div>
    )
  }

  if (!logbook) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Logbook not found</h3>
          <Button onClick={() => navigate('/logbooks')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Logbooks
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header Bar */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => navigate('/logbooks')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  Week of {formatDate(logbook.week_start_date)}
                </h1>
                {getStatusBadge(logbook.status)}
                {logbook.is_locked && (
                  <Badge variant="outline" className="text-purple-600 border-purple-600">
                    <Lock className="h-3 w-3 mr-1" />
                    Locked
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>Trainee: {logbook.owner.first_name} {logbook.owner.last_name}</span>
                </div>
                {logbook.supervisor && (
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>Supervisor: {logbook.supervisor.first_name} {logbook.supervisor.last_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Total: {getTotalHours(logbook).toFixed(1)}h</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Updated: {formatDateTime(logbook.updated_at)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getActionButtons()}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Sections */}
          <div className="col-span-8 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="section-a">Section A</TabsTrigger>
                <TabsTrigger value="section-b">Section B</TabsTrigger>
                <TabsTrigger value="section-c">Section C</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Hours Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Hours Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {logbook.total_dcc_hours}h
                            </div>
                            <div className="text-sm text-blue-600">Direct Client Contact</div>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {logbook.total_cra_hours}h
                            </div>
                            <div className="text-sm text-green-600">CRA/ICRA</div>
                          </div>
                          <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                              {logbook.total_pd_hours}h
                            </div>
                            <div className="text-sm text-purple-600">Professional Development</div>
                          </div>
                          <div className="text-center p-4 bg-orange-50 rounded-lg">
                            <div className="text-2xl font-bold text-orange-600">
                              {logbook.total_supervision_hours}h
                            </div>
                            <div className="text-sm text-orange-600">Supervision</div>
                          </div>
                        </div>
                        
                        <div className="text-center p-4 bg-gray-100 rounded-lg">
                          <div className="text-3xl font-bold text-gray-800">
                            {getTotalHours(logbook).toFixed(1)}h
                          </div>
                          <div className="text-sm text-gray-600">Total Hours</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Logbook Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Logbook Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Status</label>
                          <div className="mt-1">{getStatusBadge(logbook.status)}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Created</label>
                          <p className="text-sm">{formatDateTime(logbook.created_at)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Submitted</label>
                          <p className="text-sm">
                            {logbook.submitted_at ? formatDateTime(logbook.submitted_at) : 'Not submitted'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Approved</label>
                          <p className="text-sm">
                            {logbook.approved_at ? formatDateTime(logbook.approved_at) : 'Not approved'}
                          </p>
                        </div>
                      </div>
                      
                      {logbook.notes && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Notes</label>
                          <p className="text-sm mt-1 p-3 bg-gray-50 rounded-md">{logbook.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Section A */}
              <TabsContent value="section-a">
                <SectionPanel 
                  title="Section A: Weekly record of professional practice"
                  section={logbook.sections.find(s => s.section_type === 'A')}
                  isLocked={logbook.is_locked}
                  logbookId={logbook.id}
                />
              </TabsContent>

              {/* Section B */}
              <TabsContent value="section-b">
                <SectionPanel 
                  title="Section B: Record of professional development"
                  section={logbook.sections.find(s => s.section_type === 'B')}
                  isLocked={logbook.is_locked}
                  logbookId={logbook.id}
                />
              </TabsContent>

              {/* Section C */}
              <TabsContent value="section-c">
                <SectionPanel 
                  title="Section C: Record of supervision"
                  section={logbook.sections.find(s => s.section_type === 'C')}
                  isLocked={logbook.is_locked}
                  logbookId={logbook.id}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Sidebar */}
          <aside className="col-span-4 space-y-6">
            <CommentSidebar 
              logbookId={logbook.id}
              comments={logbook.comments}
              onCommentAdded={fetchLogbook}
            />
            <AuditTrailSidebar 
              auditEntries={logbook.audit_entries}
            />
          </aside>
        </div>
      </div>
    </div>
  )
}

// Section Panel Component
interface SectionPanelProps {
  title: string
  section: LogbookSection | undefined
  isLocked: boolean
  logbookId: string
}

function SectionPanel({ title, section, logbookId }: SectionPanelProps) {
  if (!section) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Section not found
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {section.is_locked && (
            <Badge variant="outline" className="text-purple-600 border-purple-600">
              <Lock className="h-3 w-3 mr-1" />
              Locked
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Section Content */}
          <div className="text-sm text-gray-600">
            {section.content_json && Object.keys(section.content_json).length > 0 ? (
              <div className="bg-gray-50 p-4 rounded-md">
                <pre className="whitespace-pre-wrap text-xs">
                  {JSON.stringify(section.content_json, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No content available
              </div>
            )}
          </div>

          {/* Section Comment Thread */}
          <SectionCommentThread 
            sectionId={section.id}
            logbookId={logbookId}
          />
        </div>
      </CardContent>
    </Card>
  )
}
