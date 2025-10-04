import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  MapPin, 
  Users,
  Calendar as CalendarIcon
} from 'lucide-react'
import { apiFetch } from '@/lib/api'

// Color palette for supervisees
const SUPERVISEE_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-800', hover: 'hover:bg-blue-200' },
  { bg: 'bg-green-100', text: 'text-green-800', hover: 'hover:bg-green-200' },
  { bg: 'bg-purple-100', text: 'text-purple-800', hover: 'hover:bg-purple-200' },
  { bg: 'bg-orange-100', text: 'text-orange-800', hover: 'hover:bg-orange-200' },
  { bg: 'bg-pink-100', text: 'text-pink-800', hover: 'hover:bg-pink-200' },
  { bg: 'bg-indigo-100', text: 'text-indigo-800', hover: 'hover:bg-indigo-200' },
  { bg: 'bg-teal-100', text: 'text-teal-800', hover: 'hover:bg-teal-200' },
  { bg: 'bg-amber-100', text: 'text-amber-800', hover: 'hover:bg-amber-200' },
]

// Function to get color for a supervisee based on their email
const getSuperviseeColor = (email: string) => {
  const hash = email.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
    return a & a
  }, 0)
  const index = Math.abs(hash) % SUPERVISEE_COLORS.length
  return SUPERVISEE_COLORS[index]
}

// Function to get meeting color based on attendees
const getMeetingColor = (meeting: Meeting) => {
  // If it's an individual supervision meeting, use supervisee color
  if (meeting.title.includes('Individual Supervision')) {
    const superviseeInvite = meeting.invites.find(invite => 
      invite.attendee_email !== meeting.organizer_name.split(' ')[0] // Assuming organizer_name contains email
    )
    if (superviseeInvite) {
      return getSuperviseeColor(superviseeInvite.attendee_email)
    }
  }
  
  // For group meetings or general meetings, use default blue
  return { bg: 'bg-blue-100', text: 'text-blue-800', hover: 'hover:bg-blue-200' }
}

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
}

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
  invites: MeetingInvite[]
  is_past: boolean
  is_upcoming: boolean
  is_current: boolean
}

interface CalendarProps {
  onMeetingClick?: (meeting: Meeting) => void
  onCreateMeeting?: () => void
  className?: string
}

export default function Calendar({ onMeetingClick, onCreateMeeting, className = '' }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Get start and end of month for API call
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

  useEffect(() => {
    fetchMeetings()
  }, [currentDate])

  const fetchMeetings = async () => {
    try {
      setLoading(true)
      const startDate = monthStart.toISOString().split('T')[0]
      const endDate = monthEnd.toISOString().split('T')[0]
      
      const response = await apiFetch(`/api/meetings/?start_date=${startDate}&end_date=${endDate}`)
      if (response.ok) {
        const data = await response.json()
        setMeetings(data)
      }
    } catch (error) {
      console.error('Error fetching meetings:', error)
    } finally {
      setLoading(false)
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const getMeetingsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return meetings.filter(meeting => 
      meeting.start_time.startsWith(dateStr)
    )
  }

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString()
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Calendar Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {onCreateMeeting && (
                <Button onClick={onCreateMeeting} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Meeting
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {dayNames.map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {getDaysInMonth().map((date, index) => {
              if (!date) {
                return <div key={index} className="p-2" />
              }
              
              const dayMeetings = getMeetingsForDate(date)
              const isCurrentDay = isToday(date)
              const isSelectedDay = isSelected(date)
              
              return (
                <div
                  key={index}
                  className={`
                    p-2 min-h-[80px] border border-gray-200 cursor-pointer hover:bg-gray-50
                    ${isCurrentDay ? 'bg-blue-50 border-blue-300' : ''}
                    ${isSelectedDay ? 'bg-blue-100 border-blue-400' : ''}
                  `}
                  onClick={() => setSelectedDate(date)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${isCurrentDay ? 'text-blue-600' : ''}`}>
                      {date.getDate()}
                    </span>
                    {dayMeetings.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {dayMeetings.length}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Meeting indicators */}
                  <div className="space-y-1">
                    {dayMeetings.slice(0, 2).map(meeting => {
                      const meetingColor = getMeetingColor(meeting)
                      return (
                        <div
                          key={meeting.id}
                          className={`text-xs p-1 ${meetingColor.bg} ${meetingColor.text} rounded truncate cursor-pointer ${meetingColor.hover}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onMeetingClick?.(meeting)
                          }}
                          title={meeting.title}
                        >
                          {formatTime(meeting.start_time)} {meeting.title}
                        </div>
                      )
                    })}
                    {dayMeetings.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{dayMeetings.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4 text-gray-500">
                Loading meetings...
              </div>
            ) : getMeetingsForDate(selectedDate).length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No meetings scheduled
              </div>
            ) : (
              <div className="space-y-3">
                {getMeetingsForDate(selectedDate).map(meeting => {
                  const meetingColor = getMeetingColor(meeting)
                  return (
                    <div
                      key={meeting.id}
                      className={`p-3 border-l-4 ${meetingColor.bg} border-gray-200 rounded-lg ${meetingColor.hover} cursor-pointer`}
                      style={{ borderLeftColor: meetingColor.text.replace('text-', '#') }}
                      onClick={() => onMeetingClick?.(meeting)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{meeting.title}</h4>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}
                            </div>
                            {meeting.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {meeting.location}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {meeting.attendee_count} attendees
                            </div>
                          </div>
                        </div>
                        <Badge 
                          variant={meeting.status === 'CONFIRMED' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {meeting.status_display}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

