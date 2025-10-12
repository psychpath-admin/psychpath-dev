import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { createSectionAEntry, updateSectionAEntry, getSectionAEntry } from '@/lib/api'
import { toast } from 'sonner'

interface CRAFormProps {
  onCancel: () => void
  entryId?: string
  parentDccId?: number // For linking CRA to parent DCC entry
  returnTo?: string // Where to return after completion
}

interface EntryForm {
  activity_date: string
  activity_type: string
  custom_activity_type: string
  duration_hours: string
  reflection: string
  entry_type: string
  parent_dcc_entry: number | null
}

const DEFAULT_ACTIVITY_TYPES = [
  'Problem formulation',
  'Diagnosis',
  'Treatment planning/modification',
  'Reporting/consultation'
]

function CRAForm({ onCancel, entryId, parentDccId, returnTo }: CRAFormProps) {
  const location = useLocation()
  const [formData, setFormData] = useState<EntryForm>({
    activity_date: new Date().toISOString().split('T')[0],
    activity_type: '',
    custom_activity_type: '',
    duration_hours: '1.0',
    reflection: '',
    entry_type: 'cra',
    parent_dcc_entry: parentDccId || null
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [customActivityTypes, setCustomActivityTypes] = useState<string[]>([])
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [newCustomType, setNewCustomType] = useState('')
  const [parentDccData, setParentDccData] = useState<any>(null)
  const [crossWeekWarning, setCrossWeekWarning] = useState<string>('')
  const [crossWeekInfo, setCrossWeekInfo] = useState<any>(null)
  const [userAcknowledgedCrossWeek, setUserAcknowledgedCrossWeek] = useState(false)
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

  // Validate CRA date against parent DCC date
  const validateCRADate = async (craDate: string) => {
    if (!parentDccData || !parentDccData.session_date) {
      return { isValid: true, warning: '', crossWeekInfo: null }
    }

    const parentDate = new Date(parentDccData.session_date)
    const craDateObj = new Date(craDate)
    
    // Allow CRA date to be up to 7 days before or after the parent DCC date
    const daysDiff = Math.abs((craDateObj.getTime() - parentDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff > 7) {
      return {
        isValid: false,
        warning: `CRA date is ${Math.round(daysDiff)} days from the parent DCC date (${parentDccData.session_date}). CRA activities should be related to the DCC session.`,
        crossWeekInfo: null
      }
    }

    // Check if dates are in different weeks
    const parentWeekStart = calculateWeekStarting(parentDccData.session_date)
    const craWeekStart = calculateWeekStarting(craDate)
    
    if (parentWeekStart !== craWeekStart) {
      // Calculate week ending dates
      const parentWeekEnd = new Date(parentWeekStart)
      parentWeekEnd.setDate(parentWeekEnd.getDate() + 6)
      
      const craWeekEnd = new Date(craWeekStart)
      craWeekEnd.setDate(craWeekEnd.getDate() + 6)
      
      // Check target logbook status
      const targetStatus = await checkTargetLogbookStatus(craWeekStart)
      
      const crossWeekInfo = {
        parentWeek: `${parentWeekStart} to ${parentWeekEnd.toISOString().split('T')[0]}`,
        craWeek: `${craWeekStart} to ${craWeekEnd.toISOString().split('T')[0]}`,
        daysDiff: Math.round(daysDiff),
        reason: daysDiff <= 2 ? 'Planning before session or case notes after' : 
                daysDiff <= 4 ? 'Extended preparation or follow-up work' : 
                'Extended activity related to session',
        targetLogbookStatus: targetStatus
      }
      
      // Determine validation based on target logbook status
      let isValid = true
      let warning = ''
      
      if (targetStatus === 'approved') {
        isValid = false
        warning = `❌ Cannot create CRA: Target logbook (week ${craWeekStart}) is already approved. Approved logbooks cannot be modified.`
      } else if (targetStatus === 'submitted') {
        isValid = false
        warning = `❌ Cannot create CRA: Target logbook (week ${craWeekStart}) is currently under review. Please wait for supervisor review to complete.`
      } else {
        warning = `⚠️ CRA date is in a different week than the parent DCC date. This is allowed but will affect logbook organization.`
      }
      
      return {
        isValid,
        warning,
        crossWeekInfo
      }
    }

    return { isValid: true, warning: '', crossWeekInfo: null }
  }

  // Check the status of the target logbook for cross-week scenarios
  const checkTargetLogbookStatus = async (craWeekStart: string) => {
    try {
      const response = await fetch(`/api/logbook/week/${craWeekStart}/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const logbook = await response.json()
        return logbook.status || 'draft'
      } else if (response.status === 404) {
        // No logbook exists for this week yet
        return 'draft'
      } else {
        console.error('Failed to check logbook status')
        return null
      }
    } catch (error) {
      console.error('Error checking logbook status:', error)
      return null
    }
  }

  // Load custom activity types and parent DCC data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load custom activity types
        const response = await fetch('/api/section-a/custom-activity-types/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setCustomActivityTypes(data.map((item: any) => item.name))
        } else {
          console.error('Failed to load custom activity types')
        }

        // Load parent DCC data if we have a parent DCC ID
        if (parentDccId && !isEditing) {
          try {
            const parentDcc = await getSectionAEntry(parentDccId)
            setParentDccData(parentDcc)
            
            // Set the CRA date to the same as the parent DCC date initially
            setFormData(prev => ({
              ...prev,
              activity_date: parentDcc.session_date || prev.activity_date
            }))
            
            toast.success(`Prefilled CRA form from parent DCC entry with client ${parentDcc.client_id}`)
          } catch (error) {
            console.error('Failed to load parent DCC entry:', error)
            toast.error('Failed to load parent DCC entry data')
          }
        }
      } catch (error) {
        console.error('Failed to load initial data:', error)
      }
    }
    
    loadInitialData()
  }, [parentDccId, isEditing])

  // If launched from a specific logbook, default the date to that week
  useEffect(() => {
    if (logbookWeek) {
      setFormData(prev => ({ ...prev, activity_date: logbookWeek }))
    }
  }, [logbookWeek])

  // Load existing entry data when editing
  useEffect(() => {
    if (entryId) {
      setLoading(true)
      getSectionAEntry(parseInt(entryId))
        .then(entry => {
          // If the entry has session_activity_types, use the first one as the activity type
          let activityType = entry.activity_type || ''
          let customActivityType = entry.custom_activity_type || ''
          
          if (entry.session_activity_types && entry.session_activity_types.length > 0) {
            const firstActivityType = entry.session_activity_types[0]
            // Check if it's a custom activity type (not in the default list)
            if (DEFAULT_ACTIVITY_TYPES.includes(firstActivityType)) {
              activityType = firstActivityType
            } else {
              customActivityType = firstActivityType
            }
          }
          
          setFormData({
            activity_date: entry.session_date || entry.activity_date || '',
            activity_type: activityType,
            custom_activity_type: customActivityType,
            duration_hours: entry.duration_hours?.toString() || (entry.duration_minutes ? (entry.duration_minutes / 60).toString() : '1.0'),
            reflection: entry.reflection || entry.reflections_on_experience || '',
            entry_type: entry.entry_type || 'cra',
            parent_dcc_entry: entry.parent_dcc_entry || null
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

  // Validate CRA date when it changes
  useEffect(() => {
    const validateDate = async () => {
      if (formData.activity_date && parentDccData) {
        const validation = await validateCRADate(formData.activity_date)
        setCrossWeekWarning(validation.warning)
        setCrossWeekInfo(validation.crossWeekInfo)
        
        // Reset acknowledgment if cross-week status changes
        if (validation.crossWeekInfo && !userAcknowledgedCrossWeek) {
          setUserAcknowledgedCrossWeek(false)
        } else if (!validation.crossWeekInfo) {
          setUserAcknowledgedCrossWeek(false)
        }
      } else {
        setCrossWeekWarning('')
        setCrossWeekInfo(null)
        setUserAcknowledgedCrossWeek(false)
      }
    }
    
    validateDate()
  }, [formData.activity_date, parentDccData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.activity_date) {
      toast.error('Activity date is required')
      return
    }
    
    if (!formData.activity_type && !formData.custom_activity_type) {
      toast.error('Activity type is required')
      return
    }
    
    if (!formData.duration_hours) {
      toast.error('Duration is required')
      return
    }

    // Validate CRA date against parent DCC date
    if (parentDccData) {
      const validation = await validateCRADate(formData.activity_date)
      if (!validation.isValid) {
        toast.error(validation.warning)
        return
      }
      
      // Require acknowledgment for cross-week scenarios (only if allowed)
      if (validation.crossWeekInfo && !userAcknowledgedCrossWeek && validation.isValid) {
        toast.error('Please acknowledge the cross-week warning before submitting')
        return
      }
    }

    setSaving(true)

    try {
      const weekStarting = calculateWeekStarting(formData.activity_date)
      
      // Determine the activity type for session_activity_types array
      const activityTypeForDisplay = formData.custom_activity_type || formData.activity_type
      
      const entryData = {
        session_date: formData.activity_date, // Map activity_date to session_date for backend
        activity_type: formData.activity_type,
        custom_activity_type: formData.custom_activity_type,
        session_activity_types: activityTypeForDisplay ? [activityTypeForDisplay] : [], // Populate the display field
        duration_hours: parseFloat(formData.duration_hours),
        duration_minutes: Math.round(parseFloat(formData.duration_hours) * 60), // Convert to minutes for backend
        reflections_on_experience: formData.reflection, // Map reflection to reflections_on_experience
        entry_type: formData.entry_type,
        week_starting: weekStarting,
        // Include client_id from parent DCC entry if available
        ...(parentDccData?.client_id && { client_id: parentDccData.client_id }),
        ...(formData.parent_dcc_entry && { parent_dcc_entry: formData.parent_dcc_entry })
      }

      if (isEditing && entryId) {
        await updateSectionAEntry(parseInt(entryId), entryData)
        toast.success('CRA entry updated successfully!')
      } else {
        await createSectionAEntry(entryData)
        let message = formData.parent_dcc_entry 
          ? 'CRA entry created and linked to DCC successfully!' 
          : 'CRA entry created successfully!'
        
        // Add cross-week information to success message
        if (crossWeekInfo) {
          message += ` Note: CRA is in week ${crossWeekInfo.craWeek.split(' to ')[0]} while DCC is in week ${crossWeekInfo.parentWeek.split(' to ')[0]}.`
        }
        
        toast.success(message)
      }
      onCancel()
    } catch (error) {
      console.error('Error creating entry:', error)
      toast.error('Failed to create CRA entry')
    } finally {
      setSaving(false)
    }
  }

  const handleAddCustomActivityType = async () => {
    if (newCustomType.trim() && !customActivityTypes.includes(newCustomType.trim())) {
      try {
        const response = await fetch('/api/section-a/custom-activity-types/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: newCustomType.trim()
          })
        })
        
        if (response.ok) {
          const updated = [...customActivityTypes, newCustomType.trim()]
          setCustomActivityTypes(updated)
          setFormData(prev => ({ ...prev, activity_type: '', custom_activity_type: newCustomType.trim() }))
          setNewCustomType('')
          setShowCustomInput(false)
          
          toast.success(`Added "${newCustomType.trim()}" to your custom activity types`)
        } else {
          toast.error('Failed to add custom activity type')
        }
      } catch (error) {
        console.error('Failed to add custom activity type:', error)
        toast.error('Failed to add custom activity type')
      }
    }
  }

  const handleRemoveCustomActivityType = async (typeToRemove: string) => {
    try {
      // Find the ID of the custom activity type to delete
      const response = await fetch('/api/section-a/custom-activity-types/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const itemToDelete = data.find((item: any) => item.name === typeToRemove)
        
        if (itemToDelete) {
          const deleteResponse = await fetch(`/api/section-a/custom-activity-types/${itemToDelete.id}/`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (deleteResponse.ok) {
            const updated = customActivityTypes.filter(type => type !== typeToRemove)
            setCustomActivityTypes(updated)
            toast.success(`Removed "${typeToRemove}" from your custom activity types`)
          } else {
            toast.error('Failed to remove custom activity type')
          }
        }
      }
    } catch (error) {
      console.error('Failed to remove custom activity type:', error)
      toast.error('Failed to remove custom activity type')
    }
  }

  const handleActivityTypeChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomInput(true)
      setFormData(prev => ({ ...prev, activity_type: '', custom_activity_type: '' }))
    } else {
      setShowCustomInput(false)
      setFormData(prev => ({ ...prev, activity_type: value, custom_activity_type: '' }))
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
              Section A: Client Related Activity (CRA)
            </CardTitle>
            <Button variant="outline" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
            {/* Activity Date */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Date of Activity *
              </label>
              <Input
                type="date"
                value={formData.activity_date}
                onChange={(e) => setFormData(prev => ({ ...prev, activity_date: e.target.value }))}
                required
              />
              {parentDccData && (
                <p className="text-sm text-gray-600 mt-1">
                  Related to DCC entry: {parentDccData.session_date} (Client: {parentDccData.client_id})
                </p>
              )}
              {crossWeekWarning && (
                <div className={`mt-2 p-3 rounded text-sm ${
                  crossWeekWarning.includes('⚠️') 
                    ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  <div className="font-medium">{crossWeekWarning}</div>
                  
                  {crossWeekInfo && (
                    <div className="mt-2 space-y-1">
                      <div className="text-xs">
                        <strong>DCC Week:</strong> {crossWeekInfo.parentWeek}
                      </div>
                      <div className="text-xs">
                        <strong>CRA Week:</strong> {crossWeekInfo.craWeek}
                      </div>
                      <div className="text-xs">
                        <strong>Days Apart:</strong> {crossWeekInfo.daysDiff} days
                      </div>
                      <div className="text-xs">
                        <strong>Likely Reason:</strong> {crossWeekInfo.reason}
                      </div>
                      
                      {crossWeekInfo.targetLogbookStatus && (
                        <div className="text-xs">
                          <strong>Target Logbook Status:</strong> 
                          <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${
                            crossWeekInfo.targetLogbookStatus === 'approved' 
                              ? 'bg-green-100 text-green-800' 
                              : crossWeekInfo.targetLogbookStatus === 'submitted'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {crossWeekInfo.targetLogbookStatus}
                          </span>
                        </div>
                      )}
                      
                      {/* Only show acknowledgment checkbox if submission is allowed */}
                      {crossWeekInfo.targetLogbookStatus !== 'approved' && crossWeekInfo.targetLogbookStatus !== 'submitted' && (
                        <div className="mt-2 pt-2 border-t border-yellow-300">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={userAcknowledgedCrossWeek}
                              onChange={(e) => setUserAcknowledgedCrossWeek(e.target.checked)}
                              className="rounded border-yellow-300 text-yellow-600 focus:ring-yellow-500"
                            />
                            <span className="text-xs">
                              I understand this CRA will appear in a different week than the related DCC entry
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Activity Type Dropdown */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Problem formulation, diagnosis, treatment planning/modification, reporting/consultation *
              </label>
              <Select value={formData.activity_type || formData.custom_activity_type || ''} onValueChange={handleActivityTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select activity type..." />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_ACTIVITY_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                  {customActivityTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add new option...
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {/* Custom Activity Type Input */}
              {showCustomInput && (
                <div className="mt-3 flex gap-2">
                  <Input
                    value={newCustomType}
                    onChange={(e) => setNewCustomType(e.target.value)}
                    placeholder="Enter new activity type..."
                    className="flex-1"
                  />
                  <Button type="button" onClick={handleAddCustomActivityType} disabled={!newCustomType.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowCustomInput(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {/* Display Custom Activity Types */}
              {customActivityTypes.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">Your custom activity types:</p>
                  <div className="flex flex-wrap gap-2">
                    {customActivityTypes.map(type => (
                      <div key={type} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm">
                        {type}
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomActivityType(type)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Duration (Hours) *
              </label>
              <Input
                type="number"
                value={formData.duration_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_hours: e.target.value }))}
                placeholder="e.g., 1.5"
                min="0.1"
                step="0.1"
                required
              />
              
              {/* Quick duration links */}
              <div className="flex flex-wrap gap-2 mt-2">
                {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0].map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, duration_hours: hours.toString() }))}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    {hours} Hours
                  </button>
                ))}
              </div>
            </div>

            {/* Reflection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Reflection (Optional)
              </label>
              <Textarea
                value={formData.reflection}
                onChange={(e) => setFormData(prev => ({ ...prev, reflection: e.target.value }))}
                placeholder="Describe what you did during this activity..."
                rows={4}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-4 pt-6">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : isEditing ? 'Update CRA Entry' : 'Create CRA Entry'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default CRAForm