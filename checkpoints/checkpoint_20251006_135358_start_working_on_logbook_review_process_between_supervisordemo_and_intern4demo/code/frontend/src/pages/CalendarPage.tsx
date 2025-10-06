import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  Users,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import Calendar from '@/components/Calendar'
import MeetingForm from '@/components/MeetingForm'
import MeetingInvitations from '@/components/MeetingInvitations'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'

interface Meeting {
  id: number
  title: string
  description?: string
  location?: string
  meeting_url?: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: string
  status_display: string
  organizer_name: string
  attendee_count: number
  is_past: boolean
  is_upcoming: boolean
  is_current: boolean
}

interface MeetingStats {
  total_meetings: number
  upcoming_meetings: number
  past_meetings: number
  pending_invites: number
  this_week: number
}

export default function CalendarPage() {
  const [activeTab, setActiveTab] = useState('calendar')
  const [showMeetingForm, setShowMeetingForm] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
  const [stats, setStats] = useState<MeetingStats>({
    total_meetings: 0,
    upcoming_meetings: 0,
    past_meetings: 0,
    pending_invites: 0,
    this_week: 0
  })

  React.useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await apiFetch('/api/meetings/stats/')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching meeting stats:', error)
    }
  }

  const handleCreateMeeting = () => {
    setEditingMeeting(null)
    setShowMeetingForm(true)
  }

  const handleEditMeeting = (meeting: Meeting) => {
    setEditingMeeting(meeting)
    setShowMeetingForm(true)
  }

  const handleMeetingSaved = (meeting: Meeting) => {
    setShowMeetingForm(false)
    setEditingMeeting(null)
    fetchStats()
    // Refresh calendar if it's active
    if (activeTab === 'calendar') {
      // The calendar component will refresh automatically
    }
  }

  const handleCancelForm = () => {
    setShowMeetingForm(false)
    setEditingMeeting(null)
  }

  if (showMeetingForm) {
    return (
      <div className="container mx-auto p-6">
        <MeetingForm
          meeting={editingMeeting || undefined}
          onSave={handleMeetingSaved}
          onCancel={handleCancelForm}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar & Meetings</h1>
          <p className="text-gray-600">Schedule and manage your supervision meetings</p>
        </div>
        <Button onClick={handleCreateMeeting}>
          <Plus className="h-4 w-4 mr-2" />
          New Meeting
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Meetings</p>
                <p className="text-2xl font-bold">{stats.total_meetings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold">{stats.upcoming_meetings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-2xl font-bold">{stats.this_week}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Pending Invites</p>
                <p className="text-2xl font-bold">{stats.pending_invites}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{stats.past_meetings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="invitations">My Invitations</TabsTrigger>
          <TabsTrigger value="meetings">All Meetings</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          <Calendar
            onMeetingClick={handleEditMeeting}
            onCreateMeeting={handleCreateMeeting}
          />
        </TabsContent>

        <TabsContent value="invitations" className="space-y-6">
          <MeetingInvitations />
        </TabsContent>

        <TabsContent value="meetings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All My Meetings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Meeting list view coming soon...</p>
                <p className="text-sm">Use the calendar view to see and manage your meetings</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

