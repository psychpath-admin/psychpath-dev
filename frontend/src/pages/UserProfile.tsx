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

interface UserProfile {
  id?: number
  first_name: string
  middle_name?: string
  last_name: string
  ahpra_registration_number: string
  email: string
  intern_start_date: string
  report_start_day: string
  principal_supervisor: string
  secondary_supervisor?: string
  supervisor_emails?: string
  role: 'INTERN' | 'REGISTRAR' | 'SUPERVISOR' | 'ORG_ADMIN'
  signature_url?: string
  prior_hours?: {
    section_a_direct_client: number
    section_a_client_related: number
    section_b_professional_development: number
    section_c_supervision: number
  }
}

const UserProfile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>({
    first_name: '',
    middle_name: '',
    last_name: '',
    ahpra_registration_number: '',
    email: '',
    intern_start_date: '',
    report_start_day: 'Monday',
    principal_supervisor: '',
    secondary_supervisor: '',
    supervisor_emails: '',
    role: 'INTERN',
    prior_hours: {
      section_a_direct_client: 0,
      section_a_client_related: 0,
      section_b_professional_development: 0,
      section_c_supervision: 0
    }
  })
  const [loading, setLoading] = useState(true)
  const [isAuthed, setIsAuthed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null)

  const reportStartDays = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ]

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const response = await apiFetch('/api/user-profile/')
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        if (data.signature_url) {
          setSignaturePreview(data.signature_url)
        }
        setIsAuthed(true)
      } else if (response.status === 401) {
        // User not authenticated - show demo data
        setProfile({
          first_name: 'Intern',
          middle_name: '',
          last_name: 'Demo1',
          ahpra_registration_number: 'PSY0002268200',
          email: 'intern@demo.test',
          intern_start_date: '2025-08-04',
          report_start_day: 'Monday',
          principal_supervisor: 'Demo Supervisor',
          secondary_supervisor: '',
          supervisor_emails: '',
          role: 'INTERN',
          prior_hours: {
            section_a_direct_client: 0,
            section_a_client_related: 0,
            section_b_professional_development: 0,
            section_c_supervision: 0
          }
        })
        setIsAuthed(false)
      } else {
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
        intern_start_date: '2025-08-04',
        report_start_day: 'Monday',
        principal_supervisor: 'Demo Supervisor',
        secondary_supervisor: '',
        supervisor_emails: '',
        role: 'INTERN',
        prior_hours: {
          section_a_direct_client: 0,
          section_a_client_related: 0,
          section_b_professional_development: 0,
          section_c_supervision: 0
        }
      })
      setIsAuthed(false)
    } finally {
      setLoading(false)
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
      setProfile(prev => ({ ...prev, intern_start_date: format(date, 'yyyy-MM-dd') }))
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

  const handleSave = async () => {
    try {
      setSaving(true)
      const formData = new FormData()
      
      // Add all profile fields to form data
      Object.entries(profile).forEach(([key, value]) => {
        if (key === 'prior_hours') {
          Object.entries(value as any).forEach(([subKey, subValue]) => {
            formData.append(`prior_hours.${subKey}`, subValue.toString())
          })
        } else if (value !== null && value !== undefined && value !== '' && key !== 'role') {
          formData.append(key, value.toString())
        }
      })

      // Add signature file if selected
      if (signatureFile) {
        formData.append('signature', signatureFile)
      }

      const response = await apiFetch('/api/user-profile/', {
        method: 'PATCH',
        body: formData
      })

      if (response.ok) {
        alert('Profile updated successfully!')
      } else if (response.status === 401) {
        alert('Please log in to save your profile. Demo data is shown for preview.')
      } else {
        let details: any = null
        try { details = await response.json() } catch {}
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
              <Input
                id="ahpra_registration_number"
                name="ahpra_registration_number"
                value={profile.ahpra_registration_number}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={profile.email || ''}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Intern Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${!profile.intern_start_date && "text-muted-foreground"}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {profile.intern_start_date ? format(new Date(profile.intern_start_date), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={profile.intern_start_date ? new Date(profile.intern_start_date) : undefined}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Report Start Day</Label>
              <RadioGroup
                value={profile.report_start_day}
                onValueChange={(value) => setProfile(prev => ({ ...prev, report_start_day: value }))}
                className="flex flex-wrap gap-4 mt-2"
              >
                {reportStartDays.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <RadioGroupItem value={day} id={day} />
                    <Label htmlFor={day} className="text-sm">{day}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="principal_supervisor">Principal Supervisor</Label>
              <Input
                id="principal_supervisor"
                name="principal_supervisor"
                value={profile.principal_supervisor}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="secondary_supervisor">Secondary Supervisor</Label>
              <Input
                id="secondary_supervisor"
                name="secondary_supervisor"
                value={profile.secondary_supervisor || ''}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="supervisor_emails">Add Supervisor Email</Label>
            <Textarea
              id="supervisor_emails"
              name="supervisor_emails"
              value={profile.supervisor_emails || ''}
              onChange={handleInputChange}
              placeholder="Enter supervisor email addresses, one per line"
              rows={4}
            />
          </div>

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

      {/* Prior Hours Section - Only for Interns and Registrars */}
      {(profile.role === 'INTERN' || profile.role === 'REGISTRAR') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-textDark">Prior Hours</CardTitle>
            <p className="text-sm text-textLight">
              Enter any hours completed before using CAPE to avoid recreating logbooks
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
