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
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Link, 
  Users,
  X
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'

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

interface MeetingFormProps {
  meeting?: Meeting
  onSave: (meeting: Meeting) => void
  onCancel: () => void
  supervisionId?: number
}

export default function MeetingForm({ meeting, onSave, onCancel, supervisionId }: MeetingFormProps) {
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

  useEffect(() => {
    if (meeting) {
      setFormData(meeting)
    } else {
      // Set default start time to next hour
      const now = new Date()
      const nextHour = new Date(now.getTime() + 60 * 60 * 1000)
      const endTime = new Date(nextHour.getTime() + 60 * 60 * 1000)
      
      setFormData(prev => ({
        ...prev,
        start_time: nextHour.toISOString().slice(0, 16),
        end_time: endTime.toISOString().slice(0, 16),
        supervision: supervisionId
      }))
    }
  }, [meeting, supervisionId])

  // Update end time when start time or duration changes
  useEffect(() => {
    if (formData.start_time && formData.duration_minutes) {
      const calculatedEndTime = calculateEndTime(formData.start_time, formData.duration_minutes)
      if (calculatedEndTime !== formData.end_time) {
        setFormData(prev => ({
          ...prev,
          end_time: calculatedEndTime
        }))
      }
    }
  }, [formData.start_time, formData.duration_minutes])

  const handleInputChange = (field: keyof Meeting, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
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
      setFormData(prev => ({
        ...prev,
        attendee_emails: [...prev.attendee_emails, newAttendeeEmail]
      }))
      setNewAttendeeEmail('')
    }
  }

  const removeAttendee = (email: string) => {
    setFormData(prev => ({
      ...prev,
      attendee_emails: prev.attendee_emails.filter(e => e !== email)
    }))
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

  const handleStartTimeChange = (startTime: string) => {
    setFormData(prev => ({
      ...prev,
      start_time: startTime
      // End time will be updated by useEffect
    }))
  }

  const handleEndTimeChange = (endTime: string) => {
    setFormData(prev => ({
      ...prev,
      end_time: endTime
    }))
  }

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast.error('Meeting title is required')
      return false
    }
    if (!formData.start_time) {
      toast.error('Start time is required')
      return false
    }
    if (!formData.end_time) {
      toast.error('End time is required')
      return false
    }
    if (new Date(formData.start_time) >= new Date(formData.end_time)) {
      toast.error('End time must be after start time')
      return false
    }
    if (formData.is_recurring && formData.recurrence_type === 'NONE') {
      toast.error('Please select a recurrence type for recurring meetings')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    try {
      const url = meeting ? `/api/meetings/${meeting.id}/` : '/api/meetings/'
      const method = meeting ? 'PUT' : 'POST'
      
      // Prepare data for API - convert datetime-local format to ISO string
      const apiData = {
        ...formData,
        start_time: formData.start_time ? new Date(formData.start_time).toISOString() : null,
        end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null,
        recurrence_end_date: formData.recurrence_end_date ? new Date(formData.recurrence_end_date).toISOString() : null,
      }
      
      // Keep organizer in data for API
      
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
        toast.success(meeting ? 'Meeting updated successfully' : 'Meeting created successfully')
        onSave(savedMeeting)
      } else {
        const error = await response.json()
        console.error('Meeting save error:', error)
        toast.error(error.error || 'Failed to save meeting')
      }
    } catch (error) {
      console.error('Error saving meeting:', error)
      toast.error('Failed to save meeting')
    } finally {
      setLoading(false)
    }
  }

  return (
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
                    className="pl-10"
                  />
                </div>
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
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Scheduling */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Scheduling</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="start_time">Start Time *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
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

              <div>
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Automatically calculated from start time + duration, but can be manually adjusted
                </p>
              </div>
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

            {formData.attendee_emails.length > 0 && (
              <div className="space-y-2">
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
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (meeting ? 'Update Meeting' : 'Create Meeting')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
