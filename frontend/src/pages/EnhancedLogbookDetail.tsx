/**
 * Enhanced Logbook Detail View
 * Comprehensive logbook review interface with comments, audit trail, and actions
 */

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft,
  Edit,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  MessageSquare,
  History,
  FileText,
  Clock,
  User,
  Calendar,
  Download,
  Send,
  Plus,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'

interface Logbook {
  id: string
  owner: {
    id: number
    email: string
    first_name: string
    last_name: string
  }
  supervisor: {
    id: number
    email: string
    first_name: string
    last_name: string
  } | null
  week_start_date: string
  status: string
  total_dcc_hours: number
  total_cra_hours: number
  total_pd_hours: number
  total_supervision_hours: number
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
    email: string
    first_name: string
    last_name: string
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
    email: string
    first_name: string
    last_name: string
  } | null
  action: string
  description: string
  timestamp: string
  diff_snapshot: any
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  changes_requested: 'bg-orange-100 text-orange-800',
  approved: 'bg-green-100 text-green-800',
  locked: 'bg-purple-100 text-purple-800',
}

export default function EnhancedLogbookDetail() {
  const { logbookId } = useParams<{ logbookId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [logbook, setLogbook] = useState<Logbook | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [newComment, setNewComment] = useState('')
  const [commentScope, setCommentScope] = useState<'document' | 'section' | 'record'>('document')
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [expandedAudit, setExpandedAudit] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (logbookId) {
      fetchLogbook()
    }
  }, [logbookId])

  const fetchLogbook = async () => {
    try {
      setLoading(true)
      const response = await apiFetch(`/api/enhanced-logbooks/${logbookId}/`)
      setLogbook(response)
    } catch (error) {
      console.error('Error fetching logbook:', error)
      toast.error('Failed to load logbook')
      navigate('/enhanced-logbooks')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusAction = async (action: string, data?: any) => {
    try {
      await apiFetch(`/api/enhanced-logbooks/${logbookId}/${action}/`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      })
      
      toast.success(`Logbook ${action} successful`)
      fetchLogbook()
    } catch (error) {
      console.error(`Error ${action} logbook:`, error)
      toast.error(`Failed to ${action} logbook`)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    try {
      const commentData = {
        text: newComment,
        scope: commentScope,
        section: selectedSection,
      }

      await apiFetch(`/api/enhanced-logbooks/${logbookId}/comments/`, {
        method: 'POST',
        body: JSON.stringify(commentData),
      })

      toast.success('Comment added successfully')
      setNewComment('')
      fetchLogbook()
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
    }
  }

  const handleGeneratePDF = async () => {
    try {
      const response = await apiFetch(`/api/enhanced-logbooks/${logbookId}/pdf/`, {
        method: 'POST',
      })
      
      if (response.pdf_url) {
        window.open(response.pdf_url, '_blank')
      }
      toast.success('PDF generated successfully')
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusDisplay = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getTotalHours = (logbook: Logbook) => {
    return logbook.total_dcc_hours + logbook.total_cra_hours + 
           logbook.total_pd_hours + logbook.total_supervision_hours
  }

  const toggleCommentExpansion = (commentId: string) => {
    const newExpanded = new Set(expandedComments)
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId)
    } else {
      newExpanded.add(commentId)
    }
    setExpandedComments(newExpanded)
  }

  const toggleAuditExpansion = (auditId: string) => {
    const newExpanded = new Set(expandedAudit)
    if (newExpanded.has(auditId)) {
      newExpanded.delete(auditId)
    } else {
      newExpanded.add(auditId)
    }
    setExpandedAudit(newExpanded)
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
          <Button onClick={() => navigate('/enhanced-logbooks')}>
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
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => navigate('/enhanced-logbooks')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Week of {formatDate(logbook.week_start_date)}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={statusColors[logbook.status as keyof typeof statusColors]}>
                  {getStatusDisplay(logbook.status)}
                </Badge>
                {logbook.is_locked && (
                  <Badge variant="outline" className="text-purple-600 border-purple-600">
                    <Lock className="h-3 w-3 mr-1" />
                    Locked
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {logbook.can_edit && (
              <Button
                variant="outline"
                onClick={() => {/* Navigate to edit mode */}}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            
            {logbook.can_submit && (
              <Button
                onClick={() => handleStatusAction('submit')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Submit for Review
              </Button>
            )}
            
            {logbook.can_approve && (
              <Button
                onClick={() => handleStatusAction('approve')}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            )}
            
            {logbook.can_reject && (
              <Button
                onClick={() => handleStatusAction('reject')}
                className="bg-red-600 hover:bg-red-700"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            )}
            
            {logbook.can_request_unlock && (
              <Button
                variant="outline"
                onClick={() => handleStatusAction('request-edit')}
              >
                <Unlock className="h-4 w-4 mr-2" />
                Request Edit Access
              </Button>
            )}
            
            {logbook.can_grant_unlock && (
              <Button
                variant="outline"
                onClick={() => handleStatusAction('grant-edit')}
              >
                <Unlock className="h-4 w-4 mr-2" />
                Grant Edit Access
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={handleGeneratePDF}
            >
              <Download className="h-4 w-4 mr-2" />
              Generate PDF
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="comments">
              Comments ({logbook.comments.length})
            </TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Owner</label>
                      <p className="text-sm">{logbook.owner.first_name} {logbook.owner.last_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Supervisor</label>
                      <p className="text-sm">
                        {logbook.supervisor 
                          ? `${logbook.supervisor.first_name} ${logbook.supervisor.last_name}`
                          : 'Not assigned'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Week Start</label>
                      <p className="text-sm">{formatDate(logbook.week_start_date)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <Badge className={statusColors[logbook.status as keyof typeof statusColors]}>
                        {getStatusDisplay(logbook.status)}
                      </Badge>
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
            </div>
          </TabsContent>

          {/* Sections Tab */}
          <TabsContent value="sections">
            <div className="space-y-6">
              {logbook.sections.map((section) => (
                <Card key={section.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{section.title}</CardTitle>
                      {section.is_locked && (
                        <Badge variant="outline" className="text-purple-600 border-purple-600">
                          <Lock className="h-3 w-3 mr-1" />
                          Locked
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600">
                      {section.content_json && Object.keys(section.content_json).length > 0 ? (
                        <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded-md">
                          {JSON.stringify(section.content_json, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-gray-500 italic">No content available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments">
            <div className="space-y-6">
              {/* Add Comment Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Add Comment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Scope</label>
                      <select
                        value={commentScope}
                        onChange={(e) => setCommentScope(e.target.value as any)}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                      >
                        <option value="document">Document</option>
                        <option value="section">Section</option>
                        <option value="record">Record</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Section</label>
                      <select
                        value={selectedSection || ''}
                        onChange={(e) => setSelectedSection(e.target.value || null)}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                        disabled={commentScope !== 'section'}
                      >
                        <option value="">Select section</option>
                        {logbook.sections.map((section) => (
                          <option key={section.id} value={section.id}>
                            {section.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="w-full"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Add Comment
                      </Button>
                    </div>
                  </div>
                  
                  <Textarea
                    placeholder="Enter your comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                </CardContent>
              </Card>

              {/* Comments List */}
              <div className="space-y-4">
                {logbook.comments.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No comments yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  logbook.comments.map((comment) => (
                    <Card key={comment.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">
                                {comment.author.first_name} {comment.author.last_name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {comment.scope}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {formatDate(comment.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{comment.text}</p>
                            
                            {comment.replies.length > 0 && (
                              <div className="ml-4 space-y-2">
                                {comment.replies.map((reply) => (
                                  <div key={reply.id} className="p-3 bg-gray-50 rounded-md">
                                    <div className="flex items-center gap-2 mb-1">
                                      <User className="h-3 w-3 text-gray-500" />
                                      <span className="text-sm font-medium">
                                        {reply.author.first_name} {reply.author.last_name}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {formatDate(reply.created_at)}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700">{reply.text}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Audit Trail Tab */}
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Audit Trail</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {logbook.audit_entries.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No audit entries found</p>
                    </div>
                  ) : (
                    logbook.audit_entries.map((audit) => (
                      <div key={audit.id} className="border-l-4 border-blue-200 pl-4 py-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{audit.action}</span>
                              <span className="text-xs text-gray-500">
                                {audit.actor 
                                  ? `${audit.actor.first_name} ${audit.actor.last_name}`
                                  : 'System'
                                }
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(audit.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{audit.description}</p>
                            
                            {audit.diff_snapshot && (
                              <div className="mt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleAuditExpansion(audit.id)}
                                >
                                  {expandedAudit.has(audit.id) ? (
                                    <ChevronUp className="h-4 w-4 mr-1" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 mr-1" />
                                  )}
                                  Show Details
                                </Button>
                                
                                {expandedAudit.has(audit.id) && (
                                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                                    <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                                      {JSON.stringify(audit.diff_snapshot, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
