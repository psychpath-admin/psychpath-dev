import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { 
  X, 
  Clock, 
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
  Edit,
  Edit3,
  Send,
  Plus,
  Activity,
  ArrowLeft
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch, submitLogbook } from '@/lib/api'
import { ErrorOverlay, useErrorHandler } from '@/lib/errors'
import PDForm from './PDForm'
import SupervisionForm from './SupervisionForm'
import LogbookAuditTree from './LogbookAuditTree'

// Temporary local interface to avoid import issues
interface LogbookValidActions {
  can_submit: boolean
  can_approve: boolean
  can_reject: boolean
  can_return_for_edits: boolean
  can_unlock: boolean
  valid_transitions: string[]
  current_status: string
  user_role: string
}

interface SectionAEntry {
  id: number
  entry_type: 'client_contact' | 'simulated_contact' | 'independent_activity' | 'cra'
  simulated: boolean
  parent_dcc_entry?: number
  client_id: string
  session_date: string
  place_of_practice: string
  presenting_issues: string
  session_activity_types: string[]
  duration_minutes: number
  reflections_on_experience: string
  locked: boolean
  supervisor_comment?: string
  trainee_response?: string
  // CRA-specific fields
  activity_type?: string
  custom_activity_type?: string
}

interface Logbook {
  id: number
  trainee_name: string
  week_start_date: string
  week_end_date: string
  week_display: string
  status: 'draft' | 'ready' | 'submitted' | 'under_review' | 'returned_for_edits' | 'approved' | 'rejected' | 'locked' | 'unlocked_for_edits'
  supervisor_name?: string
  reviewed_by_name?: string
  submitted_at: string
  reviewed_at?: string
  review_comments?: string
  is_editable?: boolean
  active_unlock?: {
    unlock_expires_at: string
    duration_minutes: number
  } | null
  audit_log_count: number
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
}

interface StructuredLogbookDisplayProps {
  logbook: Logbook
  onClose: () => void
  onRegenerate?: () => void
  onResubmit?: () => void
  onNavigateToHelp?: (errorDetails: { summary?: string, explanation?: string, userAction?: string }) => void
}

export default function StructuredLogbookDisplay({ logbook, onClose, onRegenerate, onResubmit }: StructuredLogbookDisplayProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sectionAEntries, setSectionAEntries] = useState<SectionAEntry[]>([])
  const [sectionBEntries, setSectionBEntries] = useState<any[]>([])
  const [sectionCEntries, setSectionCEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAuditTrail, setShowAuditTrail] = useState(false)
  const [validActions, setValidActions] = useState<LogbookValidActions | null>(null)

  // Helper function to get activity type display for any entry type
  const getActivityTypeDisplay = (entry: SectionAEntry): string => {
    if (entry.entry_type === 'cra') {
      // For CRA entries, use activity_type or custom_activity_type
      return entry.custom_activity_type || entry.activity_type || 'Not specified'
    } else {
      // For DCC entries, use session_activity_types
      return entry.session_activity_types?.join(', ') || 'Not specified'
    }
  }
  
  // State for Section B and C editing modals
  const [editingBEntry, setEditingBEntry] = useState<any>(null)
  const [editingCEntry, setEditingCEntry] = useState<any>(null)
  const [showBEditModal, setShowBEditModal] = useState(false)
  const [showCEditModal, setShowCEditModal] = useState(false)
  
  // Form data for Section B and C
  const [bFormData, setBFormData] = useState({
    activity_type: 'WORKSHOP',
    date_of_activity: new Date().toISOString().split('T')[0],
    duration_minutes: 60,
    is_active_activity: true,
    activity_details: '',
    topics_covered: '',
    competencies_covered: [] as string[],
    reflection: '',
    reviewed_in_supervision: false
  })
  
  const [cFormData, setCFormData] = useState({
    date_of_supervision: new Date().toISOString().split('T')[0],
    supervisor_name: '',
    supervisor_type: 'PRINCIPAL',
    supervision_type: 'INDIVIDUAL',
    duration_minutes: 60,
    summary: ''
  })
  
  const [competencies, setCompetencies] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  
  // Helper: can the provisional click-through to edit from the report?
  const canInlineEdit = logbook.status === 'draft' ||
                       logbook.status === 'ready' ||
                       logbook.status === 'rejected' || 
                       logbook.status === 'returned_for_edits' ||
                       logbook.is_editable
  
  // Use the new error handler hook
  const { errorOverlay, showError } = useErrorHandler()
  
  // Comment state for rejected logbooks
  const [newComments, setNewComments] = useState<Record<string, string>>({})
  const [showCommentInput, setShowCommentInput] = useState<Record<string, boolean>>({})
  const [existingComments, setExistingComments] = useState<Record<string, any[]>>({})

  useEffect(() => {
    fetchAllSections()
    fetchCompetencies()
    // Fetch valid actions asynchronously without blocking render
    fetchValidActions().catch(console.error)
    // Fetch comments for rejected logbooks
  if (logbook.status === 'rejected' || logbook.status === 'returned_for_edits') {
      fetchComments()
    }
  }, [logbook.id, logbook.status])

  const fetchCompetencies = async () => {
    try {
      const response = await apiFetch('/api/competencies/')
      if (response.ok) {
        const data = await response.json()
        setCompetencies(data)
      }
    } catch (error) {
      console.error('Error fetching competencies:', error)
    }
  }

  const fetchValidActions = async () => {
    if (!logbook.id) return
    
    try {
      const response = await apiFetch(`/api/logbook/${logbook.id}/valid-actions/`)
      if (response.ok) {
        const actions = await response.json()
        setValidActions(actions)
      } else {
        throw new Error('Failed to fetch valid actions')
      }
    } catch (error) {
      console.error('Error fetching valid actions:', error)
      // Set default actions based on current status if fetch fails
      const defaultActions = {
        can_submit: ['draft', 'returned_for_edits', 'rejected', 'ready'].includes(logbook.status),
        can_approve: false,
        can_reject: false,
        can_return_for_edits: false,
        can_unlock: false,
        valid_transitions: [],
        current_status: logbook.status,
        user_role: 'unknown'
      }
      setValidActions(defaultActions)
    }
  }

  const fetchAllSections = async () => {
    try {
      setLoading(true)
      const [aRes, bRes, cRes] = await Promise.all([
        apiFetch(`/api/logbook/${logbook.id}/section-a-entries/`),
        apiFetch(`/api/logbook/${logbook.id}/section-b-entries/`),
        apiFetch(`/api/logbook/${logbook.id}/section-c-entries/`)
      ])
      if (aRes.ok) setSectionAEntries(await aRes.json())
      if (bRes.ok) setSectionBEntries(await bRes.json())
      if (cRes.ok) setSectionCEntries(await cRes.json())
    } catch (error) {
      console.error('Error fetching logbook sections:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = () => {
    // Show normal status based on logbook.status
    switch (logbook.status) {
      case 'draft':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Draft</Badge>
      case 'ready':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Ready for Submission</Badge>
      case 'submitted':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Submitted</Badge>
      case 'under_review':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Under Review</Badge>
      case 'returned_for_edits':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Returned for Edits</Badge>
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>
      case 'locked':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Locked</Badge>
      case 'unlocked_for_edits':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Unlocked for Editing</Badge>
      default:
        return <Badge variant="secondary">{logbook.status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'under_review':
        return <AlertCircle className="h-4 w-4 text-blue-500" />
      case 'returned_for_edits':
        return <Edit className="h-4 w-4 text-orange-500" />
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'locked':
        return <Lock className="h-4 w-4 text-purple-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`
    } else if (hours > 0) {
      return `${hours}h`
    } else {
      return `${mins}m`
    }
  }

  const handleSubmitForReview = async () => {
    if (!logbook.week_start_date) {
      await showError('No week start date found for this logbook.', {
        title: 'Submission Error',
        category: 'Validation',
        customExplanation: 'The system requires a valid week start date to submit the logbook, but this information is missing from the current logbook data.',
        customUserAction: 'Please contact support if this issue persists. They can help restore the missing date information.'
      })
      return
    }

    console.log('Submitting logbook:', {
      id: logbook.id,
      weekStartDate: logbook.week_start_date,
      status: logbook.status,
      fullLogbook: logbook
    })

    try {
      // Use different endpoint for rejected logbooks (resubmit) vs new submissions
      if (logbook.status === 'rejected' || logbook.status === 'returned_for_edits') {
        const response = await apiFetch(`/api/logbook/${logbook.id}/resubmit/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to resubmit logbook')
        }
      } else {
        await submitLogbook(logbook.week_start_date)
      }
      
      toast.success('Logbook submitted for review successfully!')
      
      // Call the resubmit callback to refresh the dashboard
      if (onResubmit) {
        onResubmit()
      }
      
      onClose() // Close the dialog after successful submission
    } catch (error) {
      console.error('Failed to submit logbook:', error)
      
      // Parse error message for better UX with 3-part system
      let title = 'Unable to Submit Logbook'
      let explanation = 'The system encountered an issue when trying to submit your logbook.'
      let userAction = 'Please try again. If the problem persists, contact your supervisor for assistance.'
      
      if (error instanceof Error) {
        // Handle state machine validation errors with better messages
        if (error.message.includes('already been approved')) {
          title = 'Logbook Already Approved'
          explanation = error.message
          userAction = 'No action is needed - your logbook is approved. If you believe there is an error, contact your supervisor to discuss.'
        } else if (error.message.includes('Cannot change logbook status')) {
          title = 'Invalid Action'
          explanation = error.message
          userAction = 'Please check the current status of your logbook and try an appropriate action.'
        } else if (error.message.includes('draft, ready, or returned_for_edits')) {
          
          if (logbook.status === 'submitted') {
            explanation = 'This logbook has already been submitted and is awaiting review by your supervisor. Duplicate submissions are not allowed to prevent confusion.'
            userAction = 'Wait for your supervisor to review your submission. You can check the status on your dashboard. If you need to make changes, contact your supervisor to return it for edits.'
          } else if (logbook.status === 'approved') {
            explanation = 'This logbook has already been approved by your supervisor. Once approved, logbooks cannot be modified or resubmitted to maintain the integrity of the approval process.'
            userAction = 'No action is needed - your logbook is approved. If you believe there is an error, contact your supervisor to discuss.'
          } else if (logbook.status === 'rejected' || logbook.status === 'returned_for_edits') {
            explanation = 'The system shows this logbook as rejected, but the page data may be outdated. Your supervisor may have already processed this logbook.'
            userAction = 'Refresh the page (press F5 or click refresh) to see the current status. After refreshing, the logbook should be editable if it was returned to you.'
          } else {
            explanation = `The logbook is in an unexpected state: "${logbook.status}". This typically occurs due to a synchronization issue between the browser and server.`
            userAction = 'Refresh the page to sync the latest status. If the problem continues after refreshing, contact your supervisor for help.'
          }
        } else {
          explanation = 'An unexpected error occurred while communicating with the server. This could be due to a network issue or a temporary server problem.'
        }
      }
      
      // Use the new error handler with automatic logging
      await showError(error, {
        title,
        category: 'Validation',
        customExplanation: explanation,
        customUserAction: userAction
      })
    }
  }

  const handleRequestReturnForEdits = async () => {
    try {
      const response = await apiFetch(`/api/logbook/${logbook.id}/request-return-for-edits/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Trainee requested return for edits'
        })
      })

      if (response.ok) {
        toast.success('Logbook has been returned for edits. You can now make changes and resubmit.')
        
        // Call the resubmit callback to refresh the dashboard
        if (onResubmit) {
          onResubmit()
        }
        
        onClose() // Close the dialog after successful request
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to request return for edits')
      }
    } catch (error) {
      console.error('Failed to request return for edits:', error)
      
      // Parse error message for better UX
      let title = 'Unable to Request Return for Edits'
      let explanation = 'The system encountered an issue when trying to request that your logbook be returned for edits.'
      let userAction = 'Please try again. If the problem persists, contact your supervisor for assistance.'
      
      if (error instanceof Error) {
        // Handle specific error messages
        if (error.message.includes('cannot access local variable')) {
          explanation = 'There was a technical issue processing your request. The system encountered an internal error.'
          userAction = 'Please try again in a moment. If the problem continues, contact your supervisor or support team.'
        } else if (error.message.includes('Cannot change logbook status')) {
          title = 'Invalid Request'
          explanation = error.message
          userAction = 'Please check the current status of your logbook and try an appropriate action.'
        }
      }
      
      // Use the error handler with automatic logging
      await showError(error, {
        title,
        category: 'Validation',
        customExplanation: explanation,
        customUserAction: userAction
      })
    }
  }

  const isEditable = () => {
    console.log('isEditable check:', {
      status: logbook.status,
      id: logbook.id,
      hasId: !!logbook.id,
      weekStartDate: logbook.week_start_date,
      is_editable: logbook.is_editable,
      active_unlock: logbook.active_unlock
    })
    
    // Can edit if explicitly marked as editable (from backend)
    if (logbook.is_editable) {
      console.log('isEditable result: true (from is_editable field)')
      return true
    }
    
    // Can edit if there's an active unlock request
    if (logbook.active_unlock) {
      console.log('isEditable result: true (from active_unlock)')
      return true
    }
    
    // For submission, we need logbooks that are ready to be submitted
    const hasValidStatus = ['draft', 'returned_for_edits', 'rejected', 'ready'].includes(logbook.status)
    const canSubmit = hasValidStatus || !logbook.id // Allow submission if no id (draft/preview)
    
    console.log('isEditable result:', canSubmit)
    return canSubmit
  }


  // Comment functions for rejected logbooks
  const addEntryComment = async (entryId: number, section: string, comment: string) => {
    try {
      const response = await apiFetch(`/api/logbook/${logbook.id}/comments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_type: 'entry',
          entry_id: entryId.toString(),
          entry_section: section,
          message: comment
        })
      })

      if (response.ok) {
        toast.success('Comment added successfully')
        setNewComments(prev => ({ ...prev, [`${section}-${entryId}`]: '' }))
        setShowCommentInput(prev => ({ ...prev, [`${section}-${entryId}`]: false }))
        // Refresh comments
        fetchComments()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add comment')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
    }
  }

  const addSectionComment = async (section: string, comment: string) => {
    try {
      const response = await apiFetch(`/api/logbook/${logbook.id}/comments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_type: 'section',
          entry_section: section,
          message: comment
        })
      })

      if (response.ok) {
        toast.success('Section comment added successfully')
        setNewComments(prev => ({ ...prev, [`section-${section}`]: '' }))
        setShowCommentInput(prev => ({ ...prev, [`section-${section}`]: false }))
        // Refresh comments
        fetchComments()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add section comment')
      }
    } catch (error) {
      console.error('Error adding section comment:', error)
      toast.error('Failed to add section comment')
    }
  }

  // Click handlers for editing entries
  const handleSectionAEntryClick = (entryId: number) => {
    if (canInlineEdit) {
      // Use the logbook ID to construct the correct return URL
      const returnTo = `/logbook/${logbook.id}`
      navigate(`/section-a/edit/${entryId}`, { state: { returnTo } })
    }
  }

  const handleSectionBEntryClick = (entry: any) => {
    if (canInlineEdit) {
      setEditingBEntry(entry)
      setBFormData({
        activity_type: entry.activity_type || 'WORKSHOP',
        date_of_activity: entry.date_of_activity || entry.activity_date || new Date().toISOString().split('T')[0],
        duration_minutes: entry.duration_minutes || 60,
        is_active_activity: entry.is_active_activity !== false,
        activity_details: entry.activity_details || entry.presenter || '',
        topics_covered: entry.topics_covered || entry.specific_topics || '',
        competencies_covered: entry.competencies_covered || [],
        reflection: entry.reflection || '',
        reviewed_in_supervision: entry.reviewed_in_supervision || false
      })
      setShowBEditModal(true)
    }
  }

  const handleSectionCEntryClick = (entry: any) => {
    if (canInlineEdit) {
      setEditingCEntry(entry)
      setCFormData({
        date_of_supervision: entry.date_of_supervision || entry.date || new Date().toISOString().split('T')[0],
        supervisor_name: entry.supervisor_name || entry.supervisor || '',
        supervisor_type: entry.supervisor_type || entry.principal_or_secondary || 'PRINCIPAL',
        supervision_type: entry.supervision_type || entry.individual_group_other || 'INDIVIDUAL',
        duration_minutes: entry.duration_minutes || 60,
        summary: entry.summary || ''
      })
      setShowCEditModal(true)
    }
  }

  const toggleCompetency = (competencyName: string) => {
    setBFormData(prev => ({
      ...prev,
      competencies_covered: prev.competencies_covered.includes(competencyName)
        ? prev.competencies_covered.filter(c => c !== competencyName)
        : [...prev.competencies_covered, competencyName]
    }))
  }

  const handleBSave = async () => {
    setSaving(true)
    try {
      if (editingBEntry) {
        await apiFetch(`/api/section-b/${editingBEntry.id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bFormData)
        })
        toast.success('Professional development entry updated successfully!')
      } else {
        await apiFetch('/api/section-b/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bFormData)
        })
        toast.success('Professional development entry created successfully!')
      }
      setShowBEditModal(false)
      setEditingBEntry(null)
      fetchAllSections()
    } catch (error) {
      console.error('Error saving PD entry:', error)
      toast.error('Failed to save entry')
    } finally {
      setSaving(false)
    }
  }

  const handleCSave = async () => {
    setSaving(true)
    try {
      if (editingCEntry) {
        await apiFetch(`/api/section-c/${editingCEntry.id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cFormData)
        })
        toast.success('Supervision entry updated successfully!')
      } else {
        await apiFetch('/api/section-c/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cFormData)
        })
        toast.success('Supervision entry created successfully!')
      }
      setShowCEditModal(false)
      setEditingCEntry(null)
      fetchAllSections()
    } catch (error) {
      console.error('Error saving supervision entry:', error)
      toast.error('Failed to save entry')
    } finally {
      setSaving(false)
    }
  }

  const fetchComments = async () => {
    try {
      const response = await apiFetch(`/api/logbook/${logbook.id}/comments/`)
      if (response.ok) {
        const threads = await response.json()
        
        // Transform the thread data into a map of entry_id -> messages
        const commentsMap: Record<string, any[]> = {}
        
        threads.forEach((thread: any) => {
          if (thread.thread_type === 'entry') {
            // Entry-specific comments
            const key = `${thread.entry_section}-${thread.entry_id}`
            if (thread.messages && thread.messages.length > 0) {
              commentsMap[key] = thread.messages
            }
          } else if (thread.thread_type === 'general' && thread.entry_id && thread.entry_id.startsWith('section_')) {
            // Section-level comments
            const section = thread.entry_id.replace('section_', '')
            const key = `section-${section}`
            if (thread.messages && thread.messages.length > 0) {
              commentsMap[key] = thread.messages
            }
          }
        })
        
        setExistingComments(commentsMap)
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }


  // Separate entries into DCC and CRA
  const dccEntries = sectionAEntries.filter(entry => 
    entry.entry_type === 'client_contact' || entry.entry_type === 'simulated_contact'
  )
  const craEntries = sectionAEntries.filter(entry => 
    entry.entry_type === 'cra' || entry.entry_type === 'independent_activity'
  )

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-7xl max-h-[95vh] overflow-y-auto bg-white">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  {getStatusIcon(logbook.status)}
                  PsychPATH Online Logbook - {logbook.week_display}
                </DialogTitle>
                <DialogDescription>
                  Provisional Psychologist: {logbook.trainee_name}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge()}
                {logbook.audit_log_count > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAuditTrail(true)}
                    title="View Status History"
                    className="h-7 px-2 text-xs"
                  >
                    <Activity className="h-3 w-3 mr-1" />
                    History ({logbook.audit_log_count})
                  </Button>
                )}
                {!isEditable() && (
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                    <Lock className="h-3 w-3 mr-1" />
                    Read Only
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Supervisor Comments for Rejected Logbooks */}
            {logbook.status === 'rejected' && logbook.review_comments && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-red-800 flex items-center gap-2">
                    <XCircle className="h-5 w-5" />
                    Supervisor Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-red-700 bg-white p-4 rounded-md border border-red-200">
                    <p className="whitespace-pre-wrap">{logbook.review_comments}</p>
                  </div>
                  <div className="mt-3 text-sm text-red-600">
                    <p>Please review the feedback above and make the necessary changes before resubmitting your logbook.</p>
                  </div>
                  
                  {/* Threaded Comments Section */}
                  <div className="mt-4 pt-4 border-t border-red-200">
                    <h4 className="text-sm font-semibold text-red-800 mb-3">Discussion Thread</h4>
                    <div className="space-y-3">
                      {/* Placeholder for threaded comments - will be implemented */}
                      <div className="text-sm text-red-600 italic">
                        Threaded discussion will be available here for responses to supervisor feedback.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AHPRA HEADER */}
            <div className="text-center bg-blue-50 border-2 border-blue-200 p-6 rounded-lg">
              <h1 className="text-2xl font-bold text-blue-900 mb-2">Logbook: Record of professional practice</h1>
              <h2 className="text-xl font-semibold text-blue-800 mb-3">Psychology Board Ahpra</h2>
              <div className="text-sm text-blue-700 font-medium">
                <strong>LBPP-76</strong> | <strong>5+1 provisional psychologists</strong> | <strong>Psychology</strong>
              </div>
            </div>

            {/* AHPRA PREAMBLE */}
            <div className="bg-gray-50 border border-gray-300 p-4 rounded-lg text-sm leading-relaxed">
              <p className="font-semibold mb-2">
                Provisional psychologists must maintain a record of professional practice throughout their internship. This record needs to be regularly sighted and signed by the supervisor (usually weekly) and specifically when reviewing the supervision plan or preparing a progress report/change of principal supervisor form.
              </p>
              <p>
                The Psychology Board of Australia (the Board) can request this record at any time, requiring submission within 14 days if requested. It explicitly states that this record does not need to be attached to progress reports or final assessment reports.
              </p>
            </div>

            {/* INFORMATION AND DEFINITIONS */}
            <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-lg text-sm">
              <h3 className="font-bold text-yellow-900 mb-3">Information and definitions</h3>
              <p className="mb-2">
                <strong>Client contact:</strong> Defined as performing specific tasks like psychological assessment, diagnosis, intervention, prevention, treatment, consultation, and providing advice/strategies directly with clients under supervisor guidance.
              </p>
              <p>
                <strong>Client-related activity:</strong> Defined as activities necessary to provide high-standard client service and support the provisional psychologist's achievement of core competencies. This includes supervisor guidance on relevant activities, considering individual development needs and work role context, and encompasses reading, researching for problem formulation/diagnosis, case consultation with colleagues, and formal/informal reporting.
              </p>
            </div>

            {/* PROVISIONAL PSYCHOLOGIST DETAILS */}
            <Card className="border-2 border-orange-300 bg-orange-50">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Full name - top field */}
                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-1">
                      Provisional Psychologist's Full Name
                    </label>
                    <div className="text-lg font-semibold text-gray-900 bg-white p-3 border rounded">
                      {logbook.trainee_name}
                    </div>
                  </div>
                  
                  {/* Registration Number and Week Beginning - side by side */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-1">
                        Registration Number
                      </label>
                      <div className="text-lg font-semibold text-gray-900 bg-white p-3 border rounded">
                        [Auto-filled from profile]
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-1">
                        Week Beginning
                      </label>
                      <div className="text-lg font-semibold text-gray-900 bg-white p-3 border rounded">
                        {formatDate(logbook.week_start_date)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          {/* Section A Totals already rendered above */}

          {/* SECTION B: Professional development (hidden placeholder to preserve diff) */}
          {false && (
          <Card className="border-2 border-blue-300 mt-6">
            <CardHeader className="bg-blue-50 border-b border-blue-200">
              <CardTitle className="text-lg font-bold text-blue-900">
                SECTION B: Professional development
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <Clock className="h-8 w-8 mx-auto mb-4 text-gray-400 animate-spin" />
                  <p className="text-gray-600">Loading Section B entries...</p>
                </div>
              ) : (
                <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-blue-100 border-b border-blue-200">
                        <th className="border border-blue-300 p-3 text-left font-semibold text-blue-900">Date</th>
                        <th className="border border-blue-300 p-3 text-left font-semibold text-blue-900">Activity</th>
                        <th className="border border-blue-300 p-3 text-center font-semibold text-blue-900">Duration</th>
                        <th className="border border-blue-300 p-3 text-left font-semibold text-blue-900">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionBEntries.map((e, i) => (
                        <tr 
                          key={i} 
                          className={`border-b border-gray-200 hover:bg-gray-50 ${canInlineEdit ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                          onClick={() => canInlineEdit && handleSectionBEntryClick(e)}
                          title={canInlineEdit ? 'Click to edit this entry' : ''}
                        >
                          <td className="border p-3 flex items-center justify-between">
                            <span>{e.date_of_activity || e.activity_date || ''}</span>
                            {canInlineEdit && (
                              <Edit3 className="h-4 w-4 text-blue-600 hover:text-blue-800" />
                            )}
                          </td>
                          <td className="border p-3">{e.activity_title || e.activity_type || e.title || '—'}</td>
                          <td className="border p-3 text-center">{formatDuration(Number(e.duration_minutes || e.duration || 0))}</td>
                          <td className="border p-3">{e.notes || e.summary || ''}</td>
                        </tr>
                      ))}
                      {sectionBEntries.length === 0 && (
                        <tr>
                          <td colSpan={4} className="border p-6 text-center text-gray-500">
                            No Section B entries found for this week
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Section B Totals */}
                <div className="p-4 bg-gray-50 border-t">
                  <h4 className="font-semibold text-gray-900 mb-3">Section B Totals</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b border-gray-200">
                          <th className="border border-gray-300 p-3 text-left font-semibold text-gray-900"></th>
                          <th className="border border-gray-300 p-3 text-center font-semibold text-gray-900">Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="border p-3 font-medium">Weekly total</td>
                          <td className="border p-3 text-center font-bold">{logbook.section_totals.section_b.weekly_hours}</td>
                        </tr>
                        <tr>
                          <td className="border p-3 font-medium">Cumulative total</td>
                          <td className="border p-3 text-center font-bold">{logbook.section_totals.section_b.cumulative_hours}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                </>
              )}
            </CardContent>
          </Card>
          )}

          {/* SECTION C: Supervision (hidden placeholder to preserve diff) */}
          {false && (
          <Card className="border-2 border-blue-300 mt-6">
            <CardHeader className="bg-blue-50 border-b border-blue-200">
              <CardTitle className="text-lg font-bold text-blue-900">
                SECTION C: Supervision
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <Clock className="h-8 w-8 mx-auto mb-4 text-gray-400 animate-spin" />
                  <p className="text-gray-600">Loading Section C entries...</p>
                </div>
              ) : (
                <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-blue-100 border-b border-blue-200">
                        <th className="border border-blue-300 p-3 text-left font-semibold text-blue-900">Date</th>
                        <th className="border border-blue-300 p-3 text-left font-semibold text-blue-900">Supervisor</th>
                        <th className="border border-blue-300 p-3 text-left font-semibold text-blue-900">Type</th>
                        <th className="border border-blue-300 p-3 text-center font-semibold text-blue-900">Duration</th>
                        <th className="border border-blue-300 p-3 text-left font-semibold text-blue-900">Summary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionCEntries.map((e, i) => (
                        <tr 
                          key={i} 
                          className={`border-b border-gray-200 hover:bg-gray-50 ${canInlineEdit ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                          onClick={() => canInlineEdit && handleSectionCEntryClick(e)}
                          title={canInlineEdit ? 'Click to edit this entry' : ''}
                        >
                          <td className="border p-3 flex items-center justify-between">
                            <span>{e.date_of_supervision || e.date || ''}</span>
                            {canInlineEdit && (
                              <Edit3 className="h-4 w-4 text-blue-600 hover:text-blue-800" />
                            )}
                          </td>
                          <td className="border p-3">{e.supervisor_name || e.supervisor || '—'}</td>
                          <td className="border p-3">{e.supervision_type || '—'}</td>
                          <td className="border p-3 text-center">{formatDuration(Number(e.duration_minutes || e.duration || 0))}</td>
                          <td className="border p-3">{e.summary || ''}</td>
                        </tr>
                      ))}
                      {sectionCEntries.length === 0 && (
                        <tr>
                          <td colSpan={5} className="border p-6 text-center text-gray-500">
                            No Section C entries found for this week
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Section C Totals */}
                <div className="p-4 bg-gray-50 border-t">
                  <h4 className="font-semibold text-gray-900 mb-3">Section C Totals</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b border-gray-200">
                          <th className="border border-gray-300 p-3 text-left font-semibold text-gray-900"></th>
                          <th className="border border-gray-300 p-3 text-center font-semibold text-gray-900">Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="border p-3 font-medium">Weekly total</td>
                          <td className="border p-3 text-center font-bold">{logbook.section_totals.section_c.weekly_hours}</td>
                        </tr>
                        <tr>
                          <td className="border p-3 font-medium">Cumulative total</td>
                          <td className="border p-3 text-center font-bold">{logbook.section_totals.section_c.cumulative_hours}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                </>
              )}
            </CardContent>
          </Card>
          )}

          {/* SECTION A: Weekly record of professional practice */}
          <div className="mt-6">
            {/* AHPRA Section A Header */}
            <div className="bg-blue-600 text-white p-4 font-bold text-lg flex items-center justify-between">
              <div className="flex-1 text-center">SECTION A: Weekly record of professional practice</div>
              {(logbook.status === 'ready' || logbook.status === 'draft' || isEditable()) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/dcc-form`, { 
                    state: { 
                      weekStart: logbook.week_start_date,
                      logbookId: logbook.id,
                      returnTo: `/logbook/${logbook.id}`
                    } 
                  })}
                  className="text-white hover:bg-blue-700 border border-white/50"
                  title="Add Section A Entry"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  A
                </Button>
              )}
            </div>
            
            {/* Section A Comments for rejected logbooks */}
            {logbook.status === 'rejected' && (
              <div className="bg-yellow-50 border border-yellow-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Add Section A Comment:
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCommentInput(prev => ({ 
                      ...prev, 
                      'section-A': !prev['section-A'] 
                    }))}
                    className="h-8 w-8 p-0"
                    title="Add section comment"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {showCommentInput['section-A'] && (
                  <div className="space-y-2">
                    <Textarea
                      className="w-full border rounded px-3 py-2 text-sm resize-none"
                      rows={3}
                      placeholder="Add your comment about Section A..."
                      value={newComments['section-A'] || ''}
                      onChange={(e) => setNewComments(prev => ({ 
                        ...prev, 
                        'section-A': e.target.value 
                      }))}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => addSectionComment('A', newComments['section-A'] || '')}
                        disabled={!newComments['section-A']?.trim()}
                      >
                        Add Comment
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowCommentInput(prev => ({ ...prev, 'section-A': false }))
                          setNewComments(prev => ({ ...prev, 'section-A': '' }))
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Display existing section comments */}
                {existingComments['section-A'] && existingComments['section-A'].length > 0 && (
                  <div className="mt-3 space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Section A Comments:</h4>
                    {existingComments['section-A'].map((comment, idx) => (
                      <div key={idx} className="bg-white p-2 rounded border text-sm">
                        <div className="font-medium text-gray-900">{comment.author_role}:</div>
                        <div className="text-gray-700">{comment.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section A Content Card */}
          <Card className="border-2 border-blue-300">
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center">
                    <Clock className="h-8 w-8 mx-auto mb-4 text-gray-400 animate-spin" />
                    <p className="text-gray-600">Loading Section A entries...</p>
                  </div>
                ) : (
                  <>
                    {/* Section A Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          {/* Main column headers */}
                          <tr className="bg-blue-100 border-b border-blue-200">
                            <th className="border border-blue-300 p-3 text-left font-semibold text-blue-900 min-w-[200px]">
                              Session
                            </th>
                            <th className="border border-blue-300 p-3 text-left font-semibold text-blue-900 min-w-[250px]">
                              Psychological practice: Client contact
                            </th>
                            <th className="border border-blue-300 p-3 text-center font-semibold text-blue-900 min-w-[80px]">
                              Duration
                            </th>
                            <th className="border border-blue-300 p-3 text-left font-semibold text-blue-900 min-w-[250px]">
                              Psychological practice: Client-related activity
                            </th>
                            <th className="border border-blue-300 p-3 text-center font-semibold text-blue-900 min-w-[80px]">
                              Duration
                            </th>
                            <th className="border border-blue-300 p-3 text-left font-semibold text-blue-900 min-w-[200px]">
                              Reflections on experience
                            </th>
                          </tr>
                          
                          {/* Instructional row */}
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <td className="border border-gray-300 p-2 text-xs text-gray-600 italic">
                              Provide details of:<br/>
                              • place of practice<br/>
                              • client ID<br/>
                              • presenting issues
                            </td>
                            <td className="border border-gray-300 p-2 text-xs text-gray-600 italic">
                              Provide details of:<br/>
                              • date of activity<br/>
                              • psychological assessment and/or intervention/prevention/evaluation
                            </td>
                            <td className="border border-gray-300 p-2 text-xs text-gray-600 italic text-center">
                              Hours
                            </td>
                            <td className="border border-gray-300 p-2 text-xs text-gray-600 italic">
                              Provide details of:<br/>
                              • date of activity<br/>
                              • problem formulation, diagnosis, treatment planning/modification, reporting/consultation
                            </td>
                            <td className="border border-gray-300 p-2 text-xs text-gray-600 italic text-center">
                              Hours
                            </td>
                            <td className="border border-gray-300 p-2 text-xs text-gray-600 italic">
                              Comments
                            </td>
                          </tr>
                        </thead>
                        
                        <tbody>
                          {/* Render DCC entries with their related CRA entries */}
                          {dccEntries.map((dccEntry) => {
                            const relatedCraEntries = craEntries.filter(cra => cra.parent_dcc_entry === dccEntry.id)
                            const maxRows = Math.max(1, relatedCraEntries.length)
                            
                            return Array.from({ length: maxRows }).map((_, rowIndex) => (
                              <React.Fragment key={`${dccEntry.id}-${rowIndex}`}>
                                <tr 
                                  className={`border-b border-gray-200 hover:bg-gray-50 ${canInlineEdit ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                                  onClick={() => canInlineEdit && handleSectionAEntryClick(dccEntry.id)}
                                  title={canInlineEdit ? 'Click to edit this entry' : ''}
                                >
                                  {/* Session column - only show on first row */}
                                  <td className="border border-gray-300 p-3 align-top">
                                    {rowIndex === 0 && (
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                          <div className="font-medium text-sm">
                                            <strong>Place:</strong> {dccEntry.place_of_practice || 'Not specified'}
                                          </div>
                                          {canInlineEdit && (
                                            <Edit3 className="h-4 w-4 text-blue-600 hover:text-blue-800" />
                                          )}
                                        </div>
                                        <div className="text-sm">
                                          <strong>Client ID:</strong> {dccEntry.client_id || 'Not specified'}
                                        </div>
                                        <div className="text-sm">
                                          <strong>Issues:</strong> {dccEntry.presenting_issues || 'Not specified'}
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                  
                                  {/* Client contact column - only show on first row */}
                                  <td className="border border-gray-300 p-3 align-top">
                                    {rowIndex === 0 && (
                                      <div className="space-y-1">
                                        <div className="font-medium text-sm">
                                          <strong>Date:</strong> {formatDate(dccEntry.session_date)}
                                        </div>
                                        <div className="text-sm">
                                          <strong>Activity:</strong> {getActivityTypeDisplay(dccEntry)}
                                        </div>
                                        {dccEntry.simulated && (
                                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                                            Simulated
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  
                                  {/* Client contact duration - only show on first row */}
                                  <td className="border border-gray-300 p-3 text-center align-top">
                                    {rowIndex === 0 && (
                                      <div className="font-medium">
                                        {formatDuration(dccEntry.duration_minutes)}
                                      </div>
                                    )}
                                  </td>
                                  
                                  {/* Client-related activity column */}
                                  <td 
                                    className={`border border-gray-300 p-3 align-top ${relatedCraEntries[rowIndex] && canInlineEdit ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                                    onClick={() => relatedCraEntries[rowIndex] && canInlineEdit && navigate(`/section-a/cra-edit`, { state: { entryId: relatedCraEntries[rowIndex].id, returnTo: `/logbook/${logbook.id}` } })}
                                    title={relatedCraEntries[rowIndex] && canInlineEdit ? 'Click to edit CRA entry' : ''}
                                  >
                                    {relatedCraEntries[rowIndex] ? (
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                        <div className="font-medium text-sm">
                                          <strong>Date:</strong> {formatDate(relatedCraEntries[rowIndex].session_date)}
                                          </div>
                                          {canInlineEdit && (
                                            <Edit3 className="h-4 w-4 text-blue-600 hover:text-blue-800" />
                                          )}
                                        </div>
                                        <div className="text-sm">
                                          <strong>Activity:</strong> {getActivityTypeDisplay(relatedCraEntries[rowIndex])}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-gray-400 text-sm">No related activity</div>
                                    )}
                                  </td>
                                  
                                  {/* Client-related activity duration */}
                                  <td className="border border-gray-300 p-3 text-center align-top">
                                    {relatedCraEntries[rowIndex] && (
                                      <div className="font-medium">
                                        {formatDuration(relatedCraEntries[rowIndex].duration_minutes)}
                                      </div>
                                    )}
                                  </td>
                                  
                                  {/* Reflections column - only show on first row */}
                                  <td className="border border-gray-300 p-3 align-top">
                                    {rowIndex === 0 && (
                                      <div className="text-sm whitespace-pre-wrap">
                                        {dccEntry.reflections_on_experience || 'No reflections provided'}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                                
                                {/* Comment section for rejected logbooks - only show on first row */}
                            {rowIndex === 0 && canInlineEdit && (
                                  <tr>
                                    <td colSpan={6} className="border border-gray-300 p-3 bg-yellow-50">
                                      <div className="ml-4">
                                        <div className="flex items-center justify-between mb-2">
                                          <label className="block text-sm font-medium text-gray-700">
                                            Add Comment for Entry #{dccEntry.id}:
                                          </label>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowCommentInput(prev => ({ 
                                              ...prev, 
                                              [`A-${dccEntry.id}`]: !prev[`A-${dccEntry.id}`] 
                                            }))}
                                            className="h-8 w-8 p-0"
                                            title="Add comment"
                                          >
                                            <Plus className="h-4 w-4" />
                                          </Button>
                                        </div>
                                        
                                        {showCommentInput[`A-${dccEntry.id}`] && (
                                          <div className="space-y-2">
                                            <Textarea
                                              className="w-full border rounded px-3 py-2 text-sm resize-none"
                                              rows={3}
                                              placeholder="Add your response to supervisor feedback..."
                                              value={newComments[`A-${dccEntry.id}`] || ''}
                                              onChange={(e) => setNewComments(prev => ({ 
                                                ...prev, 
                                                [`A-${dccEntry.id}`]: e.target.value 
                                              }))}
                                            />
                                            <div className="flex gap-2">
                                              <Button
                                                size="sm"
                                                onClick={() => addEntryComment(dccEntry.id, 'A', newComments[`A-${dccEntry.id}`] || '')}
                                                disabled={!newComments[`A-${dccEntry.id}`]?.trim()}
                                              >
                                                Add Comment
                                              </Button>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                  setShowCommentInput(prev => ({ ...prev, [`A-${dccEntry.id}`]: false }))
                                                  setNewComments(prev => ({ ...prev, [`A-${dccEntry.id}`]: '' }))
                                                }}
                                              >
                                                Cancel
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Display existing comments */}
                                        {existingComments[`A-${dccEntry.id}`] && existingComments[`A-${dccEntry.id}`].length > 0 && (
                                          <div className="mt-3 space-y-2">
                                            <h4 className="text-sm font-medium text-gray-700">Comments:</h4>
                                            {existingComments[`A-${dccEntry.id}`].map((comment, idx) => (
                                              <div key={idx} className="bg-white p-2 rounded border text-sm">
                                                <div className="font-medium text-gray-900">{comment.author_role}:</div>
                                                <div className="text-gray-700">{comment.message}</div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))
                          })}
                          
                          {/* Show standalone CRA entries */}
                          {craEntries.filter(cra => !cra.parent_dcc_entry).map((craEntry) => (
                            <React.Fragment key={`standalone-cra-${craEntry.id}`}>
                              <tr 
                                className={`border-b border-gray-200 hover:bg-gray-50 ${canInlineEdit ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                                onClick={() => canInlineEdit && navigate(`/section-a/cra-edit`, { state: { entryId: craEntry.id, returnTo: `/logbook/${logbook.id}` } })}
                                title={canInlineEdit ? 'Click to edit CRA entry' : ''}
                              >
                                <td className="border border-gray-300 p-3 align-top">
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                    <div className="font-medium text-sm">
                                      <strong>Place:</strong> {craEntry.place_of_practice || 'Not specified'}
                                      </div>
                                      {canInlineEdit && (
                                        <Edit3 className="h-4 w-4 text-blue-600 hover:text-blue-800" />
                                      )}
                                    </div>
                                    <div className="text-sm">
                                      <strong>Client ID:</strong> {craEntry.client_id || 'Not specified'}
                                    </div>
                                    <div className="text-sm">
                                      <strong>Issues:</strong> {craEntry.presenting_issues || 'Not specified'}
                                    </div>
                                  </div>
                                </td>
                                
                                <td className="border border-gray-300 p-3 align-top">
                                  <div className="text-gray-400 text-sm">No client contact</div>
                                </td>
                                
                                <td className="border border-gray-300 p-3 text-center align-top">
                                  <div className="text-gray-400">-</div>
                                </td>
                                
                                <td className="border border-gray-300 p-3 align-top">
                                  <div className="space-y-1">
                                    <div className="font-medium text-sm">
                                      <strong>Date:</strong> {formatDate(craEntry.session_date)}
                                    </div>
                                    <div className="text-sm">
                                      <strong>Activity:</strong> {getActivityTypeDisplay(craEntry)}
                                    </div>
                                  </div>
                                </td>
                                
                                <td className="border border-gray-300 p-3 text-center align-top">
                                  <div className="font-medium">
                                    {formatDuration(craEntry.duration_minutes)}
                                  </div>
                                </td>
                                
                                <td className="border border-gray-300 p-3 align-top">
                                  <div className="text-sm whitespace-pre-wrap">
                                    {craEntry.reflections_on_experience || 'No reflections provided'}
                                  </div>
                                </td>
                              </tr>
                              
                              {/* Comment section for rejected logbooks - standalone CRA entries */}
                              {canInlineEdit && (
                                <tr>
                                  <td colSpan={6} className="border border-gray-300 p-3 bg-yellow-50">
                                    <div className="ml-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                          Add Comment for Entry #{craEntry.id}:
                                        </label>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setShowCommentInput(prev => ({ 
                                            ...prev, 
                                            [`A-${craEntry.id}`]: !prev[`A-${craEntry.id}`] 
                                          }))}
                                          className="h-8 w-8 p-0"
                                          title="Add comment"
                                        >
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                      </div>
                                      
                                      {showCommentInput[`A-${craEntry.id}`] && (
                                        <div className="space-y-2">
                                          <Textarea
                                            className="w-full border rounded px-3 py-2 text-sm resize-none"
                                            rows={3}
                                            placeholder="Add your response to supervisor feedback..."
                                            value={newComments[`A-${craEntry.id}`] || ''}
                                            onChange={(e) => setNewComments(prev => ({ 
                                              ...prev, 
                                              [`A-${craEntry.id}`]: e.target.value 
                                            }))}
                                          />
                                          <div className="flex gap-2">
                                            <Button
                                              size="sm"
                                              onClick={() => addEntryComment(craEntry.id, 'A', newComments[`A-${craEntry.id}`] || '')}
                                              disabled={!newComments[`A-${craEntry.id}`]?.trim()}
                                            >
                                              Add Comment
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                setShowCommentInput(prev => ({ ...prev, [`A-${craEntry.id}`]: false }))
                                                setNewComments(prev => ({ ...prev, [`A-${craEntry.id}`]: '' }))
                                              }}
                                            >
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Display existing comments */}
                                      {existingComments[`A-${craEntry.id}`] && existingComments[`A-${craEntry.id}`].length > 0 && (
                                        <div className="mt-3 space-y-2">
                                          <h4 className="text-sm font-medium text-gray-700">Comments:</h4>
                                          {existingComments[`A-${craEntry.id}`].map((comment, idx) => (
                                            <div key={idx} className="bg-white p-2 rounded border text-sm">
                                              <div className="font-medium text-gray-900">{comment.author_role}:</div>
                                              <div className="text-gray-700">{comment.message}</div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                          
                          {/* Show empty state if no entries */}
                          {sectionAEntries.length === 0 && (
                            <tr>
                              <td colSpan={6} className="border border-gray-300 p-8 text-center text-gray-500">
                                <FileText className="h-8 w-8 mx-auto mb-2" />
                                No Section A entries found for this week
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Section A Cumulative Totals Table */}
                    <div className="mt-4 border-t border-gray-300">
                      <div className="p-4 bg-gray-50">
                        <h4 className="font-semibold text-gray-900 mb-3">Section A Totals</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-100 border-b border-gray-200">
                                <th className="border border-gray-300 p-3 text-left font-semibold text-gray-900"></th>
                                <th className="border border-gray-300 p-3 text-center font-semibold text-gray-900">
                                  Direct client contact
                                </th>
                                <th className="border border-gray-300 p-3 text-center font-semibold text-gray-900">
                                  Client-related activity
                                </th>
                                <th className="border border-gray-300 p-3 text-center font-semibold text-gray-900">
                                  Total psychological practice (hours)
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-gray-200">
                                <td className="border border-gray-300 p-3 font-medium text-gray-900">
                                  Weekly total
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-medium">
                                  {logbook.section_totals.section_a.dcc?.weekly_hours || 0}h
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-medium">
                                  {logbook.section_totals.section_a.cra?.weekly_hours || 0}h
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-bold">
                                  {logbook.section_totals.section_a.weekly_hours}h
                                </td>
                              </tr>
                              <tr>
                                <td className="border border-gray-300 p-3 font-medium text-gray-900">
                                  Cumulative total
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-medium">
                                  {logbook.section_totals.section_a.dcc?.cumulative_hours || 0}h
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-medium">
                                  {logbook.section_totals.section_a.cra?.cumulative_hours || 0}h
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-bold">
                                  {logbook.section_totals.section_a.cumulative_hours}h
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

          {/* SECTION B: Professional development - after A */}
          <div className="mt-6">
            {/* AHPRA Section B Header */}
            <div className="bg-blue-600 text-white p-4 font-bold text-lg flex items-center justify-between">
              <div className="flex-1 text-center">SECTION B: Record of professional development</div>
              {(logbook.status === 'ready' || logbook.status === 'draft' || isEditable()) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/pd-form`, { 
                    state: { 
                      weekStart: logbook.week_start_date,
                      logbookId: logbook.id,
                      returnTo: `/logbook/${logbook.id}`
                    } 
                  })}
                  className="text-white hover:bg-blue-700 border border-white/50"
                  title="Add Section B Entry"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  B
                </Button>
              )}
            </div>
            
            {/* Section B Comments for rejected logbooks */}
            {logbook.status === 'rejected' && (
              <div className="bg-yellow-50 border border-yellow-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Add Section B Comment:
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCommentInput(prev => ({ 
                      ...prev, 
                      'section-B': !prev['section-B'] 
                    }))}
                    className="h-8 w-8 p-0"
                    title="Add section comment"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {showCommentInput['section-B'] && (
                  <div className="space-y-2">
                    <Textarea
                      className="w-full border rounded px-3 py-2 text-sm resize-none"
                      rows={3}
                      placeholder="Add your comment about Section B..."
                      value={newComments['section-B'] || ''}
                      onChange={(e) => setNewComments(prev => ({ 
                        ...prev, 
                        'section-B': e.target.value 
                      }))}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => addSectionComment('B', newComments['section-B'] || '')}
                        disabled={!newComments['section-B']?.trim()}
                      >
                        Add Comment
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowCommentInput(prev => ({ ...prev, 'section-B': false }))
                          setNewComments(prev => ({ ...prev, 'section-B': '' }))
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Display existing section comments */}
                {existingComments['section-B'] && existingComments['section-B'].length > 0 && (
                  <div className="mt-3 space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Section B Comments:</h4>
                    {existingComments['section-B'].map((comment, idx) => (
                      <div key={idx} className="bg-white p-2 rounded border text-sm">
                        <div className="font-medium text-gray-900">{comment.author_role}:</div>
                        <div className="text-gray-700">{comment.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Metadata */}
            <div className="flex justify-between items-center py-2 px-4 bg-white border-b border-gray-300">
              <span className="text-sm text-gray-700">Effective from: 28 October 2020</span>
            </div>
            
            {/* Professional Development Definition Box */}
            <div className="bg-gray-100 border-2 border-green-600 p-4 text-sm">
              <p className="mb-3">
                Professional development (PD) is the means by which provisional psychologists maintain, improve and broaden their knowledge, gain competence, and develop the personal qualities required in their professional practice. Professional development activities can include attending lectures, seminars, symposia, presentations, workshops, short courses, conferences, and learning by reading and using audiovisual material, including readings and PD activities undertaken to prepare for the national psychology examination, and other self directed learning. Active PD refers to activities that engage the participant and reinforce learning through written or oral activities designed to enhance and test learning. The active component may already be part of the PD activity or the supervisor may set tasks to reinforce learning.
              </p>
              <p>
                The supervisor should approve all PD activities to ensure they address the provisional psychologist's learning goals and practice requirements, and they relate to the core competencies of the internship. The provisional psychologist should update this list as required and provide this record to their supervisor for review at each supervision meeting or as required and discuss the PD outcomes with their supervisor. The supervisor should initial each activity on this record to confirm it has been reviewed and discussed.
              </p>
            </div>
          </div>

          {/* Section B Content Card */}
          <Card className="border-2 border-amber-300 mt-6">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <Clock className="h-8 w-8 mx-auto mb-4 text-gray-400 animate-spin" />
                  <p className="text-gray-600">Loading Section B entries...</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-800 text-white">
                          <th className="border border-gray-400 p-2 text-left font-semibold">Date of activity</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Type of activity</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Active PD?</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Activity details</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Specify core competency area(s)</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Specific topics covered</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Duration</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Supervisor initials</th>
                        </tr>
                        <tr className="bg-gray-100 text-gray-600 text-xs">
                          <td className="border border-gray-300 p-1"></td>
                          <td className="border border-gray-300 p-1 italic">E.g. workshop, reading, seminar, conference etc</td>
                          <td className="border border-gray-300 p-1 italic">Specify Yes or No</td>
                          <td className="border border-gray-300 p-1 italic">E.g. name of course, presenter, institution etc</td>
                          <td className="border border-gray-300 p-1 italic">E.g. intervention strategies, practice across the lifespan etc</td>
                          <td className="border border-gray-300 p-1 italic">E.g. behavioural interventions for ADHD in adolescents</td>
                          <td className="border border-gray-300 p-1 italic">Hours/mins</td>
                          <td className="border border-gray-300 p-1"></td>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionBEntries.map((e, i) => (
                          <React.Fragment key={i}>
                            <tr 
                              className={`border-b border-gray-300 hover:bg-gray-50 ${canInlineEdit ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                              onClick={() => canInlineEdit && handleSectionBEntryClick(e)}
                              title={canInlineEdit ? 'Click to edit this entry' : ''}
                            >
                              <td className="border border-gray-300 p-2 flex items-center justify-between">
                                <span>{e.date_of_activity || e.activity_date || ''}</span>
                                {canInlineEdit && (
                                  <Edit3 className="h-4 w-4 text-blue-600 hover:text-blue-800" />
                                )}
                              </td>
                              <td className="border border-gray-300 p-2">{e.activity_title || e.activity_type || e.title || '—'}</td>
                              <td className="border border-gray-300 p-2">{e.active_pd || 'No'}</td>
                              <td className="border border-gray-300 p-2">{e.activity_details || e.presenter || ''}</td>
                              <td className="border border-gray-300 p-2">{e.core_competency_areas || ''}</td>
                              <td className="border border-gray-300 p-2">{e.specific_topics || e.notes || e.summary || ''}</td>
                              <td className="border border-gray-300 p-2">{formatDuration(Number(e.duration_minutes || e.duration || 0))}</td>
                              <td className="border border-gray-300 p-2">{e.supervisor_initials || ''}</td>
                            </tr>
                            
                            {/* Comment section for rejected logbooks - Section B entries */}
                            {canInlineEdit && (
                              <tr>
                                <td colSpan={8} className="border border-gray-300 p-3 bg-yellow-50">
                                  <div className="ml-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <label className="block text-sm font-medium text-gray-700">
                                        Add Comment for Entry #{e.id}:
                                      </label>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowCommentInput(prev => ({ 
                                          ...prev, 
                                          [`B-${e.id}`]: !prev[`B-${e.id}`] 
                                        }))}
                                        className="h-8 w-8 p-0"
                                        title="Add comment"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    
                                    {showCommentInput[`B-${e.id}`] && (
                                      <div className="space-y-2">
                                        <Textarea
                                          className="w-full border rounded px-3 py-2 text-sm resize-none"
                                          rows={3}
                                          placeholder="Add your response to supervisor feedback..."
                                          value={newComments[`B-${e.id}`] || ''}
                                          onChange={(event) => setNewComments(prev => ({ 
                                            ...prev, 
                                            [`B-${e.id}`]: event.target.value 
                                          }))}
                                        />
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            onClick={() => addEntryComment(e.id, 'B', newComments[`B-${e.id}`] || '')}
                                            disabled={!newComments[`B-${e.id}`]?.trim()}
                                          >
                                            Add Comment
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setShowCommentInput(prev => ({ ...prev, [`B-${e.id}`]: false }))
                                              setNewComments(prev => ({ ...prev, [`B-${e.id}`]: '' }))
                                            }}
                                          >
                                            Cancel
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Display existing comments */}
                                    {existingComments[`B-${e.id}`] && existingComments[`B-${e.id}`].length > 0 && (
                                      <div className="mt-3 space-y-2">
                                        <h4 className="text-sm font-medium text-gray-700">Comments:</h4>
                                        {existingComments[`B-${e.id}`].map((comment, idx) => (
                                          <div key={idx} className="bg-white p-2 rounded border text-sm">
                                            <div className="font-medium text-gray-900">{comment.author_role}:</div>
                                            <div className="text-gray-700">{comment.message}</div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                        {sectionBEntries.length === 0 && (
                          <tr>
                            <td colSpan={8} className="border border-gray-300 p-6 text-center text-gray-500">No Section B entries found for this week</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Section B Footer with Totals */}
                  <div className="flex justify-between items-center p-4 bg-gray-50 border-t">
                    <div className="text-sm text-gray-600">
                      Please insert additional rows as required
                    </div>
                    <div className="flex gap-4">
                      <div className="text-sm">
                        <span className="font-semibold">Total hours:</span>
                        <div className="border border-gray-300 p-1 w-16 text-center bg-white inline-block ml-2">
                          {logbook.section_totals.section_b.weekly_hours}
                        </div>
                      </div>
                      <div className="text-sm">
                        <span className="font-semibold">Cumulative hours:</span>
                        <div className="border border-gray-300 p-1 w-16 text-center bg-white inline-block ml-2">
                          {logbook.section_totals.section_b.cumulative_hours}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* SECTION C: Supervision - after B */}
          <div className="mt-6">
            {/* Provisional Psychologist Details and Signature Block */}
            <div className="bg-gray-100 border border-gray-300 p-4 mb-4">
              <div className="grid grid-cols-2 gap-8">
                {/* Left Side - Provisional Psychologist Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Provisional psychologist name
                    </label>
                    <div className="bg-white border border-gray-300 p-2 h-8">
                      {logbook.trainee_name}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Date
                    </label>
                    <div className="bg-white border border-gray-300 p-2 h-8">
                      {/* Empty for signature */}
                    </div>
                  </div>
                </div>
                
                {/* Right Side - Signature Block */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Signature
                  </label>
                  <div className="bg-white border border-gray-300 p-2 h-16">
                    {/* Empty signature box */}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION C Header */}
            <div className="bg-blue-600 text-white p-4 font-bold text-lg flex items-center justify-between">
              <div className="flex-1 text-center">SECTION C: Record of supervision</div>
              {(logbook.status === 'ready' || logbook.status === 'draft' || isEditable()) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/supervision-form`, { 
                    state: { 
                      weekStart: logbook.week_start_date,
                      logbookId: logbook.id,
                      returnTo: `/logbook/${logbook.id}`
                    } 
                  })}
                  className="text-white hover:bg-blue-700 border border-white/50"
                  title="Add Section C Entry"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  C
                </Button>
              )}
            </div>
            
            {/* Section C Comments for rejected logbooks */}
            {logbook.status === 'rejected' && (
              <div className="bg-yellow-50 border border-yellow-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Add Section C Comment:
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCommentInput(prev => ({ 
                      ...prev, 
                      'section-C': !prev['section-C'] 
                    }))}
                    className="h-8 w-8 p-0"
                    title="Add section comment"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {showCommentInput['section-C'] && (
                  <div className="space-y-2">
                    <Textarea
                      className="w-full border rounded px-3 py-2 text-sm resize-none"
                      rows={3}
                      placeholder="Add your comment about Section C..."
                      value={newComments['section-C'] || ''}
                      onChange={(e) => setNewComments(prev => ({ 
                        ...prev, 
                        'section-C': e.target.value 
                      }))}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => addSectionComment('C', newComments['section-C'] || '')}
                        disabled={!newComments['section-C']?.trim()}
                      >
                        Add Comment
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowCommentInput(prev => ({ ...prev, 'section-C': false }))
                          setNewComments(prev => ({ ...prev, 'section-C': '' }))
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Display existing section comments */}
                {existingComments['section-C'] && existingComments['section-C'].length > 0 && (
                  <div className="mt-3 space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Section C Comments:</h4>
                    {existingComments['section-C'].map((comment, idx) => (
                      <div key={idx} className="bg-white p-2 rounded border text-sm">
                        <div className="font-medium text-gray-900">{comment.author_role}:</div>
                        <div className="text-gray-700">{comment.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Introduction Text */}
            <div className="bg-white p-4 text-sm">
              <p>
                The provisional psychologist should record an entry in this record of supervision following each supervision meeting, or in time to be tabled at the next supervision meeting. Each entry should be initialled by the supervisor who provided the supervision.
              </p>
            </div>
            
            {/* Supervision Requirements */}
            <div className="bg-white p-4 text-sm">
              <h4 className="font-bold mb-2">Supervision for the 5+1 internship must:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>total at least 80 hours over the course of the internship</li>
                <li>include at least 50 hours of direct, individual supervision provided by the principal supervisor</li>
                <li>be provided at a ratio of 1 hour of supervision for every 17 hours of internship</li>
                <li>be provided frequently for the full duration of the internship (usually weekly)</li>
                <li>be primarily direct (real time verbal) supervision using a visual medium - either in person or via video-conference etc; no more than 20 hours may be via telephone and no more than 10 hours may be asynchronous (i.e. written feedback)</li>
                <li>be primarily accrued in sessions of 1 hour or more; no more than 10 hours of shorter supervision sessions may be claimed</li>
              </ul>
            </div>
          </div>

          {/* Section C Content Card */}
          <Card className="border-2 border-blue-300 mt-6">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <Clock className="h-8 w-8 mx-auto mb-4 text-gray-400 animate-spin" />
                  <p className="text-gray-600">Loading Section C entries...</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-800 text-white">
                          <th className="border border-gray-400 p-2 text-left font-semibold">Date of supervision</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Name of supervisor</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Principal or secondary?</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Individual, group or other?</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Summary of supervision</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Duration</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Supervisor initials</th>
                        </tr>
                        <tr className="bg-gray-100 text-gray-600 text-xs">
                          <td className="border border-gray-300 p-1"></td>
                          <td className="border border-gray-300 p-1"></td>
                          <td className="border border-gray-300 p-1 italic">Specify</td>
                          <td className="border border-gray-300 p-1 italic">Specify</td>
                          <td className="border border-gray-300 p-1 italic">E.g. brief summary of matters discussed, outcomes/plans for follow up activities and discussions</td>
                          <td className="border border-gray-300 p-1 italic">Hours/mins</td>
                          <td className="border border-gray-300 p-1"></td>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionCEntries.map((e, i) => (
                          <React.Fragment key={i}>
                            <tr 
                              className={`border-b border-gray-300 hover:bg-gray-50 ${canInlineEdit ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                              onClick={() => canInlineEdit && handleSectionCEntryClick(e)}
                              title={canInlineEdit ? 'Click to edit this entry' : ''}
                            >
                              <td className="border border-gray-300 p-2 flex items-center justify-between">
                                <span>{e.date_of_supervision || e.date || ''}</span>
                                {canInlineEdit && (
                                  <Edit3 className="h-4 w-4 text-blue-600 hover:text-blue-800" />
                                )}
                              </td>
                              <td className="border border-gray-300 p-2">{e.supervisor_name || e.supervisor || '—'}</td>
                              <td className="border border-gray-300 p-2">{e.principal_or_secondary || ''}</td>
                              <td className="border border-gray-300 p-2">{e.individual_group_other || e.supervision_type || ''}</td>
                              <td className="border border-gray-300 p-2">{e.summary || ''}</td>
                              <td className="border border-gray-300 p-2">{formatDuration(Number(e.duration_minutes || e.duration || 0))}</td>
                              <td className="border border-gray-300 p-2">{e.supervisor_initials || ''}</td>
                            </tr>
                            
                            {/* Comment section for rejected logbooks - Section C entries */}
                            {canInlineEdit && (
                              <tr>
                                <td colSpan={7} className="border border-gray-300 p-3 bg-yellow-50">
                                  <div className="ml-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <label className="block text-sm font-medium text-gray-700">
                                        Add Comment for Entry #{e.id}:
                                      </label>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowCommentInput(prev => ({ 
                                          ...prev, 
                                          [`C-${e.id}`]: !prev[`C-${e.id}`] 
                                        }))}
                                        className="h-8 w-8 p-0"
                                        title="Add comment"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    
                                    {showCommentInput[`C-${e.id}`] && (
                                      <div className="space-y-2">
                                        <Textarea
                                          className="w-full border rounded px-3 py-2 text-sm resize-none"
                                          rows={3}
                                          placeholder="Add your response to supervisor feedback..."
                                          value={newComments[`C-${e.id}`] || ''}
                                          onChange={(event) => setNewComments(prev => ({ 
                                            ...prev, 
                                            [`C-${e.id}`]: event.target.value 
                                          }))}
                                        />
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            onClick={() => addEntryComment(e.id, 'C', newComments[`C-${e.id}`] || '')}
                                            disabled={!newComments[`C-${e.id}`]?.trim()}
                                          >
                                            Add Comment
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setShowCommentInput(prev => ({ ...prev, [`C-${e.id}`]: false }))
                                              setNewComments(prev => ({ ...prev, [`C-${e.id}`]: '' }))
                                            }}
                                          >
                                            Cancel
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Display existing comments */}
                                    {existingComments[`C-${e.id}`] && existingComments[`C-${e.id}`].length > 0 && (
                                      <div className="mt-3 space-y-2">
                                        <h4 className="text-sm font-medium text-gray-700">Comments:</h4>
                                        {existingComments[`C-${e.id}`].map((comment, idx) => (
                                          <div key={idx} className="bg-white p-2 rounded border text-sm">
                                            <div className="font-medium text-gray-900">{comment.author_role}:</div>
                                            <div className="text-gray-700">{comment.message}</div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                        {sectionCEntries.length === 0 && (
                          <tr>
                            <td colSpan={7} className="border border-gray-300 p-6 text-center text-gray-500">No Section C entries found for this week</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Section C Footer with Totals */}
                  <div className="flex justify-between items-center p-4 bg-gray-50 border-t">
                    <div className="text-sm text-gray-600">
                      Please insert additional rows as required
                    </div>
                    <div className="flex gap-4">
                      <div className="text-sm">
                        <span className="font-semibold">Total hours:</span>
                        <div className="border border-gray-300 p-1 w-16 text-center bg-white inline-block ml-2">
                          {logbook.section_totals.section_c.weekly_hours}
                        </div>
                      </div>
                      <div className="text-sm">
                        <span className="font-semibold">Cumulative hours:</span>
                        <div className="border border-gray-300 p-1 w-16 text-center bg-white inline-block ml-2">
                          {logbook.section_totals.section_c.cumulative_hours}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          </div>

          {/* AHPRA SIGNATURES BLOCK */}
          <div className="mt-6">
            {/* Signatures Header */}
            <div className="bg-blue-600 text-white p-4 font-bold text-lg text-center">
              Signatures
            </div>
            
            {/* Truth Statement */}
            <div className="bg-white p-4 text-sm">
              <p>The information contained in this record of practice is true and correct.</p>
            </div>
            
            {/* Provisional Psychologist Signature Block */}
            <div className="bg-gray-100 border border-gray-300 p-4">
              <div className="grid grid-cols-2 gap-8">
                {/* Left Side - Provisional Psychologist Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Provisional psychologist name
                    </label>
                    <div className="bg-white border border-gray-300 p-2 h-8 flex items-center">
                      {logbook.trainee_name}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Date
                    </label>
                    <div className="bg-white border border-gray-300 p-2 h-8">
                      {/* Empty for signature date */}
                    </div>
                  </div>
                </div>
                
                {/* Right Side - Signature */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Signature
                  </label>
                  <div className="bg-white border border-gray-300 p-2 h-16">
                    {/* Empty signature box */}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Principal Supervisor Signature Block */}
            <div className="bg-gray-100 border border-gray-300 p-4 mt-4">
              <div className="grid grid-cols-2 gap-8">
                {/* Left Side - Principal Supervisor Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Principal supervisor name
                    </label>
                    <div className="bg-white border border-gray-300 p-2 h-8 flex items-center">
                      {logbook.supervisor_name || 'Not assigned'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Date
                    </label>
                    <div className="bg-white border border-gray-300 p-2 h-8">
                      {/* Empty for signature date */}
                    </div>
                  </div>
                </div>
                
                {/* Right Side - Signature */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Signature
                  </label>
                  <div className="bg-white border border-gray-300 p-2 h-16">
                    {/* Empty signature box */}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AHPRA FOOTER */}
          <div className="bg-gray-50 border border-gray-300 p-4 rounded-lg text-xs leading-relaxed">
            <p className="font-semibold mb-2">
              Please note that all work roles must be approved by the Board prior to counting any time or training towards the supervised practice program. This form is also available in PDF format at www.psychologyboard.gov.au/Registration/Forms.
            </p>
            <div className="text-center text-gray-600">
              <strong>Effective from: 28 October 2020</strong>
            </div>
          </div>

          {/* Footer with action buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex items-center gap-2">
            </div>
            
            <div className="flex items-center gap-2">
              {(validActions?.can_submit || (!validActions && isEditable())) && (
                <Button
                  variant="default"
                  onClick={handleSubmitForReview}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit for Review
                </Button>
              )}
              {(validActions?.can_return_for_edits || (!validActions && logbook.status === 'submitted')) && (
                <Button
                  variant="outline"
                  onClick={handleRequestReturnForEdits}
                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Request Return for Edits
                </Button>
              )}
              <Button variant="outline" onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Section B Edit Modal */}
      {showBEditModal && (
        <PDForm
          onSubmit={handleBSave}
          onCancel={() => setShowBEditModal(false)}
          saving={saving}
          formData={bFormData}
          setFormData={setBFormData}
          competencies={competencies}
          toggleCompetency={toggleCompetency}
          isEditing={!!editingBEntry}
        />
      )}

      {/* Section C Edit Modal */}
      {showCEditModal && (
        <SupervisionForm
          onSubmit={handleCSave}
          onCancel={() => setShowCEditModal(false)}
          saving={saving}
          formData={cFormData}
          setFormData={setCFormData}
          isEditing={!!editingCEntry}
        />
      )}

      {/* Audit Trail Modal */}
      <LogbookAuditTree
        logbookId={logbook.id}
        isOpen={showAuditTrail}
        onClose={() => setShowAuditTrail(false)}
      />

      {/* Error Overlay with 3-part system */}
      <ErrorOverlay {...errorOverlay} />
    </>
  )
}
