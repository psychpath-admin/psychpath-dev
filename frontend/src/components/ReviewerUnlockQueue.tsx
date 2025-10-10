import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Unlock, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  User
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'

interface UnlockRequest {
  id: number
  logbook: number
  requester_name: string
  requester_role: string
  reason: string
  target_section: string
  status: 'pending' | 'approved' | 'denied'
  reviewed_by?: number
  reviewer_name?: string
  reviewer_role?: string
  reviewed_at?: string
  admin_comment?: string
  created_at: string
  logbook_week_display: string
  trainee_name: string
  can_review: boolean
}

interface ReviewerUnlockQueueProps {
  userRole: 'ORG_ADMIN' | 'SUPERVISOR'
  onRequestProcessed?: () => void
}

export default function ReviewerUnlockQueue({ onRequestProcessed }: ReviewerUnlockQueueProps) {
  const [requests, setRequests] = useState<UnlockRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState<number | null>(null)
  const [adminComment, setAdminComment] = useState('')
  const [durationMinutes, setDurationMinutes] = useState<number>(60)
  const [customDuration, setCustomDuration] = useState<string>('')
  const [useCustomDuration, setUseCustomDuration] = useState(false)

  useEffect(() => {
    fetchUnlockRequests()
  }, [])

  const fetchUnlockRequests = async () => {
    try {
      const response = await apiFetch('/api/logbook/unlock-requests/queue/')
      if (response.ok) {
        const data = await response.json()
        setRequests(data)
      } else {
        console.error('Failed to fetch unlock requests:', response.status)
        setRequests([])
      }
    } catch (error) {
      console.error('Error fetching unlock requests:', error)
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  const reviewRequest = async (requestId: number, decision: 'approve' | 'deny') => {
    if (decision === 'deny' && !adminComment.trim()) {
      toast.error('Please provide a comment when denying a request')
      return
    }

    if (decision === 'approve') {
      let finalDuration = durationMinutes
      if (useCustomDuration && customDuration.trim()) {
        try {
          finalDuration = parseInt(customDuration.trim())
          if (isNaN(finalDuration) || finalDuration <= 0) {
            toast.error('Please enter a valid duration (positive number)')
            return
          }
        } catch (error) {
          toast.error('Please enter a valid duration')
          return
        }
      }
    }

    setReviewing(requestId)
    try {
      const requestBody: any = {
        decision,
        admin_comment: adminComment.trim()
      }

      if (decision === 'approve') {
        requestBody.duration_minutes = durationMinutes
        if (useCustomDuration && customDuration.trim()) {
          requestBody.duration_minutes = parseInt(customDuration.trim())
        }
      }

      const response = await apiFetch(`/api/logbook/unlock-requests/${requestId}/review/`, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        toast.success(`Unlock request ${decision}d successfully`)
        setAdminComment('')
        setDurationMinutes(60)
        setCustomDuration('')
        setUseCustomDuration(false)
        fetchUnlockRequests()
        onRequestProcessed?.()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || `Failed to ${decision} unlock request`)
      }
    } catch (error) {
      console.error(`Error ${decision}ing unlock request:`, error)
      toast.error(`Error ${decision}ing unlock request`)
    } finally {
      setReviewing(null)
    }
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
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">Loading unlock requests...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Unlock className="h-8 w-8" />
            Unlock Requests Queue
          </h1>
          <p className="text-muted-foreground">
            Review unlock requests for approved logbooks
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            fetchUnlockRequests()
            onRequestProcessed?.()
          }}
        >
          Refresh
        </Button>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <Unlock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No Unlock Requests</h3>
              <p className="text-gray-600">
                No pending unlock requests to review.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Clock className="h-5 w-5 text-yellow-500 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{request.logbook_week_display}</h3>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Pending Review
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-4">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {request.trainee_name} ({request.requester_role})
                        </span>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Reason:</span>
                          <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-3 rounded">
                            {request.reason}
                          </p>
                        </div>
                        
                        {request.target_section && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Target Section:</span>
                            <p className="text-sm text-gray-600">{request.target_section}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Requested: {formatDate(request.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Review Actions */}
                {request.can_review && (
                  <div className="mt-6 pt-4 border-t">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`comment-${request.id}`} className="text-sm font-medium">
                          Review Comment {reviewing === request.id && '(required for denial)'}
                        </Label>
                        <Textarea
                          id={`comment-${request.id}`}
                          placeholder="Add your comment about this unlock request..."
                          value={adminComment}
                          onChange={(e) => setAdminComment(e.target.value)}
                          rows={3}
                        />
                      </div>

                      {/* Duration Selection for Approval */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Unlock Duration (for approval)</Label>
                        <div className="flex gap-2 items-center">
                          <Select
                            value={useCustomDuration ? 'custom' : durationMinutes.toString()}
                            onValueChange={(value) => {
                              if (value === 'custom') {
                                setUseCustomDuration(true)
                              } else {
                                setUseCustomDuration(false)
                                setDurationMinutes(parseInt(value))
                              }
                            }}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="60">1 hour</SelectItem>
                              <SelectItem value="180">3 hours</SelectItem>
                              <SelectItem value="1440">1 day</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {useCustomDuration && (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                placeholder="Minutes"
                                value={customDuration}
                                onChange={(e) => setCustomDuration(e.target.value)}
                                min="1"
                                className="px-3 py-2 border border-gray-300 rounded-md text-sm w-24"
                              />
                              <span className="text-sm text-gray-600">minutes</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => reviewRequest(request.id, 'approve')}
                          disabled={reviewing === request.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {reviewing === request.id ? 'Approving...' : 'Approve Unlock'}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => reviewRequest(request.id, 'deny')}
                          disabled={reviewing === request.id}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          {reviewing === request.id ? 'Denying...' : 'Deny Request'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {!request.can_review && (
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This request is assigned to a different reviewer role.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
