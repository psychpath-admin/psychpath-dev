import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle, 
  XCircle, 
  HelpCircle,
  MessageSquare,
  Download
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'

interface MeetingInvite {
  id: number
  attendee: number
  attendee_name: string
  attendee_email: string
  response: string
  response_display: string
  response_notes?: string
  responded_at?: string
  created_at: string
  meeting: {
    id: number
    title: string
    description?: string
    location?: string
    meeting_url?: string
    start_time: string
    end_time: string
    organizer_name: string
    attendee_count: number
  }
}

export default function MeetingInvitations() {
  const [invites, setInvites] = useState<MeetingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [respondingTo, setRespondingTo] = useState<number | null>(null)
  const [responseNotes, setResponseNotes] = useState('')

  useEffect(() => {
    fetchInvites()
  }, [])

  const fetchInvites = async () => {
    try {
      setLoading(true)
      const response = await apiFetch('/api/meetings/invites/')
      if (response.ok) {
        const data = await response.json()
        setInvites(data)
      }
    } catch (error) {
      console.error('Error fetching meeting invites:', error)
    } finally {
      setLoading(false)
    }
  }

  const respondToInvite = async (inviteId: number, response: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE') => {
    try {
      const responseData = await apiFetch(`/api/meetings/invites/${inviteId}/respond/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          response,
          response_notes: responseNotes || undefined
        })
      })

      if (responseData.ok) {
        toast.success(`Meeting ${response.toLowerCase()} successfully`)
        setRespondingTo(null)
        setResponseNotes('')
        fetchInvites()
      } else {
        const error = await responseData.json()
        toast.error(error.error || 'Failed to respond to meeting')
      }
    } catch (error) {
      console.error('Error responding to meeting:', error)
      toast.error('Failed to respond to meeting')
    }
  }

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getResponseIcon = (response: string) => {
    switch (response) {
      case 'ACCEPTED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'DECLINED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'TENTATIVE':
        return <HelpCircle className="h-4 w-4 text-yellow-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getResponseColor = (response: string) => {
    switch (response) {
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800'
      case 'DECLINED':
        return 'bg-red-100 text-red-800'
      case 'TENTATIVE':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const downloadICS = async (meetingId: number) => {
    try {
      const response = await apiFetch(`/api/meetings/${meetingId}/download/`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `meeting_${meetingId}.ics`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Calendar file downloaded successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to download calendar file')
      }
    } catch (error) {
      console.error('Error downloading ICS file:', error)
      toast.error('Failed to download calendar file')
    }
  }

  const pendingInvites = invites.filter(invite => invite.response === 'PENDING')
  const respondedInvites = invites.filter(invite => invite.response !== 'PENDING')

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">Loading meeting invitations...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Pending Invitations ({pendingInvites.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingInvites.map(invite => (
              <div key={invite.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">{invite.meeting?.title || 'Meeting Title Not Available'}</h3>
                    <p className="text-sm text-gray-600">Organized by {invite.meeting?.organizer_name || 'Unknown'}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Pending Response
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      {invite.meeting ? formatDateTime(invite.meeting.start_time) : 'Time not available'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      {invite.meeting ? `${formatTime(invite.meeting.start_time)} - ${formatTime(invite.meeting.end_time)}` : 'Time not available'}
                    </div>
                    {invite.meeting.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        {invite.meeting.location}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      {invite.meeting.attendee_count} attendees
                    </div>
                  </div>
                  
                  {invite.meeting.description && (
                    <div className="text-sm text-gray-600">
                      <p className="font-medium mb-1">Description:</p>
                      <p>{invite.meeting.description}</p>
                    </div>
                  )}
                </div>

                {respondingTo === invite.id ? (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Add a note (optional)"
                      value={responseNotes}
                      onChange={(e) => setResponseNotes(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => respondToInvite(invite.id, 'ACCEPTED')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => respondToInvite(invite.id, 'TENTATIVE')}
                        className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                      >
                        <HelpCircle className="h-4 w-4 mr-1" />
                        Tentative
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => respondToInvite(invite.id, 'DECLINED')}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRespondingTo(null)
                          setResponseNotes('')
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setRespondingTo(invite.id)}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Respond
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadICS(invite.meeting.id)}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download Calendar
                    </Button>
                    {invite.meeting.meeting_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(invite.meeting.meeting_url, '_blank')}
                      >
                        Join Meeting
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Responded Invitations */}
      {respondedInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Meeting History ({respondedInvites.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {respondedInvites.map(invite => (
              <div key={invite.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">{invite.meeting?.title || 'Meeting Title Not Available'}</h3>
                    <p className="text-sm text-gray-600">Organized by {invite.meeting?.organizer_name || 'Unknown'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getResponseIcon(invite.response)}
                    <Badge className={getResponseColor(invite.response)}>
                      {invite.response_display}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      {formatDateTime(invite.meeting.start_time)}
                    </div>
                    {invite.meeting.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        {invite.meeting.location}
                      </div>
                    )}
                  </div>
                  
                  {invite.response_notes && (
                    <div className="text-sm text-gray-600">
                      <p className="font-medium mb-1">Your Response:</p>
                      <p>{invite.response_notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadICS(invite.meeting.id)}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download Calendar
                  </Button>
                  {invite.meeting.meeting_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(invite.meeting.meeting_url, '_blank')}
                    >
                      Join Meeting
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {invites.length === 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No meeting invitations found</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

