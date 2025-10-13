import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'

interface SupervisionInvitation {
  id: number
  supervisor_name: string
  supervisor_email: string
  role: string
  status: string
  created_at: string
  expires_at: string
  is_expired: boolean
  can_be_accepted: boolean
}

export default function SupervisionInvitations() {
  const [invitations, setInvitations] = useState<SupervisionInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('PENDING')

  useEffect(() => {
    fetchInvitations()
  }, [])

  const fetchInvitations = async () => {
    try {
      setLoading(true)
      const response = await apiFetch('/api/supervisions/pending/')
      if (response.ok) {
        const data = await response.json()
        setInvitations(data)
      } else {
        toast.error('Failed to fetch supervision invitations')
      }
    } catch (error) {
      console.error('Error fetching invitations:', error)
      toast.error('Error fetching supervision invitations')
    } finally {
      setLoading(false)
    }
  }

  const respondToInvitation = async (invitationId: number, action: 'accept' | 'reject') => {
    setResponding(invitationId)
    
    try {
      // First get the supervision details to get the token
      const supervisionResponse = await apiFetch(`/api/supervisions/`)
      if (!supervisionResponse.ok) {
        throw new Error('Failed to fetch supervision details')
      }
      
      const supervisions = await supervisionResponse.json()
      const supervision = supervisions.find((s: any) => s.id === invitationId)
      
      if (!supervision) {
        throw new Error('Supervision invitation not found')
      }

      const response = await apiFetch('/api/supervisions/respond/', {
        method: 'POST',
        body: JSON.stringify({
          token: supervision.verification_token,
          action: action
        })
      })

      if (response.ok) {
        toast.success(`Invitation ${action}ed successfully`)
        await fetchInvitations()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || `Failed to ${action} invitation`)
      }
    } catch (error) {
      console.error(`Error ${action}ing invitation:`, error)
      toast.error(`Error ${action}ing invitation`)
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

  const getStatusIcon = (invitation: SupervisionInvitation) => {
    if (invitation.is_expired) {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
    if (invitation.can_be_accepted) {
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

  const filteredInvitations = invitations.filter(invitation => {
    if (statusFilter === 'ALL') return true
    return invitation.status === statusFilter
  })

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading supervision invitations...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Supervision Invitations</h1>
        <p className="text-gray-600">Manage your supervision invitations</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              📬 Supervision Invitations
            </CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredInvitations.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Invitations</h3>
              <p className="text-gray-600 mb-4">No supervision invitations found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInvitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(invitation)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{invitation.supervisor_name}</span>
                        {getRoleBadge(invitation.role)}
                      </div>
                      <p className="text-xs text-gray-600">
                        Invited {formatDate(invitation.created_at)} • Expires {formatDate(invitation.expires_at)}
                      </p>
                    </div>
                  </div>
                  
                  {invitation.is_expired ? (
                    <Badge variant="destructive" className="text-xs">Expired</Badge>
                  ) : invitation.can_be_accepted ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => respondToInvitation(invitation.id, 'accept')}
                        disabled={responding === invitation.id}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 h-7"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {responding === invitation.id ? 'Accepting...' : 'Accept'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => respondToInvitation(invitation.id, 'reject')}
                        disabled={responding === invitation.id}
                        className="text-xs px-3 py-1 h-7"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        {responding === invitation.id ? 'Rejecting...' : 'Reject'}
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Processing</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
