/**
 * Audit Trail Sidebar Component
 * Displays hierarchical audit trail for logbook changes
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  History, 
  User, 
  Clock, 
  FileText,
  Edit,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  MessageSquare,
  AlertCircle
} from 'lucide-react'

interface AuditEntry {
  id: string
  logbook: string
  actor: {
    id: number
    first_name: string
    last_name: string
    email: string
  } | null
  action: string
  description: string
  timestamp: string
  diff_snapshot: any
}

interface AuditTrailSidebarProps {
  auditEntries: AuditEntry[]
}

export function AuditTrailSidebar({ auditEntries }: AuditTrailSidebarProps) {
  const [showDiffs, setShowDiffs] = useState(false)

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActionIcon = (action: string) => {
    const iconMap: { [key: string]: any } = {
      'created': FileText,
      'updated': Edit,
      'submitted': MessageSquare,
      'approved': CheckCircle,
      'rejected': XCircle,
      'locked': Lock,
      'unlocked': Unlock,
      'commented': MessageSquare,
      'status_changed': AlertCircle,
      'section_updated': Edit,
      'hours_updated': Clock
    }
    
    return iconMap[action] || History
  }

  const getActionColor = (action: string) => {
    const colorMap: { [key: string]: string } = {
      'created': 'text-green-600',
      'updated': 'text-blue-600',
      'submitted': 'text-blue-600',
      'approved': 'text-green-600',
      'rejected': 'text-red-600',
      'locked': 'text-purple-600',
      'unlocked': 'text-purple-600',
      'commented': 'text-gray-600',
      'status_changed': 'text-orange-600',
      'section_updated': 'text-blue-600',
      'hours_updated': 'text-blue-600'
    }
    
    return colorMap[action] || 'text-gray-600'
  }

  const getActionBadge = (action: string) => {
    const badgeMap: { [key: string]: { label: string; color: string } } = {
      'created': { label: 'Created', color: 'bg-green-100 text-green-800' },
      'updated': { label: 'Updated', color: 'bg-blue-100 text-blue-800' },
      'submitted': { label: 'Submitted', color: 'bg-blue-100 text-blue-800' },
      'approved': { label: 'Approved', color: 'bg-green-100 text-green-800' },
      'rejected': { label: 'Rejected', color: 'bg-red-100 text-red-800' },
      'locked': { label: 'Locked', color: 'bg-purple-100 text-purple-800' },
      'unlocked': { label: 'Unlocked', color: 'bg-purple-100 text-purple-800' },
      'commented': { label: 'Commented', color: 'bg-gray-100 text-gray-800' },
      'status_changed': { label: 'Status Changed', color: 'bg-orange-100 text-orange-800' },
      'section_updated': { label: 'Section Updated', color: 'bg-blue-100 text-blue-800' },
      'hours_updated': { label: 'Hours Updated', color: 'bg-blue-100 text-blue-800' }
    }
    
    const config = badgeMap[action] || { label: action, color: 'bg-gray-100 text-gray-800' }
    return (
      <Badge className={`${config.color} text-xs`}>
        {config.label}
      </Badge>
    )
  }

  const renderDiffSnapshot = (diff: any) => {
    if (!diff || typeof diff !== 'object') return null

    return (
      <div className="mt-2 space-y-2">
        {Object.entries(diff).map(([field, changes]: [string, any]) => (
          <div key={field} className="text-xs">
            <div className="font-medium text-gray-700 mb-1">{field}:</div>
            <div className="space-y-1">
              {changes.old && (
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <div className="text-red-600 font-medium">- {changes.old}</div>
                </div>
              )}
              {changes.new && (
                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <div className="text-green-600 font-medium">+ {changes.new}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderAuditEntry = (entry: AuditEntry, index: number) => {
    const hasDiff = entry.diff_snapshot && Object.keys(entry.diff_snapshot).length > 0
    const Icon = getActionIcon(entry.action)
    const actionColor = getActionColor(entry.action)

    return (
      <div key={entry.id} className="relative">
        {/* Timeline line */}
        {index < auditEntries.length - 1 && (
          <div className="absolute left-4 top-8 w-0.5 h-full bg-gray-200"></div>
        )}
        
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center ${actionColor}`}>
            <Icon className="h-4 w-4" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-lg border p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getActionBadge(entry.action)}
                  {hasDiff && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDiffs(!showDiffs)}
                      className="text-xs h-5 px-2"
                    >
                      {showDiffs ? 'Hide' : 'Show'} Changes
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  {formatDateTime(entry.timestamp)}
                </div>
              </div>
              
              <div className="text-sm text-gray-700 mb-2">
                {entry.description}
              </div>
              
              {entry.actor && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                  <User className="h-3 w-3" />
                  {entry.actor.first_name} {entry.actor.last_name}
                </div>
              )}
              
              {/* Diff Snapshot */}
              {hasDiff && showDiffs && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs font-medium text-gray-700 mb-2">Changes:</div>
                  {renderDiffSnapshot(entry.diff_snapshot)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Audit Trail
        </CardTitle>
      </CardHeader>
      <CardContent>
        {auditEntries.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            No audit entries found
          </div>
        ) : (
          <div className="space-y-4">
            {auditEntries.map((entry, index) => renderAuditEntry(entry, index))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
