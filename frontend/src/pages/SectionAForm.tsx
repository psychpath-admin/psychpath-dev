import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Plus } from 'lucide-react'
import AddToAgendaDialog from '@/components/AddToAgendaDialog'
import { 
  createSectionAEntry, 
  updateSectionAEntry, 
  getSectionAEntry,
  getClientAutocomplete, 
  getLastSessionData, 
  getPlaceAutocomplete,
  getPresentingIssuesAutocomplete,
  checkDuplicatePseudonym,
  getClientSessionCount,
  checkEntryQuality
} from '@/lib/api'
import { QualityFeedback } from '@/components/QualityFeedback'
import { toast } from 'sonner'

interface SectionAFormProps {
  onCancel: () => void
  entryId?: string
}

interface EntryForm {
  client_id: string
  session_date: string
  place_of_practice: string
  client_age: string
  presenting_issues: string
  session_activity_types: string[]
  duration_minutes: string
  session_modality: string
  reflections_on_experience: string
  additional_comments: string
  simulated: boolean
}

const ACTIVITY_TYPES = [
  'psychological_assessment',
  'intervention', 
  'prevention',
  'evaluation'
]

function SectionAForm({ onCancel, entryId }: SectionAFormProps) {
  const [formData, setFormData] = useState<EntryForm>({
    client_id: '',
    session_date: new Date().toISOString().split('T')[0],
    place_of_practice: '',
    client_age: '',
    presenting_issues: '',
    session_activity_types: [],
    duration_minutes: '50',
    session_modality: 'face_to_face',
    reflections_on_experience: '',
    additional_comments: '',
    simulated: false
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showAddToAgenda, setShowAddToAgenda] = useState(false)
  const isEditing = !!entryId
  
  // Autocomplete state
  const [clientSuggestions, setClientSuggestions] = useState<string[]>([])
  const [placeSuggestions, setPlaceSuggestions] = useState<string[]>([])
  const [issuesSuggestions, setIssuesSuggestions] = useState<string[]>([])
  const [showClientSuggestions, setShowClientSuggestions] = useState(false)
  const [showPlaceSuggestions, setShowPlaceSuggestions] = useState(false)
  const [showIssuesSuggestions, setShowIssuesSuggestions] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<{
    show: boolean
    suggestions: string[]
  }>({ show: false, suggestions: [] })
  
  // Quality validation state
  const [presentingIssuesQuality, setPresentingIssuesQuality] = useState<any>(null)
  const [reflectionQuality, setReflectionQuality] = useState<any>(null)
  const [showPresentingIssuesPrompts, setShowPresentingIssuesPrompts] = useState(false)
  const [showReflectionPrompts, setShowReflectionPrompts] = useState(false)
  const [sessionCount, setSessionCount] = useState<number>(0)

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
            client_age: entry.client_age?.toString() || '',
            presenting_issues: entry.presenting_issues || '',
            session_activity_types: entry.session_activity_types || [],
            duration_minutes: entry.duration_minutes?.toString() || '50',
            session_modality: entry.session_modality || 'face_to_face',
            reflections_on_experience: entry.reflections_on_experience || '',
            additional_comments: entry.additional_comments || '',
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

  // Autocomplete handlers
  const handleClientPseudonymChange = async (value: string) => {
    // Clear auto-filled fields when user manually types
    setFormData(prev => ({ 
      ...prev, 
      client_id: value,
      place_of_practice: '',
      client_age: '',
      presenting_issues: ''
    }))
    
    if (value.length >= 2) {
      try {
        const suggestions = await getClientAutocomplete(value)
        setClientSuggestions(suggestions)
        setShowClientSuggestions(true)
        
        // Fetch session count
        const count = await getClientSessionCount(value)
        setSessionCount(count)
      } catch (error) {
        console.error('Error fetching client suggestions:', error)
      }
    } else {
      setShowClientSuggestions(false)
      setSessionCount(0)
    }
    
    // Check for duplicates
    if (value.length >= 2 && formData.session_date) {
      try {
        const result = await checkDuplicatePseudonym(value, formData.session_date)
        setDuplicateWarning({
          show: result.duplicate,
          suggestions: result.suggestions || []
        })
      } catch (error) {
        console.error('Error checking duplicate:', error)
      }
    }
  }

  const handleClientSelect = async (pseudonym: string) => {
    setFormData(prev => ({ ...prev, client_id: pseudonym }))
    setShowClientSuggestions(false)
    
    // Auto-fill from last session
    try {
      const lastSession = await getLastSessionData(pseudonym)
      if (lastSession) {
        setFormData(prev => ({
          ...prev,
          place_of_practice: lastSession.place_of_practice || prev.place_of_practice,
          client_age: lastSession.client_age?.toString() || prev.client_age,
          presenting_issues: lastSession.presenting_issues || prev.presenting_issues
        }))
      }
    } catch (error) {
      // No previous session found - that's ok
    }
    
    // Fetch session count
    try {
      const count = await getClientSessionCount(pseudonym)
      setSessionCount(count)
    } catch (error) {
      console.error('Error fetching session count:', error)
    }
    
    // Check for duplicates
    if (formData.session_date) {
      try {
        const result = await checkDuplicatePseudonym(pseudonym, formData.session_date)
        setDuplicateWarning({
          show: result.duplicate,
          suggestions: result.suggestions || []
        })
      } catch (error) {
        console.error('Error checking duplicate:', error)
      }
    }
  }

  const handlePlaceChange = async (value: string) => {
    setFormData(prev => ({ ...prev, place_of_practice: value }))
    
    if (value.length >= 2) {
      try {
        const suggestions = await getPlaceAutocomplete(value)
        setPlaceSuggestions(suggestions)
        setShowPlaceSuggestions(true)
      } catch (error) {
        console.error('Error fetching place suggestions:', error)
      }
    } else {
      setShowPlaceSuggestions(false)
    }
  }

  const handlePresentingIssuesChange = async (value: string) => {
    setFormData(prev => ({ ...prev, presenting_issues: value }))
    
    if (value.length >= 2 && formData.client_id) {
      try {
        const suggestions = await getPresentingIssuesAutocomplete(value, formData.client_id)
        setIssuesSuggestions(suggestions)
        setShowIssuesSuggestions(true)
      } catch (error) {
        console.error('Error fetching issues suggestions:', error)
      }
    } else {
      setShowIssuesSuggestions(false)
    }
  }
  
  // Quality validation handlers
  const handlePresentingIssuesBlur = async () => {
    if (formData.presenting_issues.length >= 5) { // Lowered threshold
      try {
        const result = await checkEntryQuality(formData.presenting_issues, 'presenting_issues')
        setPresentingIssuesQuality(result)
      } catch (error) {
        console.error('Error checking presenting issues quality:', error)
      }
    }
  }
  
  const handleReflectionBlur = async () => {
    if (formData.reflections_on_experience.length >= 10) { // Lowered threshold
      try {
        const result = await checkEntryQuality(formData.reflections_on_experience, 'reflection')
        setReflectionQuality(result)
      } catch (error) {
        console.error('Error checking reflection quality:', error)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Client pseudonym validation
    if (!formData.client_id.trim()) {
      toast.error('Client pseudonym is required')
      return
    }
    if (formData.client_id.trim().length < 2) {
      toast.error('Client pseudonym must be at least 2 characters long')
      return
    }
    if (formData.client_id.length > 50) {
      toast.error('Client pseudonym must be 50 characters or less')
      return
    }
    
    // Future date validation
    const selectedDate = new Date(formData.session_date + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (selectedDate > today) {
      toast.error('Session date cannot be in the future. Please enter the actual date of the session.')
      return
    }
    
    // Duration validation
    if (!formData.duration_minutes) {
      toast.error('Duration is required')
      return
    }
    const duration = parseInt(formData.duration_minutes)
    if (duration < 5 || duration > 480) {
      toast.error('Duration must be between 5 minutes and 8 hours')
      return
    }
    
    // Presenting issues validation
    if (formData.presenting_issues && formData.presenting_issues.trim().length < 10) {
      toast.error('Presenting issues must be at least 10 characters for clinical record quality')
      return
    }
    
    // Reflection validation
    if (formData.reflections_on_experience && formData.reflections_on_experience.trim().length < 20) {
      toast.error('Reflection must be at least 20 characters to demonstrate professional learning')
      return
    }
    
    // Place of practice validation
    if (formData.place_of_practice && formData.place_of_practice.length > 200) {
      toast.error('Place of practice must be 200 characters or less')
      return
    }
    
    // Activity types validation
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
        week_starting: formData.session_date, // Calculate week starting from session date
        place_of_practice: formData.place_of_practice,
        presenting_issues: formData.presenting_issues,
        session_activity_types: formData.session_activity_types,
        duration_minutes: parseInt(formData.duration_minutes),
        session_modality: formData.session_modality,
        reflections_on_experience: formData.reflections_on_experience,
        additional_comments: formData.additional_comments,
      }

      if (isEditing && entryId) {
        await updateSectionAEntry(parseInt(entryId), entryData)
        toast.success('DCC entry updated successfully!')
      } else {
        await createSectionAEntry(entryData)
        toast.success('DCC entry created successfully!')
      }
      onCancel() // Navigate back to dashboard
    } catch (error) {
      console.error('Error creating entry:', error)
      toast.error('Failed to create DCC entry')
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to DCC Logbook
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditing ? 'Edit DCC Entry' : 'Create New DCC Entry'}
            </h1>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowAddToAgenda(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add to Agenda
          </Button>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Direct Client Contact Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* SESSION INFO GROUP */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-brand uppercase tracking-wide border-b border-brand/20 pb-2">
                  📅 Session Information
                </h3>
                
                {/* Date (half width) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-brand mb-3">
                      Session Date *
                    </label>
                    <Input
                      type="date"
                      value={formData.session_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, session_date: e.target.value }))}
                      max={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* CLIENT INFO GROUP */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-brand uppercase tracking-wide border-b border-brand/20 pb-2">
                  👤 Client Information
                </h3>
                
                {/* Client Pseudonym, Age, and Simulated on same row */}
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-6">
                    <label className="block text-sm font-semibold text-brand mb-3">
                      Client Pseudonym *
                      {sessionCount > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Session #{sessionCount + 1} with this client
                        </Badge>
                      )}
                    </label>
                    <div className="relative">
                      <Input
                        value={formData.client_id}
                        onChange={(e) => handleClientPseudonymChange(e.target.value)}
                        onFocus={() => formData.client_id.length >= 2 && setShowClientSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                        placeholder="e.g., Client-001"
                        maxLength={50}
                        required
                      />
                      {showClientSuggestions && clientSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {clientSuggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                              onClick={() => handleClientSelect(suggestion)}
                            >
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {duplicateWarning.show && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                        <p className="text-yellow-800 font-medium">⚠️ This pseudonym was already used today</p>
                        <p className="text-yellow-700 text-xs mt-1">
                          It's unlikely you have 2 sessions with the same client on the same day. 
                          If these are different clients, consider using:
                        </p>
                        <div className="flex gap-2 mt-2">
                          {duplicateWarning.suggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                handleClientSelect(suggestion)
                                setDuplicateWarning({ show: false, suggestions: [] })
                              }}
                              className="px-2 py-1 bg-white border border-yellow-300 rounded text-xs hover:bg-yellow-50"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="col-span-3">
                    <label className="block text-sm font-semibold text-brand mb-3">
                      Age
                    </label>
                    <Input
                      type="number"
                      value={formData.client_age}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_age: e.target.value }))}
                      placeholder="e.g., 25"
                      min="0"
                      max="120"
                    />
                  </div>
                  
                  <div className="col-span-3 flex items-end pb-2">
                    <label className="flex items-center space-x-2">
                      <Checkbox
                        id="simulated"
                        checked={formData.simulated}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({ ...prev, simulated: checked as boolean }))
                        }
                      />
                      <span className="text-sm font-medium text-text">Simulated</span>
                    </label>
                  </div>
                </div>

                {/* Presenting Issues */}
                <div>
                  <label className="block text-sm font-semibold text-brand mb-3">
                    Presenting Issues <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Textarea
                      value={formData.presenting_issues}
                      onChange={(e) => handlePresentingIssuesChange(e.target.value)}
                      onFocus={() => formData.presenting_issues.length >= 2 && setShowIssuesSuggestions(true)}
                      onBlur={() => {
                        setTimeout(() => setShowIssuesSuggestions(false), 200)
                        handlePresentingIssuesBlur()
                      }}
                      placeholder="Describe the client's presenting issues..."
                      maxLength={2000}
                      rows={3}
                    />
                    <p className="text-xs text-gray-700 mt-1 text-right font-medium">
                      {formData.presenting_issues.length}/2000 characters
                    </p>
                    {showIssuesSuggestions && issuesSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {issuesSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, presenting_issues: suggestion }))
                              setShowIssuesSuggestions(false)
                            }}
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
        <QualityFeedback
          quality={presentingIssuesQuality?.quality || null}
          score={presentingIssuesQuality?.score || 0}
          feedback={presentingIssuesQuality?.feedback || []}
          prompts={presentingIssuesQuality?.prompts || []}
          showPrompts={showPresentingIssuesPrompts}
          onGetSuggestions={() => setShowPresentingIssuesPrompts(!showPresentingIssuesPrompts)}
          fieldType="presenting_issues"
        />
                </div>
              </div>

              {/* LOCATION & DURATION GROUP */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-brand uppercase tracking-wide border-b border-brand/20 pb-2">
                  🏢 Session Details
                </h3>
                
                {/* Place of Practice - full width */}
                <div>
                  <label className="block text-sm font-semibold text-brand mb-3">
                    Place of Practice <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      value={formData.place_of_practice}
                      onChange={(e) => handlePlaceChange(e.target.value)}
                      onFocus={() => formData.place_of_practice.length >= 2 && setShowPlaceSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowPlaceSuggestions(false), 200)}
                      placeholder="e.g., Virtual Clinic, Office, Community Center"
                      maxLength={200}
                    />
                    {showPlaceSuggestions && placeSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {placeSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, place_of_practice: suggestion }))
                              setShowPlaceSuggestions(false)
                            }}
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Session Modality and Duration side by side */}
                <div className="flex gap-4">
                  {/* Session Modality - left side, compact */}
                  <div className="w-48">
                    <label className="block text-sm font-semibold text-brand mb-3">
                      Session Modality *
                    </label>
                    <Select
                      value={formData.session_modality}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, session_modality: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select modality" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="face_to_face">Face-to-Face</SelectItem>
                        <SelectItem value="video">Video/Telehealth</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Duration - right side */}
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-brand mb-3">
                      Duration *
                    </label>
                    <Input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                      placeholder="e.g., 60"
                      min="1"
                      required
                    />
                    <p className="text-xs text-textLight">
                      {formData.duration_minutes ? 
                        `${Math.floor(parseInt(formData.duration_minutes) / 60)}h ${parseInt(formData.duration_minutes) % 60}m` : 
                        'Enter minutes'
                      }
                    </p>
                    
                    {/* Quick Links - below Duration input */}
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-xs text-gray-500">Quick duration:</span>
                        {[30, 50, 60, 75, 90].map((minutes) => (
                          <button
                            key={minutes}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, duration_minutes: minutes.toString() }))}
                            className={`px-2 py-1 text-xs rounded border ${
                              formData.duration_minutes === minutes.toString()
                                ? 'bg-primary text-white border-primary'
                                : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            {minutes}min
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CLINICAL DETAILS GROUP */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-brand uppercase tracking-wide border-b border-brand/20 pb-2">
                  🧠 Clinical Details
                </h3>
                
                {/* Session Activity Types */}
                <div>
                  <label className="block text-sm font-semibold text-brand mb-3">
                    Session Activity Types *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {ACTIVITY_TYPES.map(type => (
                      <div key={type} className="flex items-center space-x-2 p-2 rounded-lg border border-border hover:bg-surface/50 transition-colors">
                        <Checkbox
                          id={type}
                          checked={formData.session_activity_types.includes(type)}
                          onCheckedChange={(checked) => 
                            handleActivityTypeChange(type, checked as boolean)
                          }
                        />
                        <label htmlFor={type} className="text-sm font-medium text-text cursor-pointer flex-1">
                          {formatActivityType(type)}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* REFLECTION GROUP */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-brand uppercase tracking-wide border-b border-brand/20 pb-2">
                  💭 Reflection
                </h3>
                
                {/* Reflections on Experience */}
                <div>
                  <label className="block text-sm font-semibold text-brand mb-3">
                    Reflections on Experience <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Textarea
                      value={formData.reflections_on_experience}
                      onChange={(e) => setFormData(prev => ({ ...prev, reflections_on_experience: e.target.value }))}
                      onBlur={handleReflectionBlur}
                      placeholder="Reflect on the session, what went well, areas for improvement..."
                      maxLength={3000}
                      rows={4}
                    />
                    <p className="text-xs text-gray-700 mt-1 text-right font-medium">
                      {formData.reflections_on_experience.length}/3000 characters
                    </p>
                  </div>
        <QualityFeedback
          quality={reflectionQuality?.quality || null}
          score={reflectionQuality?.score || 0}
          feedback={reflectionQuality?.feedback || []}
          prompts={reflectionQuality?.prompts || []}
          showPrompts={showReflectionPrompts}
          onGetSuggestions={() => setShowReflectionPrompts(!showReflectionPrompts)}
          fieldType="reflection"
        />
                </div>
                
                {/* Additional Comments */}
                <div>
                  <label className="block text-sm font-semibold text-brand mb-3">
                    Additional Comments
                  </label>
                  <div className="relative">
                    <Textarea
                      value={formData.additional_comments || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, additional_comments: e.target.value }))}
                      placeholder="Any additional notes or observations..."
                      maxLength={1000}
                      rows={2}
                    />
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      {(formData.additional_comments || '').length}/1000 characters
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-4 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  className="px-6 py-2 border-blue-300 text-blue-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={saving}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {isEditing ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isEditing ? 'Update Entry' : 'Create Entry'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Add to Agenda Dialog */}
      <AddToAgendaDialog
        isOpen={showAddToAgenda}
        onClose={() => setShowAddToAgenda(false)}
        sourceType="A"
        sourceField="dcc_reflection"
        sourceExcerpt={formData.reflections_on_experience}
        defaultTitle={`DCC Discussion - ${formData.client_id}`}
        defaultDetail={formData.reflections_on_experience}
      />
    </div>
  )
}

export default SectionAForm
