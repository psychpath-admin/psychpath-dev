/**
 * Enhanced Logbook Creation Form
 * Create new logbooks with supervisor assignment and initial setup
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  ArrowLeft,
  Calendar,
  User,
  Save,
  Plus,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'

interface User {
  id: number
  email: string
  first_name: string
  last_name: string
}

export default function EnhancedLogbookCreate() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [supervisors, setSupervisors] = useState<User[]>([])
  const [formData, setFormData] = useState({
    week_start_date: '',
    supervisor: '',
    notes: ''
  })
  const [errors, setErrors] = useState<{[key: string]: string}>({})

  useEffect(() => {
    fetchSupervisors()
  }, [])

  const fetchSupervisors = async () => {
    try {
      // This would typically come from a supervisors endpoint
      // For now, we'll use a mock or existing users endpoint
      const response = await apiFetch('/api/users/supervisors/')
      setSupervisors(response.results || response)
    } catch (error) {
      console.error('Error fetching supervisors:', error)
      // If no supervisors endpoint exists, we'll allow empty selection
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}

    if (!formData.week_start_date) {
      newErrors.week_start_date = 'Week start date is required'
    } else {
      const selectedDate = new Date(formData.week_start_date)
      const today = new Date()
      
      if (selectedDate > today) {
        newErrors.week_start_date = 'Week start date cannot be in the future'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the errors below')
      return
    }

    try {
      setLoading(true)
      
      const response = await apiFetch('/api/enhanced-logbooks/', {
        method: 'POST',
        body: JSON.stringify({
          week_start_date: formData.week_start_date,
          supervisor: formData.supervisor || null,
          notes: formData.notes
        })
      })

      toast.success('Logbook created successfully')
      navigate(`/enhanced-logbooks/${response.id}`)
    } catch (error: any) {
      console.error('Error creating logbook:', error)
      
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      } else {
        toast.error('Failed to create logbook')
      }
    } finally {
      setLoading(false)
    }
  }

  const getWeekStartDate = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - dayOfWeek + 1)
    return monday.toISOString().split('T')[0]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => navigate('/enhanced-logbooks')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Logbook</h1>
              <p className="text-gray-600 mt-1">Set up a new weekly logbook for tracking</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Logbook Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Week Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Week Start Date *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="date"
                      value={formData.week_start_date}
                      onChange={(e) => handleInputChange('week_start_date', e.target.value)}
                      className={`pl-10 ${errors.week_start_date ? 'border-red-500' : ''}`}
                      placeholder="Select week start date"
                    />
                  </div>
                  {errors.week_start_date && (
                    <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {errors.week_start_date}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    This will be the Monday of the week you're tracking
                  </p>
                </div>

                {/* Supervisor Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supervisor
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Select
                      value={formData.supervisor}
                      onValueChange={(value) => handleInputChange('supervisor', value)}
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Select a supervisor (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No supervisor assigned</SelectItem>
                        {supervisors.map((supervisor) => (
                          <SelectItem key={supervisor.id} value={supervisor.id.toString()}>
                            {supervisor.first_name} {supervisor.last_name} ({supervisor.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    You can assign a supervisor later if needed
                  </p>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Add any initial notes or comments..."
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional notes that will be visible to supervisors
                  </p>
                </div>

                {/* Quick Setup Options */}
                <div className="border-t pt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Setup</h3>
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const weekStart = getWeekStartDate()
                        handleInputChange('week_start_date', weekStart)
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Use Current Week
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const lastWeek = new Date()
                        lastWeek.setDate(lastWeek.getDate() - 7)
                        const dayOfWeek = lastWeek.getDay()
                        const monday = new Date(lastWeek)
                        monday.setDate(lastWeek.getDate() - dayOfWeek + 1)
                        handleInputChange('week_start_date', monday.toISOString().split('T')[0])
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Use Last Week
                    </Button>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center gap-4 pt-6 border-t">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Create Logbook
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/enhanced-logbooks')}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm">What happens next?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Your logbook will be created with three default sections (A, B, C)</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>You can start adding entries to each section</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>When ready, submit the logbook for supervisor review</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Supervisors can approve, reject, or request changes</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
