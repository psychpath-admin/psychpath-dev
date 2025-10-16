import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeft, 
  MessageCircle, 
  AlertTriangle, 
  Save, 
  Send,
  CheckCircle,
  XCircle,
  FileText,
  User,
  BookOpen
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch, updateSectionAEntry, updatePDEntry, updateSupervisionEntry } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface LogbookEntry {
  id: number
  date?: string
  date_of_activity?: string  // Section B uses this field
  session_date?: string      // Section A uses this field
  client_pseudonym?: string
  place_of_practice?: string
  activity_type?: string | string[]  // Can be string or array
  session_activity_types?: string[]  // Section A uses this field
  reflection?: string
  reflections_on_experience?: string  // Section A uses this field
  duration_minutes?: number
  supervisor_flagged?: boolean
  supervisor_comment?: string
  // Section B specific fields
  topics_covered?: string
  competencies_covered?: string[]
  is_active_activity?: boolean
  entry_type?: 'dcc' | 'cra' | 'icra' | 'pd' | 'supervision' | 'client_contact'
  // Additional fields that might be present in different sections
  title?: string
  description?: string
  hours?: number
  supervisor?: string
  supervision_type?: string
  minutes?: number
  focus?: string
  // Section A specific fields
  parent_dcc_entry?: number
  simulated?: boolean
  client_id?: string
  client_age?: number
  presenting_issues?: string
  session_activity_type?: string
  // Section B specific fields
  is_active_activity?: boolean
  activity_details?: string
  topics_covered?: string
  competencies_covered?: string[]
  // Comment system
  comments?: Comment[]
}

interface Comment {
  id: number
  author: string
  author_type: 'supervisor' | 'trainee'
  content: string
  created_at: string
  replies?: Comment[]
}

interface Logbook {
  id: number
  week_start_date: string
  week_end_date: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'locked'
  review_comments?: string
  submitted_at?: string
  reviewed_at?: string
  reviewed_by?: string
  trainee: number
  trainee_name: string
  supervisor?: {
    id: number
    first_name: string
    last_name: string
  }
  entries?: {
    section_a: LogbookEntry[]
    section_b: LogbookEntry[]
    section_c: LogbookEntry[]
  }
  section_a_entries?: LogbookEntry[]
  section_b_entries?: LogbookEntry[]
  section_c_entries?: LogbookEntry[]
}

export default function EditRejectedLogbook() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [logbook, setLogbook] = useState<Logbook | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')

  useEffect(() => {
    if (id && user) {
      loadLogbook()
    }
  }, [id, user])

  const loadLogbook = async () => {
    try {
      setLoading(true)
      console.log('Loading logbook with id:', id)
      console.log('Current user:', user)
      
      const response = await apiFetch(`/api/logbook/${id}/`)
      
      if (!response.ok) {
        throw new Error('Failed to load logbook')
      }
      
      const data = await response.json()
      console.log('Logbook data received:', data)
      console.log('Data.trainee:', data.trainee)
      console.log('User.id:', user?.id)
      console.log('Data.entries:', data.entries)
      console.log('Data.section_a_entries:', data.section_a_entries)
      console.log('Data.section_b_entries:', data.section_b_entries)
      console.log('Data.section_c_entries:', data.section_c_entries)
      
      // Check permissions: only logbook owner and status must be rejected
      if (!data.trainee || data.trainee !== user?.id) {
        throw new Error('You can only edit your own logbooks')
      }
      
      if (data.status !== 'rejected') {
        throw new Error('This logbook is not rejected and cannot be edited')
      }
      
      // Fetch entries from separate endpoint
      const entriesResponse = await apiFetch(`/api/logbook/${id}/entries/`)
      if (!entriesResponse.ok) {
        throw new Error('Failed to load logbook entries')
      }
      
      const entriesData = await entriesResponse.json()
      
      // Add sample comments only to relevant entries
      const addSampleComments = (entries: any[], section: string) => {
        return entries.map((entry, index) => {
          // Only add comments to specific entries that would logically have supervisor feedback
          let shouldAddComments = false
          
          if (section === 'A') {
            // Add comments to the first entry (likely the main client contact)
            shouldAddComments = index === 0
          } else if (section === 'B') {
            // Add comments to entries that might need clarification
            shouldAddComments = entry.activity_type === 'WORKSHOP' && index === 0
          }
          
          return {
            ...entry,
            comments: shouldAddComments ? [
              {
                id: 1,
                author: 'Demo Supervisor',
                author_type: 'supervisor',
                content: section === 'A' 
                  ? 'Please provide more detail about the client\'s presenting issues and your intervention approach.'
                  : 'Please elaborate on how this workshop will directly apply to your clinical practice with clients.',
                created_at: '2024-10-04T10:00:00Z',
                replies: [
                  {
                    id: 2,
                    author: 'Charlotte Gorham Mackie',
                    author_type: 'trainee',
                    content: section === 'A'
                      ? 'I will add more detail about the assessment process and intervention planning.'
                      : 'I will provide specific examples of how these techniques will be applied in upcoming client sessions.',
                    created_at: '2024-10-04T14:30:00Z'
                  }
                ]
              }
            ] : []
          }
        })
      }

      
      // Combine logbook data with entries
      const processedData = {
        ...data,
        section_a_entries: addSampleComments(entriesData.section_a || [], 'A'),
        section_b_entries: addSampleComments(entriesData.section_b || [], 'B'),
        section_c_entries: entriesData.section_c || []
      }
      
      
      
      setLogbook(processedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logbook')
    } finally {
      setLoading(false)
    }
  }

  const handleReplyToComment = async (_entryId: number, parentCommentId: number, reply: string) => {
    try {
      const response = await apiFetch(`/api/logbook/comments/${parentCommentId}/reply/`, {
        method: 'POST',
        body: JSON.stringify({
          content: reply,
          author_type: 'trainee'
        })
      })
      
      if (response.ok) {
        toast.success('Reply posted successfully')
        // Reload the logbook to get updated comments
        await loadLogbook()
        setReplyingTo(null)
        setReplyText('')
      } else {
        throw new Error('Failed to post reply')
      }
    } catch (err) {
      toast.error('Failed to post reply')
      console.error('Reply error:', err)
    }
  }

  const handleSaveEntry = async (entryId: number, section: string) => {
    try {
      setSaving(true)
      
      // Get the current entry from logbook state (not the stale prop)
      let currentEntry: LogbookEntry | undefined
      if (section === 'Section A' || section === 'A') {
        currentEntry = logbook?.section_a_entries?.find(e => e.id === entryId)
      } else if (section === 'Section B' || section === 'B') {
        currentEntry = logbook?.section_b_entries?.find(e => e.id === entryId)
      } else if (section === 'Section C' || section === 'C') {
        currentEntry = logbook?.section_c_entries?.find(e => e.id === entryId)
      }
      
      if (!currentEntry) {
        throw new Error('Entry not found')
      }
      
      // Prepare data based on section type
      const updateData: any = {
        duration_minutes: currentEntry.duration_minutes
      }
      
      if (section === 'Section A' || section === 'A') {
        updateData.client_id = currentEntry.client_id
        updateData.place_of_practice = currentEntry.place_of_practice
        updateData.session_activity_types = currentEntry.session_activity_types
        updateData.session_date = currentEntry.session_date
        updateData.reflections_on_experience = currentEntry.reflections_on_experience
      } else if (section === 'Section B' || section === 'B') {
        updateData.date_of_activity = currentEntry.date_of_activity || currentEntry.date
        updateData.activity_type = currentEntry.activity_type
        updateData.activity_details = currentEntry.activity_details
        updateData.topics_covered = currentEntry.topics_covered
        updateData.competencies_covered = currentEntry.competencies_covered
        updateData.is_active_activity = currentEntry.is_active_activity
        updateData.reflection = currentEntry.reflection
      } else if (section === 'Section C' || section === 'C') {
        updateData.date = currentEntry.date
        updateData.supervisor = currentEntry.supervisor
        updateData.supervision_type = currentEntry.supervision_type
        updateData.minutes = currentEntry.minutes
        updateData.focus = currentEntry.focus
      }
      
      console.log('Saving entry:', currentEntry.id, 'Section:', section, 'Data:', updateData)
      console.log('Current entry before save:', currentEntry)
      console.log('updateData keys:', Object.keys(updateData))
      console.log('updateData values:', Object.values(updateData))
      console.log('updateData details:', JSON.stringify(updateData, null, 2))
      
      // Debug Section B specific fields
      if (section === 'Section B' || section === 'B') {
        console.log('Section B field values:')
        console.log('  topics_covered:', currentEntry.topics_covered)
        console.log('  competencies_covered:', currentEntry.competencies_covered)
        console.log('  is_active_activity:', currentEntry.is_active_activity)
        console.log('  activity_details:', currentEntry.activity_details)
      }
      
      let response
      if (section === 'Section A' || section === 'A') {
        response = await updateSectionAEntry(currentEntry.id, updateData)
      } else if (section === 'Section B' || section === 'B') {
        response = await updatePDEntry(currentEntry.id, updateData)
      } else if (section === 'Section C' || section === 'C') {
        response = await updateSupervisionEntry(currentEntry.id, updateData)
      } else {
        throw new Error(`Unknown section: ${section}`)
      }
      
      console.log('Save successful:', response)
      
      // Update the local state to reflect the changes
      if (section === 'Section A' || section === 'A') {
        setLogbook(prev => prev ? {
          ...prev,
          section_a_entries: (prev.section_a_entries || []).map(e => 
            e.id === currentEntry.id ? { ...e, ...updateData } : e
          )
        } : null)
      } else if (section === 'Section B' || section === 'B') {
        setLogbook(prev => prev ? {
          ...prev,
          section_b_entries: (prev.section_b_entries || []).map(e => 
            e.id === currentEntry.id ? { ...e, ...updateData } : e
          )
        } : null)
      } else if (section === 'Section C' || section === 'C') {
        setLogbook(prev => prev ? {
          ...prev,
          section_c_entries: (prev.section_c_entries || []).map(e => 
            e.id === currentEntry.id ? { ...e, ...updateData } : e
          )
        } : null)
      }
      
      toast.success('Entry saved successfully')
      // Create audit trail entry
      await apiFetch('/api/logbook/audit-trail/', {
        method: 'POST',
        body: JSON.stringify({
          logbook: logbook?.id,
          action: `Record Updated (${section})`,
          comment: `Updated ${section} entry for ${currentEntry.date || currentEntry.session_date}`,
        })
      })
    } catch (err) {
      toast.error('Failed to save entry')
      console.error('Error saving entry:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleResubmitLogbook = async () => {
    if (!logbook) return
    
    try {
      setSaving(true)
      const response = await apiFetch(`/api/logbook/${logbook.id}/resubmit/`, {
        method: 'POST',
        body: JSON.stringify({})
      })
      
      if (response.ok) {
        toast.success('Logbook resubmitted to your supervisor')
        navigate('/logbook')
      } else {
        throw new Error('Failed to resubmit logbook')
      }
    } catch (err) {
      toast.error('Failed to resubmit logbook')
      console.error('Error resubmitting logbook:', err)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatWeekRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return `${start.getDate()} ${start.toLocaleDateString('en-AU', { month: 'short' })} ${start.getFullYear()} - ${end.getDate()} ${end.toLocaleDateString('en-AU', { month: 'short' })} ${end.getFullYear()}`
  }

  const getClientDisplayName = (entry: LogbookEntry) => {
    // For ICRA/CRA/independent_activity entries, use client_id if available, otherwise descriptive name
    if (entry.entry_type === 'icra' || entry.entry_type === 'cra' || entry.entry_type === 'independent_activity') {
      if (entry.client_id) {
        return entry.client_id
      }
      return `ICRA Activity (${entry.activity_details || entry.activity_type || 'Professional Development'})`
    }
    return entry.client_id || entry.client_pseudonym || 'Unnamed Client'
  }

  const renderComments = (entry: LogbookEntry) => {
    if (!entry.comments || entry.comments.length === 0) {
      return null
    }

    return (
      <div className="mt-4 space-y-3">
        <h5 className="font-medium text-sm text-gray-700">Comments & Feedback</h5>
        {entry.comments.map((comment) => (
          <div key={comment.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={comment.author_type === 'supervisor' ? 'destructive' : 'secondary'} className="text-xs">
                  {comment.author_type === 'supervisor' ? 'Supervisor' : 'You'}
                </Badge>
                <span className="text-xs text-gray-500">{comment.author}</span>
                <span className="text-xs text-gray-400">
                  {new Date(comment.created_at).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              {comment.author_type === 'supervisor' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyingTo(comment.id)}
                  className="text-xs h-6 px-2"
                >
                  Reply
                </Button>
              )}
            </div>
            <p className="text-sm text-gray-700">{comment.content}</p>
            
            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="ml-4 space-y-2">
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="bg-white rounded p-2 border-l-2 border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {reply.author_type === 'supervisor' ? 'Supervisor' : 'You'}
                      </Badge>
                      <span className="text-xs text-gray-500">{reply.author}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(reply.created_at).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{reply.content}</p>
                  </div>
                ))}
              </div>
            )}
            
            {/* Reply Form */}
            {replyingTo === comment.id && (
              <div className="mt-3 p-3 bg-white rounded border">
                <Textarea
                  placeholder="Write your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="mb-2"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleReplyToComment(entry.id, comment.id, replyText)}
                    disabled={!replyText.trim()}
                  >
                    Post Reply
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReplyingTo(null)
                      setReplyText('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (loading || !user) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading logbook...</div>
        </div>
      </div>
    )
  }

  if (error || !logbook) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            {error || 'Logbook not found'}
          </h1>
          <Button onClick={() => navigate('/logbook')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Logbook Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Edit Rejected Logbook</h1>
          <p className="text-gray-600">
            Week of {formatWeekRange(logbook.week_start_date, logbook.week_end_date)}
          </p>
        </div>
        <Badge variant="destructive" className="text-sm">
          <XCircle className="w-4 h-4 mr-1" />
          Rejected
        </Badge>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => navigate('/logbook')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Logbook Dashboard
        </Button>
      </div>


      {/* Supervisor Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-amber-600" />
            Supervisor Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Review Comments:</strong> {logbook.review_comments || 'No specific comments provided.'}
            </AlertDescription>
          </Alert>
          
          {logbook.reviewed_at && (
            <div className="mt-4 text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>Reviewed: {formatDate(logbook.reviewed_at)}</span>
                {logbook.reviewed_by && (
                  <span>By: {logbook.reviewed_by}</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section A - Direct Client Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Section A — Direct Client Contact (DCC)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(logbook.section_a_entries || []).map((entry) => (
            <Card key={entry.id} className={`${entry.supervisor_flagged ? 'border-red-200 bg-red-50' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{entry.session_date || entry.date} – {getClientDisplayName(entry)}</h4>
                    <p className="text-sm text-gray-600">
                      {Array.isArray(entry.session_activity_types) 
                        ? entry.session_activity_types.join(', ') 
                        : Array.isArray(entry.activity_type) 
                          ? entry.activity_type.join(', ') 
                          : entry.session_activity_type || entry.activity_type || 'N/A'
                      }
                    </p>
                  </div>
                  {entry.supervisor_flagged && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Flagged
                    </Badge>
                  )}
                </div>
                {entry.supervisor_comment && (
                  <Alert className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <strong>Supervisor Comment:</strong> {entry.supervisor_comment}
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Render nested comments */}
                {renderComments(entry)}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`client-${entry.id}`}>Client Pseudonym</Label>
                    <Input
                      id={`client-${entry.id}`}
                      value={entry.client_id || entry.client_pseudonym || ''}
                      onChange={(e) => {
                        const updatedEntry = { ...entry, client_id: e.target.value }
                        setLogbook(prev => prev ? {
                          ...prev,
                          section_a_entries: (prev.section_a_entries || []).map(e => e.id === entry.id ? updatedEntry : e)
                        } : null)
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`place-${entry.id}`}>Place of Practice</Label>
                    <Input
                      id={`place-${entry.id}`}
                      value={entry.place_of_practice || ''}
                      onChange={(e) => {
                        const updatedEntry = { ...entry, place_of_practice: e.target.value }
                        setLogbook(prev => prev ? {
                          ...prev,
                          section_a_entries: (prev.section_a_entries || []).map(e => e.id === entry.id ? updatedEntry : e)
                        } : null)
                      }}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor={`reflection-${entry.id}`}>Reflection</Label>
                  <Textarea
                    id={`reflection-${entry.id}`}
                    value={entry.reflections_on_experience || entry.reflection || ''}
                    onChange={(e) => {
                      const updatedEntry = { ...entry, reflections_on_experience: e.target.value }
                      setLogbook(prev => prev ? {
                        ...prev,
                        section_a_entries: (prev.section_a_entries || []).map(e => e.id === entry.id ? updatedEntry : e)
                      } : null)
                    }}
                    rows={4}
                  />
                </div>
                
                <div className="flex justify-end">
                  <Button
                    onClick={() => handleSaveEntry(entry.id, 'Section A')}
                    disabled={saving}
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {(logbook.section_a_entries || []).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No Section A entries found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section B - Professional Development */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-green-600" />
            Section B — Professional Development
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(logbook.section_b_entries || []).map((entry) => (
            <Card key={entry.id} className={`${entry.supervisor_flagged ? 'border-red-200 bg-red-50' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{entry.date || entry.date_of_activity || 'No date'}</h4>
                    <p className="text-sm text-gray-600">
                      {entry.activity_details || entry.activity_type || 'N/A'}
                    </p>
                  </div>
                  {entry.supervisor_flagged && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Flagged
                    </Badge>
                  )}
                </div>
                {entry.supervisor_comment && (
                  <Alert className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <strong>Supervisor Comment:</strong> {entry.supervisor_comment}
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Render nested comments */}
                {renderComments(entry)}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`date-b-${entry.id}`}>Date</Label>
                    <Input
                      id={`date-b-${entry.id}`}
                      type="date"
                      value={entry.date || entry.date_of_activity || ''}
                      onChange={(e) => {
                        const updatedEntry = { ...entry, date_of_activity: e.target.value }
                        setLogbook(prev => prev ? {
                          ...prev,
                          section_b_entries: (prev.section_b_entries || []).map(e => e.id === entry.id ? updatedEntry : e)
                        } : null)
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`duration-b-${entry.id}`}>Duration (minutes)</Label>
                    <Input
                      id={`duration-b-${entry.id}`}
                      type="number"
                      value={entry.duration_minutes || 0}
                      onChange={(e) => {
                        const updatedEntry = { ...entry, duration_minutes: parseInt(e.target.value) || 0 }
                        setLogbook(prev => prev ? {
                          ...prev,
                          section_b_entries: (prev.section_b_entries || []).map(e => e.id === entry.id ? updatedEntry : e)
                        } : null)
                      }}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor={`reflection-b-${entry.id}`}>Description & Reflection</Label>
                  <Textarea
                    id={`reflection-b-${entry.id}`}
                    value={entry.reflection || ''}
                    onChange={(e) => {
                      const updatedEntry = { ...entry, reflection: e.target.value }
                      setLogbook(prev => prev ? {
                        ...prev,
                        section_b_entries: (prev.section_b_entries || []).map(e => e.id === entry.id ? updatedEntry : e)
                      } : null)
                    }}
                    rows={4}
                  />
                </div>
                
                <div className="flex justify-end">
                  <Button
                    onClick={() => handleSaveEntry(entry.id, 'Section B')}
                    disabled={saving}
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {(logbook.section_b_entries || []).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No Section B entries found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section C - Supervision */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-purple-600" />
            Section C — Supervision
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(logbook.section_c_entries || []).map((entry) => (
            <Card key={entry.id} className={`${entry.supervisor_flagged ? 'border-red-200 bg-red-50' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{entry.date || entry.date_of_activity || 'No date'}</h4>
                    <p className="text-sm text-gray-600">
                      {Array.isArray(entry.activity_type) 
                        ? entry.activity_type.join(', ') 
                        : entry.activity_type || 'N/A'
                      }
                    </p>
                  </div>
                  {entry.supervisor_flagged && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Flagged
                    </Badge>
                  )}
                </div>
                {entry.supervisor_comment && (
                  <Alert className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <strong>Supervisor Comment:</strong> {entry.supervisor_comment}
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Render nested comments */}
                {renderComments(entry)}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`date-c-${entry.id}`}>Date</Label>
                    <Input
                      id={`date-c-${entry.id}`}
                      type="date"
                      value={entry.date || entry.date_of_activity || ''}
                      onChange={(e) => {
                        const updatedEntry = { ...entry, date: e.target.value }
                        setLogbook(prev => prev ? {
                          ...prev,
                          section_c_entries: (prev.section_c_entries || []).map(e => e.id === entry.id ? updatedEntry : e)
                        } : null)
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`duration-c-${entry.id}`}>Duration (minutes)</Label>
                    <Input
                      id={`duration-c-${entry.id}`}
                      type="number"
                      value={entry.duration_minutes || 0}
                      onChange={(e) => {
                        const updatedEntry = { ...entry, duration_minutes: parseInt(e.target.value) || 0 }
                        setLogbook(prev => prev ? {
                          ...prev,
                          section_c_entries: (prev.section_c_entries || []).map(e => e.id === entry.id ? updatedEntry : e)
                        } : null)
                      }}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor={`reflection-c-${entry.id}`}>Supervision Focus & Reflection</Label>
                  <Textarea
                    id={`reflection-c-${entry.id}`}
                    value={entry.reflection || ''}
                    onChange={(e) => {
                      const updatedEntry = { ...entry, reflection: e.target.value }
                      setLogbook(prev => prev ? {
                        ...prev,
                        section_c_entries: (prev.section_c_entries || []).map(e => e.id === entry.id ? updatedEntry : e)
                      } : null)
                    }}
                    rows={4}
                  />
                </div>
                
                <div className="flex justify-end">
                  <Button
                    onClick={() => handleSaveEntry(entry.id, 'Section C')}
                    disabled={saving}
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {(logbook.section_c_entries || []).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No Section C entries found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resubmit Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            Resubmit Logbook
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Once you have addressed all supervisor feedback, you can resubmit this logbook for review.
              This will notify your supervisor and reset the review status.
            </AlertDescription>
          </Alert>
          
          <Button
            onClick={handleResubmitLogbook}
            disabled={saving}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {saving ? 'Resubmitting...' : 'Resubmit to Supervisor'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
