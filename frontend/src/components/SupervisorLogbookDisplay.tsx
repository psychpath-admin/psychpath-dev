import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { 
  CheckCircle,
  XCircle,
  Edit,
  RefreshCw,
  MessageSquare,
  Plus,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

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
}

interface SectionBEntry {
  id: number
  date_of_activity: string
  activity_type: string
  is_active_activity?: boolean
  activity_details?: string
  topics_covered?: string
  competencies_covered?: string[]
  duration_minutes: number
  reflection?: string
  locked: boolean
  supervisor_comment?: string
  trainee_response?: string
}

interface SectionCEntry {
  id: number
  date_of_supervision: string
  supervisor_name: string
  supervisor_type: string
  supervision_type: string
  duration_minutes: number
  summary?: string
  locked: boolean
  supervisor_comment?: string
  trainee_response?: string
}

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

interface CommentThread {
  id: number
  entry_id?: string
  entry_section?: string
  thread_type: 'general' | 'entry' | 'section'
  messages: CommentMessage[]
}

interface CommentMessage {
  id: number
  author: string
  author_role: 'supervisor' | 'trainee' | 'admin' | 'system'
  message: string
  created_at: string
  reply_to?: number
}

interface SupervisorLogbookDisplayProps {
  logbook: Logbook
  onClose: () => void
  onApprove: () => void
  onReject: () => void
  onRequestEdits: () => void
  inline?: boolean
}

export default function SupervisorLogbookDisplay({ 
  logbook, 
  onClose, 
  onApprove, 
  onReject, 
  onRequestEdits,
  inline = false
}: SupervisorLogbookDisplayProps) {
  const [sectionAEntries, setSectionAEntries] = useState<SectionAEntry[]>([])
  const [sectionBEntries, setSectionBEntries] = useState<SectionBEntry[]>([])
  const [sectionCEntries, setSectionCEntries] = useState<SectionCEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [commentThreads, setCommentThreads] = useState<CommentThread[]>([])
  const [showCommentInput, setShowCommentInput] = useState<{[key: string]: boolean}>({})
  const [newComments, setNewComments] = useState<{[key: string]: string}>({})
  const [expandedComments, setExpandedComments] = useState<{[key: string]: boolean}>({})
  const [expandedRows, setExpandedRows] = useState<{[key: string]: boolean}>({})

  useEffect(() => {
    fetchAllSections()
    fetchCommentThreads()
  }, [logbook.id])

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
      toast.error('Failed to load logbook entries')
    } finally {
      setLoading(false)
    }
  }

  const fetchCommentThreads = async () => {
    try {
      const response = await apiFetch(`/api/logbook/${logbook.id}/comments/`)
      if (response.ok) {
        const threads = await response.json()
        setCommentThreads(threads)
      }
    } catch (error) {
      console.error('Error fetching comment threads:', error)
    }
  }

  const getEntryComments = (entryId: number, section: string) => {
    return commentThreads.filter(thread => 
      thread.thread_type === 'entry' && 
      thread.entry_id === entryId.toString() && 
      thread.entry_section === section.toUpperCase()
    )
  }

  // const getSectionComments = (section: string) => {
  //   return commentThreads.filter(thread => 
  //     thread.thread_type === 'section' && 
  //     thread.entry_section === section.toUpperCase()
  //   )
  // }

  // const getGeneralComments = () => {
  //   return commentThreads.filter(thread => thread.thread_type === 'general')
  // }

  const toggleCommentsExpanded = (key: string) => {
    setExpandedComments(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const addEntryComment = async (entryId: number, section: string, comment: string) => {
    try {
      const response = await apiFetch(`/api/logbook/${logbook.id}/comments/`, {
        method: 'POST',
        body: JSON.stringify({ 
          thread_type: 'entry',
          entry_id: String(entryId),
          entry_section: section.toUpperCase(),
          message: comment 
        })
      })
      
      if (response.ok) {
        toast.success('Comment added successfully')
        fetchCommentThreads()
        setShowCommentInput(prev => ({ ...prev, [`${entryId}`]: false }))
        setNewComments(prev => ({ ...prev, [`${entryId}`]: '' }))
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
        body: JSON.stringify({ 
          thread_type: 'section',
          entry_section: section.toUpperCase(),
          message: comment 
        })
      })
      
      if (response.ok) {
        toast.success('Section comment added successfully')
        fetchCommentThreads()
        setShowCommentInput(prev => ({ ...prev, [`section-${section}`]: false }))
        setNewComments(prev => ({ ...prev, [`section-${section}`]: '' }))
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add section comment')
      }
    } catch (error) {
      console.error('Error adding section comment:', error)
      toast.error('Failed to add section comment')
    }
  }

  const addGeneralComment = async (comment: string) => {
    try {
      const response = await apiFetch(`/api/logbook/${logbook.id}/comments/`, {
        method: 'POST',
        body: JSON.stringify({ 
          thread_type: 'general',
          message: comment 
        })
      })
      
      if (response.ok) {
        toast.success('General comment added successfully')
        fetchCommentThreads()
        setShowCommentInput(prev => ({ ...prev, 'general': false }))
        setNewComments(prev => ({ ...prev, 'general': '' }))
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add general comment')
      }
    } catch (error) {
      console.error('Error adding general comment:', error)
      toast.error('Failed to add general comment')
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}:${mins.toString().padStart(2, '0')}`
  }

  if (loading) {
    if (inline) {
      return (
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading logbook...</p>
            </div>
          </div>
        </div>
      )
    }
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <VisuallyHidden>
            <DialogTitle>Loading logbook</DialogTitle>
            <DialogDescription>Fetching sections and comments</DialogDescription>
          </VisuallyHidden>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading logbook...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const Report = ({ useDialog = true }: { useDialog?: boolean }) => (
    <>
      {useDialog ? (
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-2">
            AHPRA Weekly Logbook
          </DialogTitle>
          <DialogDescription className="text-center">
            Review logbook for {logbook.trainee_name} - Week of {logbook.week_display}
          </DialogDescription>
        </DialogHeader>
      ) : (
        <div className="mb-4 text-center">
          <h2 className="text-2xl font-bold mb-1">AHPRA Weekly Logbook</h2>
          <p className="text-sm text-gray-600">Review logbook for {logbook.trainee_name} - Week of {logbook.week_display}</p>
        </div>
      )}
    </>
  )

  if (inline) {
    return (
      <div className="max-w-6xl mx-auto">
        <Report useDialog={false} />
        
        {/* AHPRA Header */}
        <div className="bg-blue-600 text-white p-4 rounded-lg mb-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Weekly Logbook</h1>
            <p className="text-sm">Australian Health Practitioner Regulation Agency</p>
            <p className="text-xs mt-1">Provisional Psychologist Registration</p>
          </div>
        </div>

        {/* AHPRA Preamble */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6 text-sm">
          <p className="mb-2">
            <strong>Instructions:</strong> This logbook must be completed weekly and submitted to your principal supervisor 
            for review and approval. All entries must be accurate and reflect actual supervised practice activities.
          </p>
          <p>
            <strong>Professional Development:</strong> Activities that enhance your knowledge, skills, and professional 
            competence in psychology, including training, workshops, conferences, reading, and other learning activities.
          </p>
        </div>

        {/* Trainee Information */}
        <div className="bg-white border-2 border-gray-300 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-sm mb-1">Trainee Name</label>
              <div className="bg-white border border-gray-300 p-2 h-8 flex items-center">
                {logbook.trainee_name}
              </div>
            </div>
            <div>
              <label className="block font-bold text-sm mb-1">Week Period</label>
              <div className="bg-white border border-gray-300 p-2 h-8 flex items-center">
                {logbook.week_display}
              </div>
            </div>
          </div>
        </div>

        {/* Section A Header */}
        <div className="bg-blue-600 text-white p-3 rounded-t-lg mb-0">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">SECTION A: Direct Client Contact & Client Related Activities</h2>
            <div className="text-sm">
              <span>Effective: 1 July 2025</span>
            </div>
          </div>
        </div>

        {/* Section A Content */}
        <div className="border border-gray-300 border-t-0 rounded-b-lg mb-6">
          <div className="bg-gray-50 p-3 border-b border-gray-300">
            <div className="grid grid-cols-8 gap-2 text-xs font-medium text-gray-700">
              <div>Date</div>
              <div>Client ID</div>
              <div>Type</div>
              <div>Duration</div>
              <div>Place</div>
              <div>Issues</div>
              <div>Activities</div>
              <div>Comments</div>
            </div>
          </div>
          <div className="p-3">
            {sectionAEntries.length === 0 ? (
              <div className="text-center py-4 text-gray-500 italic">No Section A entries</div>
            ) : (
              <div className="space-y-2">
                {sectionAEntries.map((entry) => (
                  <div key={entry.id}>
                    <div className="grid grid-cols-8 gap-2 text-xs items-center py-2 border-b border-gray-200 last:border-b-0">
                      <div>{entry.session_date}</div>
                      <div className="truncate">{entry.client_id}</div>
                      <div className="text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          entry.entry_type === 'client_contact' ? 'bg-blue-100 text-blue-800' :
                          entry.entry_type === 'simulated_contact' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {entry.entry_type === 'client_contact' ? 'DCC' :
                           entry.entry_type === 'simulated_contact' ? 'SIM' : 'CRA'}
                        </span>
                      </div>
                      <div className="text-center">{formatDuration(entry.duration_minutes)}</div>
                      <div className="truncate">{entry.place_of_practice}</div>
                      <div className="truncate">{entry.presenting_issues}</div>
                      <div className="truncate">{entry.session_activity_types?.join(', ') || ''}</div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedRows(prev => ({ ...prev, [`A-${entry.id}`]: !prev[`A-${entry.id}`] }))}
                          className="h-6 w-6 p-0"
                          title={expandedRows[`A-${entry.id}`] ? 'Collapse' : 'Expand'}
                        >
                          {expandedRows[`A-${entry.id}`] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCommentInput(prev => ({ ...prev, [`${entry.id}`]: !prev[`${entry.id}`] }))}
                          className="h-6 w-6 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {expandedRows[`A-${entry.id}`] && (
                      <div className="bg-gray-50 border-l-2 border-blue-200 p-3 text-xs space-y-2">
                        {entry.reflections_on_experience && (
                          <div>
                            <span className="font-medium mr-1">Reflection:</span>
                            <span className="text-gray-700">{entry.reflections_on_experience}</span>
                          </div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div><span className="font-medium">Simulated:</span> {entry.simulated ? 'Yes' : 'No'}</div>
                          {entry.parent_dcc_entry && (<div><span className="font-medium">Parent DCC:</span> {entry.parent_dcc_entry}</div>)}
                          <div className="col-span-2"><span className="font-medium">Activities:</span> {entry.session_activity_types?.join(', ') || '—'}</div>
                        </div>
                      </div>
                    )}
                    {showCommentInput[`${entry.id}`] && (
                      <div className="mt-2 ml-4 p-3 bg-yellow-50 rounded border-l-4 border-yellow-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Add Comment for Entry #{entry.id}:</label>
                        <Textarea className="w-full border rounded px-3 py-2 text-sm resize-none" rows={3} placeholder="Add your feedback or comments for this entry..." value={newComments[`${entry.id}`] || ''} onChange={(ev) => setNewComments(prev => ({ ...prev, [`${entry.id}`]: ev.target.value }))} />
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" onClick={() => addEntryComment(entry.id, 'A', newComments[`${entry.id}`] || '')} disabled={!newComments[`${entry.id}`]?.trim()}>Add Comment</Button>
                          <Button variant="outline" size="sm" onClick={() => { setShowCommentInput(prev => ({ ...prev, [`${entry.id}`]: false })); setNewComments(prev => ({ ...prev, [`${entry.id}`]: '' })) }}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Existing entry comments */}
                {sectionAEntries.map((entry) => (
                  <div key={`A-existing-${entry.id}`} className="mt-2">
                    {getEntryComments(entry.id, 'A').length > 0 && (
                      <div className="ml-4">
                        <button onClick={() => toggleCommentsExpanded(`entry-${entry.id}`)} className="flex items-center gap-2 text-xs font-medium text-blue-700 hover:text-blue-800 mb-2">
                          {expandedComments[`entry-${entry.id}`] ? (<ChevronDown className="h-3 w-3" />) : (<ChevronRight className="h-3 w-3" />)}
                          Comments ({getEntryComments(entry.id, 'A').reduce((t, th) => t + th.messages.length, 0)})
                        </button>
                        {expandedComments[`entry-${entry.id}`] && (
                          <div className="ml-2 space-y-2">
                            {getEntryComments(entry.id, 'A').map((thread) => (
                              <div key={thread.id} className="p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                                <div className="space-y-1">
                                  {thread.messages.map((msg: CommentMessage, index: number) => (
                                    <div key={msg.id} className={`text-xs ${index > 0 ? 'ml-3 border-l-2 border-blue-200 pl-2' : ''}`}>
                                      <div className="flex justify-between items-start mb-1">
                                        <span className="font-medium text-blue-800">{msg.author} ({msg.author_role})</span>
                                        <span className="text-xs text-gray-500">{new Date(msg.created_at).toLocaleString()}</span>
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
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Section A Totals */}
          <div className="bg-gray-100 p-3 border-t border-gray-300">
            <div className="grid grid-cols-8 gap-2 text-sm font-medium">
              <div className="col-span-7">Weekly total</div>
              <div className="text-center">{logbook.section_totals.section_a.weekly_hours}</div>
            </div>
            <div className="grid grid-cols-8 gap-2 text-sm font-medium mt-1">
              <div className="col-span-7">Cumulative total</div>
              <div className="text-center">{logbook.section_totals.section_a.cumulative_hours}</div>
            </div>
          </div>

          {/* Section A Comments */}
          <div className="p-3 border-t border-gray-300">
            <Button variant="outline" size="sm" onClick={() => setShowCommentInput(prev => ({ ...prev, 'section-A': !prev['section-A'] }))} className="mb-2">
              <MessageSquare className="h-4 w-4 mr-2" />
              Add Section A Comment
            </Button>
            {showCommentInput['section-A'] && (
              <div className="p-3 bg-green-50 rounded border-l-4 border-green-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Add Section A Comment:</label>
                <Textarea className="w-full border rounded px-3 py-2 text-sm resize-none" rows={3} placeholder="Add general feedback for Section A..." value={newComments['section-A'] || ''} onChange={(ev) => setNewComments(prev => ({ ...prev, 'section-A': ev.target.value }))} />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => addSectionComment('A', newComments['section-A'] || '')} disabled={!newComments['section-A']?.trim()}>Add Comment</Button>
                  <Button variant="outline" size="sm" onClick={() => { setShowCommentInput(prev => ({ ...prev, 'section-A': false })); setNewComments(prev => ({ ...prev, 'section-A': '' })) }}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* The remainder (Sections B & C, signatures, general comments, inline buttons) is identical to the modal content and follows below */}

        {/* Reuse the existing modal body by simply rendering from Section B onward */}
        {/* Section B Header */}
        <div className="bg-blue-600 text-white p-3 rounded-t-lg mt-8 mb-0">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">SECTION B: Professional Development</h2>
            <div className="text-sm"><span>Effective: 1 July 2025</span></div>
          </div>
        </div>
        {/* We rely on the same JSX blocks defined below in the modal branch; to avoid duplication,
            the code remains duplicated here for inline rendering. */}
        {sectionBEntries.length === 0 ? (
          <div className="border border-gray-300 border-t-0 rounded-b-lg mb-6 p-3 text-center text-gray-500 italic">No Section B entries</div>
        ) : (
          <div className="border border-gray-300 border-t-0 rounded-b-lg mb-6">
            <div className="bg-gray-50 p-3 border-b border-gray-300">
              <div className="grid grid-cols-7 gap-2 text-xs font-medium text-gray-700">
                <div>Date</div>
                <div>Activity Type</div>
                <div>Active?</div>
                <div>Details</div>
                <div>Topics</div>
                <div>Competencies</div>
                <div>Duration</div>
              </div>
            </div>
            <div className="p-3">
              <div className="space-y-2">
                {sectionBEntries.map((entry) => (
                  <div key={`B-inline-${entry.id}`}>
                    <div className="grid grid-cols-7 gap-2 text-xs items-center py-2 border-b border-gray-200 last:border-b-0">
                      <div>{entry.date_of_activity}</div>
                      <div className="truncate">{entry.activity_type}</div>
                      <div className="text-center">{entry.is_active_activity ? 'Yes' : 'No'}</div>
                      <div className="truncate">{entry.activity_details || ''}</div>
                      <div className="truncate">{entry.topics_covered || ''}</div>
                      <div className="truncate">{entry.competencies_covered?.join(', ') || ''}</div>
                      <div className="flex items-center justify-center gap-2">
                        <span>{formatDuration(entry.duration_minutes)}</span>
                        <Button variant="ghost" size="sm" onClick={() => setExpandedRows(prev => ({ ...prev, [`B-${entry.id}`]: !prev[`B-${entry.id}`] }))} className="h-6 w-6 p-0" title={expandedRows[`B-${entry.id}`] ? 'Collapse' : 'Expand'}>
                          {expandedRows[`B-${entry.id}`] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowCommentInput(prev => ({ ...prev, [`B-${entry.id}`]: !prev[`B-${entry.id}`] }))} className="h-6 w-6 p-0" title="Add comment"><Plus className="h-3 w-3" /></Button>
                      </div>
                    </div>
                    {expandedRows[`B-${entry.id}`] && (
                      <div className="bg-gray-50 border-l-2 border-blue-200 p-3 text-xs space-y-2">
                        {entry.reflection && (<div><span className="font-medium mr-1">Reflection:</span><span className="text-gray-700">{entry.reflection}</span></div>)}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div className="col-span-2"><span className="font-medium">Details:</span> {entry.activity_details || '—'}</div>
                          <div className="col-span-2"><span className="font-medium">Topics:</span> {entry.topics_covered || '—'}</div>
                          <div className="col-span-2"><span className="font-medium">Competencies:</span> {entry.competencies_covered?.join(', ') || '—'}</div>
                        </div>
                      </div>
                    )}
                    {showCommentInput[`B-${entry.id}`] && (
                      <div className="mt-2 ml-4 p-3 bg-yellow-50 rounded border-l-4 border-yellow-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Add Comment for Entry #{entry.id}:</label>
                        <Textarea className="w-full border rounded px-3 py-2 text-sm resize-none" rows={3} placeholder="Add your feedback or comments for this entry..." value={newComments[`B-${entry.id}`] || ''} onChange={(ev) => setNewComments(prev => ({ ...prev, [`B-${entry.id}`]: ev.target.value }))} />
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" onClick={() => addEntryComment(entry.id, 'B', newComments[`B-${entry.id}`] || '')} disabled={!newComments[`B-${entry.id}`]?.trim()}>Add Comment</Button>
                          <Button variant="outline" size="sm" onClick={() => { setShowCommentInput(prev => ({ ...prev, [`B-${entry.id}`]: false })); setNewComments(prev => ({ ...prev, [`B-${entry.id}`]: '' })) }}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div className="bg-gray-100 p-3 border-t border-gray-300">
                  <div className="grid grid-cols-7 gap-2 text-sm font-medium"><div className="col-span-6">Weekly total</div><div className="text-center">{logbook.section_totals.section_b.weekly_hours}</div></div>
                  <div className="grid grid-cols-7 gap-2 text-sm font-medium mt-1"><div className="col-span-6">Cumulative total</div><div className="text-center">{logbook.section_totals.section_b.cumulative_hours}</div></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section C Header */}
        <div className="bg-blue-600 text-white p-3 rounded-t-lg mb-0">
          <div className="flex justify-between items-center"><h2 className="text-lg font-bold">SECTION C: Supervision</h2><div className="text-sm"><span>Effective: 1 July 2025</span></div></div>
        </div>
        {sectionCEntries.length === 0 ? (
          <div className="border border-gray-300 border-t-0 rounded-b-lg mb-6 p-3 text-center text-gray-500 italic">No Section C entries</div>
        ) : (
          <div className="border border-gray-300 border-t-0 rounded-b-lg mb-6">
            <div className="bg-gray-50 p-3 border-b border-gray-300">
              <div className="grid grid-cols-7 gap-2 text-xs font-medium text-gray-700"><div>Date</div><div>Supervisor</div><div>Type</div><div>Format</div><div>Summary</div><div></div><div>Duration</div></div>
            </div>
            <div className="p-3">
              <div className="space-y-2">
                {sectionCEntries.map((entry) => (
                  <div key={`C-inline-${entry.id}`}>
                    <div className="grid grid-cols-7 gap-2 text-xs items-center py-2 border-b border-gray-200 last:border-b-0">
                      <div>{entry.date_of_supervision}</div>
                      <div className="truncate">{entry.supervisor_name}</div>
                      <div className="truncate">{entry.supervisor_type}</div>
                      <div className="truncate">{entry.supervision_type}</div>
                      <div className="truncate col-span-2">{entry.summary || ''}</div>
                      <div className="flex items-center justify-center gap-2">
                        <span>{formatDuration(entry.duration_minutes)}</span>
                        <Button variant="ghost" size="sm" onClick={() => setExpandedRows(prev => ({ ...prev, [`C-${entry.id}`]: !prev[`C-${entry.id}`] }))} className="h-6 w-6 p-0" title={expandedRows[`C-${entry.id}`] ? 'Collapse' : 'Expand'}>
                          {expandedRows[`C-${entry.id}`] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowCommentInput(prev => ({ ...prev, [`C-${entry.id}`]: !prev[`C-${entry.id}`] }))} className="h-6 w-6 p-0" title="Add comment"><Plus className="h-3 w-3" /></Button>
                      </div>
                    </div>
                    {expandedRows[`C-${entry.id}`] && (
                      <div className="bg-gray-50 border-l-2 border-blue-200 p-3 text-xs space-y-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {/* Placeholder for any additional supervision details if available in model */}
                          <div className="col-span-2"><span className="font-medium">Summary:</span> {entry.summary || '—'}</div>
                        </div>
                      </div>
                    )}
                    {showCommentInput[`C-${entry.id}`] && (
                      <div className="mt-2 ml-4 p-3 bg-yellow-50 rounded border-l-4 border-yellow-200"><label className="block text-sm font-medium text-gray-700 mb-2">Add Comment for Entry #{entry.id}:</label><Textarea className="w-full border rounded px-3 py-2 text-sm resize-none" rows={3} placeholder="Add your feedback or comments for this entry..." value={newComments[`C-${entry.id}`] || ''} onChange={(ev) => setNewComments(prev => ({ ...prev, [`C-${entry.id}`]: ev.target.value }))} /><div className="flex gap-2 mt-2"><Button size="sm" onClick={() => addEntryComment(entry.id, 'C', newComments[`C-${entry.id}`] || '')} disabled={!newComments[`C-${entry.id}`]?.trim()}>Add Comment</Button><Button variant="outline" size="sm" onClick={() => { setShowCommentInput(prev => ({ ...prev, [`C-${entry.id}`]: false })); setNewComments(prev => ({ ...prev, [`C-${entry.id}`]: '' })) }}>Cancel</Button></div></div>
                    )}
                  </div>
                ))}
                <div className="bg-gray-100 p-3 border-t border-gray-300"><div className="grid grid-cols-7 gap-2 text-sm font-medium"><div className="col-span-6">Weekly total</div><div className="text-center">{logbook.section_totals.section_c.weekly_hours}</div></div><div className="grid grid-cols-7 gap-2 text-sm font-medium mt-1"><div className="col-span-6">Cumulative total</div><div className="text-center">{logbook.section_totals.section_c.cumulative_hours}</div></div></div>
              </div>
            </div>
          </div>
        )}

        {/* Signatures */}
        <div className="bg-white border-2 border-gray-300 p-4 rounded-lg mb-6"><h3 className="font-bold text-lg mb-4">Signatures</h3><div className="grid grid-cols-2 gap-6"><div><label className="block text-sm text-gray-600 mb-1">Provisional Psychologist</label><div className="h-12 border border-gray-300 rounded" /><div className="text-xs text-gray-500 mt-1">I declare that the information provided is true and correct.</div></div><div><label className="block text-sm text-gray-600 mb-1">Supervisor</label><div className="h-12 border border-gray-300 rounded" /><div className="text-xs text-gray-500 mt-1">Reviewed and confirmed by supervisor.</div></div></div></div>

        {/* General Comments Section */}
        <div className="bg-white border-2 border-gray-300 p-4 rounded-lg mb-6"><h3 className="font-bold text-lg mb-3">General Comments</h3><Button variant="outline" size="sm" onClick={() => setShowCommentInput(prev => ({ ...prev, 'general': !prev['general'] }))} className="mb-3"><MessageSquare className="h-4 w-4 mr-2" />Add General Comment</Button>{showCommentInput['general'] && (<div className="p-3 bg-blue-50 rounded border-l-4 border-blue-200"><label className="block text-sm font-medium text-gray-700 mb-2">Add General Comment:</label><Textarea className="w-full border rounded px-3 py-2 text-sm resize-none" rows={4} placeholder="Add general feedback for this logbook..." value={newComments['general'] || ''} onChange={(ev) => setNewComments(prev => ({ ...prev, 'general': ev.target.value }))} /><div className="flex gap-2 mt-2"><Button size="sm" onClick={() => addGeneralComment(newComments['general'] || '')} disabled={!newComments['general']?.trim()}>Add Comment</Button><Button variant="outline" size="sm" onClick={() => { setShowCommentInput(prev => ({ ...prev, 'general': false })); setNewComments(prev => ({ ...prev, 'general': '' })) }}>Cancel</Button></div></div>)}</div>

        {/* Inline Action Buttons */}
        <div className="flex gap-3 justify-end py-4">
          <Button variant="outline" onClick={onRequestEdits} className="bg-orange-600 hover:bg-orange-700 text-white"><Edit className="h-4 w-4 mr-2" />Request Edits</Button>
          <Button variant="outline" onClick={onReject} className="bg-red-600 hover:bg-red-700 text-white"><XCircle className="h-4 w-4 mr-2" />Reject</Button>
          <Button onClick={onApprove} className="bg-green-600 hover:bg-green-700 text-white"><CheckCircle className="h-4 w-4 mr-2" />Approve</Button>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <Report />

        {/* AHPRA Header */}
        <div className="bg-blue-600 text-white p-4 rounded-lg mb-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Weekly Logbook</h1>
            <p className="text-sm">Australian Health Practitioner Regulation Agency</p>
            <p className="text-xs mt-1">Provisional Psychologist Registration</p>
          </div>
        </div>

        {/* AHPRA Preamble */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6 text-sm">
          <p className="mb-2">
            <strong>Instructions:</strong> This logbook must be completed weekly and submitted to your principal supervisor 
            for review and approval. All entries must be accurate and reflect actual supervised practice activities.
          </p>
          <p>
            <strong>Professional Development:</strong> Activities that enhance your knowledge, skills, and professional 
            competence in psychology, including training, workshops, conferences, reading, and other learning activities.
          </p>
        </div>

        {/* Trainee Information */}
        <div className="bg-white border-2 border-gray-300 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-sm mb-1">Trainee Name</label>
              <div className="bg-white border border-gray-300 p-2 h-8 flex items-center">
                {logbook.trainee_name}
              </div>
            </div>
            <div>
              <label className="block font-bold text-sm mb-1">Week Period</label>
              <div className="bg-white border border-gray-300 p-2 h-8 flex items-center">
                {logbook.week_display}
              </div>
            </div>
          </div>
        </div>

        {/* Section A Header */}
        <div className="bg-blue-600 text-white p-3 rounded-t-lg mb-0">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">SECTION A: Direct Client Contact & Client Related Activities</h2>
            <div className="text-sm">
              <span>Effective: 1 July 2025</span>
            </div>
          </div>
        </div>

        {/* Section A Content */}
        <div className="border border-gray-300 border-t-0 rounded-b-lg mb-6">
          <div className="bg-gray-50 p-3 border-b border-gray-300">
            <div className="grid grid-cols-8 gap-2 text-xs font-medium text-gray-700">
              <div>Date</div>
              <div>Client ID</div>
              <div>Type</div>
              <div>Duration</div>
              <div>Place</div>
              <div>Issues</div>
              <div>Activities</div>
              <div>Comments</div>
            </div>
          </div>
          <div className="p-3">
            {sectionAEntries.length === 0 ? (
              <div className="text-center py-4 text-gray-500 italic">No Section A entries</div>
            ) : (
              <div className="space-y-2">
                {sectionAEntries.map((entry) => (
                  <div key={entry.id} className="grid grid-cols-8 gap-2 text-xs items-center py-2 border-b border-gray-200 last:border-b-0">
                    <div>{entry.session_date}</div>
                    <div>{entry.client_id}</div>
                    <div className="text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        entry.entry_type === 'client_contact' ? 'bg-blue-100 text-blue-800' :
                        entry.entry_type === 'simulated_contact' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {entry.entry_type === 'client_contact' ? 'DCC' :
                         entry.entry_type === 'simulated_contact' ? 'SIM' : 'CRA'}
                      </span>
                    </div>
                    <div className="text-center">{formatDuration(entry.duration_minutes)}</div>
                    <div className="truncate">{entry.place_of_practice}</div>
                    <div className="truncate">{entry.presenting_issues}</div>
                    <div className="truncate">{entry.session_activity_types?.join(', ') || ''}</div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCommentInput(prev => ({ 
                          ...prev, 
                          [`${entry.id}`]: !prev[`${entry.id}`] 
                        }))}
                        className="h-6 w-6 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {/* Entry Comments */}
                {sectionAEntries.map((entry) => (
                  <div key={`comments-${entry.id}`} className="mt-2">
                    {getEntryComments(entry.id, 'A').length > 0 && (
                      <div className="ml-4">
                        <button
                          onClick={() => toggleCommentsExpanded(`entry-${entry.id}`)}
                          className="flex items-center gap-2 text-xs font-medium text-blue-700 hover:text-blue-800 mb-2"
                        >
                          {expandedComments[`entry-${entry.id}`] ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                          Comments ({getEntryComments(entry.id, 'A').reduce((total, thread) => total + thread.messages.length, 0)})
                        </button>
                        
                        {expandedComments[`entry-${entry.id}`] && (
                          <div className="ml-2 space-y-2">
                            {getEntryComments(entry.id, 'A').map((thread) => (
                              <div key={thread.id} className="p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                                <div className="space-y-1">
                                  {thread.messages.map((msg: CommentMessage, index: number) => (
                                    <div key={msg.id} className={`text-xs ${index > 0 ? 'ml-3 border-l-2 border-blue-200 pl-2' : ''}`}>
                                      <div className="flex justify-between items-start mb-1">
                                        <span className="font-medium text-blue-800">
                                          {msg.author} ({msg.author_role})
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

                    {/* Entry Comment Input */}
                    {showCommentInput[`${entry.id}`] && (
                      <div className="mt-2 ml-4 p-3 bg-yellow-50 rounded border-l-4 border-yellow-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Add Comment for Entry #{entry.id}:
                        </label>
                        <Textarea
                          className="w-full border rounded px-3 py-2 text-sm resize-none"
                          rows={3}
                          placeholder="Add your feedback or comments for this entry..."
                          value={newComments[`${entry.id}`] || ''}
                          onChange={(ev) => setNewComments(prev => ({ 
                            ...prev, 
                            [`${entry.id}`]: ev.target.value 
                          }))}
                        />
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => addEntryComment(entry.id, 'A', newComments[`${entry.id}`] || '')}
                            disabled={!newComments[`${entry.id}`]?.trim()}
                          >
                            Add Comment
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowCommentInput(prev => ({ ...prev, [`${entry.id}`]: false }))
                              setNewComments(prev => ({ ...prev, [`${entry.id}`]: '' }))
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
            )}
          </div>
          
          {/* Section A Totals */}
          <div className="bg-gray-100 p-3 border-t border-gray-300">
            <div className="grid grid-cols-8 gap-2 text-sm font-medium">
              <div className="col-span-7">Weekly total</div>
              <div className="text-center">{logbook.section_totals.section_a.weekly_hours}</div>
            </div>
            <div className="grid grid-cols-8 gap-2 text-sm font-medium mt-1">
              <div className="col-span-7">Cumulative total</div>
              <div className="text-center">{logbook.section_totals.section_a.cumulative_hours}</div>
            </div>
          </div>

          {/* Section A Comments */}
          <div className="p-3 border-t border-gray-300">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCommentInput(prev => ({ 
                ...prev, 
                'section-A': !prev['section-A'] 
              }))}
              className="mb-2"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Add Section A Comment
            </Button>
            
            {showCommentInput['section-A'] && (
              <div className="p-3 bg-green-50 rounded border-l-4 border-green-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Section A Comment:
                </label>
                <Textarea
                  className="w-full border rounded px-3 py-2 text-sm resize-none"
                  rows={3}
                  placeholder="Add general feedback for Section A..."
                  value={newComments['section-A'] || ''}
                  onChange={(ev) => setNewComments(prev => ({ 
                    ...prev, 
                    'section-A': ev.target.value 
                  }))}
                />
                <div className="flex gap-2 mt-2">
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
          </div>
        </div>

        {/* Section B Header */}
        <div className="bg-blue-600 text-white p-3 rounded-t-lg mt-8 mb-0">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">SECTION B: Professional Development</h2>
            <div className="text-sm"><span>Effective: 1 July 2025</span></div>
          </div>
        </div>
        <div className="border border-gray-300 border-t-0 rounded-b-lg mb-6">
          <div className="bg-gray-50 p-3 border-b border-gray-300">
            <div className="grid grid-cols-7 gap-2 text-xs font-medium text-gray-700">
              <div>Date</div>
              <div>Activity Type</div>
              <div>Active?</div>
              <div>Details</div>
              <div>Topics</div>
              <div>Competencies</div>
              <div>Duration</div>
            </div>
          </div>
          <div className="p-3">
            {sectionBEntries.length === 0 ? (
              <div className="text-center py-4 text-gray-500 italic">No Section B entries</div>
            ) : (
              <div className="space-y-2">
                {sectionBEntries.map((entry) => (
                  <div key={`B-${entry.id}`} className="grid grid-cols-7 gap-2 text-xs items-center py-2 border-b border-gray-200 last:border-b-0">
                    <div>{entry.date_of_activity}</div>
                    <div className="truncate">{entry.activity_type}</div>
                    <div className="text-center">{entry.is_active_activity ? 'Yes' : 'No'}</div>
                    <div className="truncate">{entry.activity_details || ''}</div>
                    <div className="truncate">{entry.topics_covered || ''}</div>
                    <div className="truncate">{entry.competencies_covered?.join(', ') || ''}</div>
                    <div className="flex items-center justify-center gap-2">
                      <span>{formatDuration(entry.duration_minutes)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCommentInput(prev => ({ ...prev, [`B-${entry.id}`]: !prev[`B-${entry.id}`] }))}
                        className="h-6 w-6 p-0"
                        title="Add comment"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {/* Entry Comments - Section B */}
                {sectionBEntries.map((entry) => (
                  <div key={`B-comments-${entry.id}`} className="mt-2">
                    {getEntryComments(entry.id, 'B').length > 0 && (
                      <div className="ml-4">
                        <button
                          onClick={() => toggleCommentsExpanded(`entry-B-${entry.id}`)}
                          className="flex items-center gap-2 text-xs font-medium text-blue-700 hover:text-blue-800 mb-2"
                        >
                          {expandedComments[`entry-B-${entry.id}`] ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                          Comments ({getEntryComments(entry.id, 'B').reduce((total, thread) => total + thread.messages.length, 0)})
                        </button>
                        {expandedComments[`entry-B-${entry.id}`] && (
                          <div className="ml-2 space-y-2">
                            {getEntryComments(entry.id, 'B').map((thread) => (
                              <div key={thread.id} className="p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                                <div className="space-y-1">
                                  {thread.messages.map((msg: CommentMessage, index: number) => (
                                    <div key={msg.id} className={`text-xs ${index > 0 ? 'ml-3 border-l-2 border-blue-200 pl-2' : ''}`}>
                                      <div className="flex justify-between items-start mb-1">
                                        <span className="font-medium text-blue-800">{msg.author} ({msg.author_role})</span>
                                        <span className="text-xs text-gray-500">{new Date(msg.created_at).toLocaleString()}</span>
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

                    {/* Entry Comment Input - B */}
                    {showCommentInput[`B-${entry.id}`] && (
                      <div className="mt-2 ml-4 p-3 bg-yellow-50 rounded border-l-4 border-yellow-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Add Comment for Entry #{entry.id}:</label>
                        <Textarea
                          className="w-full border rounded px-3 py-2 text-sm resize-none"
                          rows={3}
                          placeholder="Add your feedback or comments for this entry..."
                          value={newComments[`B-${entry.id}`] || ''}
                          onChange={(ev) => setNewComments(prev => ({ ...prev, [`B-${entry.id}`]: ev.target.value }))}
                        />
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" onClick={() => addEntryComment(entry.id, 'B', newComments[`B-${entry.id}`] || '')} disabled={!newComments[`B-${entry.id}`]?.trim()}>
                            Add Comment
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setShowCommentInput(prev => ({ ...prev, [`B-${entry.id}`]: false })); setNewComments(prev => ({ ...prev, [`B-${entry.id}`]: '' })) }}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {/* Totals */}
                <div className="bg-gray-100 p-3 border-t border-gray-300">
                  <div className="grid grid-cols-7 gap-2 text-sm font-medium">
                    <div className="col-span-6">Weekly total</div>
                    <div className="text-center">{logbook.section_totals.section_b.weekly_hours}</div>
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-sm font-medium mt-1">
                    <div className="col-span-6">Cumulative total</div>
                    <div className="text-center">{logbook.section_totals.section_b.cumulative_hours}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section B Comments (Section-level) */}
        <div className="p-3 border-t border-gray-300">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCommentInput(prev => ({ ...prev, 'section-B': !prev['section-B'] }))}
            className="mb-2"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Add Section B Comment
          </Button>
          {showCommentInput['section-B'] && (
            <div className="p-3 bg-green-50 rounded border-l-4 border-green-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">Add Section B Comment:</label>
              <Textarea
                className="w-full border rounded px-3 py-2 text-sm resize-none"
                rows={3}
                placeholder="Add general feedback for Section B..."
                value={newComments['section-B'] || ''}
                onChange={(ev) => setNewComments(prev => ({ ...prev, 'section-B': ev.target.value }))}
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={() => addSectionComment('B', newComments['section-B'] || '')} disabled={!newComments['section-B']?.trim()}>Add Comment</Button>
                <Button variant="outline" size="sm" onClick={() => { setShowCommentInput(prev => ({ ...prev, 'section-B': false })); setNewComments(prev => ({ ...prev, 'section-B': '' })) }}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        {/* Section C Header */}
        <div className="bg-blue-600 text-white p-3 rounded-t-lg mb-0">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">SECTION C: Supervision</h2>
            <div className="text-sm"><span>Effective: 1 July 2025</span></div>
          </div>
        </div>
        <div className="border border-gray-300 border-t-0 rounded-b-lg mb-6">
          <div className="bg-gray-50 p-3 border-b border-gray-300">
            <div className="grid grid-cols-7 gap-2 text-xs font-medium text-gray-700">
              <div>Date</div>
              <div>Supervisor</div>
              <div>Type</div>
              <div>Format</div>
              <div>Summary</div>
              <div></div>
              <div>Duration</div>
            </div>
          </div>
          <div className="p-3">
            {sectionCEntries.length === 0 ? (
              <div className="text-center py-4 text-gray-500 italic">No Section C entries</div>
            ) : (
              <div className="space-y-2">
                {sectionCEntries.map((entry) => (
                  <div key={`C-${entry.id}`} className="grid grid-cols-7 gap-2 text-xs items-center py-2 border-b border-gray-200 last:border-b-0">
                    <div>{entry.date_of_supervision}</div>
                    <div className="truncate">{entry.supervisor_name}</div>
                    <div className="truncate">{entry.supervisor_type}</div>
                    <div className="truncate">{entry.supervision_type}</div>
                    <div className="truncate col-span-2">{entry.summary || ''}</div>
                    <div className="flex items-center justify-center gap-2">
                      <span>{formatDuration(entry.duration_minutes)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCommentInput(prev => ({ ...prev, [`C-${entry.id}`]: !prev[`C-${entry.id}`] }))}
                        className="h-6 w-6 p-0"
                        title="Add comment"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {/* Entry Comments - Section C */}
                {sectionCEntries.map((entry) => (
                  <div key={`C-comments-${entry.id}`} className="mt-2">
                    {getEntryComments(entry.id, 'C').length > 0 && (
                      <div className="ml-4">
                        <button
                          onClick={() => toggleCommentsExpanded(`entry-C-${entry.id}`)}
                          className="flex items-center gap-2 text-xs font-medium text-blue-700 hover:text-blue-800 mb-2"
                        >
                          {expandedComments[`entry-C-${entry.id}`] ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                          Comments ({getEntryComments(entry.id, 'C').reduce((total, thread) => total + thread.messages.length, 0)})
                        </button>
                        {expandedComments[`entry-C-${entry.id}`] && (
                          <div className="ml-2 space-y-2">
                            {getEntryComments(entry.id, 'C').map((thread) => (
                              <div key={thread.id} className="p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                                <div className="space-y-1">
                                  {thread.messages.map((msg: CommentMessage, index: number) => (
                                    <div key={msg.id} className={`text-xs ${index > 0 ? 'ml-3 border-l-2 border-blue-200 pl-2' : ''}`}>
                                      <div className="flex justify-between items-start mb-1">
                                        <span className="font-medium text-blue-800">{msg.author} ({msg.author_role})</span>
                                        <span className="text-xs text-gray-500">{new Date(msg.created_at).toLocaleString()}</span>
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

                    {/* Entry Comment Input - C */}
                    {showCommentInput[`C-${entry.id}`] && (
                      <div className="mt-2 ml-4 p-3 bg-yellow-50 rounded border-l-4 border-yellow-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Add Comment for Entry #{entry.id}:</label>
                        <Textarea
                          className="w-full border rounded px-3 py-2 text-sm resize-none"
                          rows={3}
                          placeholder="Add your feedback or comments for this entry..."
                          value={newComments[`C-${entry.id}`] || ''}
                          onChange={(ev) => setNewComments(prev => ({ ...prev, [`C-${entry.id}`]: ev.target.value }))}
                        />
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" onClick={() => addEntryComment(entry.id, 'C', newComments[`C-${entry.id}`] || '')} disabled={!newComments[`C-${entry.id}`]?.trim()}>
                            Add Comment
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setShowCommentInput(prev => ({ ...prev, [`C-${entry.id}`]: false })); setNewComments(prev => ({ ...prev, [`C-${entry.id}`]: '' })) }}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {/* Totals */}
                <div className="bg-gray-100 p-3 border-t border-gray-300">
                  <div className="grid grid-cols-7 gap-2 text-sm font-medium">
                    <div className="col-span-6">Weekly total</div>
                    <div className="text-center">{logbook.section_totals.section_c.weekly_hours}</div>
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-sm font-medium mt-1">
                    <div className="col-span-6">Cumulative total</div>
                    <div className="text-center">{logbook.section_totals.section_c.cumulative_hours}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section C Comments (Section-level) */}
        <div className="p-3 border-t border-gray-300">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCommentInput(prev => ({ ...prev, 'section-C': !prev['section-C'] }))}
            className="mb-2"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Add Section C Comment
          </Button>
          {showCommentInput['section-C'] && (
            <div className="p-3 bg-green-50 rounded border-l-4 border-green-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">Add Section C Comment:</label>
              <Textarea
                className="w-full border rounded px-3 py-2 text-sm resize-none"
                rows={3}
                placeholder="Add general feedback for Section C..."
                value={newComments['section-C'] || ''}
                onChange={(ev) => setNewComments(prev => ({ ...prev, 'section-C': ev.target.value }))}
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={() => addSectionComment('C', newComments['section-C'] || '')} disabled={!newComments['section-C']?.trim()}>Add Comment</Button>
                <Button variant="outline" size="sm" onClick={() => { setShowCommentInput(prev => ({ ...prev, 'section-C': false })); setNewComments(prev => ({ ...prev, 'section-C': '' })) }}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        {/* Signatures */}
        <div className="bg-white border-2 border-gray-300 p-4 rounded-lg mb-6">
          <h3 className="font-bold text-lg mb-4">Signatures</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Provisional Psychologist</label>
              <div className="h-12 border border-gray-300 rounded" />
              <div className="text-xs text-gray-500 mt-1">I declare that the information provided is true and correct.</div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Supervisor</label>
              <div className="h-12 border border-gray-300 rounded" />
              <div className="text-xs text-gray-500 mt-1">Reviewed and confirmed by supervisor.</div>
            </div>
          </div>
        </div>

        {/* General Comments Section */}
        <div className="bg-white border-2 border-gray-300 p-4 rounded-lg mb-6">
          <h3 className="font-bold text-lg mb-3">General Comments</h3>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCommentInput(prev => ({ 
              ...prev, 
              'general': !prev['general'] 
            }))}
            className="mb-3"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Add General Comment
          </Button>
          
          {showCommentInput['general'] && (
            <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add General Comment:
              </label>
              <Textarea
                className="w-full border rounded px-3 py-2 text-sm resize-none"
                rows={4}
                placeholder="Add general feedback for this logbook..."
                value={newComments['general'] || ''}
                onChange={(ev) => setNewComments(prev => ({ 
                  ...prev, 
                  'general': ev.target.value 
                }))}
              />
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  onClick={() => addGeneralComment(newComments['general'] || '')}
                  disabled={!newComments['general']?.trim()}
                >
                  Add Comment
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCommentInput(prev => ({ ...prev, 'general': false }))
                    setNewComments(prev => ({ ...prev, 'general': '' }))
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {inline ? (
          <div className="flex gap-3 justify-end py-4">
            <Button variant="outline" onClick={onRequestEdits} className="bg-orange-600 hover:bg-orange-700 text-white">
              <Edit className="h-4 w-4 mr-2" />
              Request Edits
            </Button>
            <Button variant="outline" onClick={onReject} className="bg-red-600 hover:bg-red-700 text-white">
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button onClick={onApprove} className="bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </div>
        ) : (
          <DialogFooter className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button variant="outline" onClick={onRequestEdits} className="bg-orange-600 hover:bg-orange-700 text-white">
              <Edit className="h-4 w-4 mr-2" />
              Request Edits
            </Button>
            <Button variant="outline" onClick={onReject} className="bg-red-600 hover:bg-red-700 text-white">
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button onClick={onApprove} className="bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
