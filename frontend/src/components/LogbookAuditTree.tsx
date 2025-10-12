import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Clock, 
  User, 
  Activity, 
  ChevronDown, 
  ChevronRight,
  Send,
  CheckCircle,
  XCircle,
  Unlock,
  Lock,
  RefreshCw,
  MessageSquare,
  Key,
  Info
} from 'lucide-react'
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

interface LogbookAuditTreeProps {
  logbookId: number | null
  isOpen: boolean
  onClose: () => void
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'created':
      return <Activity className="h-4 w-4" />
    case 'submitted':
      return <Send className="h-4 w-4" />
    case 'approved':
      return <CheckCircle className="h-4 w-4" />
    case 'rejected':
      return <XCircle className="h-4 w-4" />
    case 'returned_for_edits':
      return <RefreshCw className="h-4 w-4" />
    case 'resubmitted':
      return <Send className="h-4 w-4" />
    case 'unlocked':
      return <Unlock className="h-4 w-4" />
    case 'locked':
      return <Lock className="h-4 w-4" />
    case 'unlock_requested':
    case 'unlock_approved':
    case 'unlock_denied':
    case 'unlock_activated':
      return <Key className="h-4 w-4" />
    case 'message_sent':
    case 'comment_added':
    case 'comment_replied':
    case 'comment_edited':
    case 'comment_deleted':
      return <MessageSquare className="h-4 w-4" />
    default:
      return <Info className="h-4 w-4" />
  }
}

const getRoleColor = (role: string) => {
  switch (role) {
    case 'provisional':
    case 'registrar':
      return 'border-blue-300 bg-blue-50 text-blue-800'
    case 'supervisor':
      return 'border-green-300 bg-green-50 text-green-800'
    case 'org_admin':
      return 'border-purple-300 bg-purple-50 text-purple-800'
    case 'system':
      return 'border-gray-300 bg-gray-50 text-gray-800'
    default:
      return 'border-gray-300 bg-gray-50 text-gray-800'
  }
}

const getActionColor = (action: string) => {
  switch (action) {
    case 'created':
      return 'text-green-600'
    case 'submitted':
      return 'text-blue-600'
    case 'approved':
      return 'text-green-600'
    case 'rejected':
      return 'text-red-600'
    case 'returned_for_edits':
      return 'text-orange-600'
    case 'resubmitted':
      return 'text-blue-600'
    case 'unlocked':
      return 'text-yellow-600'
    case 'locked':
      return 'text-gray-600'
    case 'unlock_requested':
    case 'unlock_approved':
    case 'unlock_denied':
    case 'unlock_activated':
      return 'text-orange-600'
    case 'message_sent':
    case 'comment_added':
    case 'comment_replied':
    case 'comment_edited':
    case 'comment_deleted':
      return 'text-cyan-600'
    default:
      return 'text-gray-600'
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

const AuditTreeNode: React.FC<{ log: AuditLog; isLast: boolean }> = ({ log, isLast }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  return (
    <div className="relative">
      {/* Vertical line */}
      {!isLast && (
        <div className="absolute left-4 top-8 w-0.5 h-full bg-gray-300" />
      )}
      
      {/* Node content */}
      <div className="flex items-start gap-3 pb-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center relative z-10">
          <div className={getActionColor(log.action)}>
            {getActionIcon(log.action)}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={getRoleColor(log.user_role)}>
              {log.user_role.replace('_', ' ')}
            </Badge>
            <span className="text-sm font-medium text-gray-900">
              {formatAction(log.action)}
            </span>
            {log.previous_status && log.new_status && (
              <span className="text-sm text-gray-500">
                {log.previous_status} → {log.new_status}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <User className="h-3 w-3" />
            <span>{log.user_name}</span>
            <Clock className="h-3 w-3 ml-2" />
            <span>{formatTimestamp(log.timestamp)}</span>
          </div>
          
          {/* Comments and details */}
          {(log.comments || (log.metadata && Object.keys(log.metadata).length > 0)) && (
            <div className="mt-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 text-xs text-gray-500 hover:text-gray-700"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                {isExpanded ? 'Hide' : 'Show'} details
              </Button>
              
              {isExpanded && (
                <div className="mt-2">
                  {log.comments && (
                    <div className="p-3 bg-gray-50 rounded-md mb-2">
                      <p className="text-sm text-gray-700">{log.comments}</p>
                    </div>
                  )}
                  
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="text-xs text-gray-500">
                      <details>
                        <summary className="cursor-pointer hover:text-gray-700 mb-1">
                          Additional Details
                        </summary>
                        <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LogbookAuditTree({ logbookId, isOpen, onClose }: LogbookAuditTreeProps) {
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
            Logbook Status History
          </DialogTitle>
        </DialogHeader>

        <div className="h-[60vh] overflow-y-auto pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No status changes found for this logbook.
            </div>
          ) : (
            <div className="relative">
              {/* Legend */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Status Change Legend</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getRoleColor('provisional')}>
                      Trainee
                    </Badge>
                    <span className="text-gray-600">Provisional/Registrar actions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getRoleColor('supervisor')}>
                      Supervisor
                    </Badge>
                    <span className="text-gray-600">Supervisor actions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getRoleColor('org_admin')}>
                      Org Admin
                    </Badge>
                    <span className="text-gray-600">Organization admin actions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getRoleColor('system')}>
                      System
                    </Badge>
                    <span className="text-gray-600">Automated system actions</span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-0">
                {auditLogs.map((log, index) => (
                  <AuditTreeNode 
                    key={log.id} 
                    log={log} 
                    isLast={index === auditLogs.length - 1} 
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
