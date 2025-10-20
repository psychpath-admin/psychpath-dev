import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Target, 
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react'
import type { 
  EnrollmentFormData, 
  TrackRequirements, 
  SupervisorProfile
} from '@/types/registrar'
import { 
  AOPE_CHOICES, 
  TRACK_CHOICES 
} from '@/types/registrar'
import { apiFetch } from '@/lib/api'

const STEPS = [
  { id: 1, title: 'AoPE Area', description: 'Select your area of practice endorsement' },
  { id: 2, title: 'Program Track', description: 'Choose your program track and FTE' },
  { id: 3, title: 'Supervisors', description: 'Assign principal and secondary supervisors' },
  { id: 4, title: 'Program Details', description: 'Set dates and special requirements' },
  { id: 5, title: 'Review', description: 'Review and submit your enrollment' },
]

export default function RegistrarEnrollment() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [trackRequirements, setTrackRequirements] = useState<TrackRequirements | null>(null)
  const [supervisors, setSupervisors] = useState<SupervisorProfile[]>([])
  const [formData, setFormData] = useState<EnrollmentFormData>({
    aope_area: '',
    program_track: 'TRACK_2',
    fte_fraction: 1.0,
    principal_supervisor: 0,
    secondary_supervisor: 0,
    enrollment_date: new Date().toISOString().split('T')[0],
    expected_completion_date: '',
    board_variation_enabled: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load supervisors on mount
  useEffect(() => {
    loadSupervisors()
  }, [])

  // Load track requirements when track changes
  useEffect(() => {
    if (formData.program_track) {
      loadTrackRequirements(formData.program_track, formData.fte_fraction)
    }
  }, [formData.program_track, formData.fte_fraction])

  const loadSupervisors = async () => {
    try {
      const response = await apiFetch('/api/registrar-logbook/supervisors/')
      if (response.ok) {
        const data = await response.json()
        setSupervisors(data)
      }
    } catch (error) {
      console.error('Error loading supervisors:', error)
    }
  }

  const loadTrackRequirements = async (track: string, fte: number) => {
    try {
      setLoading(true)
      const response = await apiFetch(`/api/registrar-aope/profiles/program_config/?track=${track}&fte=${fte}`)
      if (response.ok) {
        const data = await response.json()
        setTrackRequirements(data)
        
        // Calculate expected completion date
        const enrollmentDate = new Date(formData.enrollment_date)
        const completionDate = new Date(enrollmentDate)
        completionDate.setFullYear(completionDate.getFullYear() + data.duration_years)
        setFormData(prev => ({
          ...prev,
          expected_completion_date: completionDate.toISOString().split('T')[0]
        }))
      }
    } catch (error) {
      console.error('Error loading track requirements:', error)
    } finally {
      setLoading(false)
    }
  }

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    switch (step) {
      case 1:
        if (!formData.aope_area) {
          newErrors.aope_area = 'Please select an AoPE area'
        }
        break
      case 2:
        if (!formData.program_track) {
          newErrors.program_track = 'Please select a program track'
        }
        if (formData.fte_fraction < 0.1 || formData.fte_fraction > 1.0) {
          newErrors.fte_fraction = 'FTE must be between 0.1 and 1.0'
        }
        break
      case 3:
        if (!formData.principal_supervisor) {
          newErrors.principal_supervisor = 'Please select a principal supervisor'
        }
        break
      case 4:
        if (!formData.enrollment_date) {
          newErrors.enrollment_date = 'Please select an enrollment date'
        }
        if (!formData.expected_completion_date) {
          newErrors.expected_completion_date = 'Please select an expected completion date'
        }
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length))
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return

    try {
      setSaving(true)
      const response = await apiFetch('/api/registrar-aope/profiles/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        navigate('/registrar-dashboard')
      } else {
        const errorData = await response.json()
        setErrors(errorData)
      }
    } catch (error) {
      console.error('Error submitting enrollment:', error)
      setErrors({ submit: 'Failed to submit enrollment. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="aope_area" className="text-sm font-medium text-gray-700 mb-2 block">
                Area of Practice Endorsement *
              </Label>
              <Select 
                value={formData.aope_area} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, aope_area: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your AoPE area" />
                </SelectTrigger>
                <SelectContent>
                  {AOPE_CHOICES.map(choice => (
                    <SelectItem key={choice.value} value={choice.value}>
                      {choice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.aope_area && (
                <p className="text-red-600 text-sm mt-1">{errors.aope_area}</p>
              )}
            </div>

            <div>
              <Label htmlFor="aope_reason" className="text-sm font-medium text-gray-700 mb-2 block">
                Why this area? (Optional)
              </Label>
              <Textarea
                id="aope_reason"
                placeholder="Briefly explain why you chose this AoPE area..."
                rows={3}
                className="w-full"
              />
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>What is Area of Practice Endorsement?</strong><br />
                AoPE is a formal recognition by AHPRA that you have advanced training and competency in a specific area of psychology practice. This requires completing a registrar program in your chosen area.
              </AlertDescription>
            </Alert>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-4 block">
                Program Track *
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {TRACK_CHOICES.map(track => (
                  <Card 
                    key={track.value}
                    className={`cursor-pointer transition-all ${
                      formData.program_track === track.value 
                        ? 'ring-2 ring-purple-500 border-purple-500' 
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, program_track: track.value as any }))}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <input
                          type="radio"
                          checked={formData.program_track === track.value}
                          onChange={() => setFormData(prev => ({ ...prev, program_track: track.value as any }))}
                          className="text-purple-600"
                        />
                        <span className="font-medium">{track.label}</span>
                      </div>
                      <p className="text-sm text-gray-600">{track.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {errors.program_track && (
                <p className="text-red-600 text-sm mt-1">{errors.program_track}</p>
              )}
            </div>

            <div>
              <Label htmlFor="fte_fraction" className="text-sm font-medium text-gray-700 mb-2 block">
                FTE (Full-Time Equivalent) *
              </Label>
              <div className="space-y-2">
                <Input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={formData.fte_fraction}
                  onChange={(e) => setFormData(prev => ({ ...prev, fte_fraction: parseFloat(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>0.1 (10%)</span>
                  <span className="font-medium">{formData.fte_fraction} ({Math.round(formData.fte_fraction * 100)}%)</span>
                  <span>1.0 (100%)</span>
                </div>
              </div>
              {errors.fte_fraction && (
                <p className="text-red-600 text-sm mt-1">{errors.fte_fraction}</p>
              )}
            </div>

            {trackRequirements && (
              <Card className="bg-purple-50 border-purple-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-purple-900">Program Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">Duration:</span> {trackRequirements.duration_years} years
                    </div>
                    <div>
                      <span className="font-medium">Total Hours:</span> {trackRequirements.total_hours_required}
                    </div>
                    <div>
                      <span className="font-medium">Supervision:</span> {trackRequirements.supervision_hours_required} hours
                    </div>
                    <div>
                      <span className="font-medium">CPD:</span> {trackRequirements.cpd_hours_required} hours
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="principal_supervisor" className="text-sm font-medium text-gray-700 mb-2 block">
                  Principal Supervisor *
                </Label>
                <Select 
                  value={formData.principal_supervisor.toString()} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, principal_supervisor: parseInt(value) }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select principal supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    {supervisors.map(supervisor => (
                      <SelectItem key={supervisor.id} value={supervisor.id.toString()}>
                        {supervisor.name} - {supervisor.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.principal_supervisor && (
                  <p className="text-red-600 text-sm mt-1">{errors.principal_supervisor}</p>
                )}
              </div>

              <div>
                <Label htmlFor="secondary_supervisor" className="text-sm font-medium text-gray-700 mb-2 block">
                  Secondary Supervisor (Optional)
                </Label>
                <Select 
                  value={formData.secondary_supervisor?.toString() || ''} 
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    secondary_supervisor: value ? parseInt(value) : undefined 
                  }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select secondary supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {supervisors.map(supervisor => (
                      <SelectItem key={supervisor.id} value={supervisor.id.toString()}>
                        {supervisor.name} - {supervisor.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Supervisor Eligibility:</strong> Your principal supervisor must have at least 2 years of endorsement experience in the {formData.aope_area} area and be approved to supervise registrars.
              </AlertDescription>
            </Alert>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="enrollment_date" className="text-sm font-medium text-gray-700 mb-2 block">
                  Enrollment Date *
                </Label>
                <Input
                  type="date"
                  value={formData.enrollment_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, enrollment_date: e.target.value }))}
                  className="w-full"
                />
                {errors.enrollment_date && (
                  <p className="text-red-600 text-sm mt-1">{errors.enrollment_date}</p>
                )}
              </div>

              <div>
                <Label htmlFor="expected_completion_date" className="text-sm font-medium text-gray-700 mb-2 block">
                  Expected Completion Date *
                </Label>
                <Input
                  type="date"
                  value={formData.expected_completion_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, expected_completion_date: e.target.value }))}
                  className="w-full"
                />
                {errors.expected_completion_date && (
                  <p className="text-red-600 text-sm mt-1">{errors.expected_completion_date}</p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="board_variation"
                  checked={formData.board_variation_enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ 
                    ...prev, 
                    board_variation_enabled: checked as boolean 
                  }))}
                />
                <Label htmlFor="board_variation" className="text-sm font-medium text-gray-700">
                  Board variation for direct client contact (&lt;176 hours/year)
                </Label>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Check this if you have AHPRA approval for reduced direct client contact hours
              </p>
            </div>

            {formData.board_variation_enabled && (
              <div>
                <Label htmlFor="board_variation_doc" className="text-sm font-medium text-gray-700 mb-2 block">
                  Board Variation Document
                </Label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setFormData(prev => ({ ...prev, board_variation_doc: file }))
                    }
                  }}
                  className="w-full"
                />
              </div>
            )}
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Enrollment Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">AoPE Area:</span>
                  <span className="ml-2">{AOPE_CHOICES.find(c => c.value === formData.aope_area)?.label}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Program Track:</span>
                  <span className="ml-2">{TRACK_CHOICES.find(c => c.value === formData.program_track)?.label}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">FTE:</span>
                  <span className="ml-2">{Math.round(formData.fte_fraction * 100)}%</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Enrollment Date:</span>
                  <span className="ml-2">{formData.enrollment_date}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Expected Completion:</span>
                  <span className="ml-2">{formData.expected_completion_date}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Board Variation:</span>
                  <span className="ml-2">{formData.board_variation_enabled ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            {trackRequirements && (
              <Card className="bg-purple-50 border-purple-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-purple-900">Your Program Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">Total Hours:</span> {trackRequirements.total_hours_required}
                    </div>
                    <div>
                      <span className="font-medium">Supervision Hours:</span> {trackRequirements.supervision_hours_required}
                    </div>
                    <div>
                      <span className="font-medium">CPD Hours:</span> {trackRequirements.cpd_hours_required}
                    </div>
                    <div>
                      <span className="font-medium">Program Duration:</span> {trackRequirements.weeks_required} weeks
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {errors.submit && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{errors.submit}</AlertDescription>
              </Alert>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-8 text-white shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-8 w-8" />
              <h1 className="text-3xl font-bold">Registrar Program Enrollment</h1>
            </div>
            <p className="text-white/90 text-lg">
              Complete your Area of Practice Endorsement program enrollment
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'bg-white border-gray-300 text-gray-500'
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>
                <div className="ml-3 hidden sm:block">
                  <p className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-purple-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`hidden sm:block w-16 h-0.5 mx-4 ${
                    currentStep > step.id ? 'bg-purple-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl">
              Step {currentStep}: {STEPS[currentStep - 1].title}
            </CardTitle>
            <p className="text-gray-600">{STEPS[currentStep - 1].description}</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : (
              renderStepContent()
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="border-blue-300 text-blue-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              onClick={handleNext}
              disabled={loading}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={saving || loading}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Submitting...' : 'Submit Enrollment'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
