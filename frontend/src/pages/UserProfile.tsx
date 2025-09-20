import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { CalendarIcon, Upload, X } from 'lucide-react'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { apiFetch } from '@/lib/api'
import CitySelect from '@/components/CitySelect'
import EndorsementManagementModal from '@/components/EndorsementManagementModal'
import { getCityInfo } from '@/lib/cityMapping'

interface UserProfile {
  id?: number
  first_name: string
  middle_name?: string
  last_name: string
  ahpra_registration_number: string
  email: string
  provisional_start_date: string
  principal_supervisor: string
  principal_supervisor_email?: string
  secondary_supervisor?: string
  secondary_supervisor_email?: string
  supervisor_emails?: string
  role: 'PROVISIONAL' | 'REGISTRAR' | 'SUPERVISOR' | 'ORG_ADMIN'
  signature_url?: string
  prior_hours?: {
    section_a_direct_client: number
    section_a_client_related: number
    section_b_professional_development: number
    section_c_supervision: number
  }
  // Location & Contact Information
  city?: string
  state?: string
  timezone?: string
  mobile?: string
  // New role-specific fields
  program_type?: string
  start_date?: string
  target_weeks?: number
  weekly_commitment?: number
  aope?: string
  qualification_level?: string
}

const UserProfile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>({
    first_name: '',
    middle_name: '',
    last_name: '',
    ahpra_registration_number: '',
    email: '',
    provisional_start_date: '',
    principal_supervisor: '',
    principal_supervisor_email: '',
    secondary_supervisor: '',
    secondary_supervisor_email: '',
    supervisor_emails: '',
    role: 'PROVISIONAL',
    prior_hours: {
      section_a_direct_client: 0,
      section_a_client_related: 0,
      section_b_professional_development: 0,
      section_c_supervision: 0
    },
    // Location & Contact Information
    city: '',
    state: '',
    timezone: '',
    mobile: '',
    // New role-specific fields
    program_type: '',
    start_date: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to 23 days ago
    target_weeks: 44, // Default to minimum weeks for interns
    weekly_commitment: 17.5, // Default to full-time hours for interns
    aope: '',
    qualification_level: ''
  })
  const [loading, setLoading] = useState(true)
  const [isAuthed, setIsAuthed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null)
  const [endorsements, setEndorsements] = useState<any[]>([])

  const roles = [
    { value: 'INTERN', label: 'Intern' },
    { value: 'REGISTRAR', label: 'Registrar' },
    { value: 'SUPERVISOR', label: 'Supervisor' },
    { value: 'ORG_ADMIN', label: 'Organization Admin' },
  ]

  // Function to get default values for registrar qualification levels based on AHPRA rules
  const getRegistrarDefaults = (qualificationLevel: string) => {
    const defaults = {
      MASTERS: {
        target_weeks: 88,
        weekly_commitment: 34.1, // 3000 hours / 88 weeks
      },
      COMBINED: {
        target_weeks: 66,
        weekly_commitment: 34.1, // 2250 hours / 66 weeks
      },
      DOCTORATE: {
        target_weeks: 44,
        weekly_commitment: 34.1, // 1500 hours / 44 weeks
      },
      SECOND_AOPE: {
        target_weeks: 66,
        weekly_commitment: 34.1, // 2250 hours / 66 weeks
      },
    }
    
    return defaults[qualificationLevel as keyof typeof defaults] || {
      target_weeks: undefined,
      weekly_commitment: undefined,
    }
  }


  useEffect(() => {
    loadProfile()
  }, [])

  // Fetch endorsements when profile role changes to SUPERVISOR
  useEffect(() => {
    if (profile?.role === 'SUPERVISOR') {
      fetchEndorsements(profile.role)
    }
  }, [profile?.role])

  const loadProfile = async () => {
    try {
      setLoading(true)
      console.log('Loading profile...')
      
      // Debug authentication
      const token = localStorage.getItem('accessToken')
      console.log('Access token exists:', !!token)
      console.log('Access token preview:', token ? token.substring(0, 20) + '...' : 'None')
      
      const response = await apiFetch('/api/user-profile/')
      console.log('Profile response status:', response.status)
      console.log('Profile response ok:', response.ok)
      if (response.ok) {
        const data = await response.json()
        
        // Auto-set program_type based on role
        if (data.role === 'PROVISIONAL') {
          data.program_type = '5+1'
        } else if (data.role === 'REGISTRAR' && !data.program_type) {
          data.program_type = 'registrar'
        }
        
        // Set default start date if not set (for existing users)
        if (!data.start_date) {
          const defaultStartDate = new Date()
          defaultStartDate.setDate(defaultStartDate.getDate() - 23)
          data.start_date = defaultStartDate.toISOString().split('T')[0]
          console.log('Set default start date to:', data.start_date)
        }
        
        console.log('Profile data loaded:', data)
        setProfile(data)
        if (data.signature_url) {
          setSignaturePreview(data.signature_url)
        }
        setIsAuthed(true)
        
        // Fetch endorsements if user is a supervisor
        if (data.role === 'SUPERVISOR') {
          fetchEndorsements(data.role)
        }
      } else if (response.status === 401) {
        console.log('User not authenticated - showing demo data')
        // User not authenticated - show demo data
        setProfile({
          first_name: 'Intern',
          middle_name: '',
          last_name: 'Demo1',
          ahpra_registration_number: 'PSY0002268200',
          email: 'intern@demo.test',
          provisional_start_date: '2025-08-04',
          principal_supervisor: 'Demo Supervisor',
          secondary_supervisor: '',
          supervisor_emails: '',
          role: 'PROVISIONAL',
          prior_hours: {
            section_a_direct_client: 0,
            section_a_client_related: 0,
            section_b_professional_development: 0,
            section_c_supervision: 0
          },
    // Demo data for new fields
    program_type: '5+1',
    start_date: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 23 days ago
    target_weeks: 44,
    weekly_commitment: 17.5,
    aope: '',
    qualification_level: ''
        })
        setIsAuthed(false)
      } else {
        console.log('Profile load failed with status:', response.status)
        const errorText = await response.text()
        console.log('Error response:', errorText)
        throw new Error('Failed to load profile')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      // Show demo data on error
      setProfile({
        first_name: 'Intern',
        middle_name: '',
        last_name: 'Demo1',
        ahpra_registration_number: 'PSY0002268200',
        email: 'intern@demo.test',
        provisional_start_date: '2025-08-04',
        principal_supervisor: 'Demo Supervisor',
        principal_supervisor_email: '',
        secondary_supervisor: '',
        secondary_supervisor_email: '',
        supervisor_emails: '',
        role: 'PROVISIONAL',
        prior_hours: {
          section_a_direct_client: 0,
          section_a_client_related: 0,
          section_b_professional_development: 0,
          section_c_supervision: 0
        },
        // Demo data for new fields
        program_type: '5+1',
        start_date: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 23 days ago
        target_weeks: 44,
        weekly_commitment: 17.5,
        aope: '',
        qualification_level: ''
      })
      setIsAuthed(false)
    } finally {
      setLoading(false)
    }
  }

  const fetchEndorsements = async (userRole?: string) => {
    const role = userRole || profile?.role
    if (role !== 'SUPERVISOR') return
    
    try {
      const response = await apiFetch('/api/supervisor-endorsements/')
      if (response.ok) {
        const data = await response.json()
        setEndorsements(data)
        console.log('Fetched endorsements:', data)
      }
    } catch (error) {
      console.error('Error fetching endorsements:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProfile(prev => ({ ...prev, [name]: value }))
  }

  const handlePriorHoursChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setProfile(prev => ({
      ...prev,
      prior_hours: {
        ...prev.prior_hours!,
        [field]: numValue
      }
    }))
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setProfile(prev => ({ ...prev, provisional_start_date: format(date, 'yyyy-MM-dd') }))
    }
  }

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSignatureFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        setSignaturePreview(dataUrl)
        // Persist the data URL so it survives reloads (demo storage)
        setProfile(prev => ({ ...prev, signature_url: dataUrl }))
      }
      reader.readAsDataURL(file)
    }
  }

  const removeSignature = () => {
    setSignatureFile(null)
    setSignaturePreview(null)
  }

  const handleCityChange = (city: string) => {
    const cityInfo = getCityInfo(city)
    setProfile(prev => ({
      ...prev,
      city,
      state: cityInfo?.state || '',
      timezone: cityInfo?.timezone || ''
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const formData = new FormData()
      
      // Debug: Check if user is authenticated
      const token = localStorage.getItem('accessToken')
      console.log('Auth token exists:', !!token)
      console.log('Current profile data:', profile)
      
      // Add all profile fields to form data
      Object.entries(profile).forEach(([key, value]) => {
        if (key === 'prior_hours') {
          Object.entries(value as any).forEach(([subKey, subValue]) => {
            formData.append(`prior_hours.${subKey}`, subValue.toString())
          })
        } else if (value !== null && value !== undefined && value !== '' && key !== 'role') {
          formData.append(key, value.toString())
          console.log(`Adding field ${key}: ${value}`)
        }
      })

      // Add signature file if selected
      if (signatureFile) {
        formData.append('signature', signatureFile)
      }

      console.log('Sending profile update request...')
      const response = await apiFetch('/api/user-profile/', {
        method: 'PATCH',
        body: formData
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      if (response.ok) {
        alert('Profile updated successfully!')
        // Reload profile to get updated data from server
        await loadProfile()
      } else if (response.status === 401) {
        alert('Please log in to save your profile. Demo data is shown for preview.')
      } else {
        let details: any = null
        try { details = await response.json() } catch {}
        console.log('Error details:', details)
        const message = details ? `Save failed: ${JSON.stringify(details)}` : 'Failed to update profile'
        throw new Error(message)
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert(String(error))
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    loadProfile()
  }

  if (loading) {
    return <div className="container mx-auto py-8">Loading profile...</div>
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-headings text-3xl text-textDark">User Profile</h1>
      </div>

      {/* Authentication Notice */}
      {!isAuthed && (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Demo Mode
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>You are viewing demo data. To save changes, please log in with your credentials.</p>
              <p className="mt-1">
                <strong>Demo Login:</strong> Email: <code>intern@demo.test</code> | Password: <code>demo123</code>
              </p>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* User Details Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-textDark">User Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                name="first_name"
                value={profile.first_name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="middle_name">Middle Name</Label>
              <Input
                id="middle_name"
                name="middle_name"
                value={profile.middle_name || ''}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                name="last_name"
                value={profile.last_name}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ahpra_registration_number">AHPRA Registration Number</Label>
              <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                {profile.ahpra_registration_number}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                AHPRA Registration Number is set during registration and cannot be changed here
              </p>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                {profile.email || ''}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Email address is set during registration and cannot be changed here
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label>Role</Label>
              <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                {roles.find(role => role.value === profile.role)?.label || profile.role}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Role is set during registration and cannot be changed here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location & Contact Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-textDark">Location & Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="city">City *</Label>
              <CitySelect
                value={profile.city || ''}
                onValueChange={handleCityChange}
                placeholder="Select your city"
              />
              {profile.state && profile.timezone && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>State:</strong> {profile.state} | <strong>Timezone:</strong> {profile.timezone}
                  </p>
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input
                id="mobile"
                name="mobile"
                type="tel"
                value={profile.mobile || ''}
                onChange={handleInputChange}
                placeholder="e.g., +61412345678"
              />
              <p className="text-xs text-gray-500 mt-1">
                Australian mobile format: +614XXXXXXXX (optional)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Program Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-textDark">Program Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Program Type - Only show for Registrars */}
              {profile.role === 'REGISTRAR' && (
                <div>
                  <Label htmlFor="program_type">Program Type</Label>
                  <RadioGroup
                    value={profile.program_type || ''}
                    onValueChange={(value) => setProfile(prev => ({ ...prev, program_type: value }))}
                    className="flex gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="registrar" id="program_registrar" />
                      <Label htmlFor="program_registrar" className="text-sm">Registrar Program</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
              
              {/* For Provisionals: Show Program Type as read-only */}
              {profile.role === 'PROVISIONAL' && (
                <div>
                  <Label>Program Type</Label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                    5+1 Internship Program
                  </div>
                </div>
              )}
              
              {/* For Supervisors: Show Program Type as read-only */}
              {profile.role === 'SUPERVISOR' && (
                <div>
                  <Label>Program Type</Label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                    Supervisor Program
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="start_date">Program Start Date</Label>
                <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                  {profile.start_date ? format(new Date(profile.start_date), "PPP") : 'Not set'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Program start date is set during registration and cannot be changed here
                </p>
              </div>
            </div>

            {/* For Provisionals: Show Part-time vs Full-time option */}
            {profile.role === 'PROVISIONAL' && (
              <div className="mb-4 text-center">
                <Label>Study Mode</Label>
                <RadioGroup
                  value={profile.weekly_commitment === 17.5 ? 'fulltime' : 'parttime'}
                  onValueChange={(value) => {
                    const weeklyHours = value === 'fulltime' ? 17.5 : 8.75
                    setProfile(prev => ({ 
                      ...prev, 
                      weekly_commitment: weeklyHours,
                      target_weeks: value === 'fulltime' ? 44 : 88 // Double the weeks for part-time
                    }))
                  }}
                  className="flex justify-center gap-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fulltime" id="study_fulltime" />
                    <Label htmlFor="study_fulltime" className="text-sm">
                      Full-time (17.5 hrs/week, ~44 weeks)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="parttime" id="study_parttime" />
                    <Label htmlFor="study_parttime" className="text-sm">
                      Part-time (8.75 hrs/week, ~88 weeks)
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-gray-500 mt-1">
                  Minimum internship duration is 44 weeks regardless of study mode. Part-time students typically take twice as long.
                </p>
              </div>
            )}

            {/* For Registrars: Show calculated fields */}
            {profile.role === 'REGISTRAR' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="target_weeks">Target Weeks</Label>
                  <Input
                    id="target_weeks"
                    name="target_weeks"
                    type="number"
                    value={profile.target_weeks || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, target_weeks: e.target.value ? parseInt(e.target.value) : undefined }))}
                    placeholder="Auto-calculated based on qualification"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Set based on your qualification level selection above
                  </p>
                </div>
                <div>
                  <Label htmlFor="weekly_commitment">Weekly Commitment (Hours)</Label>
                  <Input
                    id="weekly_commitment"
                    name="weekly_commitment"
                    type="number"
                    step="0.1"
                    value={profile.weekly_commitment || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, weekly_commitment: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    placeholder="Auto-calculated based on qualification"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Calculated to meet total practice hours within target weeks
                  </p>
                </div>
              </div>
            )}

            {/* Registrar-specific fields */}
            {profile.role === 'REGISTRAR' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="aope">Area of Practice Endorsement (AoPE)</Label>
                    <RadioGroup
                      value={profile.aope || ''}
                      onValueChange={(value) => setProfile(prev => ({ ...prev, aope: value }))}
                      className="mt-2"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="CLINICAL" id="aope_clinical" />
                          <Label htmlFor="aope_clinical" className="text-sm">Clinical</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="FORENSIC" id="aope_forensic" />
                          <Label htmlFor="aope_forensic" className="text-sm">Forensic</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="ORGANISATIONAL" id="aope_organisational" />
                          <Label htmlFor="aope_organisational" className="text-sm">Organisational</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="SPORT_EXERCISE" id="aope_sport" />
                          <Label htmlFor="aope_sport" className="text-sm">Sport & Exercise</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="COMMUNITY" id="aope_community" />
                          <Label htmlFor="aope_community" className="text-sm">Community</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="COUNSELLING" id="aope_counselling" />
                          <Label htmlFor="aope_counselling" className="text-sm">Counselling</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="EDUCATIONAL_DEVELOPMENTAL" id="aope_educational" />
                          <Label htmlFor="aope_educational" className="text-sm">Educational & Developmental</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="HEALTH" id="aope_health" />
                          <Label htmlFor="aope_health" className="text-sm">Health</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="NEUROPSYCHOLOGY" id="aope_neuropsychology" />
                          <Label htmlFor="aope_neuropsychology" className="text-sm">Neuropsychology</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label htmlFor="qualification_level">Qualification Level</Label>
                    <p className="text-xs text-gray-500 mb-2">
                      Selecting a qualification level will auto-set target weeks and weekly commitment based on AHPRA requirements
                    </p>
                    <RadioGroup
                      value={profile.qualification_level || ''}
                      onValueChange={(value) => {
                        // Update qualification level and set default values based on AHPRA rules
                        const defaults = getRegistrarDefaults(value)
                        setProfile(prev => ({ 
                          ...prev, 
                          qualification_level: value,
                          target_weeks: defaults.target_weeks,
                          weekly_commitment: defaults.weekly_commitment
                        }))
                      }}
                      className="mt-2"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="MASTERS" id="qual_masters" />
                          <Label htmlFor="qual_masters" className="text-sm">Masters</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="COMBINED" id="qual_combined" />
                          <Label htmlFor="qual_combined" className="text-sm">Combined Masters/PhD</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="DOCTORATE" id="qual_doctorate" />
                          <Label htmlFor="qual_doctorate" className="text-sm">Doctorate</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="SECOND_AOPE" id="qual_second" />
                          <Label htmlFor="qual_second" className="text-sm">Second AoPE</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </>
            )}

            {/* Supervisor-specific fields */}
            {profile.role === 'SUPERVISOR' && (
              <>
                <div className="mb-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">Supervisor Status</h4>
                    <p className="text-sm text-green-700">
                      You are registered as a Board-Approved Supervisor and can provide supervision to provisional psychologists and registrars.
                    </p>
                  </div>
                </div>
              </>
            )}
        </CardContent>
      </Card>


      {/* Supervision Details Section - Only for non-supervisors */}
      {profile.role !== 'SUPERVISOR' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-textDark">Supervision Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Principal Supervisor */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <h4 className="font-semibold text-textDark mb-4">Principal Supervisor *</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="principal_supervisor_name">Name</Label>
                  <Input
                    id="principal_supervisor_name"
                    name="principal_supervisor"
                    value={profile.principal_supervisor}
                    onChange={handleInputChange}
                    placeholder="Dr. Jane Smith"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="principal_supervisor_email">Email</Label>
                  <Input
                    id="principal_supervisor_email"
                    name="principal_supervisor_email"
                    type="email"
                    value={profile.principal_supervisor_email || ''}
                    onChange={handleInputChange}
                    placeholder="jane.smith@example.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supervisor will receive a notification to accept/decline supervision
                  </p>
                </div>
              </div>
            </div>

            {/* Secondary Supervisor */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold text-textDark mb-4">Secondary Supervisor (Optional)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="secondary_supervisor_name">Name</Label>
                  <Input
                    id="secondary_supervisor_name"
                    name="secondary_supervisor"
                    value={profile.secondary_supervisor || ''}
                    onChange={handleInputChange}
                    placeholder="Dr. John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="secondary_supervisor_email">Email</Label>
                  <Input
                    id="secondary_supervisor_email"
                    name="secondary_supervisor_email"
                    type="email"
                    value={profile.secondary_supervisor_email || ''}
                    onChange={handleInputChange}
                    placeholder="john.doe@example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supervisor will receive a notification to accept/decline supervision
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Supervisor Emails */}
            <div>
              <Label htmlFor="supervisor_emails">Additional Supervisor Contacts</Label>
              <Textarea
                id="supervisor_emails"
                name="supervisor_emails"
                value={profile.supervisor_emails || ''}
                onChange={handleInputChange}
                placeholder="Enter additional supervisor email addresses, one per line"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                Add any additional supervisors or administrative contacts here
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Endorsement Management Section - Only for supervisors */}
      {profile.role === 'SUPERVISOR' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-textDark">Professional Endorsements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Endorsements Display */}
            {console.log('Profile role:', profile?.role, 'Endorsements count:', endorsements.length)}
            {endorsements.length > 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-3">Current Endorsements</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {endorsements.map((endorsement) => (
                    <div key={endorsement.id} className="bg-white border border-green-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-green-900 capitalize">
                            {endorsement.endorsement.replace('_', ' ').toLowerCase()}
                          </p>
                          <p className="text-sm text-green-700">
                            {endorsement.endorsement_body}
                          </p>
                          <p className="text-xs text-green-600">
                            {new Date(endorsement.endorsement_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${
                          endorsement.is_active ? 'bg-green-500' : 'bg-gray-400'
                        }`} title={endorsement.is_active ? 'Active' : 'Inactive'} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Current Endorsements</h4>
                <p className="text-sm text-gray-600">No endorsements found. Add your professional endorsements below.</p>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Supervisor Endorsements</h4>
              <p className="text-sm text-blue-700 mb-4">
                You can only supervise registrars who have matching endorsements. Add your professional endorsements below.
              </p>
              <EndorsementManagementModal
                trigger={
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Manage Endorsements
                  </Button>
                }
                onEndorsementsChange={() => {
                  // Refresh endorsements when they are updated
                  fetchEndorsements();
                }}
              />
            </div>
            
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-2">Available Endorsements:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Clinical Psychology</li>
                <li>Counselling Psychology</li>
                <li>Educational Psychology</li>
                <li>Forensic Psychology</li>
                <li>Health Psychology</li>
                <li>Neuropsychology</li>
                <li>Organisational Psychology</li>
                <li>Sport Psychology</li>
                <li>Community Psychology</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-textDark">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          <div className="flex gap-2">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-primaryBlue hover:bg-primaryBlue/90 text-white"
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="outline" className="bg-yellow-500 hover:bg-yellow-600 text-white">
              Update Subscription
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Signatures Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-textDark">Signatures</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="file"
              id="signature-upload"
              accept="image/*"
              onChange={handleSignatureUpload}
              className="hidden"
            />
            <Button
              onClick={() => document.getElementById('signature-upload')?.click()}
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Signatures
            </Button>
          </div>

          {signaturePreview || profile.signature_url ? (
            <div className="border rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Current Signature</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={removeSignature}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <img
                src={signaturePreview || (profile.signature_url as string)}
                alt="Signature preview"
                className="max-w-xs max-h-32 object-contain border rounded"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Prior Hours Section - Only for Provisionals and Registrars */}
      {(profile.role === 'PROVISIONAL' || profile.role === 'REGISTRAR') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-textDark">Prior Hours</CardTitle>
            <p className="text-sm text-textLight">
              Enter any hours completed before using PsychPATH to avoid recreating logbooks
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg bg-gray-50">
                <div className="text-2xl font-bold text-textDark mb-2">
                  {profile.prior_hours?.section_a_direct_client || 0}
                </div>
                <div className="text-sm text-textLight mb-2">Section A - Direct Client</div>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={profile.prior_hours?.section_a_direct_client || 0}
                  onChange={(e) => handlePriorHoursChange('section_a_direct_client', e.target.value)}
                  className="text-center"
                />
              </div>
              <div className="text-center p-4 border rounded-lg bg-gray-50">
                <div className="text-2xl font-bold text-textDark mb-2">
                  {profile.prior_hours?.section_a_client_related || 0}
                </div>
                <div className="text-sm text-textLight mb-2">Section A - Client Related</div>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={profile.prior_hours?.section_a_client_related || 0}
                  onChange={(e) => handlePriorHoursChange('section_a_client_related', e.target.value)}
                  className="text-center"
                />
              </div>
              <div className="text-center p-4 border rounded-lg bg-gray-50">
                <div className="text-2xl font-bold text-textDark mb-2">
                  {profile.prior_hours?.section_b_professional_development || 0}
                </div>
                <div className="text-sm text-textLight mb-2">Section B - Professional Development</div>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={profile.prior_hours?.section_b_professional_development || 0}
                  onChange={(e) => handlePriorHoursChange('section_b_professional_development', e.target.value)}
                  className="text-center"
                />
              </div>
              <div className="text-center p-4 border rounded-lg bg-gray-50">
                <div className="text-2xl font-bold text-textDark mb-2">
                  {profile.prior_hours?.section_c_supervision || 0}
                </div>
                <div className="text-sm text-textLight mb-2">Section C - Supervision</div>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={profile.prior_hours?.section_c_supervision || 0}
                  onChange={(e) => handlePriorHoursChange('section_c_supervision', e.target.value)}
                  className="text-center"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default UserProfile
