/**
 * Section Comment Thread Component
 * Displays threaded comments for a specific section
 */

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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

interface SectionCommentThreadProps {
  sectionId: string
  logbookId: string
}

export function SectionCommentThread({ sectionId, logbookId }: SectionCommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())

  React.useEffect(() => {
    fetchComments()
  }, [sectionId])

  const fetchComments = async () => {
    try {
      setLoading(true)
      const response = await apiFetch(`/api/enhanced-logbooks/${logbookId}/comments/?section=${sectionId}`)
      setComments((response as any).results || response)
    } catch (error) {
      console.error('Error fetching section comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    try {
      await apiFetch(`/api/enhanced-logbooks/${logbookId}/comments/`, {
        method: 'POST',
        body: JSON.stringify({
          text: newComment,
          scope: 'section',
          section: sectionId
        }),
      })
      
      setNewComment('')
      fetchComments()
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
          scope: 'section',
          section: sectionId,
          parent_comment: parentId
        }),
      })
      
      setReplyText('')
      setReplyingTo(null)
      fetchComments()
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

  const renderComment = (comment: Comment, depth = 0) => {
    const isExpanded = expandedComments.has(comment.id)
    const hasReplies = comment.replies && comment.replies.length > 0

    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''}`}>
        <div className="bg-gray-50 rounded-lg border p-3 mb-2">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-gray-500" />
              <span className="font-medium text-xs">
                {comment.author.first_name} {comment.author.last_name}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              {formatDateTime(comment.created_at)}
            </div>
          </div>
          
          <p className="text-xs text-gray-700 mb-2 whitespace-pre-wrap">
            {comment.text}
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="text-xs h-6 px-2"
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
            
            {hasReplies && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleCommentExpansion(comment.id)}
                className="text-xs h-6 px-2"
              >
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3 mr-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 mr-1" />
                )}
                {isExpanded ? 'Hide' : 'Show'} {comment.replies.length}
              </Button>
            )}
          </div>
          
          {/* Reply Form */}
          {replyingTo === comment.id && (
            <div className="mt-2 pt-2 border-t">
              <Textarea
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="mb-2 text-xs"
                rows={2}
              />
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={() => handleAddReply(comment.id)}
                  disabled={!replyText.trim()}
                  className="text-xs h-6 px-2"
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
                  className="text-xs h-6 px-2"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Replies */}
        {hasReplies && isExpanded && (
          <div className="space-y-1">
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MessageSquare className="h-4 w-4" />
          Loading comments...
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <MessageSquare className="h-4 w-4" />
        Section Comments
      </div>
      
      {/* Add New Comment */}
      <div className="space-y-2">
        <Textarea
          placeholder="Add a comment about this section..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={2}
          className="text-sm"
        />
        <Button
          onClick={handleAddComment}
          disabled={!newComment.trim()}
          size="sm"
          className="w-full"
        >
          <Send className="h-3 w-3 mr-1" />
          Add Comment
        </Button>
      </div>
      
      {/* Comments List */}
      <div className="space-y-2">
        {comments.length === 0 ? (
          <div className="text-center py-3 text-gray-500 text-sm">
            No comments yet
          </div>
        ) : (
          comments.map(comment => renderComment(comment))
        )}
      </div>
    </div>
  )
}
