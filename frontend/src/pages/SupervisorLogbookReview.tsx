import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { 
  BookOpen, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  FileText,
  User,
  MessageSquare,
  Filter,
  RefreshCw,
  Plus,
  Activity,
  ChevronDown,
  ChevronRight,
  Edit
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import LogbookAuditTrailModal from '@/components/LogbookAuditTrailModal'
import SupervisorLogbookDisplay from '@/components/SupervisorLogbookDisplay'
import { useSimpleFilterPersistence } from '@/hooks/useFilterPersistence'

interface LogbookForReview {
  id: number
  trainee_name: string
  trainee_email: string
  week_start_date: string
  week_end_date: string
  week_display: string
  status: 'submitted' | 'approved' | 'rejected' | 'returned_for_edits'
  submitted_at: string
  reviewed_at?: string
  resubmitted_at?: string
  supervisor_comments?: string
  section_totals: {
    section_a: { weekly_hours: string; cumulative_hours: string }
    section_b: { weekly_hours: string; cumulative_hours: string }
    section_c: { weekly_hours: string; cumulative_hours: string }
    total: { weekly_hours: string; cumulative_hours: string }
  }
}

export default function SupervisorLogbookReview() {
  const [logbooks, setLogbooks] = useState<LogbookForReview[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState<number | null>(null)
  const [activeLogbookId, setActiveLogbookId] = useState<number | null>(null)
  const [generalComment, setGeneralComment] = useState('')
  const [entryComments, setEntryComments] = useState<Record<string, string>>({})
  const [entriesBySection, setEntriesBySection] = useState<any | null>(null)
  const [statusFilter, setStatusFilter] = useSimpleFilterPersistence<string>('supervisor-logbook-status-filter', 'all')
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [showMessages, setShowMessages] = useState(false)
  const [commentThreads, setCommentThreads] = useState<any[]>([])
  const [showCommentInput, setShowCommentInput] = useState<Record<string, boolean>>({})
  const [newComments, setNewComments] = useState<Record<string, string>>({})
  const [auditModalOpen, setAuditModalOpen] = useState(false)
  const [selectedLogbookId, setSelectedLogbookId] = useState<number | null>(null)
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectingLogbookId, setRejectingLogbookId] = useState<number | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [structuredDisplayOpen, setStructuredDisplayOpen] = useState(false)
  const [selectedLogbookForDisplay, setSelectedLogbookForDisplay] = useState<LogbookForReview | null>(null)

  useEffect(() => {
    fetchLogbooksForReview()
    // Reset review state when filter changes
    setActiveLogbookId(null)
    setEntriesBySection(null)
    setGeneralComment('')
    setEntryComments({})
    setShowMessages(false)
    setMessages([])
    setNewMessage('')
    setCommentThreads([])
    setShowCommentInput({})
    setNewComments({})
    setExpandedComments({})
    setRejectModalOpen(false)
    setRejectingLogbookId(null)
    setRejectionReason('')
  }, [statusFilter])

  const fetchLogbooksForReview = async () => {
    try {
      const url = `/api/logbook/supervisor/?status=${statusFilter}`
      const response = await apiFetch(url)
      if (response.ok) {
        const data = await response.json()
        
        // Filter logbooks based on status filter
        const filteredData = data.filter((logbook: LogbookForReview) => {
          if (statusFilter === 'all' || statusFilter === 'submitted') {
            // For 'all' or 'submitted' filters, show logbooks that need review
            if (logbook.status !== 'submitted') return false
            if (!logbook.reviewed_at) return true // Never reviewed
            // If resubmitted after review, it needs review again
            return logbook.resubmitted_at && new Date(logbook.resubmitted_at) > new Date(logbook.reviewed_at)
          }
          return true // Show all for other status filters
        })
        
        setLogbooks(filteredData)
      } else {
        console.error('Failed to fetch logbooks:', response.status)
        setLogbooks([])
      }
    } catch (error) {
      console.error('Error fetching logbooks for review:', error)
      setLogbooks([])
    } finally {
      setLoading(false)
    }
  }

  const openReview = async (logbookId: number) => {
    const logbook = logbooks.find(l => l.id === logbookId)
    if (logbook) {
      setSelectedLogbookForDisplay(logbook)
      setStructuredDisplayOpen(true)
    }
  }


  const fetchMessages = async (logbookId: number) => {
    try {
      const response = await apiFetch(`/api/logbook/${logbookId}/messages/`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const sendMessage = async (logbookId: number) => {
    if (!newMessage.trim()) return
    
    try {
      const response = await apiFetch(`/api/logbook/${logbookId}/messages/`, {
        method: 'POST',
        body: JSON.stringify({ message: newMessage.trim() })
      })
      if (response.ok) {
        setNewMessage('')
        fetchMessages(logbookId)
        toast.success('Message sent successfully')
      } else {
        toast.error('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Error sending message')
    }
  }

  const fetchCommentThreads = async (logbookId: number) => {
    try {
      const response = await apiFetch(`/api/logbook/${logbookId}/comments/`)
      if (response.ok) {
        const data = await response.json()
        setCommentThreads(data)
      }
    } catch (error) {
      console.error('Error fetching comment threads:', error)
    }
  }

  const addEntryComment = async (logbookId: number, entryId: string, section: string, comment: string) => {
    if (!comment.trim()) return
    
    try {
      const response = await apiFetch(`/api/logbook/${logbookId}/comments/`, {
        method: 'POST',
        body: JSON.stringify({
          thread_type: 'entry',
          entry_id: entryId,
          entry_section: section,
          message: comment.trim()
        })
      })
      if (response.ok) {
        setNewComments(prev => ({ ...prev, [`${entryId}`]: '' }))
        setShowCommentInput(prev => ({ ...prev, [`${entryId}`]: false }))
        fetchCommentThreads(logbookId)
        toast.success('Comment added successfully')
      } else {
        toast.error('Failed to add comment')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Error adding comment')
    }
  }

  const addGeneralComment = async (logbookId: number, comment: string) => {
    if (!comment.trim()) return
    
    try {
      const response = await apiFetch(`/api/logbook/${logbookId}/comments/`, {
        method: 'POST',
        body: JSON.stringify({
          thread_type: 'general',
          message: comment.trim()
        })
      })
      if (response.ok) {
        setGeneralComment('')
        fetchCommentThreads(logbookId)
        toast.success('General comment added successfully')
      } else {
        toast.error('Failed to add general comment')
      }
    } catch (error) {
      console.error('Error adding general comment:', error)
      toast.error('Error adding general comment')
    }
  }

  const getEntryComments = (entryId: number) => {
    console.log('getEntryComments called with entryId:', entryId, 'type:', typeof entryId);
    console.log('Available commentThreads:', commentThreads);
    const filtered = commentThreads.filter(thread => {
      console.log('Checking thread:', thread.id, 'thread_type:', thread.thread_type, 'entry_id:', thread.entry_id, 'entry_id type:', typeof thread.entry_id);
      return thread.thread_type === 'entry' && thread.entry_id === entryId.toString();
    });
    console.log('Filtered comments for entry', entryId, ':', filtered);
    return filtered;
  }

  const getGeneralComments = () => {
    return commentThreads.filter(thread => thread.thread_type === 'general')
  }

  const toggleCommentsExpanded = (key: string) => {
    setExpandedComments(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const isCommentsExpanded = (key: string) => {
    return expandedComments[key] || false
  }

  const handleApproveLogbook = async (logbookId: number) => {
    setReviewing(logbookId)
    try {
      const response = await apiFetch(`/api/logbook/${logbookId}/review/`, {
        method: 'POST',
        body: JSON.stringify({
          decision: 'approve',
          generalComment,
          entryComments: Object.entries(entryComments).map(([entryId, comment]) => ({ entryId, comment }))
        })
      })
      
      if (response.ok) {
        toast.success('Logbook approved successfully!')
        fetchLogbooksForReview()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to approve logbook')
      }
    } catch (error) {
      console.error('Error approving logbook:', error)
      toast.error('Error approving logbook')
    } finally {
      setReviewing(null)
    }
  }

  const openRejectModal = (logbookId: number) => {
    setRejectingLogbookId(logbookId)
    setRejectionReason('')
    setRejectModalOpen(true)
  }

  const handleRejectLogbook = async () => {
    if (!rejectingLogbookId || !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }

    setReviewing(rejectingLogbookId)
    try {
      const response = await apiFetch(`/api/logbook/${rejectingLogbookId}/review/`, {
        method: 'POST',
        body: JSON.stringify({
          decision: 'reject',
          generalComment: rejectionReason.trim(),
          entryComments: Object.entries(entryComments).map(([entryId, comment]) => ({ entryId, comment }))
        })
      })
      
      if (response.ok) {
        toast.success('Logbook rejected successfully!')
        fetchLogbooksForReview()
        setRejectModalOpen(false)
        setRejectingLogbookId(null)
        setRejectionReason('')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to reject logbook')
      }
    } catch (error) {
      console.error('Error rejecting logbook:', error)
      toast.error('Error rejecting logbook')
    } finally {
      setReviewing(null)
    }
  }

  const handleRequestEdits = async (logbookId: number) => {
    if (!generalComment.trim()) {
      toast.error('Please provide comments when requesting edits')
      return
    }

    setReviewing(logbookId)
    try {
      const response = await apiFetch(`/api/logbook/${logbookId}/review/`, {
        method: 'POST',
        body: JSON.stringify({
          decision: 'return_for_edits',
          generalComment: generalComment.trim(),
          entryComments: Object.entries(entryComments).map(([entryId, comment]) => ({ entryId, comment }))
        })
      })
      
      if (response.ok) {
        toast.success('Logbook returned for edits successfully!')
        fetchLogbooksForReview()
        setGeneralComment('')
        setEntryComments({})
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to return logbook for edits')
      }
    } catch (error) {
      console.error('Error requesting edits:', error)
      toast.error('Error requesting edits')
    } finally {
      setReviewing(null)
    }
  }

  const cancelRejectModal = () => {
    setRejectModalOpen(false)
    setRejectingLogbookId(null)
    setRejectionReason('')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
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

  const handleViewAuditTrail = (logbookId: number) => {
    setSelectedLogbookId(logbookId)
    setAuditModalOpen(true)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'returned_for_edits':
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Logbook Reviews</h1>
            <p className="text-muted-foreground">Review logbooks submitted by your supervisees</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">Loading logbooks for review...</div>
          </CardContent>
        </Card>
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
            Logbook Reviews
          </h1>
          <p className="text-muted-foreground">Review logbooks submitted by your supervisees</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="returned_for_edits">Returned for Edits</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogbooksForReview}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Logbooks List */}
      {logbooks.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No Logbooks to Review</h3>
              <p className="text-gray-600 mb-4">
                No logbooks have been submitted by your supervisees yet.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {logbooks.map((logbook) => (
            <Card key={logbook.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {getStatusIcon(logbook.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{logbook.week_display}</h3>
                        {getStatusBadge(logbook.status)}
                      </div>
                      
                      <div className="flex items-center gap-2 mb-4">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {logbook.trainee_name} ({logbook.trainee_email})
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                        <div>
                          <span className="text-gray-600">Section A:</span>
                          <span className="ml-1 font-medium">{logbook.section_totals.section_a.weekly_hours}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Section B:</span>
                          <span className="ml-1 font-medium">{logbook.section_totals.section_b.weekly_hours}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Section C:</span>
                          <span className="ml-1 font-medium">{logbook.section_totals.section_c.weekly_hours}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Total:</span>
                          <span className="ml-1 font-medium">{logbook.section_totals.total.weekly_hours}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Submitted: {formatDate(logbook.submitted_at)}</span>
                        {logbook.reviewed_at && (
                          <span>Reviewed: {formatDate(logbook.reviewed_at)}</span>
                        )}
                      </div>

                      {logbook.supervisor_comments && (
                        <Alert className="mt-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Your Comments:</strong> {logbook.supervisor_comments}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openReview(logbook.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewAuditTrail(logbook.id)}
                      title="View Audit Trail"
                    >
                      <Activity className="h-4 w-4" />
                    </Button>
                    
                    {logbook.status === 'rejected' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowMessages(!showMessages)
                          if (!showMessages) {
                            fetchMessages(logbook.id)
                          }
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Messages
                      </Button>
                    )}
                    
                    {logbook.status === 'submitted' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApproveLogbook(logbook.id)}
                          disabled={reviewing === logbook.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {reviewing === logbook.id ? 'Approving...' : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleRequestEdits(logbook.id)}
                          disabled={reviewing === logbook.id}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {reviewing === logbook.id ? 'Requesting...' : 'Request Edits'}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openRejectModal(logbook.id)}
                          disabled={reviewing === logbook.id}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          {reviewing === logbook.id ? 'Rejecting...' : 'Reject'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

          {/* Removed detailed entries view - now using structured display */}
          {false && activeLogbookId && entriesBySection && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Review Entries</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveLogbookId(null)
                      setEntriesBySection(null)
                      setGeneralComment('')
                      setEntryComments({})
                    }}
                  >
                    Close Review
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {(['section_a','section_b','section_c'] as const).map(section => (
                  <div key={section}>
                    <h3 className="font-semibold mb-4 text-lg">{section === 'section_a' ? 'Section A (DCC/CRA)' : section === 'section_b' ? 'Section B (PD)' : 'Section C (Supervision)'}</h3>
                    <div className="space-y-4">
                      {entriesBySection[section].length === 0 ? (
                        <div className="text-sm text-gray-500 italic">No entries for this section</div>
                      ) : entriesBySection[section].map((e: any) => (
                        <div key={e.id} className="border rounded-lg p-4 bg-gray-50">
                          {/* Entry Header */}
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">Entry #{e.id}</span>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {e.duration_display || `${Math.round((e.duration_minutes||0)/60*10)/10}h`}
                              </span>
                              {e.simulated && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                  Simulated
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {e.session_date || e.date_of_activity || e.date_of_supervision}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowCommentInput(prev => ({ 
                                  ...prev, 
                                  [`${e.id}`]: !prev[`${e.id}`] 
                                }))}
                                className="h-6 w-6 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Entry Details */}
                          <div className="space-y-2 text-sm">
                            {/* Section A specific details */}
                            {section === 'section_a' && (
                              <>
                                {e.entry_type && (
                                  <div>
                                    <span className="font-medium">Type:</span> {e.entry_type.replace('_', ' ').toUpperCase()}
                                  </div>
                                )}
                                {e.client_id && (
                                  <div>
                                    <span className="font-medium">Client ID:</span> {e.client_id}
                                  </div>
                                )}
                                {e.client_pseudonym && (
                                  <div>
                                    <span className="font-medium">Client:</span> {e.client_pseudonym}
                                  </div>
                                )}
                                {e.client_age && (
                                  <div>
                                    <span className="font-medium">Age:</span> {e.client_age}
                                  </div>
                                )}
                                {e.place_of_practice && (
                                  <div>
                                    <span className="font-medium">Place:</span> {e.place_of_practice}
                                  </div>
                                )}
                                {e.presenting_issues && (
                                  <div>
                                    <span className="font-medium">Issues:</span> {e.presenting_issues}
                                  </div>
                                )}
                                {e.session_activity_types && e.session_activity_types.length > 0 && (
                                  <div>
                                    <span className="font-medium">Activities:</span> {e.session_activity_types.join(', ')}
                                  </div>
                                )}
                                {e.activity_description && (
                                  <div>
                                    <span className="font-medium">Description:</span> {e.activity_description}
                                  </div>
                                )}
                              </>
                            )}

                            {/* Section B specific details */}
                            {section === 'section_b' && (
                              <>
                                {e.activity_type && (
                                  <div>
                                    <span className="font-medium">Activity Type:</span> {e.activity_type}
                                  </div>
                                )}
                                {e.is_active_activity !== undefined && (
                                  <div>
                                    <span className="font-medium">Active Learning:</span> {e.is_active_activity ? 'Yes' : 'No'}
                                  </div>
                                )}
                                {e.activity_details && (
                                  <div>
                                    <span className="font-medium">Details:</span> {e.activity_details}
                                  </div>
                                )}
                                {e.topics_covered && (
                                  <div>
                                    <span className="font-medium">Topics:</span> {e.topics_covered}
                                  </div>
                                )}
                                {e.competencies_covered && e.competencies_covered.length > 0 && (
                                  <div>
                                    <span className="font-medium">Competencies:</span> {e.competencies_covered.join(', ')}
                                  </div>
                                )}
                              </>
                            )}

                            {/* Section C specific details */}
                            {section === 'section_c' && (
                              <>
                                {e.supervisor_name && (
                                  <div>
                                    <span className="font-medium">Supervisor:</span> {e.supervisor_name}
                                  </div>
                                )}
                                {e.supervisor_type && (
                                  <div>
                                    <span className="font-medium">Type:</span> {e.supervisor_type}
                                  </div>
                                )}
                                {e.supervision_type && (
                                  <div>
                                    <span className="font-medium">Format:</span> {e.supervision_type}
                                  </div>
                                )}
                                {e.summary && (
                                  <div>
                                    <span className="font-medium">Summary:</span> {e.summary}
                                  </div>
                                )}
                              </>
                            )}

                            {/* Reflection (common to all sections) */}
                            {(e.reflections_on_experience || e.reflection) && (
                              <div className="mt-3 p-3 bg-white rounded border-l-4 border-blue-200">
                                <span className="font-medium text-blue-800">Reflection:</span>
                                <div className="mt-1 text-gray-700">
                                  {e.reflections_on_experience || e.reflection}
                                </div>
                              </div>
                            )}

                            {/* Existing supervisor comment */}
                            {e.supervisor_comment && (
                              <div className="mt-3 p-3 bg-yellow-50 rounded border-l-4 border-yellow-200">
                                <span className="font-medium text-yellow-800">Previous Supervisor Comment:</span>
                                <div className="mt-1 text-gray-700">{e.supervisor_comment}</div>
                              </div>
                            )}

                            {/* Trainee response to previous comment */}
                            {e.trainee_response && (
                              <div className="mt-3 p-3 bg-green-50 rounded border-l-4 border-green-200">
                                <span className="font-medium text-green-800">Trainee Response:</span>
                                <div className="mt-1 text-gray-700">{e.trainee_response}</div>
                              </div>
                            )}
                          </div>

                          {/* Comments Display - Cascading below entry details */}
                          {(() => {
                            const entryComments = getEntryComments(e.id);
                            return entryComments.length > 0 && (
                              <div className="mt-3 ml-4">
                                <button
                                  onClick={() => toggleCommentsExpanded(`entry-${e.id}`)}
                                  className="flex items-center gap-2 text-xs font-medium text-blue-700 hover:text-blue-800 mb-2"
                                >
                                  {isCommentsExpanded(`entry-${e.id}`) ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                  Comments ({entryComments.reduce((total, thread) => total + thread.messages.length, 0)})
                                </button>
                                
                                {isCommentsExpanded(`entry-${e.id}`) && (
                                  <div className="ml-2 space-y-2">
                                    {entryComments.map((thread) => (
                                      <div key={thread.id} className="p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                                        <div className="space-y-1">
                                          {thread.messages.map((msg: any, index: number) => (
                                            <div key={msg.id} className={`text-xs ${index > 0 ? 'ml-3 border-l-2 border-blue-200 pl-2' : ''}`}>
                                              <div className="flex justify-between items-start mb-1">
                                                <span className="font-medium text-blue-800">
                                                  {msg.author_name} ({msg.author_role})
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                  {new Date(msg.created_at).toLocaleString()}
                                                </span>
                                              </div>
                                              <div className="text-gray-700">{msg.message}</div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Comment Input */}
                          {showCommentInput[e.id] && logbooks.find(l => l.id === activeLogbookId)?.status !== 'rejected' && (
                            <div className="mt-4 p-3 bg-yellow-50 rounded border-l-4 border-yellow-200">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Add Comment for Entry #{e.id}:
                              </label>
                              <Textarea
                                className="w-full border rounded px-3 py-2 text-sm resize-none"
                                rows={3}
                                placeholder="Add your feedback or comments for this entry..."
                                value={newComments[e.id] || ''}
                                onChange={(ev) => setNewComments(prev => ({ 
                                  ...prev, 
                                  [`${e.id}`]: ev.target.value 
                                }))}
                              />
                              <div className="flex gap-2 mt-2">
                                <Button
                                  size="sm"
                                  onClick={() => addEntryComment(
                                    activeLogbookId!, 
                                    e.id.toString(), 
                                    section.toUpperCase(), 
                                    newComments[e.id] || ''
                                  )}
                                  disabled={!newComments[e.id]?.trim()}
                                >
                                  Add Comment
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setShowCommentInput(prev => ({ ...prev, [`${e.id}`]: false }))
                                    setNewComments(prev => ({ ...prev, [`${e.id}`]: '' }))
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {showCommentInput[e.id] && logbooks.find(l => l.id === activeLogbookId)?.status === 'rejected' && (
                            <div className="mt-4 p-3 bg-orange-50 rounded border-l-4 border-orange-200">
                              <div className="flex items-center gap-2 text-orange-800">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-sm font-medium">Cannot Add Comments</span>
                              </div>
                              <p className="text-sm text-orange-700 mt-1">
                                This logbook has been rejected and returned to the trainee for editing. 
                                No additional comments can be added until the trainee resubmits the logbook.
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => {
                                  setShowCommentInput(prev => ({ ...prev, [`${e.id}`]: false }))
                                }}
                              >
                                Close
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* General Comments Section - Cascading below all entries */}
                <div className="mt-6 ml-4">
                  <h4 className="font-semibold text-lg mb-3">General Comments</h4>
                  
                  {/* Display existing general comments */}
                  {getGeneralComments().length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleCommentsExpanded('general')}
                        className="flex items-center gap-2 text-xs font-medium text-green-700 hover:text-green-800 mb-2"
                      >
                        {isCommentsExpanded('general') ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        General Comments ({getGeneralComments().reduce((total, thread) => total + thread.messages.length, 0)})
                      </button>
                      
                      {isCommentsExpanded('general') && (
                        <div className="ml-2 space-y-2">
                          {getGeneralComments().map((thread) => (
                            <div key={thread.id} className="p-2 bg-green-50 rounded border-l-2 border-green-200">
                              <div className="space-y-1">
                                {thread.messages.map((msg: any, index: number) => (
                                  <div key={msg.id} className={`text-xs ${index > 0 ? 'ml-3 border-l-2 border-green-200 pl-2' : ''}`}>
                                    <div className="flex justify-between items-start mb-1">
                                      <span className="font-medium text-green-800">
                                        {msg.author_name} ({msg.author_role})
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {new Date(msg.created_at).toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="text-gray-700">{msg.message}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* General comment input */}
                  {logbooks.find(l => l.id === activeLogbookId)?.status !== 'rejected' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Add General Comment:</label>
                      <Textarea 
                        className="w-full border rounded px-3 py-2 text-sm" 
                        rows={3} 
                        placeholder="Add general feedback for this logbook..."
                        value={generalComment} 
                        onChange={(e) => setGeneralComment(e.target.value)} 
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => addGeneralComment(activeLogbookId!, generalComment)}
                          disabled={!generalComment.trim()}
                        >
                          Add General Comment
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setGeneralComment('')}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {logbooks.find(l => l.id === activeLogbookId)?.status === 'rejected' && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2 text-orange-800">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Logbook Rejected</span>
                      </div>
                      <p className="text-sm text-orange-700 mt-1">
                        This logbook has been rejected and returned to the trainee for editing. 
                        No additional comments can be added until the trainee resubmits the logbook.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => activeLogbookId && handleApproveLogbook(activeLogbookId)}
                    disabled={reviewing === activeLogbookId || logbooks.find(l => l.id === activeLogbookId)?.status === 'rejected'}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {reviewing === activeLogbookId ? 'Approving...' : 'Approve Logbook'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => activeLogbookId && handleRequestEdits(activeLogbookId)}
                    disabled={reviewing === activeLogbookId || logbooks.find(l => l.id === activeLogbookId)?.status === 'rejected'}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {reviewing === activeLogbookId ? 'Requesting...' : 'Request Edits'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => activeLogbookId && openRejectModal(activeLogbookId)}
                    disabled={reviewing === activeLogbookId || logbooks.find(l => l.id === activeLogbookId)?.status === 'rejected'}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {reviewing === activeLogbookId ? 'Rejecting...' : 'Reject Logbook'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

      {/* Message Thread for Rejected Logbooks */}
      {showMessages && activeLogbookId && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Message Thread
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMessages(false)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Messages */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="text-sm text-gray-500 italic">No messages yet</div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      msg.author_role === 'supervisor'
                        ? 'bg-blue-50 border-l-4 border-blue-200 ml-8'
                        : 'bg-gray-50 border-l-4 border-gray-200 mr-8'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">
                        {msg.author_name} ({msg.author_role})
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">{msg.message}</div>
                  </div>
                ))
              )}
            </div>

            {/* New Message Input */}
            <div className="space-y-2">
              <Textarea
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end">
                <Button
                  onClick={() => sendMessage(activeLogbookId)}
                  disabled={!newMessage.trim()}
                  size="sm"
                >
                  Send Message
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Trail Modal */}
      <LogbookAuditTrailModal
        logbookId={selectedLogbookId}
        isOpen={auditModalOpen}
        onClose={() => {
          setAuditModalOpen(false)
          setSelectedLogbookId(null)
        }}
      />

      {/* Rejection Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              Reject Logbook
            </DialogTitle>
            <DialogDescription>
              Please provide a detailed reason for rejecting this logbook. This feedback will be shared with the trainee and added to the audit trail.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="rejection-reason" className="text-sm font-medium text-gray-700">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="rejection-reason"
                placeholder="Please provide specific feedback about what needs to be improved or corrected in this logbook..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <div className="text-xs text-gray-500">
                {rejectionReason.length} characters
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Important:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• This rejection will be recorded in the audit trail</li>
                    <li>• The trainee will be notified of the rejection</li>
                    <li>• The logbook will be unlocked for editing</li>
                    <li>• The trainee can resubmit after making corrections</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={cancelRejectModal}
                disabled={reviewing === rejectingLogbookId}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRejectLogbook}
                disabled={!rejectionReason.trim() || reviewing === rejectingLogbookId}
                className="bg-red-600 hover:bg-red-700"
              >
                {reviewing === rejectingLogbookId ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Logbook
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Structured Logbook Display */}
      {structuredDisplayOpen && selectedLogbookForDisplay && (
        <SupervisorLogbookDisplay
          logbook={selectedLogbookForDisplay}
          onClose={() => {
            setStructuredDisplayOpen(false)
            setSelectedLogbookForDisplay(null)
          }}
          onApprove={() => {
            if (selectedLogbookForDisplay?.id) {
              handleApproveLogbook(selectedLogbookForDisplay.id)
              setStructuredDisplayOpen(false)
              setSelectedLogbookForDisplay(null)
            }
          }}
          onReject={() => {
            if (selectedLogbookForDisplay?.id) {
              setRejectingLogbookId(selectedLogbookForDisplay.id)
              setRejectModalOpen(true)
              setStructuredDisplayOpen(false)
              setSelectedLogbookForDisplay(null)
            }
          }}
          onRequestEdits={() => {
            if (selectedLogbookForDisplay?.id) {
              handleRequestEdits(selectedLogbookForDisplay.id)
              setStructuredDisplayOpen(false)
              setSelectedLogbookForDisplay(null)
            }
          }}
        />
      )}
    </div>
  )
}
