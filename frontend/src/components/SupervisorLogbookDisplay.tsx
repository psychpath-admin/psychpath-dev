import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  CheckCircle,
  XCircle,
  Edit,
  RefreshCw,
  MessageSquare,
  Plus,
  ChevronDown,
  ChevronRight,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'

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
  activity_title?: string
  activity_type?: string
  active_pd?: string
  is_active_activity?: boolean
  activity_details?: string
  presenter?: string
  core_competency_areas?: string
  specific_topics?: string
  topics_covered?: string
  notes?: string
  summary?: string
  competencies_covered?: string[]
  duration_minutes: number
  supervisor_initials?: string
  reflection?: string
  locked: boolean
}

interface SectionCEntry {
  id: number
  date_of_supervision: string
  supervisor_name: string
  principal_or_secondary?: string
  supervisor_type?: string
  individual_group_other?: string
  supervision_type?: string
  duration_minutes: number
  summary?: string
  supervisor_initials?: string
  locked: boolean
}

interface Logbook {
  id: number
  trainee_name: string
  week_start_date: string
  week_end_date: string
  week_display: string
  status: 'draft' | 'submitted' | 'returned_for_edits' | 'approved' | 'rejected' | 'locked'
  supervisor_name?: string
  reviewed_by_name?: string
  submitted_at: string
  reviewed_at?: string
  supervisor_comments?: string
  section_totals: {
    section_a: { 
      weekly_hours: number | string
      cumulative_hours: number | string
      dcc?: { weekly_hours: number | string; cumulative_hours: number | string }
      cra?: { weekly_hours: number | string; cumulative_hours: number | string }
    }
    section_b: { weekly_hours: number | string; cumulative_hours: number | string }
    section_c: { weekly_hours: number | string; cumulative_hours: number | string }
    total: { weekly_hours: number | string; cumulative_hours: number | string }
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
  onClose?: () => void
  onApprove: () => void
  onReject: () => void
  onRequestEdits: () => void
  inline?: boolean
}

export default function SupervisorLogbookDisplay({ 
  logbook, 
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

  const getSectionComments = (section: string) => {
    return commentThreads.filter(thread => 
      thread.thread_type === 'general' && 
      thread.entry_id === `section_${section.toUpperCase()}` &&
      thread.entry_section === section.toUpperCase()
    )
  }

  const getGeneralComments = () => {
    return commentThreads.filter(thread => 
      thread.thread_type === 'general' && 
      !thread.entry_id?.startsWith('section_') &&
      !thread.entry_section
    )
  }

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
        setShowCommentInput(prev => ({ ...prev, [`${section}-${entryId}`]: false }))
        setNewComments(prev => ({ ...prev, [`${section}-${entryId}`]: '' }))
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

  // Separate entries into DCC and CRA
  const dccEntries = sectionAEntries.filter(entry => 
    entry.entry_type === 'client_contact' || entry.entry_type === 'simulated_contact'
  )
  const craEntries = sectionAEntries.filter(entry => 
    entry.entry_type === 'cra' || entry.entry_type === 'independent_activity'
  )

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading logbook...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={inline ? "max-w-7xl mx-auto" : "max-w-7xl mx-auto p-6"}>
      {/* AHPRA HEADER */}
      <div className="text-center bg-blue-50 border-2 border-blue-200 p-6 rounded-lg mb-6">
        <h1 className="text-2xl font-bold text-blue-900 mb-2">Logbook: Record of professional practice</h1>
        <h2 className="text-xl font-semibold text-blue-800 mb-3">Psychology Board Ahpra</h2>
        <div className="text-sm text-blue-700 font-medium">
          <strong>LBPP-76</strong> | <strong>5+1 provisional psychologists</strong> | <strong>Psychology</strong>
        </div>
      </div>

      {/* AHPRA PREAMBLE */}
      <div className="bg-gray-50 border border-gray-300 p-4 rounded-lg text-sm leading-relaxed mb-6">
        <p className="font-semibold mb-2">
          Provisional psychologists must maintain a record of professional practice throughout their internship. This record needs to be regularly sighted and signed by the supervisor (usually weekly) and specifically when reviewing the supervision plan or preparing a progress report/change of principal supervisor form.
        </p>
        <p>
          The Psychology Board of Australia (the Board) can request this record at any time, requiring submission within 14 days if requested. It explicitly states that this record does not need to be attached to progress reports or final assessment reports.
        </p>
      </div>

      {/* INFORMATION AND DEFINITIONS */}
      <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-lg text-sm mb-6">
        <h3 className="font-bold text-yellow-900 mb-3">Information and definitions</h3>
        <p className="mb-2">
          <strong>Client contact:</strong> Defined as performing specific tasks like psychological assessment, diagnosis, intervention, prevention, treatment, consultation, and providing advice/strategies directly with clients under supervisor guidance.
        </p>
        <p>
          <strong>Client-related activity:</strong> Defined as activities necessary to provide high-standard client service and support the provisional psychologist's achievement of core competencies. This includes supervisor guidance on relevant activities, considering individual development needs and work role context, and encompasses reading, researching for problem formulation/diagnosis, case consultation with colleagues, and formal/informal reporting.
        </p>
      </div>

      {/* PROVISIONAL PSYCHOLOGIST DETAILS */}
      <Card className="border-2 border-orange-300 bg-orange-50 mb-6">
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

      {/* SECTION A: Weekly record of professional practice */}
      <div className="mt-6">
        {/* AHPRA Section A Header */}
        <div className="bg-blue-600 text-white p-4 font-bold text-lg text-center rounded-t-lg">
          SECTION A: Weekly record of professional practice
        </div>
      </div>

      {/* Section A Content Card */}
      <Card className="border-2 border-blue-300 rounded-t-none">
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
                        <th className="border border-blue-300 p-2 text-left font-semibold text-blue-900 text-xs w-[15%]">
                          Session
                        </th>
                        <th className="border border-blue-300 p-2 text-left font-semibold text-blue-900 text-xs w-[15%]">
                          Psychological practice: Client contact
                        </th>
                        <th className="border border-blue-300 p-2 text-center font-semibold text-blue-900 text-xs w-[8%]">
                          Duration
                        </th>
                        <th className="border border-blue-300 p-2 text-left font-semibold text-blue-900 text-xs w-[15%]">
                          Psychological practice: Client-related activity
                        </th>
                        <th className="border border-blue-300 p-2 text-center font-semibold text-blue-900 text-xs w-[8%]">
                          Duration
                        </th>
                        <th className="border border-blue-300 p-2 text-left font-semibold text-blue-900 text-xs w-[30%]">
                          Reflections on experience
                        </th>
                        <th className="border border-blue-300 p-2 text-center font-semibold text-blue-900 text-xs w-[9%]">
                          Actions
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
                        <td className="border border-gray-300 p-2 text-xs text-gray-600 italic text-center">
                          
                        </td>
                      </tr>
                    </thead>
                    
                    <tbody>
                      {/* Render DCC entries with their related CRA entries */}
                      {dccEntries.map((dccEntry) => {
                        const relatedCraEntries = craEntries.filter(cra => cra.parent_dcc_entry === dccEntry.id)
                        const maxRows = Math.max(1, relatedCraEntries.length)
                        
                        return (
                          <React.Fragment key={dccEntry.id}>
                            {Array.from({ length: maxRows }).map((_, rowIndex) => (
                              <tr key={`${dccEntry.id}-${rowIndex}`} className="border-b border-gray-200 hover:bg-gray-50">
                                {/* Session column - only show on first row */}
                                <td className="border border-gray-300 p-2 align-top text-xs">
                                  {rowIndex === 0 && (
                                    <div className="space-y-1">
                                      <div className="font-medium">
                                        <strong>Place:</strong> {dccEntry.place_of_practice || 'Not specified'}
                                      </div>
                                      <div>
                                        <strong>Client ID:</strong> {dccEntry.client_id || 'Not specified'}
                                      </div>
                                      <div>
                                        <strong>Issues:</strong> {dccEntry.presenting_issues || 'Not specified'}
                                      </div>
                                    </div>
                                  )}
                                </td>
                                
                                {/* Client contact column - only show on first row */}
                                <td className="border border-gray-300 p-2 align-top text-xs">
                                  {rowIndex === 0 && (
                                    <div className="space-y-1">
                                      <div className="font-medium">
                                        <strong>Date:</strong> {formatDate(dccEntry.session_date)}
                                      </div>
                                      <div>
                                        <strong>Activity:</strong> {dccEntry.session_activity_types?.join(', ') || 'Not specified'}
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
                                <td className="border border-gray-300 p-2 text-center align-top text-xs">
                                  {rowIndex === 0 && (
                                    <div className="font-medium">
                                      {formatDuration(dccEntry.duration_minutes)}
                                    </div>
                                  )}
                                </td>
                                
                                {/* Client-related activity column */}
                                <td className="border border-gray-300 p-2 align-top text-xs">
                                  {relatedCraEntries[rowIndex] ? (
                                    <div className="space-y-1">
                                      <div className="font-medium">
                                        <strong>Date:</strong> {formatDate(relatedCraEntries[rowIndex].session_date)}
                                      </div>
                                      <div>
                                        <strong>Activity:</strong> {relatedCraEntries[rowIndex].session_activity_types?.join(', ') || 'Not specified'}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-gray-400">No related activity</div>
                                  )}
                                </td>
                                
                                {/* Client-related activity duration */}
                                <td className="border border-gray-300 p-2 text-center align-top text-xs">
                                  {relatedCraEntries[rowIndex] && (
                                    <div className="font-medium">
                                      {formatDuration(relatedCraEntries[rowIndex].duration_minutes)}
                                    </div>
                                  )}
                                </td>
                                
                                {/* Reflections column - only show on first row */}
                                <td className="border border-gray-300 p-2 align-top text-xs">
                                  {rowIndex === 0 && (
                                    <div className="whitespace-pre-wrap">
                                      {dccEntry.reflections_on_experience || 'No reflections provided'}
                                    </div>
                                  )}
                                </td>

                                {/* Actions column - only show on first row */}
                                <td className="border border-gray-300 p-2 text-center align-top">
                                  {rowIndex === 0 && (
                                    <Button
                                      variant="ghost"
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
                                  )}
                                </td>
                              </tr>
                            ))}

                            {/* Comment input for this DCC entry - appears right after its rows */}
                            {showCommentInput[`A-${dccEntry.id}`] && (
                              <tr key={`comment-${dccEntry.id}`}>
                                <td colSpan={7} className="border border-gray-300 p-3 bg-yellow-50">
                                  <div className="ml-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Add Comment for Entry #{dccEntry.id}:
                                    </label>
                                    <Textarea
                                      className="w-full border rounded px-3 py-2 text-sm resize-none mb-2"
                                      rows={3}
                                      placeholder="Add your feedback or comments for this entry..."
                                      value={newComments[`A-${dccEntry.id}`] || ''}
                                      onChange={(ev) => setNewComments(prev => ({ 
                                        ...prev, 
                                        [`A-${dccEntry.id}`]: ev.target.value 
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
                                </td>
                              </tr>
                            )}

                            {/* Existing comments for this DCC entry */}
                            {getEntryComments(dccEntry.id, 'A').length > 0 && (
                              <tr key={`existing-comments-${dccEntry.id}`}>
                                <td colSpan={7} className="border border-gray-300 p-3 bg-blue-50">
                                  <div className="ml-4">
                                    <button
                                      onClick={() => toggleCommentsExpanded(`entry-A-${dccEntry.id}`)}
                                      className="flex items-center gap-2 text-xs font-medium text-blue-700 hover:text-blue-800 mb-2"
                                    >
                                      {expandedComments[`entry-A-${dccEntry.id}`] ? (
                                        <ChevronDown className="h-3 w-3" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3" />
                                      )}
                                      Comments ({getEntryComments(dccEntry.id, 'A').reduce((total, thread) => total + thread.messages.length, 0)})
                                    </button>
                                    
                                    {expandedComments[`entry-A-${dccEntry.id}`] && (
                                      <div className="ml-2 space-y-2">
                                        {getEntryComments(dccEntry.id, 'A').map((thread) => (
                                          <div key={thread.id} className="p-2 bg-white rounded border border-blue-200">
                                            <div className="space-y-1">
                                              {thread.messages.map((msg: CommentMessage) => (
                                                <div key={msg.id} className="text-xs">
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
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                      
                      {/* Show standalone CRA entries */}
                      {craEntries.filter(cra => !cra.parent_dcc_entry).map((craEntry) => (
                        <React.Fragment key={`standalone-cra-${craEntry.id}`}>
                          <tr className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="border border-gray-300 p-2 align-top text-xs">
                              <div className="space-y-1">
                                <div className="font-medium">
                                  <strong>Place:</strong> {craEntry.place_of_practice || 'Not specified'}
                                </div>
                                <div>
                                  <strong>Client ID:</strong> {craEntry.client_id || 'Not specified'}
                                </div>
                                <div>
                                  <strong>Issues:</strong> {craEntry.presenting_issues || 'Not specified'}
                                </div>
                              </div>
                            </td>
                            
                            <td className="border border-gray-300 p-2 align-top text-xs">
                              <div className="text-gray-400">No client contact</div>
                            </td>
                            
                            <td className="border border-gray-300 p-2 text-center align-top text-xs">
                              <div className="text-gray-400">-</div>
                            </td>
                            
                            <td className="border border-gray-300 p-2 align-top text-xs">
                              <div className="space-y-1">
                                <div className="font-medium">
                                  <strong>Date:</strong> {formatDate(craEntry.session_date)}
                                </div>
                                <div>
                                  <strong>Activity:</strong> {craEntry.session_activity_types?.join(', ') || 'Not specified'}
                                </div>
                              </div>
                            </td>
                            
                            <td className="border border-gray-300 p-2 text-center align-top text-xs">
                              <div className="font-medium">
                                {formatDuration(craEntry.duration_minutes)}
                              </div>
                            </td>
                            
                            <td className="border border-gray-300 p-2 align-top text-xs">
                              <div className="whitespace-pre-wrap">
                                {craEntry.reflections_on_experience || 'No reflections provided'}
                              </div>
                            </td>

                            <td className="border border-gray-300 p-2 text-center align-top">
                              <Button
                                variant="ghost"
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
                            </td>
                          </tr>

                          {/* Comment input for CRA */}
                          {showCommentInput[`A-${craEntry.id}`] && (
                            <tr key={`cra-comment-${craEntry.id}`}>
                              <td colSpan={7} className="border border-gray-300 p-3 bg-yellow-50">
                                <div className="ml-4">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Add Comment for Entry #{craEntry.id}:
                                  </label>
                                  <Textarea
                                    className="w-full border rounded px-3 py-2 text-sm resize-none mb-2"
                                    rows={3}
                                    placeholder="Add your feedback or comments for this entry..."
                                    value={newComments[`A-${craEntry.id}`] || ''}
                                    onChange={(ev) => setNewComments(prev => ({ 
                                      ...prev, 
                                      [`A-${craEntry.id}`]: ev.target.value 
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
                              </td>
                            </tr>
                          )}

                          {/* Existing comments for CRA */}
                          {getEntryComments(craEntry.id, 'A').length > 0 && (
                            <tr key={`cra-existing-comments-${craEntry.id}`}>
                              <td colSpan={7} className="border border-gray-300 p-3 bg-blue-50">
                                <div className="ml-4">
                                  <button
                                    onClick={() => toggleCommentsExpanded(`entry-A-${craEntry.id}`)}
                                    className="flex items-center gap-2 text-xs font-medium text-blue-700 hover:text-blue-800 mb-2"
                                  >
                                    {expandedComments[`entry-A-${craEntry.id}`] ? (
                                      <ChevronDown className="h-3 w-3" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3" />
                                    )}
                                    Comments ({getEntryComments(craEntry.id, 'A').reduce((total, thread) => total + thread.messages.length, 0)})
                                  </button>
                                  
                                  {expandedComments[`entry-A-${craEntry.id}`] && (
                                    <div className="ml-2 space-y-2">
                                      {getEntryComments(craEntry.id, 'A').map((thread) => (
                                        <div key={thread.id} className="p-2 bg-white rounded border border-blue-200">
                                          <div className="space-y-1">
                                            {thread.messages.map((msg: CommentMessage) => (
                                              <div key={msg.id} className="text-xs">
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
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                      
                      {/* Show empty state if no entries */}
                      {sectionAEntries.length === 0 && (
                        <tr>
                          <td colSpan={7} className="border border-gray-300 p-8 text-center text-gray-500">
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

                  {/* Section A Comments */}
                  <div className="p-4 bg-white border-t border-gray-300">
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

                    {/* Existing Section A Comments */}
                    {getSectionComments('A').length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={() => toggleCommentsExpanded('section-A')}
                          className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 mb-2"
                        >
                          {expandedComments['section-A'] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          Section Comments ({getSectionComments('A').reduce((total, thread) => total + thread.messages.length, 0)})
                        </button>
                        
                        {expandedComments['section-A'] && (
                          <div className="space-y-2">
                            {getSectionComments('A').map((thread) => (
                              <div key={thread.id} className="p-3 bg-blue-50 rounded border border-blue-200">
                                <div className="space-y-2">
                                  {thread.messages.map((msg: CommentMessage) => (
                                    <div key={msg.id} className="text-sm">
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
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

      {/* SECTION B: Professional development - after A */}
      <div className="mt-6">
        {/* AHPRA Section B Header */}
        <div className="bg-blue-600 text-white p-4 font-bold text-lg">
          SECTION B: Record of professional development
        </div>
        
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
                      <th className="border border-gray-400 p-2 text-center font-semibold">Actions</th>
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
                      <td className="border border-gray-300 p-1"></td>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionBEntries.map((e) => (
                      <React.Fragment key={e.id}>
                        <tr className="border-b border-gray-300 hover:bg-gray-50">
                          <td className="border border-gray-300 p-2">{e.date_of_activity || ''}</td>
                          <td className="border border-gray-300 p-2">{e.activity_title || e.activity_type || '—'}</td>
                          <td className="border border-gray-300 p-2">{e.active_pd || (e.is_active_activity ? 'Yes' : 'No')}</td>
                          <td className="border border-gray-300 p-2">{e.activity_details || e.presenter || ''}</td>
                          <td className="border border-gray-300 p-2">{e.core_competency_areas || ''}</td>
                          <td className="border border-gray-300 p-2">{e.specific_topics || e.topics_covered || e.notes || e.summary || ''}</td>
                          <td className="border border-gray-300 p-2">{formatDuration(Number(e.duration_minutes || 0))}</td>
                          <td className="border border-gray-300 p-2">{e.supervisor_initials || ''}</td>
                          <td className="border border-gray-300 p-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowCommentInput(prev => ({ 
                                ...prev, 
                                [`B-${e.id}`]: !prev[`B-${e.id}`] 
                              }))}
                              className="h-6 w-6 p-0"
                              title="Add comment"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>

                        {/* Comment input for Section B entry */}
                        {showCommentInput[`B-${e.id}`] && (
                          <tr key={`B-comment-${e.id}`}>
                            <td colSpan={9} className="border border-gray-300 p-3 bg-yellow-50">
                              <div className="ml-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Add Comment for Entry #{e.id}:
                                </label>
                                <Textarea
                                  className="w-full border rounded px-3 py-2 text-sm resize-none mb-2"
                                  rows={3}
                                  placeholder="Add your feedback or comments for this entry..."
                                  value={newComments[`B-${e.id}`] || ''}
                                  onChange={(ev) => setNewComments(prev => ({ 
                                    ...prev, 
                                    [`B-${e.id}`]: ev.target.value 
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
                            </td>
                          </tr>
                        )}

                        {/* Existing comments for Section B entry */}
                        {getEntryComments(e.id, 'B').length > 0 && (
                          <tr key={`B-existing-comments-${e.id}`}>
                            <td colSpan={9} className="border border-gray-300 p-3 bg-blue-50">
                              <div className="ml-4">
                                <button
                                  onClick={() => toggleCommentsExpanded(`entry-B-${e.id}`)}
                                  className="flex items-center gap-2 text-xs font-medium text-blue-700 hover:text-blue-800 mb-2"
                                >
                                  {expandedComments[`entry-B-${e.id}`] ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                  Comments ({getEntryComments(e.id, 'B').reduce((total, thread) => total + thread.messages.length, 0)})
                                </button>
                                
                                {expandedComments[`entry-B-${e.id}`] && (
                                  <div className="ml-2 space-y-2">
                                    {getEntryComments(e.id, 'B').map((thread) => (
                                      <div key={thread.id} className="p-2 bg-white rounded border border-blue-200">
                                        <div className="space-y-1">
                                          {thread.messages.map((msg: CommentMessage) => (
                                            <div key={msg.id} className="text-xs">
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
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    {sectionBEntries.length === 0 && (
                      <tr>
                        <td colSpan={9} className="border border-gray-300 p-6 text-center text-gray-500">No Section B entries found for this week</td>
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

              {/* Section B Comment Button */}
              <div className="p-4 bg-white border-t border-gray-300">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCommentInput(prev => ({ 
                    ...prev, 
                    'section-B': !prev['section-B'] 
                  }))}
                  className="mb-2"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Add Section B Comment
                </Button>
                
                {showCommentInput['section-B'] && (
                  <div className="p-3 bg-green-50 rounded border-l-4 border-green-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Add Section B Comment:
                    </label>
                    <Textarea
                      className="w-full border rounded px-3 py-2 text-sm resize-none"
                      rows={3}
                      placeholder="Add general feedback for Section B..."
                      value={newComments['section-B'] || ''}
                      onChange={(ev) => setNewComments(prev => ({ 
                        ...prev, 
                        'section-B': ev.target.value 
                      }))}
                    />
                    <div className="flex gap-2 mt-2">
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

                {/* Existing Section B Comments */}
                {getSectionComments('B').length > 0 && (
                  <div className="mt-3">
                    <button
                      onClick={() => toggleCommentsExpanded('section-B')}
                      className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 mb-2"
                    >
                      {expandedComments['section-B'] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      Section Comments ({getSectionComments('B').reduce((total, thread) => total + thread.messages.length, 0)})
                    </button>
                    
                    {expandedComments['section-B'] && (
                      <div className="space-y-2">
                        {getSectionComments('B').map((thread) => (
                          <div key={thread.id} className="p-3 bg-blue-50 rounded border border-blue-200">
                            <div className="space-y-2">
                              {thread.messages.map((msg: CommentMessage) => (
                                <div key={msg.id} className="text-sm">
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
        <div className="bg-blue-600 text-white p-4 font-bold text-lg text-center">
          SECTION C: Record of supervision
        </div>
        
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
      <Card className="border-2 border-purple-300 mt-6">
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
                      <th className="border border-gray-400 p-2 text-center font-semibold">Actions</th>
                    </tr>
                    <tr className="bg-gray-100 text-gray-600 text-xs">
                      <td className="border border-gray-300 p-1"></td>
                      <td className="border border-gray-300 p-1"></td>
                      <td className="border border-gray-300 p-1 italic">Specify</td>
                      <td className="border border-gray-300 p-1 italic">Specify</td>
                      <td className="border border-gray-300 p-1 italic">E.g. brief summary of matters discussed, outcomes/plans for follow up activities and discussions</td>
                      <td className="border border-gray-300 p-1 italic">Hours/mins</td>
                      <td className="border border-gray-300 p-1"></td>
                      <td className="border border-gray-300 p-1"></td>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionCEntries.map((e) => (
                      <React.Fragment key={e.id}>
                        <tr className="border-b border-gray-300 hover:bg-gray-50">
                          <td className="border border-gray-300 p-2">{e.date_of_supervision || ''}</td>
                          <td className="border border-gray-300 p-2">{e.supervisor_name || '—'}</td>
                          <td className="border border-gray-300 p-2">{e.principal_or_secondary || e.supervisor_type || ''}</td>
                          <td className="border border-gray-300 p-2">{e.individual_group_other || e.supervision_type || ''}</td>
                          <td className="border border-gray-300 p-2">{e.summary || ''}</td>
                          <td className="border border-gray-300 p-2">{formatDuration(Number(e.duration_minutes || 0))}</td>
                          <td className="border border-gray-300 p-2">{e.supervisor_initials || ''}</td>
                          <td className="border border-gray-300 p-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowCommentInput(prev => ({ 
                                ...prev, 
                                [`C-${e.id}`]: !prev[`C-${e.id}`] 
                              }))}
                              className="h-6 w-6 p-0"
                              title="Add comment"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>

                        {/* Comment input for Section C entry */}
                        {showCommentInput[`C-${e.id}`] && (
                          <tr key={`C-comment-${e.id}`}>
                            <td colSpan={8} className="border border-gray-300 p-3 bg-yellow-50">
                              <div className="ml-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Add Comment for Entry #{e.id}:
                                </label>
                                <Textarea
                                  className="w-full border rounded px-3 py-2 text-sm resize-none mb-2"
                                  rows={3}
                                  placeholder="Add your feedback or comments for this entry..."
                                  value={newComments[`C-${e.id}`] || ''}
                                  onChange={(ev) => setNewComments(prev => ({ 
                                    ...prev, 
                                    [`C-${e.id}`]: ev.target.value 
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
                            </td>
                          </tr>
                        )}

                        {/* Existing comments for Section C entry */}
                        {getEntryComments(e.id, 'C').length > 0 && (
                          <tr key={`C-existing-comments-${e.id}`}>
                            <td colSpan={8} className="border border-gray-300 p-3 bg-blue-50">
                              <div className="ml-4">
                                <button
                                  onClick={() => toggleCommentsExpanded(`entry-C-${e.id}`)}
                                  className="flex items-center gap-2 text-xs font-medium text-blue-700 hover:text-blue-800 mb-2"
                                >
                                  {expandedComments[`entry-C-${e.id}`] ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                  Comments ({getEntryComments(e.id, 'C').reduce((total, thread) => total + thread.messages.length, 0)})
                                </button>
                                
                                {expandedComments[`entry-C-${e.id}`] && (
                                  <div className="ml-2 space-y-2">
                                    {getEntryComments(e.id, 'C').map((thread) => (
                                      <div key={thread.id} className="p-2 bg-white rounded border border-blue-200">
                                        <div className="space-y-1">
                                          {thread.messages.map((msg: CommentMessage) => (
                                            <div key={msg.id} className="text-xs">
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
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    {sectionCEntries.length === 0 && (
                      <tr>
                        <td colSpan={8} className="border border-gray-300 p-6 text-center text-gray-500">No Section C entries found for this week</td>
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

              {/* Section C Comment Button */}
              <div className="p-4 bg-white border-t border-gray-300">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCommentInput(prev => ({ 
                    ...prev, 
                    'section-C': !prev['section-C'] 
                  }))}
                  className="mb-2"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Add Section C Comment
                </Button>
                
                {showCommentInput['section-C'] && (
                  <div className="p-3 bg-green-50 rounded border-l-4 border-green-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Add Section C Comment:
                    </label>
                    <Textarea
                      className="w-full border rounded px-3 py-2 text-sm resize-none"
                      rows={3}
                      placeholder="Add general feedback for Section C..."
                      value={newComments['section-C'] || ''}
                      onChange={(ev) => setNewComments(prev => ({ 
                        ...prev, 
                        'section-C': ev.target.value 
                      }))}
                    />
                    <div className="flex gap-2 mt-2">
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

                {/* Existing Section C Comments */}
                {getSectionComments('C').length > 0 && (
                  <div className="mt-3">
                    <button
                      onClick={() => toggleCommentsExpanded('section-C')}
                      className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 mb-2"
                    >
                      {expandedComments['section-C'] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      Section Comments ({getSectionComments('C').reduce((total, thread) => total + thread.messages.length, 0)})
                    </button>
                    
                    {expandedComments['section-C'] && (
                      <div className="space-y-2">
                        {getSectionComments('C').map((thread) => (
                          <div key={thread.id} className="p-3 bg-blue-50 rounded border border-blue-200">
                            <div className="space-y-2">
                              {thread.messages.map((msg: CommentMessage) => (
                                <div key={msg.id} className="text-sm">
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
              </div>
            </>
          )}
        </CardContent>
      </Card>

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

      {/* General Comments */}
      <div className="mt-6 bg-white border-2 border-gray-300 p-4 rounded-lg">
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
          <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-200 mb-3">
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

        {/* Existing General Comments */}
        {getGeneralComments().length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => toggleCommentsExpanded('general')}
              className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 mb-2"
            >
              {expandedComments['general'] ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              General Comments ({getGeneralComments().reduce((total, thread) => total + thread.messages.length, 0)})
            </button>
            
            {expandedComments['general'] && (
              <div className="space-y-2">
                {getGeneralComments().map((thread) => (
                  <div key={thread.id} className="p-3 bg-blue-50 rounded border border-blue-200">
                    <div className="space-y-2">
                      {thread.messages.map((msg: CommentMessage) => (
                        <div key={msg.id} className="text-sm">
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
      </div>

      {/* AHPRA FOOTER */}
      <div className="bg-gray-50 border border-gray-300 p-4 rounded-lg text-xs leading-relaxed mt-6">
        <p className="font-semibold mb-2">
          Please note that all work roles must be approved by the Board prior to counting any time or training towards the supervised practice program. This form is also available in PDF format at www.psychologyboard.gov.au/Registration/Forms.
        </p>
        <div className="text-center text-gray-600">
          <strong>Effective from: 28 October 2020</strong>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end py-6">
        <Button 
          variant="outline" 
          onClick={onRequestEdits} 
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          <Edit className="h-4 w-4 mr-2" />
          Request Edits
        </Button>
        <Button 
          variant="outline" 
          onClick={onReject} 
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Reject
        </Button>
        <Button 
          onClick={onApprove} 
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve
        </Button>
      </div>
    </div>
  )
}
