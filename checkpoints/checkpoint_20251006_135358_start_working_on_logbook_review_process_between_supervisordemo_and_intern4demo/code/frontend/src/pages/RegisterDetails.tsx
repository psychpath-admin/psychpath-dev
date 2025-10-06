import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { API_URL } from '@/lib/api'
import CitySelect from '@/components/CitySelect'
import { getCityInfo } from '@/lib/cityMapping'

const designations = [
  { value: 'PROVISIONAL', label: 'Provisional Psychologist' },
  { value: 'REGISTRAR', label: 'Registrar' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
]


export default function RegisterDetails() {
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    ahpra_registration_number: '',
    designation: '',
    provisional_start_date: '' as string,
    city: '',
    state: '',
    timezone: '',
    mobile: '',
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    // Required fields
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required'
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    if (!formData.password) newErrors.password = 'Password is required'
    if (!formData.ahpra_registration_number.trim()) newErrors.ahpra_registration_number = 'AHPRA registration number is required'
    if (!formData.designation) newErrors.designation = 'Designation is required'
    if (formData.designation === 'PROVISIONAL' && !formData.provisional_start_date) {
      newErrors.provisional_start_date = 'Program start date is required'
    }
    if (!formData.city.trim()) newErrors.city = 'City is required'
    
    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    // Password validation
    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }
    
    // Password confirmation
    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match'
    }
    
    // AHPRA number validation (basic format check)
    if (formData.ahpra_registration_number && !/^[A-Z0-9]{3,15}$/.test(formData.ahpra_registration_number)) {
      newErrors.ahpra_registration_number = 'AHPRA registration number must be 3-15 alphanumeric characters'
    }
    
    // Program start date validation (only for provisional psychologists)
    if (formData.designation === 'PROVISIONAL' && formData.provisional_start_date) {
      const selectedDate = new Date(formData.provisional_start_date)
      const now = new Date()
      const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate())
      
      if (selectedDate > now) {
        newErrors.provisional_start_date = 'Program start date must be in the past'
      } else if (selectedDate < fiveYearsAgo) {
        newErrors.provisional_start_date = 'Program start date must be less than 5 years ago'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCityChange = (city: string) => {
    const cityInfo = getCityInfo(city)
    setFormData(prev => ({
      ...prev,
      city,
      state: cityInfo?.state || '',
      timezone: cityInfo?.timezone || ''
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/auth/register/details/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // Store form data for later use
        localStorage.setItem('registrationData', JSON.stringify(formData))
        // Store verification code for demo purposes
        if (data.verification_code) {
          localStorage.setItem('verification_code', data.verification_code)
        }
        window.location.href = '/register/verify'
      } else {
        setErrors({ submit: data.error || 'Registration failed' })
      }
    } catch (error) {
      console.error('Error submitting registration:', error)
      setErrors({ submit: 'Network error. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
    
    // Clear start date when supervisor is selected
    if (field === 'designation' && value === 'SUPERVISOR') {
      setFormData(prev => ({ ...prev, provisional_start_date: '' }))
      // Clear start date error
      if (errors.provisional_start_date) {
        setErrors(prev => ({ ...prev, provisional_start_date: '' }))
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Registration Details</CardTitle>
          <p className="text-center text-gray-600">Please provide your professional information</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    className={errors.first_name ? 'border-red-500' : ''}
                  />
                  {errors.first_name && <p className="text-sm text-red-500">{errors.first_name}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    className={errors.last_name ? 'border-red-500' : ''}
                  />
                  {errors.last_name && <p className="text-sm text-red-500">{errors.last_name}</p>}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="middle_name">Other Names (Optional)</Label>
                <Input
                  id="middle_name"
                  value={formData.middle_name}
                  onChange={(e) => handleInputChange('middle_name', e.target.value)}
                />
              </div>
            </div>

            {/* Account Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Account Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={errors.password ? 'border-red-500' : ''}
                  />
                  {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm Password *</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={formData.confirm_password}
                    onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                    className={errors.confirm_password ? 'border-red-500' : ''}
                  />
                  {errors.confirm_password && <p className="text-sm text-red-500">{errors.confirm_password}</p>}
                </div>
              </div>
            </div>

            {/* Professional Information */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Professional Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="ahpra_registration_number">AHPRA Registration Number *</Label>
                <Input
                  id="ahpra_registration_number"
                  value={formData.ahpra_registration_number}
                  onChange={(e) => handleInputChange('ahpra_registration_number', e.target.value.toUpperCase())}
                  placeholder="e.g., PSY000123456"
                  className={errors.ahpra_registration_number ? 'border-red-500' : ''}
                />
                {errors.ahpra_registration_number && <p className="text-sm text-red-500">{errors.ahpra_registration_number}</p>}
                <p className="text-xs text-gray-500">This must be unique in the system</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="designation">Designation *</Label>
                <Select value={formData.designation} onValueChange={(value) => handleInputChange('designation', value)}>
                  <SelectTrigger className={errors.designation ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select your designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {designations.map((designation) => (
                      <SelectItem key={designation.value} value={designation.value}>
                        {designation.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.designation && <p className="text-sm text-red-500">{errors.designation}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="provisional_start_date">
                  {formData.designation === 'REGISTRAR' ? 'Endorsement Registrar Start Date *' : 
                   formData.designation === 'SUPERVISOR' ? 'Start Date' :
                   'Internship Start Date *'}
                </Label>
                <Input
                  id="provisional_start_date"
                  type="date"
                  value={formData.provisional_start_date}
                  onChange={(e) => handleInputChange('provisional_start_date', e.target.value)}
                  disabled={formData.designation === 'SUPERVISOR'}
                  max={new Date().toISOString().split('T')[0]}
                  min={new Date(new Date().getFullYear() - 5, 0, 1).toISOString().split('T')[0]}
                  className={cn(
                    errors.provisional_start_date && "border-red-500",
                    formData.designation === 'SUPERVISOR' && "bg-gray-100 text-gray-400 cursor-not-allowed"
                  )}
                  placeholder={formData.designation === 'SUPERVISOR' ? 'Not applicable for supervisors' : 'Select a date'}
                />
                {errors.provisional_start_date && <p className="text-sm text-red-500">{errors.provisional_start_date}</p>}
                {formData.designation === 'SUPERVISOR' ? (
                  <p className="text-xs text-gray-500">Start date is not required for supervisors</p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Select the date when your {formData.designation === 'REGISTRAR' ? 'registrar program' : 'internship'} started (must be in the past and less than 5 years ago)
                  </p>
                )}
              </div>
              
            </div>

            {/* Location & Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Location & Contact Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <CitySelect
                  value={formData.city}
                  onValueChange={handleCityChange}
                  placeholder="Select your city"
                />
                {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
                
                {/* Display derived information */}
                {formData.state && formData.timezone && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>State:</strong> {formData.state} | <strong>Timezone:</strong> {formData.timezone}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number (Optional)</Label>
                <Input
                  id="mobile"
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => handleInputChange('mobile', e.target.value)}
                  placeholder="e.g., +61412345678"
                />
                <p className="text-xs text-gray-500">Australian mobile format: +614XXXXXXXX</p>
              </div>
            </div>

            <div className="flex justify-center pt-6">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-primary text-white hover:bg-primary/90 px-8"
              >
                {isLoading ? 'Processing...' : 'Continue to Verification'}
              </Button>
            </div>
            
            <div className="text-center mt-4">
              <Link to="/login" className="text-sm text-primaryBlue hover:underline">
                ← Back to Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
