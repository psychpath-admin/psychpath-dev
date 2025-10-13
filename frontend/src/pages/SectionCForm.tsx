import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import { createSupervisionEntry, updateSupervisionEntry, apiFetch } from '@/lib/api'

interface SectionCFormProps {
  onCancel: () => void
  entryId?: string
}

interface EntryForm {
  supervisor_name: string
  supervisor_type: 'PRINCIPAL' | 'SECONDARY' | ''
  supervision_type: 'INDIVIDUAL' | 'GROUP' | 'OTHER' | ''
  date_of_supervision: string
  duration_minutes: string
  summary: string
}

interface UserProfile {
  principal_supervisor: string
  secondary_supervisor: string
}

const SUPERVISOR_TYPES = [
  { value: 'PRINCIPAL', label: 'Principal' },
  { value: 'SECONDARY', label: 'Secondary' }
]

const SUPERVISION_TYPES = [
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'GROUP', label: 'Group' },
  { value: 'OTHER', label: 'Other' }
]

function SectionCForm({ onCancel, entryId }: SectionCFormProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [formData, setFormData] = useState<EntryForm>({
    supervisor_name: '',
    supervisor_type: '',
    supervision_type: '',
    date_of_supervision: new Date().toISOString().split('T')[0],
    duration_minutes: '60',
    summary: ''
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
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

  // Fetch user profile to get supervisor names
  const fetchUserProfile = async () => {
    try {
      const response = await apiFetch('/api/user-profile/')
      if (response.ok) {
        const profile = await response.json()
        setUserProfile({
          principal_supervisor: profile.principal_supervisor || '',
          secondary_supervisor: profile.secondary_supervisor || ''
        })
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
    }
  }

  // Create supervisor options from user profile
  const getSupervisorOptions = () => {
    const options = []
    
    if (userProfile?.principal_supervisor) {
      options.push({
        value: userProfile.principal_supervisor,
        label: userProfile.principal_supervisor,
        type: 'PRINCIPAL'
      })
    }
    
    if (userProfile?.secondary_supervisor) {
      options.push({
        value: userProfile.secondary_supervisor,
        label: userProfile.secondary_supervisor,
        type: 'SECONDARY'
      })
    }
    
    // If no supervisors are configured, add a custom option
    if (options.length === 0) {
      options.push({
        value: 'custom',
        label: 'Enter supervisor name manually',
        type: 'CUSTOM'
      })
    }
    
    return options
  }

  // Handle supervisor selection - automatically set supervisor type
  const handleSupervisorChange = (value: string) => {
    const supervisorOptions = getSupervisorOptions()
    const selectedOption = supervisorOptions.find(option => option.value === value)
    
    if (selectedOption) {
      if (selectedOption.type === 'CUSTOM') {
        // Show manual input field
        setFormData(prev => ({ 
          ...prev, 
          supervisor_name: '', 
          supervisor_type: '' 
        }))
      } else {
        // Set supervisor name and type automatically
        setFormData(prev => ({ 
          ...prev, 
          supervisor_name: selectedOption.value,
          supervisor_type: selectedOption.type as 'PRINCIPAL' | 'SECONDARY'
        }))
      }
    }
  }

  // Fetch user profile on component mount
  useEffect(() => {
    fetchUserProfile()
  }, [])

  // If launched from +C on a specific logbook, default the date to that week
  useEffect(() => {
    if (logbookWeek) {
      setFormData(prev => ({ ...prev, date_of_supervision: logbookWeek }))
    }
  }, [logbookWeek])

  // Load existing entry data when editing
  useEffect(() => {
    if (entryId) {
      setLoading(true)
      // Note: We'll need to implement getSupervisionEntry or use a different approach
      // For now, we'll skip loading existing entry data
      setLoading(false)
    }
  }, [entryId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const weekStarting = calculateWeekStarting(formData.date_of_supervision)
      
      const entryData = {
        ...formData,
        supervisor_type: formData.supervisor_type as 'PRINCIPAL' | 'SECONDARY',
        supervision_type: formData.supervision_type as 'INDIVIDUAL' | 'GROUP' | 'OTHER',
        duration_minutes: parseInt(formData.duration_minutes),
        week_starting: weekStarting
      }

      if (isEditing) {
        await updateSupervisionEntry(parseInt(entryId!), entryData)
      } else {
        await createSupervisionEntry(entryData)
      }

      navigate('/section-c')
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
              Section C: Supervision Entry
            </CardTitle>
            <Button variant="outline" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Supervisor Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Supervisor Name *
                </label>
                <Select
                  value={formData.supervisor_name}
                  onValueChange={handleSupervisorChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    {getSupervisorOptions().map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Manual input field - shown when custom option is selected or no supervisors configured */}
                {(!userProfile?.principal_supervisor && !userProfile?.secondary_supervisor) && (
                  <div className="mt-2">
                    <Input
                      value={formData.supervisor_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, supervisor_name: e.target.value }))}
                      placeholder="Enter supervisor name manually"
                      required
                    />
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Principal or Secondary? *
                </label>
                <Select
                  value={formData.supervisor_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, supervisor_type: value as 'PRINCIPAL' | 'SECONDARY' }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supervisor type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPERVISOR_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Supervision Type and Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Supervision Type *
                </label>
                <Select
                  value={formData.supervision_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, supervision_type: value as 'INDIVIDUAL' | 'GROUP' | 'OTHER' }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supervision type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPERVISION_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Date of Supervision *
                </label>
                <Input
                  type="date"
                  value={formData.date_of_supervision}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_of_supervision: e.target.value }))}
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

            {/* Summary */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Supervision Summary *
              </label>
              <Textarea
                value={formData.summary}
                onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Summarize the key points discussed, learning outcomes, and areas for development..."
                rows={6}
                required
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

export default SectionCForm
