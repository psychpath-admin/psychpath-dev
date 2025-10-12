import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Save, Plus } from 'lucide-react'
import { createSectionAEntry, updateSectionAEntry, getSectionAEntry } from '@/lib/api'
import { toast } from 'sonner'
import AutocompleteInput from '@/components/AutocompleteInput'
import { 
  getClientSuggestions, 
  getPlaceSuggestions, 
  getLastSessionData
} from '@/lib/autocompleteApi'
import { useErrorHandler, ErrorOverlay } from '@/lib/errors'

interface SectionAFormProps {
  onCancel: () => void
  entryId?: string
}

interface EntryForm {
  client_id: string
  session_date: string
  place_of_practice: string
  presenting_issues: string
  session_activity_types: string[]
  duration_minutes: string
  reflections_on_experience: string
  simulated: boolean
}

const ACTIVITY_TYPES = [
  'psychological_assessment',
  'intervention', 
  'prevention',
  'evaluation'
]

function SectionAForm({ onCancel, entryId }: SectionAFormProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { errorOverlay, showError } = useErrorHandler()
  const [formData, setFormData] = useState<EntryForm>({
    client_id: '',
    session_date: new Date().toISOString().split('T')[0],
    place_of_practice: '',
    presenting_issues: '',
    session_activity_types: [],
    duration_minutes: '50',
    reflections_on_experience: '',
    simulated: false
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clientSuggestions, setClientSuggestions] = useState<string[]>([])
  const [placeSuggestions, setPlaceSuggestions] = useState<string[]>([])
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

  // Load initial suggestions on component mount (without query for all suggestions)
  useEffect(() => {
    const loadInitialSuggestions = async () => {
      try {
        const [clients, places] = await Promise.all([
          getClientSuggestions(), // Load all client suggestions
          getPlaceSuggestions()   // Load all place suggestions
        ])
        setClientSuggestions(clients)
        setPlaceSuggestions(places)
      } catch (error) {
        console.error('Failed to load initial suggestions:', error)
      }
    }
    
    loadInitialSuggestions()
  }, [])

  // Dynamic client suggestions based on input
  const handleClientInputChange = async (value: string) => {
    setFormData(prev => ({ ...prev, client_id: value }))
    
    // If user has typed 2+ characters, fetch filtered suggestions
    if (value.length >= 2) {
      try {
        const filteredClients = await getClientSuggestions(value)
        setClientSuggestions(filteredClients)
      } catch (error) {
        console.error('Failed to load client suggestions:', error)
      }
    }
  }

  // Dynamic place suggestions based on input
  const handlePlaceInputChange = async (value: string) => {
    setFormData(prev => ({ ...prev, place_of_practice: value }))
    
    // If user has typed 2+ characters, fetch filtered suggestions
    if (value.length >= 2) {
      try {
        const filteredPlaces = await getPlaceSuggestions(value)
        setPlaceSuggestions(filteredPlaces)
      } catch (error) {
        console.error('Failed to load place suggestions:', error)
      }
    }
  }

  // If launched from +A on a specific logbook, default the session date to that week
  useEffect(() => {
    if (logbookWeek) {
      setFormData(prev => ({ ...prev, session_date: logbookWeek }))
    }
  }, [logbookWeek])

  // Load existing entry data when editing
  useEffect(() => {
    if (entryId) {
      setLoading(true)
      getSectionAEntry(parseInt(entryId))
        .then(entry => {
          setFormData({
            client_id: entry.client_id || '',
            session_date: entry.session_date || new Date().toISOString().split('T')[0],
            place_of_practice: entry.place_of_practice || '',
            presenting_issues: entry.presenting_issues || '',
            session_activity_types: entry.session_activity_types || [],
            duration_minutes: entry.duration_minutes?.toString() || '50',
            reflections_on_experience: entry.reflections_on_experience || '',
            simulated: entry.simulated || false
          })
        })
        .catch(error => {
          console.error('Error loading entry:', error)
          toast.error('Failed to load entry data')
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [entryId])

  const handleSubmit = async (action: 'dcc_only' | 'dcc_and_cra') => {
    if (!formData.client_id.trim()) {
      toast.error('Client ID is required')
      return
    }
    
    if (!formData.duration_minutes) {
      toast.error('Duration is required')
      return
    }
    
    if (formData.session_activity_types.length === 0) {
      toast.error('At least one session activity type is required')
      return
    }

    try {
      setSaving(true)
      
      const entryData = {
        entry_type: 'client_contact',
        simulated: formData.simulated,
        client_id: formData.client_id,
        session_date: formData.session_date,
        week_starting: logbookWeek || calculateWeekStarting(formData.session_date), // Use logbook week if provided, otherwise calculate from session date
        place_of_practice: formData.place_of_practice,
        presenting_issues: formData.presenting_issues,
        session_activity_types: formData.session_activity_types,
        duration_minutes: parseInt(formData.duration_minutes),
        reflections_on_experience: formData.reflections_on_experience,
      }

      let createdEntryId: number | null = null

      if (isEditing && entryId) {
        await updateSectionAEntry(parseInt(entryId), entryData)
        toast.success('DCC entry updated successfully!')
        createdEntryId = parseInt(entryId)
      } else {
        const response = await createSectionAEntry(entryData)
        createdEntryId = response.id
        toast.success('DCC entry created successfully!')
      }

      if (action === 'dcc_only') {
        onCancel() // Navigate back to dashboard
      } else if (action === 'dcc_and_cra') {
        // Navigate to CRA form with the created DCC entry ID
        // Use the returnTo from the original navigation state
        const originalReturnTo = (location.state as any)?.returnTo || '/section-a'
        
        navigate('/section-a/cra', { 
          state: { 
            parentDccId: createdEntryId,
            returnTo: originalReturnTo
          } 
        })
      }
    } catch (error: any) {
      console.error('Error creating entry:', error)
      
      // Check if it's a duplicate DCC error
      const errorMessage = error?.message || 'Failed to create DCC entry'
      
      if (errorMessage.includes('already exists for client')) {
        // Use the standard error handling system
        await showError(error, {
          title: 'Duplicate Session Entry',
          category: 'Validation',
          customExplanation: `The system prevents duplicate DCC entries for the same client on the same day to maintain accurate records.`,
          customUserAction: `**Option 1**: Change the session date if this was a different session.\n\n**Option 2**: Check "Simulated" if this is a practice/role-play session.\n\n**Option 3**: Edit the existing entry instead of creating a new one.`
        })
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleActivityTypeChange = (activityType: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      session_activity_types: checked 
        ? [...prev.session_activity_types, activityType]
        : prev.session_activity_types.filter(type => type !== activityType)
    }))
  }

  // Handle client selection and prefill previous session data
  const handleClientSelection = async (clientId: string) => {
    if (!clientId.trim()) return
    
    try {
      const lastSessionData = await getLastSessionData(clientId)
      
      // Prefill form fields with previous session data if available
      setFormData(prev => ({
        ...prev,
        client_id: clientId,
        place_of_practice: lastSessionData.place_of_practice || prev.place_of_practice,
        presenting_issues: lastSessionData.presenting_issues || prev.presenting_issues,
        session_activity_types: lastSessionData.session_activity_types.length > 0 
          ? lastSessionData.session_activity_types 
          : prev.session_activity_types
      }))
      
      if (lastSessionData.place_of_practice || lastSessionData.presenting_issues) {
        const prefilledFields = []
        if (lastSessionData.place_of_practice) prefilledFields.push('Place of Practice')
        if (lastSessionData.presenting_issues) prefilledFields.push('Presenting Issues')
        if (lastSessionData.session_activity_types?.length > 0) prefilledFields.push('Activity Types')
        
        toast.success(`Prefilled ${prefilledFields.join(', ')} from previous session with ${clientId}`)
      }
    } catch (error) {
      console.error('Failed to load previous session data:', error)
      // Still update the client ID even if prefill fails
      setFormData(prev => ({ ...prev, client_id: clientId }))
    }
  }

  const formatActivityType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading entry data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to DCC Logbook
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Edit DCC Entry' : 'Create New DCC Entry'}
          </h1>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Direct Client Contact Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Client Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Client Pseudonym *
                  </label>
                  <AutocompleteInput
                    value={formData.client_id}
                    onChange={handleClientInputChange}
                    onSuggestionSelect={handleClientSelection}
                    placeholder="e.g., Client-001"
                    suggestions={clientSuggestions}
                    required
                    minChars={2}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Session Date *
                  </label>
                  <Input
                    type="date"
                    value={formData.session_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, session_date: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Session Details */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Place of Practice
                </label>
                <AutocompleteInput
                  value={formData.place_of_practice}
                  onChange={handlePlaceInputChange}
                  placeholder="e.g., Virtual Clinic, Office, Community Center"
                  suggestions={placeSuggestions}
                  minChars={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Presenting Issues
                </label>
                <Textarea
                  value={formData.presenting_issues}
                  onChange={(e) => setFormData(prev => ({ ...prev, presenting_issues: e.target.value }))}
                  placeholder="Describe the client's presenting issues..."
                  rows={3}
                />
              </div>

              {/* Session Activity Types */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Session Activity Types *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ACTIVITY_TYPES.map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={type}
                        checked={formData.session_activity_types.includes(type)}
                        onCheckedChange={(checked) => 
                          handleActivityTypeChange(type, checked as boolean)
                        }
                      />
                      <label htmlFor={type} className="text-sm">
                        {formatActivityType(type)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duration and Simulated */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                
                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="simulated"
                    checked={formData.simulated}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, simulated: checked as boolean }))
                    }
                  />
                  <label htmlFor="simulated" className="text-sm">
                    Simulated Client Contact
                  </label>
                </div>
              </div>

              {/* Reflections */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Reflections on Experience
                </label>
                <Textarea
                  value={formData.reflections_on_experience}
                  onChange={(e) => setFormData(prev => ({ ...prev, reflections_on_experience: e.target.value }))}
                  placeholder="Reflect on the session, what went well, areas for improvement..."
                  rows={4}
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-6">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => handleSubmit('dcc_only')}
                  disabled={saving}
                  className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create DCC Entry
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  onClick={() => handleSubmit('dcc_and_cra')}
                  disabled={saving}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create DCC + CRA
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Error Overlay with standard help system */}
      <ErrorOverlay
        isOpen={errorOverlay.isOpen}
        onClose={errorOverlay.onClose}
        onGetHelp={errorOverlay.onGetHelp}
        error={errorOverlay.error}
      />
    </div>
  )
}

export default SectionAForm
