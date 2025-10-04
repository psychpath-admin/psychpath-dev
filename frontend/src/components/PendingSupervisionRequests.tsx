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
}

export const PendingSupervisionRequests: React.FC<PendingSupervisionRequestsProps> = ({ onUpdate }) => {
  const [requests, setRequests] = useState<SupervisionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<number | null>(null)
  const [showAck, setShowAck] = useState(false)
  const [ackSupervisorName, setAckSupervisorName] = useState<string>('')
  const [pollMs, setPollMs] = useState(5000)

  useEffect(() => {
    fetchPendingRequests()
  }, [])

  // Auto-refresh pending requests every few seconds; backoff on errors
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      fetchPendingRequests()
    }, pollMs)
    return () => clearInterval(intervalId)
  }, [pollMs])

  // Refresh on focus/visibility
  useEffect(() => {
    const onFocus = () => fetchPendingRequests()
    const onVisibility = () => { if (!document.hidden) fetchPendingRequests() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const fetchPendingRequests = async () => {
    try {
      const response = await apiFetch('/api/supervisions/pending/')
      if (response.ok) {
        const data = await response.json()
        setRequests(data)
        if (pollMs !== 5000) setPollMs(5000)
      } else {
        toast.error('Failed to fetch pending requests')
        setPollMs(prev => Math.min(prev * 2, 60000))
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error)
      toast.error('Error fetching pending requests')
      setPollMs(prev => Math.min(prev * 2, 60000))
    } finally {
      setLoading(false)
    }
  }

  const respondToRequest = async (supervisionId: number, action: 'accept' | 'reject') => {
    setResponding(supervisionId)
    
    try {
      // First get the supervision details to get the token
      const supervisionResponse = await apiFetch(`/api/supervisions/`)
      if (!supervisionResponse.ok) {
        throw new Error('Failed to fetch supervision details')
      }
      
      const supervisions = await supervisionResponse.json()
      const supervision = supervisions.find((s: any) => s.id === supervisionId)
      
      if (!supervision) {
        throw new Error('Supervision request not found')
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
        // If accepted, show acknowledgement overlay once
        if (action === 'accept') {
          const name = supervision.supervisor_name || supervision.supervisor_email || 'your supervisor'
          setAckSupervisorName(name)
          // Only show once per supervision id
          const ackKey = `supervision_ack_${supervisionId}`
          if (!localStorage.getItem(ackKey)) {
            setShowAck(true)
            localStorage.setItem(ackKey, '1')
          }
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

  if (requests.length === 0 && !showAck) {
    return null // Don't show anything if no requests and no overlay to show
  }

  return (
    <div className="space-y-2">
      {showAck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="border-b px-6 py-4 text-center">
              <h3 className="text-lg font-semibold">🤝 Supervision Agreement Acknowledgement</h3>
              <p className="mt-1 text-sm text-gray-600">You have accepted a supervision invitation from {ackSupervisorName}</p>
            </div>
            <div className="max-h-[60vh] space-y-4 overflow-auto px-6 py-4 text-sm">
              <section>
                <div className="mb-1 font-medium">🔍 Your Responsibilities as a Supervisee</div>
                <ul className="list-disc space-y-1 pl-5 text-gray-700">
                  <li>Attend regular supervision sessions as agreed upon with your supervisor</li>
                  <li>Be punctual, prepared, and engaged in each supervision meeting</li>
                  <li>Log all supervision hours accurately in your logbook</li>
                  <li>Be open to feedback and use supervision to support your professional development</li>
                  <li>Maintain client confidentiality and seek supervisor guidance when needed</li>
                  <li>Raise concerns early if issues arise within the supervisory relationship</li>
                </ul>
              </section>
              <section>
                <div className="mb-1 font-medium">🧾 Record Keeping & Audit</div>
                <ul className="list-disc space-y-1 pl-5 text-gray-700">
                  <li>Ensure your supervision hours are recorded clearly and signed off when required</li>
                  <li>Use PsychPATH logbook tools to submit reflections, supervision notes, and milestone progress</li>
                  <li>Supervision records may be subject to audit by AHPRA</li>
                </ul>
              </section>
              <section>
                <div className="mb-1 font-medium">📌 Important Notes</div>
                <ul className="list-disc space-y-1 pl-5 text-gray-700">
                  <li>You can only have one primary supervisor at a time</li>
                  <li>Secondary supervisors may also provide support where approved</li>
                  <li>This agreement is linked to the specific supervisor and role</li>
                </ul>
              </section>
              <div className="rounded-md bg-yellow-50 p-3 text-xs text-gray-700">
                By clicking below, you acknowledge your responsibilities within this supervision relationship and agree to uphold the professional standards outlined above.
              </div>
            </div>
            <div className="flex gap-3 border-t px-6 py-4">
              <Button className="flex-1" onClick={() => setShowAck(false)}>Acknowledge & Continue</Button>
            </div>
          </div>
        </div>
      )}
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
