import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Link, 
  Users,
  X,
  Download,
  UserPlus,
  User,
  Users2,
  Globe
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import ErrorOverlay from '@/components/ErrorOverlay'

interface Meeting {
  id?: number
  title: string
  description?: string
  location?: string
  meeting_url?: string
  start_time: string
  end_time: string
  duration_minutes: number
  is_recurring: boolean
  recurrence_type: string
  recurrence_end_date?: string
  recurrence_count?: number
  supervision?: number
  attendee_emails: string[]
}

interface Supervisee {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: string
  supervision_id: number
}

interface MeetingFormProps {
  meeting?: Meeting
  onSave: (meeting: Meeting) => void
  onCancel: () => void
  supervisionId?: number
}

export default function MeetingForm({ meeting, onSave, onCancel, supervisionId }: MeetingFormProps) {
  const { user } = useAuth()
  const { showError, showErrorOverlay, currentError, dismissError } = useErrorHandler()
  const [formData, setFormData] = useState<Meeting>({
    title: '',
    description: '',
    location: '',
    meeting_url: '',
    start_time: '',
    end_time: '',
    duration_minutes: 60,
    is_recurring: false,
    recurrence_type: 'NONE',
    recurrence_end_date: '',
    recurrence_count: undefined,
    supervision: supervisionId,
    attendee_emails: []
  })
  const [loading, setLoading] = useState(false)
  const [newAttendeeEmail, setNewAttendeeEmail] = useState('')
  const [supervisees, setSupervisees] = useState<Supervisee[]>([])
  const [loadingSupervisees, setLoadingSupervisees] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<'individual' | 'group' | 'general' | null>(null)
  
  // Separate date and time states for better UX
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [startAmPm, setStartAmPm] = useState<'AM' | 'PM'>('AM')
  
  // Field error state for highlighting
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Utility functions for time conversion
  const convertTo24Hour = (time: string, amPm: 'AM' | 'PM') => {
    if (!time) return time
    const [hours, minutes] = time.split(':')
    let hour24 = parseInt(hours)
    
    if (amPm === 'PM' && hour24 !== 12) {
      hour24 += 12
    } else if (amPm === 'AM' && hour24 === 12) {
      hour24 = 0
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minutes}`
  }

  const convertTo12Hour = (time24: string) => {
    if (!time24) return { time: '', amPm: 'AM' as const }
    const [hours, minutes] = time24.split(':')
    const hour24 = parseInt(hours)
    
    if (hour24 === 0) {
      return { time: `12:${minutes}`, amPm: 'AM' as const }
    } else if (hour24 < 12) {
      return { time: `${hour24}:${minutes}`, amPm: 'AM' as const }
    } else if (hour24 === 12) {
      return { time: `12:${minutes}`, amPm: 'PM' as const }
    } else {
      return { time: `${hour24 - 12}:${minutes}`, amPm: 'PM' as const }
    }
  }

  const combineDateTime = (date: string, time: string, amPm: 'AM' | 'PM') => {
    if (!date || !time) return ''
    const time24 = convertTo24Hour(time, amPm)
    return `${date}T${time24}`
  }

  const parseDateTime = (dateTime: string) => {
    if (!dateTime) return { date: '', time: '', amPm: 'AM' as const }
    
    const [date, time] = dateTime.split('T')
    if (!time) return { date: '', time: '', amPm: 'AM' as const }
    
    const time24 = time.slice(0, 5) // Get HH:MM part
    const time12 = convertTo12Hour(time24)
    
    return {
      date,
      time: time12.time,
      amPm: time12.amPm
    }
  }

  useEffect(() => {
    if (meeting) {
      setFormData(meeting)
      
      // Parse existing datetime values
      const startParsed = parseDateTime(meeting.start_time)
      
      setStartDate(startParsed.date)
      setStartTime(startParsed.time)
      setStartAmPm(startParsed.amPm)
    } else {
      // Set default start time to next hour
      const now = new Date()
      const nextHour = new Date(now.getTime() + 60 * 60 * 1000)
      const endTime = new Date(nextHour.getTime() + 60 * 60 * 1000)
      
      const startDateTime = nextHour.toISOString().slice(0, 16)
      const endDateTime = endTime.toISOString().slice(0, 16)
      
      setFormData(prev => ({
        ...prev,
        start_time: startDateTime,
        end_time: endDateTime,
        supervision: supervisionId
      }))
      
      // Parse default datetime values
      const startParsed = parseDateTime(startDateTime)
      
      setStartDate(startParsed.date)
      setStartTime(startParsed.time)
      setStartAmPm(startParsed.amPm)
    }
    
    // Fetch supervisees when component mounts
    fetchSupervisees()
  }, [meeting, supervisionId])

  const fetchSupervisees = async () => {
    try {
      setLoadingSupervisees(true)
      const response = await apiFetch('/api/supervisees/')
      if (response.ok) {
        const data = await response.json()
        setSupervisees(data)
      } else {
        // If user is not a supervisor, this will fail - that's okay
        console.log('User is not a supervisor or no supervisees found')
      }
    } catch (error) {
      console.log('Error fetching supervisees:', error)
      // This is expected for non-supervisors
    } finally {
      setLoadingSupervisees(false)
    }
  }

  // Update formData when separate date/time states change
  useEffect(() => {
    const startDateTime = combineDateTime(startDate, startTime, startAmPm)
    
    // Calculate end time automatically from start time + duration
    let endDateTime = ''
    if (startDateTime && formData.duration_minutes) {
      const start = new Date(startDateTime)
      const end = new Date(start.getTime() + formData.duration_minutes * 60 * 1000)
      endDateTime = end.toISOString().slice(0, 16)
    }
    
    setFormData(prev => ({
      ...prev,
      start_time: startDateTime,
      end_time: endDateTime
    }))
  }, [startDate, startTime, startAmPm, formData.duration_minutes])


  const handleInputChange = (field: keyof Meeting, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleRecurringChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      is_recurring: checked,
      recurrence_type: checked ? 'WEEKLY' : 'NONE',
      recurrence_end_date: checked ? '' : undefined,
      recurrence_count: checked ? undefined : undefined
    }))
  }

  const addAttendee = () => {
    if (newAttendeeEmail && !formData.attendee_emails.includes(newAttendeeEmail)) {
      // If adding a non-supervisee to individual supervision, change to general meeting
      if (selectedPreset === 'individual' && !supervisees.some(s => s.email === newAttendeeEmail)) {
        setSelectedPreset('general')
        setFormData(prev => ({
          ...prev,
          title: 'General Meeting',
          attendee_emails: [...prev.attendee_emails, newAttendeeEmail]
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          attendee_emails: [...prev.attendee_emails, newAttendeeEmail]
        }))
      }
      setNewAttendeeEmail('')
    }
  }

  const addSupervisee = (supervisee: Supervisee) => {
    if (!formData.attendee_emails.includes(supervisee.email) && canAddAttendee(supervisee.email)) {
      setFormData(prev => {
        let newTitle = prev.title
        
        // For supervisors only, when adding supervisee to Individual Supervision preset
        if (user?.role === 'SUPERVISOR' && selectedPreset === 'individual') {
          // If title is still the default "Individual Supervision", append supervisee name
          if (newTitle === 'Individual Supervision') {
            newTitle = `Individual Supervision - ${supervisee.full_name}`
          } else if (!newTitle.includes(supervisee.full_name)) {
            // If title already has a name but not this supervisee, replace or append
            newTitle = `Individual Supervision - ${supervisee.full_name}`
          }
        }
        
        return {
          ...prev,
          title: newTitle,
          attendee_emails: [...prev.attendee_emails, supervisee.email]
        }
      })
    }
  }

  const removeAttendee = (email: string) => {
    setFormData(prev => {
      const newAttendeeEmails = prev.attendee_emails.filter(e => e !== email)
      let newTitle = prev.title
      
      // For supervisors only, when removing supervisee from Individual Supervision preset
      if (user?.role === 'SUPERVISOR' && selectedPreset === 'individual') {
        // If no supervisees left, revert to default title
        const remainingSupervisees = supervisees.filter(s => newAttendeeEmails.includes(s.email))
        if (remainingSupervisees.length === 0) {
          newTitle = 'Individual Supervision'
        } else if (remainingSupervisees.length === 1) {
          // Update title to show the remaining supervisee
          newTitle = `Individual Supervision - ${remainingSupervisees[0].full_name}`
        }
      }
      
      return {
        ...prev,
        title: newTitle,
        attendee_emails: newAttendeeEmails
      }
    })
  }

  const handlePresetSelect = (preset: 'individual' | 'group' | 'general') => {
    setSelectedPreset(preset)
    
    // Set title based on preset
    const titles = {
      individual: 'Individual Supervision',
      group: 'Group Supervision',
      general: 'General Meeting'
    }
    
    setFormData(prev => ({
      ...prev,
      title: titles[preset],
      // Clear existing attendees for individual supervision
      attendee_emails: preset === 'individual' ? [] : prev.attendee_emails
    }))
  }

  const canAddAttendee = (email: string) => {
    if (selectedPreset === 'individual') {
      // For individual supervision, only allow one supervisee
      return formData.attendee_emails.length === 0 && 
             supervisees.some(s => s.email === email)
    }
    return true
  }

  const getPresetDescription = (preset: 'individual' | 'group' | 'general') => {
    const descriptions = {
      individual: 'One-on-one supervision with a single supervisee',
      group: 'Supervision with multiple supervisees and other participants',
      general: 'General meeting - invite anyone you need'
    }
    return descriptions[preset]
  }

  const calculateEndTime = (startTime: string, duration: number) => {
    if (!startTime) return ''
    const start = new Date(startTime)
    const end = new Date(start.getTime() + duration * 60 * 1000)
    // Format as YYYY-MM-DDTHH:MM for datetime-local input
    const year = end.getFullYear()
    const month = String(end.getMonth() + 1).padStart(2, '0')
    const day = String(end.getDate()).padStart(2, '0')
    const hours = String(end.getHours()).padStart(2, '0')
    const minutes = String(end.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const handleDurationChange = (duration: number) => {
    setFormData(prev => ({
      ...prev,
      duration_minutes: duration
      // End time will be updated by useEffect
    }))
  }

  // New handlers for separate date/time inputs
  const handleStartDateChange = (date: string) => {
    setStartDate(date)
  }

  const handleStartTimeChange = (time: string) => {
    setStartTime(time)
  }

  const handleStartAmPmChange = (amPm: 'AM' | 'PM') => {
    setStartAmPm(amPm)
  }


  const validateForm = () => {
    if (!formData.title.trim()) {
      showError(new Error('Meeting title is required'), {
        title: 'Meeting Creation Failed',
        summary: 'Meeting title is required',
        explanation: 'You must provide a title for your meeting to help attendees understand what the meeting is about.',
        userAction: 'Please enter a descriptive title for your meeting and try again.',
        errorId: 'MEETING-001'
      })
      return false
    }
    if (!formData.start_time) {
      showError(new Error('Start time is required'), {
        title: 'Meeting Creation Failed',
        summary: 'Start time is required',
        explanation: 'You must specify when your meeting will begin so attendees can plan accordingly.',
        userAction: 'Please select a start date and time for your meeting and try again.',
        errorId: 'MEETING-002'
      })
      return false
    }
    if (!formData.duration_minutes || formData.duration_minutes <= 0) {
      showError(new Error('Duration required'), {
        title: 'Meeting Creation Failed',
        summary: 'Meeting duration is required',
        explanation: 'You must specify how long the meeting will last.',
        userAction: 'Please enter a valid duration (in minutes) for your meeting and try again.',
        errorId: 'MEETING-003'
      })
      return false
    }
    // Calculate end time for validation
    if (formData.start_time && formData.duration_minutes && formData.duration_minutes > 0) {
      const start = new Date(formData.start_time)
      const end = new Date(start.getTime() + formData.duration_minutes * 60 * 1000)
      
      if (start >= end) {
        showError(new Error('End time must be after start time'), {
          title: 'Meeting Creation Failed',
          summary: 'End time must be after start time',
          explanation: 'The meeting cannot end at the same time or before it starts. This would create an invalid meeting duration.',
          userAction: 'Please adjust your start time or duration and try again.',
          errorId: 'MEETING-004'
        })
        return false
      }
    }
    if (formData.is_recurring && formData.recurrence_type === 'NONE') {
      showError(new Error('Recurrence type required'), {
        title: 'Meeting Creation Failed',
        summary: 'Recurrence type is required for recurring meetings',
        explanation: 'You have selected to make this a recurring meeting but have not specified how often it should repeat.',
        userAction: 'Please select a recurrence type (Daily, Weekly, etc.) or uncheck the recurring option and try again.',
        errorId: 'MEETING-005'
      })
      return false
    }
    if (!formData.location?.trim() && !formData.meeting_url?.trim()) {
      setFieldErrors({
        location: 'Either location or meeting URL is required',
        meeting_url: 'Either location or meeting URL is required'
      })
      showError(new Error('Location or meeting URL required'), {
        title: 'Meeting Creation Failed',
        summary: 'Location or meeting URL is required',
        explanation: 'You must provide either a physical location or a meeting URL so attendees know where to join the meeting.',
        userAction: 'Please enter either a location or meeting URL and try again.',
        errorId: 'MEETING-006'
      })
      return false
    }
    // Clear any field errors if validation passes
    setFieldErrors({})
    return true
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    try {
      const url = meeting ? `/api/meetings/${meeting.id}/` : '/api/meetings/'
      const method = meeting ? 'PUT' : 'POST'
      
      // Always calculate end time to ensure consistency
      let endTime = null
      if (formData.start_time && formData.duration_minutes && formData.duration_minutes > 0) {
        const start = new Date(formData.start_time)
        const end = new Date(start.getTime() + formData.duration_minutes * 60 * 1000)
        endTime = end.toISOString()
      }
      
      // Prepare data for API - convert datetime-local format to ISO string
      const apiData = {
        ...formData,
        start_time: formData.start_time ? new Date(formData.start_time).toISOString() : null,
        end_time: endTime,
        recurrence_end_date: formData.recurrence_end_date ? new Date(formData.recurrence_end_date).toISOString() : null,
        // organizer is set automatically by the backend
      }
      
      console.log('Sending meeting data:', apiData)
      
      const response = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData)
      })

      if (response.ok) {
        const savedMeeting = await response.json()
        // Clear any field errors on successful save
        setFieldErrors({})
        // Show success toast and close form
        toast.success(meeting ? 'Meeting updated successfully!' : 'Meeting created successfully!')
        console.log('Meeting saved successfully:', savedMeeting)
        onSave(savedMeeting)
      } else {
        const error = await response.json()
        console.error('Meeting save error:', error)
        
        // Use error overlay for API errors
        let errorMessage = 'Failed to save meeting'
        let errorId = 'MEETING-API-001'
        
        if (error.error) {
          errorMessage = error.error
        } else if (error.detail) {
          errorMessage = error.detail
        } else if (error.non_field_errors) {
          errorMessage = Array.isArray(error.non_field_errors) ? error.non_field_errors[0] : error.non_field_errors
        }
        
        showError(new Error(errorMessage), {
          title: 'Meeting Creation Failed',
          summary: errorMessage,
          explanation: 'There was an issue saving your meeting. This could be due to invalid data, server issues, or permission problems.',
          userAction: 'Please check your meeting details and try again. If the problem persists, contact support.',
          errorId: errorId
        })
      }
    } catch (error) {
      console.error('Error saving meeting:', error)
      
      showError(error as Error, {
        title: 'Meeting Creation Failed',
        summary: 'Network or server error occurred',
        explanation: 'There was a problem connecting to the server or processing your request. This could be a temporary network issue.',
        userAction: 'Please check your internet connection and try again. If the problem continues, contact support.',
        errorId: 'MEETING-NETWORK-001'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {meeting ? 'Edit Meeting' : 'Create New Meeting'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Meeting Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter meeting title"
                required
              />
            </div>

            {/* Meeting Presets - Only for supervisors creating new meetings */}
            {!meeting && user?.role === 'SUPERVISOR' && (
              <div className="space-y-3">
                <Label>Meeting Type Presets</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    type="button"
                    variant={selectedPreset === 'individual' ? 'default' : 'outline'}
                    onClick={() => handlePresetSelect('individual')}
                    className="h-auto p-4 flex flex-col items-center gap-2 text-left"
                  >
                    <User className="h-5 w-5" />
                    <div>
                      <div className="font-medium">Individual Supervision</div>
                      <div className="text-xs text-gray-600 mt-1">
                        One supervisee only
                      </div>
                    </div>
                  </Button>
                  
                  <Button
                    type="button"
                    variant={selectedPreset === 'group' ? 'default' : 'outline'}
                    onClick={() => handlePresetSelect('group')}
                    className="h-auto p-4 flex flex-col items-center gap-2 text-left"
                  >
                    <Users2 className="h-5 w-5" />
                    <div>
                      <div className="font-medium">Group Supervision</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Multiple supervisees + others
                      </div>
                    </div>
                  </Button>
                  
                  <Button
                    type="button"
                    variant={selectedPreset === 'general' ? 'default' : 'outline'}
                    onClick={() => handlePresetSelect('general')}
                    className="h-auto p-4 flex flex-col items-center gap-2 text-left"
                  >
                    <Globe className="h-5 w-5" />
                    <div>
                      <div className="font-medium">General Meeting</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Invite anyone
                      </div>
                    </div>
                  </Button>
                </div>
                
                {selectedPreset && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                    <Badge variant="secondary" className="text-xs">
                      {selectedPreset === 'individual' && 'Individual'}
                      {selectedPreset === 'group' && 'Group'}
                      {selectedPreset === 'general' && 'General'}
                    </Badge>
                    <span>{getPresetDescription(selectedPreset)}</span>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter meeting description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="Meeting location"
                    className={`pl-10 ${fieldErrors.location ? 'border-red-500 bg-red-50' : ''}`}
                  />
                </div>
                {fieldErrors.location && (
                  <p className="text-red-600 text-sm mt-1">{fieldErrors.location}</p>
                )}
              </div>

              <div>
                <Label htmlFor="meeting_url">Meeting URL</Label>
                <div className="relative">
                  <Link className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="meeting_url"
                    type="url"
                    value={formData.meeting_url}
                    onChange={(e) => handleInputChange('meeting_url', e.target.value)}
                    placeholder="https://..."
                    className={`pl-10 ${fieldErrors.meeting_url ? 'border-red-500 bg-red-50' : ''}`}
                  />
                </div>
                {fieldErrors.meeting_url && (
                  <p className="text-red-600 text-sm mt-1">{fieldErrors.meeting_url}</p>
                )}
              </div>
            </div>
          </div>

          {/* Scheduling */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Scheduling</h3>
            
            {/* Start Date and Time */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Start Date & Time *</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="start_date" className="text-xs text-gray-600">Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="start_time" className="text-xs text-gray-600">Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={convertTo24Hour(startTime, startAmPm)}
                    onChange={(e) => {
                      const time24 = e.target.value
                      const time12 = convertTo12Hour(time24)
                      setStartTime(time12.time)
                      setStartAmPm(time12.amPm)
                    }}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="start_ampm" className="text-xs text-gray-600">AM/PM</Label>
                  <Select value={startAmPm} onValueChange={handleStartAmPmChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Duration */}
            <div>
              <Label htmlFor="duration">Duration</Label>
              <Select
                value={formData.duration_minutes.toString()}
                onValueChange={(value) => handleDurationChange(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="180">3 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* End Time Display (Read-only) */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">End Time</Label>
              <div className="p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Clock className="h-4 w-4" />
                  <span>
                    {formData.start_time && formData.duration_minutes 
                      ? (() => {
                          const start = new Date(formData.start_time)
                          const end = new Date(start.getTime() + formData.duration_minutes * 60 * 1000)
                          const endDate = end.toLocaleDateString('en-AU', {
                            day: '2-digit',
                            month: '2-digit', 
                            year: 'numeric'
                          })
                          const endTime = end.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: true
                          })
                          return `${endDate} at ${endTime}`
                        })()
                      : 'Set start time and duration to see end time'
                    }
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Automatically calculated from start time + duration
              </p>
            </div>
          </div>

          {/* Recurrence */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_recurring"
                checked={formData.is_recurring}
                onCheckedChange={handleRecurringChange}
              />
              <Label htmlFor="is_recurring">Recurring meeting</Label>
            </div>

            {formData.is_recurring && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recurrence_type">Repeat</Label>
                  <Select
                    value={formData.recurrence_type}
                    onValueChange={(value) => handleInputChange('recurrence_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="recurrence_end_date">End Date</Label>
                  <Input
                    id="recurrence_end_date"
                    type="date"
                    value={formData.recurrence_end_date}
                    onChange={(e) => handleInputChange('recurrence_end_date', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Attendees */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Attendees</h3>
            
            {/* Supervisees List (for supervisors) */}
            {supervisees.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">Your Supervisees</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {supervisees.map((supervisee) => {
                    const isAlreadyAdded = formData.attendee_emails.includes(supervisee.email)
                    const canAdd = canAddAttendee(supervisee.email)
                    const isDisabled = isAlreadyAdded || !canAdd
                    
                    return (
                      <div key={supervisee.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-blue-900 truncate">
                            {supervisee.full_name}
                          </p>
                          <p className="text-xs text-blue-700 truncate">
                            {supervisee.email}
                          </p>
                          <p className="text-xs text-blue-600">
                            {supervisee.role} Supervisor
                          </p>
                          {!canAdd && selectedPreset === 'individual' && (
                            <p className="text-xs text-red-600 mt-1">
                              Individual supervision limited to one supervisee
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addSupervisee(supervisee)}
                          disabled={isDisabled}
                          className={`ml-2 ${
                            isDisabled 
                              ? 'text-gray-400 border-gray-300 cursor-not-allowed' 
                              : 'text-blue-600 border-blue-300 hover:bg-blue-100'
                          }`}
                          title={
                            isAlreadyAdded 
                              ? 'Already added' 
                              : !canAdd && selectedPreset === 'individual'
                              ? 'Individual supervision limited to one supervisee'
                              : 'Add to meeting'
                          }
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            
            {/* Add Other Attendees */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Add Other Attendees</Label>
              {selectedPreset === 'individual' && formData.attendee_emails.length > 0 && (
                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                  Individual supervision allows only one supervisee. Adding other attendees will change this to a general meeting.
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={newAttendeeEmail}
                  onChange={(e) => setNewAttendeeEmail(e.target.value)}
                  placeholder="Enter email address"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAttendee())}
                />
                <Button type="button" onClick={addAttendee} variant="outline">
                  <Users className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Current Attendees List */}
            {formData.attendee_emails.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Invited Attendees</Label>
                {formData.attendee_emails.map((email, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{email}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttendee(email)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4">
            {/* Download ICS button (only for existing meetings) */}
            {meeting?.id && (
              <Button
                type="button"
                variant="outline"
                onClick={() => downloadICS(meeting.id)}
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Calendar File
              </Button>
            )}
            
            {/* Form actions */}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : (meeting ? 'Update Meeting' : 'Create Meeting')}
              </Button>
            </div>
          </div>
          </form>
        </CardContent>
      </Card>
      
      {/* Error Overlay */}
      {showErrorOverlay && currentError && (
        <ErrorOverlay
          error={currentError}
          onClose={dismissError}
          isOpen={showErrorOverlay}
        />
      )}
    </>
  )
}
