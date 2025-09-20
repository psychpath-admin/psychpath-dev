import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'

interface PendingSupervisionRequestsProps {
  onUpdate?: () => void // Callback to refresh parent dashboard
}

interface SupervisionRequest {
  id: number
  supervisor_name: string
  supervisee_email: string
  role: string
  status: string
  created_at: string
  expires_at: string
  is_expired: boolean
  can_be_accepted: boolean
  verification_token: string
}

export const PendingSupervisionRequests: React.FC<PendingSupervisionRequestsProps> = ({ onUpdate }) => {
  const [requests, setRequests] = useState<SupervisionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<number | null>(null)

  useEffect(() => {
    fetchPendingRequests()
  }, [])

  const fetchPendingRequests = async () => {
    try {
      const response = await apiFetch('/api/supervisions/pending/')
      if (response.ok) {
        const data = await response.json()
        setRequests(data)
      } else {
        toast.error('Failed to fetch pending requests')
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error)
      toast.error('Error fetching pending requests')
    } finally {
      setLoading(false)
    }
  }

  const respondToRequest = async (supervisionId: number, action: 'accept' | 'reject') => {
    setResponding(supervisionId)
    
    try {
      // Find the supervision request from our current requests data
      const supervision = requests.find((s) => s.id === supervisionId)
      
      if (!supervision) {
        throw new Error('Supervision request not found')
      }

      if (!supervision.can_be_accepted && action === 'accept') {
        toast.error('This invitation can no longer be accepted')
        return
      }

      const response = await apiFetch('/api/supervisions/respond/', {
        method: 'POST',
        body: JSON.stringify({
          token: supervision.verification_token,
          action: action
        })
      })

      if (response.ok) {
        toast.success(`Request ${action}ed successfully`)
        await fetchPendingRequests()
        // Notify parent dashboard to refresh
        if (onUpdate) {
          onUpdate()
        }
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || `Failed to ${action} request`)
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error)
      toast.error(`Error ${action}ing request`)
    } finally {
      setResponding(null)
    }
  }

  const getRoleBadge = (role: string) => {
    const isPrimary = role === 'PRIMARY'
    return (
      <Badge variant={isPrimary ? 'default' : 'secondary'}>
        {isPrimary ? 'Primary' : 'Secondary'} Supervisor
      </Badge>
    )
  }

  const getStatusIcon = (request: SupervisionRequest) => {
    if (request.is_expired) {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
    if (request.can_be_accepted) {
      return <Clock className="h-4 w-4 text-yellow-500" />
    }
    return <XCircle className="h-4 w-4 text-gray-500" />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading supervision requests...</div>
  }

  if (requests.length === 0) {
    return null // Don't show anything if no requests
  }

  return (
    <div className="space-y-2">
      {requests.map((request) => (
        <div key={request.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            {getStatusIcon(request)}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{request.supervisor_name}</span>
                {getRoleBadge(request.role)}
              </div>
              <p className="text-xs text-gray-600">
                Invited {formatDate(request.created_at)} • Expires {formatDate(request.expires_at)}
              </p>
            </div>
          </div>
          
          {request.is_expired ? (
            <Badge variant="destructive" className="text-xs">Expired</Badge>
          ) : request.can_be_accepted ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => respondToRequest(request.id, 'accept')}
                disabled={responding === request.id}
                className="bg-green-600 hover:bg-green-700 text-xs h-7 px-3"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                {responding === request.id ? 'Accepting...' : 'Accept'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => respondToRequest(request.id, 'reject')}
                disabled={responding === request.id}
                className="text-xs h-7 px-3"
              >
                <XCircle className="h-3 w-3 mr-1" />
                {responding === request.id ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          ) : (
            <Badge variant="secondary" className="text-xs">Processing</Badge>
          )}
        </div>
      ))}
    </div>
  )
}

export default PendingSupervisionRequests
