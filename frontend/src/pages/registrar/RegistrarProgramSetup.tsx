import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ProgramFormData {
  aope: string
  qualification_tier: string
  fte_fraction: number
  start_date: string
  expected_end_date: string
}

const AOPE_OPTIONS = [
  { value: 'CLINICAL', label: 'Clinical Psychology' },
  { value: 'FORENSIC', label: 'Forensic Psychology' },
  { value: 'ORGANISATIONAL', label: 'Organisational Psychology' },
  { value: 'SPORT_EXERCISE', label: 'Sport and Exercise Psychology' },
  { value: 'COMMUNITY', label: 'Community Psychology' },
  { value: 'COUNSELLING', label: 'Counselling Psychology' },
  { value: 'EDUCATIONAL_DEVELOPMENTAL', label: 'Educational and Developmental Psychology' },
  { value: 'HEALTH', label: 'Health Psychology' },
  { value: 'NEUROPSYCHOLOGY', label: 'Neuropsychology' },
]

const QUALIFICATION_TIERS = [
  { 
    value: 'masters', 
    label: 'Masters (6th-year) or APAC bridging (first AoPE)',
    description: '3,000 practice hours, 80 supervision hours, 80 CPD hours'
  },
  { 
    value: 'masters_phd', 
    label: 'Combined Masters/PhD (6th-year w/ doctoral thesis) or bridging (subsequent AoPE)',
    description: '2,250 practice hours, 60 supervision hours, 60 CPD hours'
  },
  { 
    value: 'doctoral', 
    label: 'Doctoral (7th-year+)',
    description: '1,500 practice hours, 40 supervision hours, 40 CPD hours'
  },
]

const RegistrarProgramSetup: React.FC = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<ProgramFormData>({
    aope: '',
    qualification_tier: '',
    fte_fraction: 1.0,
    start_date: new Date().toISOString().split('T')[0], // Default to today
    expected_end_date: ''
  })
  const [loading, setLoading] = useState(false)

  // Calculate minimum end date based on qualification tier and FTE
  const calculateMinimumEndDate = (startDate: string, qualificationTier: string, fteFraction: number): string => {
    if (!startDate || !qualificationTier) return ''
    
    // Validate the date string
    const start = new Date(startDate)
    if (isNaN(start.getTime())) return ''
    
    const minWeeks = {
      'masters': 88,
      'masters_phd': 66,
      'doctoral': 44
    }[qualificationTier] || 44
    
    // Calculate actual weeks needed based on FTE
    const actualWeeks = Math.ceil(minWeeks / fteFraction)
    
    const end = new Date(start)
    end.setDate(start.getDate() + (actualWeeks * 7))
    
    return end.toISOString().split('T')[0]
  }

  const handleInputChange = (field: keyof ProgramFormData, value: string | number) => {
    const newFormData = {
      ...formData,
      [field]: value
    }
    
    // Auto-calculate end date when start date, qualification tier, or FTE changes
    if (field === 'start_date' || field === 'qualification_tier' || field === 'fte_fraction') {
      const startDate = field === 'start_date' ? value as string : newFormData.start_date
      const qualificationTier = field === 'qualification_tier' ? value as string : newFormData.qualification_tier
      const fteFraction = field === 'fte_fraction' ? value as number : newFormData.fte_fraction
      
      if (startDate && qualificationTier) {
        newFormData.expected_end_date = calculateMinimumEndDate(startDate, qualificationTier, fteFraction)
      }
    }
    
    setFormData(newFormData)
  }

          const validateForm = (): string | null => {
            if (!formData.aope) return 'Please select an Area of Practice Endorsement'
            if (!formData.qualification_tier) return 'Please select a qualification tier'
            if (!formData.fte_fraction || formData.fte_fraction <= 0 || formData.fte_fraction > 1) return 'FTE fraction must be between 0 and 1'
            if (!formData.start_date) return 'Please select a start date'
            if (!formData.expected_end_date) return 'Please select a qualification tier to auto-calculate the end date'
    
    const startDate = new Date(formData.start_date)
    const endDate = new Date(formData.expected_end_date)
    
    if (endDate <= startDate) return 'Expected end date must be after start date'
    
    // Check minimum duration based on qualification tier
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const fteYears = (durationDays / 365.25) * formData.fte_fraction
    
    const minWeeks = {
      'masters': 88,
      'masters_phd': 66,
      'doctoral': 44
    }[formData.qualification_tier] || 44
    
    const minDays = minWeeks * 7
    
    if (durationDays < minDays) {
      return `Program duration must be at least ${minWeeks} FTE weeks (${minDays} days) for ${formData.qualification_tier} qualification tier`
    }
    
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Ensure fte_fraction is set
    const submitData = {
      ...formData,
      fte_fraction: formData.fte_fraction || 1.0
    }
    
    const validationError = validateForm()
    if (validationError) {
      toast.error(validationError)
      return
    }
    
    setLoading(true)
    
    try {
      const response = await apiFetch('/api/registrar/programs/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })
      
      if (response.ok) {
        toast.success('Registrar program created successfully!')
        navigate('/registrar')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to create program')
      }
    } catch (error) {
      toast.error('An error occurred while creating the program')
    } finally {
      setLoading(false)
    }
  }

  const selectedTier = QUALIFICATION_TIERS.find(tier => tier.value === formData.qualification_tier)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/registrar')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Registrar Program</h1>
          <p className="text-gray-600">Set up your registrar program with the required targets and timeline</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Program Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* AoPE Selection */}
            <div className="space-y-2">
              <Label htmlFor="aope">Area of Practice Endorsement</Label>
              <Select value={formData.aope} onValueChange={(value) => handleInputChange('aope', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your AoPE" />
                </SelectTrigger>
                <SelectContent>
                  {AOPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Qualification Tier */}
            <div className="space-y-2">
              <Label htmlFor="qualification_tier">Qualification Tier</Label>
              <Select value={formData.qualification_tier} onValueChange={(value) => {
                setFormData(prev => {
                  const newData = { ...prev, qualification_tier: value }
                  
                  // Auto-calculate end date if we have the required fields
                  if (newData.start_date && value) {
                    newData.expected_end_date = calculateMinimumEndDate(newData.start_date, value, newData.fte_fraction)
                  }
                  
                  return newData
                })
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your qualification tier" />
                </SelectTrigger>
                <SelectContent>
                  {QUALIFICATION_TIERS.map((tier) => (
                    <SelectItem key={tier.value} value={tier.value}>
                      <div>
                        <div className="font-medium">{tier.label}</div>
                        <div className="text-xs text-gray-500">{tier.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedTier && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Target Hours:</strong> {selectedTier.description}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* FTE Fraction */}
            <div className="space-y-2">
              <Label htmlFor="fte_fraction">Full-Time Equivalent (FTE)</Label>
              <Select 
                value={formData.fte_fraction ? (formData.fte_fraction === 1.0 ? "1.0" : formData.fte_fraction.toFixed(1)) : "1.0"} 
                onValueChange={(value) => {
                  const fteValue = parseFloat(value)
                  if (!isNaN(fteValue)) {
                    setFormData(prev => {
                      const newData = { ...prev, fte_fraction: fteValue }
                      
                      // Auto-calculate end date if we have the required fields
                      if (newData.start_date && newData.qualification_tier) {
                        newData.expected_end_date = calculateMinimumEndDate(newData.start_date, newData.qualification_tier, fteValue)
                      }
                      
                      return newData
                    })
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your FTE" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.0">1.0 FTE (Full-time)</SelectItem>
                  <SelectItem value="0.8">0.8 FTE</SelectItem>
                  <SelectItem value="0.6">0.6 FTE</SelectItem>
                  <SelectItem value="0.5">0.5 FTE</SelectItem>
                  <SelectItem value="0.4">0.4 FTE</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                FTE affects the minimum program duration. Lower FTE means longer program duration.
              </p>
              <p className="text-xs text-blue-600">
                Current FTE value: {formData.fte_fraction || 'undefined'} | Select value: "{(formData.fte_fraction === 1.0 ? "1.0" : formData.fte_fraction?.toFixed(1)) || 'undefined'}"
              </p>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Program Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => {
                    const value = e.target.value
                    setFormData(prev => {
                      const newData = { ...prev, start_date: value }
                      
                      // Auto-calculate end date if we have the required fields
                      if (value && newData.qualification_tier) {
                        newData.expected_end_date = calculateMinimumEndDate(value, newData.qualification_tier, newData.fte_fraction)
                      }
                      
                      return newData
                    })
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="expected_end_date">Expected End Date</Label>
                <Input
                  id="expected_end_date"
                  type="date"
                  value={formData.expected_end_date}
                  onChange={(e) => handleInputChange('expected_end_date', e.target.value)}
                  min={formData.start_date ? formData.start_date : undefined}
                />
                {formData.expected_end_date && (
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>
                      Auto-calculated based on {formData.qualification_tier} requirements and {formData.fte_fraction} FTE. 
                      You can adjust this date if needed.
                    </p>
                    {(() => {
                      const start = new Date(formData.start_date)
                      const end = new Date(formData.expected_end_date)
                      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                      const weeks = Math.ceil(days / 7)
                      const fteYears = (days / 365.25) * formData.fte_fraction
                      
                      return (
                        <p className="font-medium">
                          Program Duration: {weeks} weeks ({fteYears.toFixed(1)} FTE years)
                        </p>
                      )
                    })()}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Program Requirements Info */}
        <Card>
          <CardHeader>
            <CardTitle>Program Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-gray-900 mb-2">Supervision Requirements</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• ≥50% of total supervision provided by Principal Supervisor</li>
                  <li>• ≥66% of supervision must be Individual (1:1)</li>
                  <li>• ≤33% may be Group supervision</li>
                  <li>• Sessions predominantly ≥60 min (allow up to 25% shorter)</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-gray-900 mb-2">Practice Requirements</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• ≥176 hours DCC per FTE year</li>
                  <li>• Count: DCC, case formulation, test scoring/interpretation, report writing</li>
                  <li>• Don't count: supervision time, CPD time, generic admin</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-gray-900 mb-2">Supervisor Eligibility</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Principal Supervisor: BAS + endorsed in same AoPE ≥2 years</li>
                  <li>• Secondary Supervisor (same AoPE): up to 50% of total supervision</li>
                  <li>• Secondary Supervisor (different AoPE): up to 33% of total supervision</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Program
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default RegistrarProgramSetup
