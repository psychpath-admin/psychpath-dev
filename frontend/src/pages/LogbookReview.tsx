import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { apiFetch } from '@/lib/api'
import { 
  CheckCircle, 
  Edit, 
  XCircle, 
  AlertTriangle,
  FileText,
  User,
  Calendar,
  Clock,
  MessageSquare
} from 'lucide-react'
import { toast } from 'sonner'
import SupervisorLogbookDisplay from '@/components/SupervisorLogbookDisplay'

interface LogbookReview {
  id: number
  trainee_name: string
  trainee_email: string
  week_start_date: string
  week_end_date: string
  week_display?: string
  status: string
  review_comments?: string
  reviewed_by?: string
  supervisor_decision_at?: string
  section_totals: {
    section_a: {
      weekly_hours: string | { hours: number; minutes: number }
      cumulative_hours: string | { hours: number; minutes: number }
    }
    section_b: {
      weekly_hours: string | { hours: number; minutes: number }
      cumulative_hours: string | { hours: number; minutes: number }
    }
    section_c: {
      weekly_hours: string | { hours: number; minutes: number }
      cumulative_hours: string | { hours: number; minutes: number }
    }
  }
  entries: {
    section_a: any[]
    section_b: any[]
    section_c: any[]
  }
}

export default function LogbookReview() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [logbook, setLogbook] = useState<LogbookReview | null>(null)
  const [reviewComments, setReviewComments] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    action: 'approve' | 'reject' | 'return_for_edits' | null
    title: string
    message: string
  }>({
    open: false,
    action: null,
    title: '',
    message: ''
  })

  useEffect(() => {
    if (id) {
      fetchLogbook()
    }
  }, [id])

  const fetchLogbook = async () => {
    try {
      const response = await apiFetch(`/api/logbook/${id}/`)
      if (response.ok) {
        const data = await response.json()
        // Debug: surface payload shape while we align UI with API
        try { console.info('[LogbookReview] fetched logbook', data) } catch {}
        setLogbook(data)
        setReviewComments(data.review_comments || '')
      } else {
        toast.error('Failed to load logbook')
        navigate('/logbook/review')
      }
    } catch (error) {
      console.error('Error fetching logbook:', error)
      toast.error('Failed to load logbook')
      navigate('/logbook/review')
    } finally {
      setLoading(false)
    }
  }

  const initiateReviewAction = (action: 'approve' | 'return_for_edits' | 'reject') => {
    // Validate that comment is provided for reject
    if (action === 'reject' && !reviewComments.trim()) {
      setConfirmDialog({
        open: true,
        action: null,
        title: 'Comment Required',
        message: 'You must provide a comment explaining why you are rejecting this logbook. Please add your comments in the Review Comments field before rejecting.'
      })
      return
    }

    // Show confirmation dialog with appropriate message
    const messages = {
      approve: {
        title: 'Approve Logbook',
        message: 'Are you sure you want to approve this logbook? This will lock all entries and mark the logbook as approved.'
      },
      reject: {
        title: 'Reject Logbook',
        message: 'Are you sure? This will unlock the logbook for full revision.'
      },
      return_for_edits: {
        title: 'Return for Edits',
        message: 'Are you sure you want to return this logbook for edits? The trainee will be able to make changes and resubmit.'
      }
    }

    setConfirmDialog({
      open: true,
      action,
      title: messages[action].title,
      message: messages[action].message
    })
  }

  const handleReviewAction = async () => {
    const action = confirmDialog.action
    if (!logbook || !action) return

    setConfirmDialog({ ...confirmDialog, open: false })
    setActionLoading(action)
    
    try {
      const response = await apiFetch(`/api/logbook/${id}/review/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision: action,
          generalComment: reviewComments
        })
      })

      if (response.ok) {
        const message = action === 'approve' ? 'Logbook approved successfully' :
                       action === 'return_for_edits' ? 'Logbook returned for edits' :
                       'Logbook rejected'
        toast.success(message)
        fetchLogbook() // Refresh data
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to update logbook')
      }
    } catch (error) {
      console.error('Error updating logbook:', error)
      toast.error('Failed to update logbook')
    } finally {
      setActionLoading(null)
    }
  }

  const formatDuration = (duration: string | number | { hours: number; minutes: number } | undefined | null) => {
    if (duration == null) return '0h'
    if (typeof duration === 'string') {
      // Accept "Hh Mm", "H:MM", or plain text
      const hm = duration.match(/^(\d+):(\d{2})$/)
      if (hm) {
        const h = parseInt(hm[1], 10)
        const m = parseInt(hm[2], 10)
        return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`
      }
      return duration
    }
    if (typeof duration === 'number') {
      const h = Math.floor(duration / 60)
      const m = duration % 60
      return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`
    }
    const { hours = 0, minutes = 0 } = duration
    if (hours === 0 && minutes === 0) return '0h'
    if (hours === 0) return `${minutes}m`
    if (minutes === 0) return `${hours}h`
    return `${hours}h ${minutes}m`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Submitted</Badge>
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>
      case 'returned_for_edits':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Returned for Edits</Badge>
      case 'draft':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Draft</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading logbook...</div>
        </div>
      </div>
    )
  }

  if (!logbook) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Logbook not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Logbook Review</h1>
          <p className="text-gray-600 mt-1">
            Review logbook for {logbook.trainee_name} - Week of {new Date(logbook.week_start_date).toLocaleDateString()}
          </p>
        </div>
        {getStatusBadge(logbook.status)}
      </div>

      {/* Logbook Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Logbook Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                Trainee
              </div>
              <div className="font-medium">{logbook.trainee_name}</div>
              <div className="text-sm text-gray-500">{logbook.trainee_email}</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                Week Period
              </div>
              <div className="font-medium">
                {new Date(logbook.week_start_date).toLocaleDateString()} - {new Date(logbook.week_end_date).toLocaleDateString()}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                Section A (Clinical)
              </div>
              <div className="font-medium">{formatDuration(logbook.section_totals.section_a.weekly_hours)}</div>
              <div className="text-sm text-gray-500">Total: {formatDuration(logbook.section_totals.section_a.cumulative_hours)}</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                Section B (PD)
              </div>
              <div className="font-medium">{formatDuration(logbook.section_totals.section_b.weekly_hours)}</div>
              <div className="text-sm text-gray-500">Total: {formatDuration(logbook.section_totals.section_b.cumulative_hours)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Review Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-gray-600">Use the structured report below to review entries and add comments.</div>
          <div className="space-y-2">
            <Label htmlFor="review-comments">Supervisor feedback to registrar/provisional</Label>
            <Textarea
              id="review-comments"
              placeholder="Enter your feedback and comments for the trainee..."
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => initiateReviewAction('approve')}
              disabled={actionLoading !== null || logbook.status === 'approved'}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {actionLoading === 'approve' ? 'Approving...' : '✅ Approve Logbook'}
            </Button>

            <Button
              onClick={() => initiateReviewAction('return_for_edits')}
              disabled={actionLoading !== null || logbook.status === 'returned_for_edits'}
              variant="outline"
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <Edit className="h-4 w-4 mr-2" />
              {actionLoading === 'return_for_edits' ? 'Processing...' : '✏️ Return for Edits'}
            </Button>

            <Button
              onClick={() => initiateReviewAction('reject')}
              disabled={actionLoading !== null || logbook.status === 'rejected'}
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {actionLoading === 'reject' ? 'Processing...' : '❌ Reject Logbook'}
            </Button>
          </div>

          {logbook.reviewed_by && (
            <div className="text-sm text-gray-600">
              Last reviewed by {logbook.reviewed_by} on{' '}
              {logbook.supervisor_decision_at && new Date(logbook.supervisor_decision_at).toLocaleDateString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Embedded structured report */}
      <SupervisorLogbookDisplay
        logbook={{
          id: logbook.id,
          trainee_name: logbook.trainee_name,
          week_start_date: logbook.week_start_date,
          week_end_date: logbook.week_end_date,
          week_display: logbook.week_display || `${new Date(logbook.week_start_date).toLocaleDateString('en-AU', {day:'2-digit', month:'short', year:'numeric'})} - ${new Date(logbook.week_end_date).toLocaleDateString('en-AU', {day:'2-digit', month:'short', year:'numeric'})}`,
          status: logbook.status as any,
          section_totals: logbook.section_totals as any,
          entries: logbook.entries as any,
        } as any}
        onApprove={() => initiateReviewAction('approve')}
        onReject={() => initiateReviewAction('reject')}
        onRequestEdits={() => initiateReviewAction('return_for_edits')}
        inline
      />

      {/* Removed old preview list; structured report above is the source of truth. */}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmDialog.action === 'reject' || confirmDialog.title === 'Comment Required' ? (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              ) : confirmDialog.action === 'approve' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Edit className="h-5 w-5 text-orange-500" />
              )}
              {confirmDialog.title}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {confirmDialog.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
            >
              Cancel
            </Button>
            {confirmDialog.action && (
              <Button
                onClick={handleReviewAction}
                className={
                  confirmDialog.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : confirmDialog.action === 'reject'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }
              >
                OK
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
