import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Clock, User, Activity } from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface AuditLog {
  id: number
  action: string
  user_role: string
  user_name: string
  timestamp: string
  comments: string
  previous_status: string
  new_status: string
  target_id: string
  metadata: any
}

interface LogbookAuditTrailModalProps {
  logbookId: number | null
  isOpen: boolean
  onClose: () => void
}

const getActionColor = (action: string) => {
  switch (action) {
    case 'created':
      return 'bg-green-100 text-green-800'
    case 'submitted':
      return 'bg-blue-100 text-blue-800'
    case 'approved':
      return 'bg-green-100 text-green-800'
    case 'rejected':
      return 'bg-red-100 text-red-800'
    case 'unlocked':
      return 'bg-yellow-100 text-yellow-800'
    case 'locked':
      return 'bg-gray-100 text-gray-800'
    case 'resubmitted':
      return 'bg-purple-100 text-purple-800'
    case 'message_sent':
      return 'bg-indigo-100 text-indigo-800'
    case 'comment_added':
    case 'comment_replied':
    case 'comment_edited':
    case 'comment_deleted':
      return 'bg-cyan-100 text-cyan-800'
    case 'unlock_requested':
    case 'unlock_approved':
    case 'unlock_denied':
      return 'bg-orange-100 text-orange-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'created':
      return '📝'
    case 'submitted':
      return '📤'
    case 'approved':
      return '✅'
    case 'rejected':
      return '❌'
    case 'unlocked':
      return '🔓'
    case 'locked':
      return '🔒'
    case 'resubmitted':
      return '🔄'
    case 'message_sent':
      return '💬'
    case 'comment_added':
    case 'comment_replied':
    case 'comment_edited':
    case 'comment_deleted':
      return '💭'
    case 'unlock_requested':
    case 'unlock_approved':
    case 'unlock_denied':
      return '🔑'
    default:
      return '📋'
  }
}

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatAction = (action: string) => {
  return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export default function LogbookAuditTrailModal({ logbookId, isOpen, onClose }: LogbookAuditTrailModalProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && logbookId) {
      fetchAuditLogs()
    }
  }, [isOpen, logbookId])

  const fetchAuditLogs = async () => {
    if (!logbookId) return
    
    setLoading(true)
    try {
      const response = await apiFetch(`/api/logbook/${logbookId}/audit/`)
      if (response.ok) {
        const data = await response.json()
        setAuditLogs(data)
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Logbook Audit Trail
          </DialogTitle>
        </DialogHeader>

        <div className="h-[60vh] overflow-y-auto pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No audit logs found for this logbook.
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{getActionIcon(log.action)}</span>
                      <Badge className={getActionColor(log.action)}>
                        {formatAction(log.action)}
                      </Badge>
                      {log.previous_status && log.new_status && (
                        <span className="text-sm text-gray-600">
                          {log.previous_status} → {log.new_status}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">{log.user_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {log.user_role}
                    </Badge>
                  </div>

                  {log.comments && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-700">{log.comments}</p>
                    </div>
                  )}

                  {log.target_id && (
                    <div className="mt-2 text-xs text-gray-500">
                      Target ID: {log.target_id}
                    </div>
                  )}

                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      <details>
                        <summary className="cursor-pointer hover:text-gray-700">
                          Additional Details
                        </summary>
                        <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
