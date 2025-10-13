import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft } from 'lucide-react'
import { createPDEntry, updatePDEntry, getPDEntry } from '@/lib/api'

interface SectionBFormProps {
  onCancel: () => void
  entryId?: string
}

interface EntryForm {
  activity_type: string
  date_of_activity: string
  duration_minutes: string
  activity_details: string
  topics_covered: string
  competencies_covered: string[]
  reflection: string
}

const ACTIVITY_TYPES = [
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'WEBINAR', label: 'Webinar' },
  { value: 'LECTURE', label: 'Lecture' },
  { value: 'PRESENTATION', label: 'Presentation' },
  { value: 'READING', label: 'Reading' },
  { value: 'COURSE', label: 'Course' },
  { value: 'CONFERENCE', label: 'Conference' },
  { value: 'TRAINING', label: 'Training' },
  { value: 'OTHER', label: 'Other' }
]

function SectionBForm({ onCancel, entryId }: SectionBFormProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [formData, setFormData] = useState<EntryForm>({
    activity_type: '',
    date_of_activity: new Date().toISOString().split('T')[0],
    duration_minutes: '60',
    activity_details: '',
    topics_covered: '',
    competencies_covered: [],
    reflection: ''
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const isEditing = !!entryId
  
  // Get logbook week information from location state
  const logbookWeek = (location.state as any)?.logbookWeek as string | undefined
  
  // Helper function to calculate week starting date
  const calculateWeekStarting = (dateString: string) => {
    const date = new Date(dateString)
    const dayOfWeek = date.getDay() // 0 for Sunday, 1 for Monday, etc.
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust to Monday
    const weekStart = new Date(date.setDate(diff))
    return weekStart.toISOString().split('T')[0]
  }

  // If launched from +B on a specific logbook, default the date to that week
  useEffect(() => {
    if (logbookWeek) {
      setFormData(prev => ({ ...prev, date_of_activity: logbookWeek }))
    }
  }, [logbookWeek])

  // Load existing entry data when editing
  useEffect(() => {
    if (entryId) {
      setLoading(true)
      getPDEntry(parseInt(entryId))
        .then(entry => {
          setFormData({
            activity_type: entry.activity_type || '',
            date_of_activity: entry.date_of_activity || '',
            duration_minutes: entry.duration_minutes?.toString() || '60',
            activity_details: entry.activity_details || '',
            topics_covered: entry.topics_covered || '',
            competencies_covered: entry.competencies_covered || [],
            reflection: entry.reflection || ''
          })
        })
        .catch(error => {
          console.error('Failed to load entry:', error)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [entryId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const weekStarting = calculateWeekStarting(formData.date_of_activity)
      
      const entryData = {
        ...formData,
        duration_minutes: parseInt(formData.duration_minutes),
        week_starting: weekStarting
      }

      if (isEditing) {
        await updatePDEntry(parseInt(entryId!), entryData)
      } else {
        await createPDEntry(entryData)
      }

      navigate('/section-b')
    } catch (error) {
      console.error('Failed to save entry:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading entry...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">
              Section B: Professional Development Entry
            </CardTitle>
            <Button variant="outline" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Activity Type and Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Activity Type *
                </label>
                <Select
                  value={formData.activity_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, activity_type: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Date of Activity *
                </label>
                <Input
                  type="date"
                  value={formData.date_of_activity}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_of_activity: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Duration (minutes) *
              </label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                placeholder="e.g., 60"
                min="1"
                required
              />
              
              {/* Quick duration links */}
              <div className="flex flex-wrap gap-2 mt-2">
                {[15, 30, 45, 60, 75, 90, 120].map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, duration_minutes: minutes.toString() }))}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    {minutes === 120 ? '2 hours' : `${minutes} Minutes`}
                  </button>
                ))}
              </div>
            </div>

            {/* Activity Details */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Activity Details *
              </label>
              <Textarea
                value={formData.activity_details}
                onChange={(e) => setFormData(prev => ({ ...prev, activity_details: e.target.value }))}
                placeholder="E.g. name of course, presenter, institution etc"
                rows={3}
                required
              />
            </div>

            {/* Topics Covered */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Topics Covered *
              </label>
              <Textarea
                value={formData.topics_covered}
                onChange={(e) => setFormData(prev => ({ ...prev, topics_covered: e.target.value }))}
                placeholder="E.g. behavioural interventions for ADHD in adolescents"
                rows={3}
                required
              />
            </div>

            {/* Reflection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Reflection on Learning
              </label>
              <Textarea
                value={formData.reflection}
                onChange={(e) => setFormData(prev => ({ ...prev, reflection: e.target.value }))}
                placeholder="Reflect on what you learned and how you can apply it..."
                rows={4}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-4 pt-6">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : isEditing ? 'Update Entry' : 'Create Entry'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default SectionBForm
