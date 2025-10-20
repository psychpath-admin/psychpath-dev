/**
 * Comment Sidebar Component
 * Displays threaded comments for the logbook
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  MessageSquare, 
  Send, 
  User, 
  Clock, 
  Reply,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'

interface Comment {
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
  replies: Comment[]
}

interface CommentSidebarProps {
  logbookId: string
  comments: Comment[]
  onCommentAdded: () => void
}

export function CommentSidebar({ logbookId, comments, onCommentAdded }: CommentSidebarProps) {
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    try {
      await apiFetch(`/api/enhanced-logbooks/${logbookId}/comments/`, {
        method: 'POST',
        body: JSON.stringify({
          text: newComment,
          scope: 'document'
        }),
      })
      
      setNewComment('')
      onCommentAdded()
      toast.success('Comment added successfully')
    } catch (error: any) {
      console.error('Error adding comment:', error)
      const errorMessage = error.response?.data?.error || 'Failed to add comment'
      toast.error(errorMessage)
    }
  }

  const handleAddReply = async (parentId: string) => {
    if (!replyText.trim()) return

    try {
      await apiFetch(`/api/enhanced-logbooks/${logbookId}/comments/`, {
        method: 'POST',
        body: JSON.stringify({
          text: replyText,
          scope: 'document',
          parent_comment: parentId
        }),
      })
      
      setReplyText('')
      setReplyingTo(null)
      onCommentAdded()
      toast.success('Reply added successfully')
    } catch (error: any) {
      console.error('Error adding reply:', error)
      const errorMessage = error.response?.data?.error || 'Failed to add reply'
      toast.error(errorMessage)
    }
  }

  const toggleCommentExpansion = (commentId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
      } else {
        newSet.add(commentId)
      }
      return newSet
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

  const getScopeBadge = (scope: string) => {
    const config = {
      record: { label: 'Record', color: 'bg-blue-100 text-blue-800' },
      section: { label: 'Section', color: 'bg-green-100 text-green-800' },
      document: { label: 'Document', color: 'bg-purple-100 text-purple-800' }
    }
    
    const scopeConfig = config[scope as keyof typeof config]
    return (
      <Badge className={`${scopeConfig.color} text-xs`}>
        {scopeConfig.label}
      </Badge>
    )
  }

  const renderComment = (comment: Comment, depth = 0) => {
    const isExpanded = expandedComments.has(comment.id)
    const hasReplies = comment.replies && comment.replies.length > 0

    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''}`}>
        <div className="bg-white rounded-lg border p-4 mb-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-sm">
                {comment.author.first_name} {comment.author.last_name}
              </span>
              {getScopeBadge(comment.scope)}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              {formatDateTime(comment.created_at)}
            </div>
          </div>
          
          <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
            {comment.text}
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="text-xs"
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
            
            {hasReplies && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleCommentExpansion(comment.id)}
                className="text-xs"
              >
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3 mr-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 mr-1" />
                )}
                {isExpanded ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
              </Button>
            )}
          </div>
          
          {/* Reply Form */}
          {replyingTo === comment.id && (
            <div className="mt-3 pt-3 border-t">
              <Textarea
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="mb-2"
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAddReply(comment.id)}
                  disabled={!replyText.trim()}
                >
                  <Send className="h-3 w-3 mr-1" />
                  Reply
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
        
        {/* Replies */}
        {hasReplies && isExpanded && (
          <div className="space-y-2">
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  // Group comments by scope
  const documentComments = comments.filter(c => c.scope === 'document' && !c.parent_comment)
  const sectionComments = comments.filter(c => c.scope === 'section' && !c.parent_comment)
  const recordComments = comments.filter(c => c.scope === 'record' && !c.parent_comment)

  return (
    <div className="space-y-6">
      {/* Document Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Document Comments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Comment */}
          <div className="space-y-3">
            <Textarea
              placeholder="Add a comment about this logbook..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Add Comment
            </Button>
          </div>
          
          {/* Comments List */}
          <div className="space-y-3">
            {documentComments.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                No comments yet
              </div>
            ) : (
              documentComments.map(comment => renderComment(comment))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section Comments */}
      {sectionComments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Section Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sectionComments.map(comment => renderComment(comment))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Record Comments */}
      {recordComments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Record Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recordComments.map(comment => renderComment(comment))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
