import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Clock, Users, AlertTriangle, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface PracticeEntryFormData {
  program: string
  date: string
  start_time: string
  end_time: string
  duration_minutes: number
  dcc_minutes: number
  dcc_categories: string[]
  setting: string
  modality: string
  client_code: string
  client_age_band: string
  presenting_issue: string
  tasks: string
  competency_tags: string[]
  observed: boolean
  supervisor_followup_date: string
}

interface RegistrarProgram {
  id: string
  aope: string
  aope_display: string
  qualification_tier: string
  qualification_tier_display: string
}

interface CompetencyTag {
  id: string
  label: string
  category_code: string
  description: string
}

const DCC_CATEGORIES = [
  { value: 'assessment', label: 'Assessment' },
  { value: 'intervention', label: 'Intervention' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'management_planning', label: 'Management Planning' },
]

const SETTING_CHOICES = [
  { value: 'outpatient', label: 'Outpatient' },
  { value: 'inpatient', label: 'Inpatient' },
  { value: 'community', label: 'Community' },
  { value: 'education', label: 'Education' },
  { value: 'research', label: 'Research' },
  { value: 'management', label: 'Management' },
  { value: 'telehealth', label: 'Telehealth' },
  { value: 'other', label: 'Other' },
]

const MODALITY_CHOICES = [
  { value: 'in_person', label: 'In Person' },
  { value: 'video', label: 'Video' },
  { value: 'phone', label: 'Phone' },
  { value: 'asynchronous', label: 'Asynchronous' },
]

const CLIENT_AGE_BANDS = [
  { value: '0-12', label: '0-12 years' },
  { value: '13-17', label: '13-17 years' },
  { value: '18-25', label: '18-25 years' },
  { value: '26-44', label: '26-44 years' },
  { value: '45-64', label: '45-64 years' },
  { value: '65+', label: '65+ years' },
]

const RegistrarPracticeEntryForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  
  const [formData, setFormData] = useState<PracticeEntryFormData>({
    program: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    duration_minutes: 0,
    dcc_minutes: 0,
    dcc_categories: [],
    setting: '',
    modality: '',
    client_code: '',
    client_age_band: '',
    presenting_issue: '',
    tasks: '',
    competency_tags: [],
    observed: false,
    supervisor_followup_date: '',
  })
  
  const [loading, setLoading] = useState(false)
  const [programs, setPrograms] = useState<RegistrarProgram[]>([])
  const [competencyTags, setCompetencyTags] = useState<CompetencyTag[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [autoCalcDuration, setAutoCalcDuration] = useState(false)
  const [showErrorOverlay, setShowErrorOverlay] = useState(false)
  const [errorOverlayMessage, setErrorOverlayMessage] = useState('')

  // Load programs and competency tags on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load programs
        const programsResponse = await apiFetch('/api/registrar/programs/')
        if (programsResponse.ok) {
          const programsData = await programsResponse.json()
          console.log('Loaded programs:', programsData)
          setPrograms(programsData)
          
          // Auto-select program if not already set
          if (programsData.length > 0 && !formData.program) {
            setFormData(prev => ({ ...prev, program: programsData[0].id }))
            console.log('Auto-selected program:', programsData[0].id, programsData[0].aope_display)
          } else if (programsData.length === 0) {
            console.warn('No programs found for user')
            toast.error('No registrar programs found. Please contact your supervisor.')
          }
        } else {
          console.error('Failed to load programs:', programsResponse.status, await programsResponse.text())
          toast.error('Failed to load registrar programs. Please refresh the page.')
        }

        // Load competency tags for the selected program
        if (formData.program) {
          const competencyResponse = await apiFetch(`/api/registrar/competency-framework/?aope=${formData.program}`)
          if (competencyResponse.ok) {
            const competencyData = await competencyResponse.json()
            setCompetencyTags(competencyData)
          }
        }
      } catch (error) {
        toast.error('Failed to load form data')
      }
    }

    loadData()
  }, [])

  // Load existing entry if editing
  useEffect(() => {
    if (isEditing && id) {
      const loadEntry = async () => {
        try {
          const response = await apiFetch(`/api/registrar/practice-entries/${id}/`)
          if (response.ok) {
            const entry = await response.json()
            setFormData({
              program: entry.program,
              date: entry.date,
              start_time: entry.start_time || '',
              end_time: entry.end_time || '',
              duration_minutes: entry.duration_minutes,
              dcc_minutes: entry.dcc_minutes,
              dcc_categories: entry.dcc_categories,
              setting: entry.setting,
              modality: entry.modality,
              client_code: entry.client_code,
              client_age_band: entry.client_age_band,
              presenting_issue: entry.presenting_issue || '',
              tasks: entry.tasks,
              competency_tags: entry.competency_tags,
              observed: entry.observed,
              supervisor_followup_date: entry.supervisor_followup_date || '',
            })
          } else {
            toast.error('Failed to load practice entry')
            navigate('/registrar/practice')
          }
        } catch (error) {
          toast.error('Failed to load practice entry')
          navigate('/registrar/practice')
        }
      }
      loadEntry()
    }
  }, [isEditing, id, navigate])

  // Calculate duration when start/end times change
  useEffect(() => {
    if (formData.start_time && formData.end_time) {
      const start = new Date(`2000-01-01T${formData.start_time}`)
      const end = new Date(`2000-01-01T${formData.end_time}`)
      
      if (end > start) {
        const durationMs = end.getTime() - start.getTime()
        const durationMinutes = Math.round(durationMs / (1000 * 60))
        setFormData(prev => ({ ...prev, duration_minutes: durationMinutes }))
        setAutoCalcDuration(true)
      }
    }
  }, [formData.start_time, formData.end_time])

  const handleInputChange = (field: keyof PracticeEntryFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleDccCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      dcc_categories: prev.dcc_categories.includes(category)
        ? prev.dcc_categories.filter(c => c !== category)
        : [...prev.dcc_categories, category]
    }))
  }

  const handleCompetencyTagToggle = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      competency_tags: prev.competency_tags.includes(tag)
        ? prev.competency_tags.filter(t => t !== tag)
        : [...prev.competency_tags, tag]
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.program) {
      if (programs.length === 0) {
        newErrors.program = 'No registrar programs available. Please contact your supervisor.'
      } else if (programs.length === 1) {
        // Auto-set the single program if not already set
        setFormData(prev => ({ ...prev, program: programs[0].id }))
      } else {
        newErrors.program = 'Please select a program'
      }
    }
    if (!formData.date) newErrors.date = 'Please select a date'
    if (!formData.duration_minutes || formData.duration_minutes <= 0) {
      newErrors.duration_minutes = 'Duration must be greater than 0'
    }
    if (formData.dcc_minutes < 0) {
      newErrors.dcc_minutes = 'DCC minutes cannot be negative'
    }
    if (formData.dcc_minutes > formData.duration_minutes) {
      newErrors.dcc_minutes = 'DCC minutes cannot exceed total duration'
    }
    if (formData.dcc_minutes > 0 && formData.dcc_categories.length === 0) {
      newErrors.dcc_categories = 'DCC categories must be specified when DCC minutes > 0'
    }
    if (!formData.setting) newErrors.setting = 'Please select a setting'
    if (!formData.modality) newErrors.modality = 'Please select a modality'
    if (!formData.client_code) {
      newErrors.client_code = 'Please enter a client code'
    } else if (!/^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(formData.client_code)) {
      newErrors.client_code = 'Client code must contain only letters, numbers, and hyphens (e.g., C-044, BM-1961-M, A123-B456)'
    }
    if (!formData.client_age_band) newErrors.client_age_band = 'Please select client age band'
    if (!formData.tasks || formData.tasks.trim().length < 10) {
      newErrors.tasks = 'Tasks description must be at least 10 characters'
    }
    if (formData.tasks && formData.tasks.trim().length > 500) {
      newErrors.tasks = 'Tasks description cannot exceed 500 characters'
    }
    if (formData.presenting_issue && formData.presenting_issue.length > 120) {
      newErrors.presenting_issue = 'Presenting issue cannot exceed 120 characters'
    }

    setErrors(newErrors)
    
    // Show error overlay if there are validation errors
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0]
      setErrorOverlayMessage(firstError)
      setShowErrorOverlay(true)
      return false
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate date is not in the future
    const selectedDate = new Date(formData.date + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (selectedDate > today) {
      toast.error('Practice date cannot be in the future. Please enter the actual date of practice.')
      return
    }
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    
    try {
      const url = isEditing 
        ? `/api/registrar/practice-entries/${id}/`
        : '/api/registrar/practice-entries/'
      
      const method = isEditing ? 'PUT' : 'POST'
      
      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      if (response.ok) {
        const entry = await response.json()
        const dccHours = (entry.dcc_minutes / 60).toFixed(1)
        const totalHours = (entry.duration_minutes / 60).toFixed(1)
        
        toast.success(
          `Practice entry ${isEditing ? 'updated' : 'added'} successfully! ` +
          `${totalHours}h total (${dccHours}h DCC). Totals updated.`
        )
        
        navigate('/registrar/practice')
      } else {
        const errorData = await response.json()
        if (errorData.errors) {
          setErrors(errorData.errors)
        }
        toast.error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} practice entry`)
      }
    } catch (error) {
      toast.error(`An error occurred while ${isEditing ? 'updating' : 'creating'} the practice entry`)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAndAddAnother = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    
    try {
      const response = await apiFetch('/api/registrar/practice-entries/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      if (response.ok) {
        const entry = await response.json()
        const dccHours = (entry.dcc_minutes / 60).toFixed(1)
        const totalHours = (entry.duration_minutes / 60).toFixed(1)
        
        toast.success(
          `Practice entry added! ${totalHours}h total (${dccHours}h DCC). Totals updated.`
        )
        
        // Reset form for next entry
        setFormData(prev => ({
          ...prev,
          date: new Date().toISOString().split('T')[0],
          start_time: '',
          end_time: '',
          duration_minutes: 0,
          dcc_minutes: 0,
          dcc_categories: [],
          client_code: '',
          presenting_issue: '',
          tasks: '',
          competency_tags: [],
          observed: false,
          supervisor_followup_date: '',
        }))
        setErrors({})
      } else {
        const errorData = await response.json()
        if (errorData.errors) {
          setErrors(errorData.errors)
        }
        toast.error(errorData.error || 'Failed to create practice entry')
      }
    } catch (error) {
      toast.error('An error occurred while creating the practice entry')
    } finally {
      setLoading(false)
    }
  }

  const dccRatio = formData.duration_minutes > 0 
    ? Math.round((formData.dcc_minutes / formData.duration_minutes) * 100) 
    : 0

  const durationHours = (formData.duration_minutes / 60).toFixed(1)
  const dccHours = (formData.dcc_minutes / 60).toFixed(1)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/registrar/practice')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Practice Log
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Practice Entry' : 'Add Practice Entry'}
          </h1>
          <p className="text-gray-600">
            Record your clinical practice activities for your registrar program
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="program">Program</Label>
                {programs.length === 1 ? (
                  // Show as read-only input when only one program
                  <div className="space-y-1">
                    <Input
                      value={programs[0] ? `${programs[0].aope_display} (${programs[0].qualification_tier_display})` : ''}
                      readOnly
                      className="bg-gray-50 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500">This is your only registrar program</p>
                  </div>
                ) : (
                  // Show as select dropdown when multiple programs or none
                  <Select 
                    value={formData.program} 
                    onValueChange={(value) => handleInputChange('program', value)}
                  >
                    <SelectTrigger className={cn(errors.program && "border-red-500")}>
                      <SelectValue placeholder={programs.length === 0 ? "Loading programs..." : "Select your program"} />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.length === 0 ? (
                        <SelectItem value="no-programs" disabled>No programs available</SelectItem>
                      ) : (
                        programs.map((program) => (
                          <SelectItem key={program.id} value={program.id}>
                            {program.aope_display} ({program.qualification_tier_display})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
                {programs.length === 0 && (
                  <p className="text-sm text-amber-600">No registrar programs found. Please contact your supervisor.</p>
                )}
                {errors.program && <p className="text-sm text-red-500">{errors.program}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className={cn(errors.date && "border-red-500")}
                  max={new Date().toISOString().split('T')[0]}
                />
                {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
              </div>
            </div>

            {/* Time Block */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Time Block</Label>
                {autoCalcDuration && (
                  <Badge variant="secondary" className="text-xs">
                    Auto-calculated duration
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time (optional)</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => handleInputChange('start_time', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time (optional)</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => handleInputChange('end_time', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    min="1"
                    max="720"
                    value={formData.duration_minutes}
                    onChange={(e) => handleInputChange('duration_minutes', parseInt(e.target.value) || 0)}
                    className={cn(errors.duration_minutes && "border-red-500")}
                  />
                  <p className="text-xs text-gray-500">
                    {durationHours} hours ({formData.duration_minutes} minutes)
                  </p>
                  {errors.duration_minutes && <p className="text-sm text-red-500">{errors.duration_minutes}</p>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DCC vs Other Practice */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Direct Client Contact (DCC) vs Other Practice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dcc_minutes">DCC Minutes</Label>
              <Input
                id="dcc_minutes"
                type="number"
                min="0"
                max={formData.duration_minutes}
                value={formData.dcc_minutes}
                onChange={(e) => handleInputChange('dcc_minutes', parseInt(e.target.value) || 0)}
                className={cn(errors.dcc_minutes && "border-red-500")}
              />
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {dccHours} hours DCC / {durationHours} hours total
                </span>
                <Badge variant={dccRatio >= 50 ? "default" : "secondary"}>
                  DCC ratio: {dccRatio}%
                </Badge>
              </div>
              {errors.dcc_minutes && <p className="text-sm text-red-500">{errors.dcc_minutes}</p>}
            </div>

            {/* DCC Categories */}
            <div className="space-y-2">
              <Label>DCC Categories</Label>
              <div className="flex flex-wrap gap-2">
                {DCC_CATEGORIES.map((category) => (
                  <Button
                    key={category.value}
                    type="button"
                    variant={formData.dcc_categories.includes(category.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDccCategoryToggle(category.value)}
                    disabled={formData.dcc_minutes === 0}
                    className="text-xs"
                  >
                    {category.label}
                  </Button>
                ))}
              </div>
              {formData.dcc_minutes === 0 && (
                <p className="text-xs text-gray-500">
                  DCC categories are disabled when DCC minutes = 0
                </p>
              )}
              {errors.dcc_categories && <p className="text-sm text-red-500">{errors.dcc_categories}</p>}
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>DCC includes:</strong> assessment, intervention, consultation, and management planning performed with or for a client.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Context */}
        <Card>
          <CardHeader>
            <CardTitle>Client & Session Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_code">Client Code</Label>
                <Input
                  id="client_code"
                  placeholder="e.g., C-044, BM-1961-M, A123-B456"
                  value={formData.client_code}
                  onChange={(e) => handleInputChange('client_code', e.target.value.toUpperCase())}
                  className={cn(errors.client_code && "border-red-500")}
                />
                <p className="text-xs text-gray-500">
                  Use a coded ID with letters, numbers, and hyphens. Do not enter names, DOB, phone or email.
                </p>
                {errors.client_code && <p className="text-sm text-red-500">{errors.client_code}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_age_band">Client Age Band</Label>
                <Select 
                  value={formData.client_age_band} 
                  onValueChange={(value) => handleInputChange('client_age_band', value)}
                >
                  <SelectTrigger className={cn(errors.client_age_band && "border-red-500")}>
                    <SelectValue placeholder="Select age band" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_AGE_BANDS.map((band) => (
                      <SelectItem key={band.value} value={band.value}>
                        {band.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.client_age_band && <p className="text-sm text-red-500">{errors.client_age_band}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="presenting_issue">Presenting Issue (optional)</Label>
              <Input
                id="presenting_issue"
                placeholder="e.g., depressive symptoms, anxiety"
                value={formData.presenting_issue}
                onChange={(e) => handleInputChange('presenting_issue', e.target.value)}
                className={cn(errors.presenting_issue && "border-red-500")}
                maxLength={120}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Brief description only (no PII)</span>
                <span>{formData.presenting_issue.length}/120</span>
              </div>
              {errors.presenting_issue && <p className="text-sm text-red-500">{errors.presenting_issue}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="setting">Setting</Label>
                <Select 
                  value={formData.setting} 
                  onValueChange={(value) => handleInputChange('setting', value)}
                >
                  <SelectTrigger className={cn(errors.setting && "border-red-500")}>
                    <SelectValue placeholder="Select setting" />
                  </SelectTrigger>
                  <SelectContent>
                    {SETTING_CHOICES.map((setting) => (
                      <SelectItem key={setting.value} value={setting.value}>
                        {setting.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.setting && <p className="text-sm text-red-500">{errors.setting}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="modality">Modality</Label>
                <Select 
                  value={formData.modality} 
                  onValueChange={(value) => handleInputChange('modality', value)}
                >
                  <SelectTrigger className={cn(errors.modality && "border-red-500")}>
                    <SelectValue placeholder="Select modality" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODALITY_CHOICES.map((modality) => (
                      <SelectItem key={modality.value} value={modality.value}>
                        {modality.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.modality && <p className="text-sm text-red-500">{errors.modality}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Tasks Performed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tasks">What did you do?</Label>
              <Textarea
                id="tasks"
                placeholder="Briefly list what you did (e.g., diagnostic interview, PHQ-9, case formulation, GP liaison)."
                value={formData.tasks}
                onChange={(e) => handleInputChange('tasks', e.target.value)}
                className={cn(errors.tasks && "border-red-500")}
                rows={4}
                maxLength={500}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>No PII (names, emails, phone numbers, dates)</span>
                <span>{formData.tasks.length}/500</span>
              </div>
              {errors.tasks && <p className="text-sm text-red-500">{errors.tasks}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Competency Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Competency Tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select relevant competencies</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {competencyTags.map((tag) => (
                  <div key={tag.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`competency-${tag.id}`}
                      checked={formData.competency_tags.includes(tag.label)}
                      onCheckedChange={() => handleCompetencyTagToggle(tag.label)}
                    />
                    <Label 
                      htmlFor={`competency-${tag.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {tag.label}
                    </Label>
                  </div>
                ))}
              </div>
              {competencyTags.length === 0 && (
                <p className="text-sm text-gray-500">
                  No competency tags available for this program's AoPE.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Supervisor Section */}
        <Card>
          <CardHeader>
            <CardTitle>Supervisor Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="observed"
                checked={formData.observed}
                onCheckedChange={(checked) => handleInputChange('observed', checked)}
              />
              <Label htmlFor="observed">
                Was any portion of this session observed by a supervisor?
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supervisor_followup_date">Supervisor Follow-up Date (optional)</Label>
              <Input
                id="supervisor_followup_date"
                type="date"
                value={formData.supervisor_followup_date}
                onChange={(e) => handleInputChange('supervisor_followup_date', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/registrar/practice')}
          >
            Cancel
          </Button>
          
          {!isEditing && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveAndAddAnother}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Save & Add Another
                </>
              )}
            </Button>
          )}
          
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isEditing ? 'Updating...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Update Entry' : 'Save Entry'}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Error Overlay */}
      {showErrorOverlay && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowErrorOverlay(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Application Error</h3>
              </div>
              <button
                onClick={() => setShowErrorOverlay(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-gray-500 text-sm mb-6">Error ID: Error</p>

            {/* Issue Section (Red) */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-red-800">Issue</h4>
                  <p className="text-sm text-red-700 mt-1">{errorOverlayMessage}</p>
                </div>
              </div>
            </div>

            {/* What this means Section (Blue) */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">What this means</h4>
                  <p className="text-sm text-blue-700 mt-1">The form has validation errors that need to be corrected before you can save your entry.</p>
                </div>
              </div>
            </div>

            {/* What you can do Section (Green) */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-green-800">What you can do</h4>
                  <p className="text-sm text-green-700 mt-1">Please fix the highlighted field(s) and try again. All required fields must be completed correctly.</p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowErrorOverlay(false)
                  // Focus on the first field with error and highlight it
                  const firstErrorField = Object.keys(errors)[0]
                  if (firstErrorField) {
                    const fieldElement = document.getElementById(firstErrorField)
                    if (fieldElement) {
                      fieldElement.focus()
                      fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      // Add temporary highlight class
                      fieldElement.classList.add('ring-2', 'ring-red-500')
                      setTimeout(() => {
                        fieldElement.classList.remove('ring-2', 'ring-red-500')
                      }, 3000)
                    }
                  }
                }}
                className="flex-1 flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </Button>
              <Button
                onClick={() => {
                  setShowErrorOverlay(false)
                  // Show a help modal instead of navigating away
                  toast.info('For additional help, please contact your supervisor or refer to the registrar program guidelines.')
                }}
                className="flex-1 flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                I Need More Help
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RegistrarPracticeEntryForm
