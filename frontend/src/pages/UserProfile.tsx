import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
import SupervisorWelcomeOverlay from '@/components/SupervisorWelcomeOverlay'
import ProvisionalPsychologistWelcomeOverlay from '@/components/ProvisionalPsychologistWelcomeOverlay'
import { getCityInfo } from '@/lib/cityMapping'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import ErrorOverlay from '@/components/ErrorOverlay'
import DisconnectionRequestModal from '@/components/DisconnectionRequestModal'

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
  initials_url?: string
  prior_hours?: {
    section_a_direct_client: number
    section_a_client_related: number
    section_b_professional_development: number
    section_c_supervision: number
  }
  prior_hours_declined?: boolean
  prior_hours_submitted?: boolean
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
  // Supervisor-specific fields
  is_board_approved_supervisor?: boolean
  supervisor_registration_date?: string
  can_supervise_provisionals?: boolean
  can_supervise_registrars?: boolean
  supervisor_welcome_seen?: boolean
  // Provisional psychologist-specific fields
  provisional_registration_date?: string
  internship_start_date?: string
  is_full_time?: boolean
  estimated_completion_weeks?: number
  weekly_commitment_hours?: number
  first_login_completed?: boolean
}

const UserProfile: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { showError, showErrorOverlay, currentError, dismissError, retryAction, setRetryAction } = useErrorHandler()
  
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
    prior_hours_declined: false,
    prior_hours_submitted: false,
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
    qualification_level: 'MASTERS', // Default to Masters for registrars
    // Supervisor-specific fields
    is_board_approved_supervisor: false,
    supervisor_registration_date: '',
    can_supervise_provisionals: false,
    can_supervise_registrars: false,
    supervisor_welcome_seen: false,
    // Provisional psychologist-specific fields
    provisional_registration_date: '',
    internship_start_date: '',
    is_full_time: true,
    estimated_completion_weeks: 44,
    weekly_commitment_hours: 17.5,
    first_login_completed: false
  })
  
  // Track which critical dates have been successfully saved
  const [savedDates, setSavedDates] = useState({
    provisional_registration_date: false,
    internship_start_date: false,
    start_date: false
  })
  const [loading, setLoading] = useState(true)
  const [isAuthed, setIsAuthed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null)
  const [initialsFile, setInitialsFile] = useState<File | null>(null)
  const [initialsPreview, setInitialsPreview] = useState<string | null>(null)
  const [endorsements, setEndorsements] = useState<any[]>([])
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false)
  const [overlayJustAcknowledged, setOverlayJustAcknowledged] = useState(false)
  const [showProvisionalWelcomeOverlay, setShowProvisionalWelcomeOverlay] = useState(false)
  const [showPriorHoursConfirmation, setShowPriorHoursConfirmation] = useState(false)
  const [priorHoursToSubmit, setPriorHoursToSubmit] = useState<any>(null)
  const [showPriorHoursAcknowledgment, setShowPriorHoursAcknowledgment] = useState(false)
  const [hasPriorHoursDecision, setHasPriorHoursDecision] = useState(false)
  
  // Disconnection request modal state
  const [showDisconnectionModal, setShowDisconnectionModal] = useState(false)
  const [disconnectionRole, setDisconnectionRole] = useState<'PRIMARY' | 'SECONDARY'>('PRIMARY')
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({})

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

  // Handle navigation prevention for users who haven't made prior hours decision
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only prevent navigation for provisional psychologists and registrars who haven't made prior hours decision
      if ((profile.role === 'PROVISIONAL' || profile.role === 'REGISTRAR') && !hasPriorHoursDecision) {
        e.preventDefault()
        e.returnValue = 'You must make a decision about your prior hours before leaving this page.'
        return 'You must make a decision about your prior hours before leaving this page.'
      }
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    const handleVisibilityChange = () => {
      // Show acknowledgment dialog when user tries to navigate away
      if ((profile.role === 'PROVISIONAL' || profile.role === 'REGISTRAR') && !hasPriorHoursDecision && document.hidden) {
        setShowPriorHoursAcknowledgment(true)
      }
    }

    const handleClick = (e: MouseEvent) => {
      // Check if user is clicking on navigation links
      const target = e.target as HTMLElement
      const link = target.closest('a')
      const button = target.closest('button')
      
      // Confirm leaving if dirty
      if (isDirty && (link || (button && button.getAttribute('data-nav') !== null))) {
        const ok = window.confirm('You have unsaved changes. Are you sure you want to leave this page?')
        if (!ok) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
      }
      
      // Check for navigation links
      if (link && link.href && !link.href.includes('javascript:') && 
          (profile.role === 'PROVISIONAL' || profile.role === 'REGISTRAR') && !hasPriorHoursDecision) {
        e.preventDefault()
        e.stopPropagation()
        setShowPriorHoursAcknowledgment(true)
        return
      }
      
      // Check for navigation buttons (like in navbar)
      if (button && button.dataset.nav && 
          (profile.role === 'PROVISIONAL' || profile.role === 'REGISTRAR') && !hasPriorHoursDecision) {
        e.preventDefault()
        e.stopPropagation()
        setShowPriorHoursAcknowledgment(true)
        return
      }
    }

    const markDirtyFromAnyInput = () => setIsDirty(true)

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('click', handleClick)
    document.addEventListener('input', markDirtyFromAnyInput)
    // Explicit assignment for Safari/iOS
    const prevBeforeUnload = window.onbeforeunload
    window.onbeforeunload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
      return null
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('click', handleClick)
      document.removeEventListener('input', markDirtyFromAnyInput)
      window.onbeforeunload = prevBeforeUnload || null
    }
  }, [profile.role, hasPriorHoursDecision, isDirty])

  // Intercept React Router navigation attempts
  useEffect(() => {
    const handleRouteChange = (e: PopStateEvent) => {
      if (isDirty) {
        const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave this page?')
        if (!confirmLeave) {
          window.history.pushState(null, '', location.pathname)
          return
        }
      }
      if ((profile.role === 'PROVISIONAL' || profile.role === 'REGISTRAR') && !hasPriorHoursDecision) {
        // Prevent the route change
        window.history.pushState(null, '', location.pathname)
        setShowPriorHoursAcknowledgment(true)
      }
    }

    window.addEventListener('popstate', handleRouteChange)
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [profile.role, hasPriorHoursDecision, location.pathname, isDirty])

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
        
        // Handle null prior_hours from backend
        if (data.prior_hours === null) {
          data.prior_hours = {
            section_a_direct_client: 0,
            section_a_client_related: 0,
            section_b_professional_development: 0,
            section_c_supervision: 0
          }
        }
        
        // Set default study mode values for provisional psychologists
        if (data.role === 'PROVISIONAL') {
          // Default to full-time if not set
          if (data.is_full_time === undefined || data.is_full_time === null) {
            data.is_full_time = true
          }
          
          // Set default weekly commitment hours if not set
          if (!data.weekly_commitment_hours && !data.weekly_commitment) {
            data.weekly_commitment_hours = data.is_full_time ? 17.5 : 8.75
            data.weekly_commitment = data.is_full_time ? 17.5 : 8.75
          }
          
          // Set default estimated completion weeks if not set
          if (!data.estimated_completion_weeks && !data.target_weeks) {
            data.estimated_completion_weeks = data.is_full_time ? 44 : 88
            data.target_weeks = data.is_full_time ? 44 : 88
          }
        }
        
        // Set default values for registrars
        if (data.role === 'REGISTRAR') {
          // Default qualification level to Masters if not set
          if (!data.qualification_level) {
            data.qualification_level = 'MASTERS'
          }
          
          // Set default target weeks and weekly commitment based on qualification level
          const defaults = getRegistrarDefaults(data.qualification_level)
          if (!data.target_weeks && defaults.target_weeks) {
            data.target_weeks = defaults.target_weeks
          }
          if (!data.weekly_commitment && defaults.weekly_commitment) {
            data.weekly_commitment = defaults.weekly_commitment
          }
        }
        
        console.log('Profile loaded:', data.role, 'qualification_level:', data.qualification_level)
        setProfile(data)
        
        // Set saved dates state based on loaded profile
        setSavedDates({
          provisional_registration_date: !!data.provisional_registration_date,
          internship_start_date: !!data.internship_start_date,
          start_date: !!data.start_date
        })
        
        if (data.signature_url) {
          setSignaturePreview(data.signature_url)
        }
        if (data.initials_url) {
          setInitialsPreview(data.initials_url)
        }
        setIsAuthed(true)
        
        // Show welcome overlay for supervisors who haven't seen it yet
        // Only show if they haven't seen it in the database
        if (data.role === 'SUPERVISOR' && !data.supervisor_welcome_seen) {
          setShowWelcomeOverlay(true)
        }
        
        // Show welcome overlay for provisional psychologists on first login
        if (data.role === 'PROVISIONAL' && !data.first_login_completed) {
          setShowProvisionalWelcomeOverlay(true)
        }
        
        // Check if user has made prior hours decision
        const hasDecision = data.prior_hours_submitted || data.prior_hours_declined
        console.log('Prior hours decision check:', {
          prior_hours_submitted: data.prior_hours_submitted,
          prior_hours_declined: data.prior_hours_declined,
          hasDecision,
          role: data.role,
          currentHasPriorHoursDecision: hasPriorHoursDecision
        })
        setHasPriorHoursDecision(hasDecision)
        
        // Show prior hours acknowledgment dialog if user hasn't made a decision
        // Only show for PROVISIONAL and REGISTRAR roles, never for SUPERVISOR or ORG_ADMIN
        if (data.role === 'SUPERVISOR' || data.role === 'ORG_ADMIN') {
          console.log('User is supervisor or org admin, not showing prior hours dialog')
          setShowPriorHoursAcknowledgment(false)
        } else if ((data.role === 'PROVISIONAL' || data.role === 'REGISTRAR') && !hasDecision) {
          console.log('Showing prior hours acknowledgment dialog')
          setShowPriorHoursAcknowledgment(true)
        } else if (hasDecision) {
          console.log('User has already made prior hours decision, not showing dialog')
          setShowPriorHoursAcknowledgment(false)
        }
        
        // Reset overlay acknowledgment state when profile loads
        setOverlayJustAcknowledged(false)
        
        // Fetch endorsements if user is a supervisor
        if (data.role === 'SUPERVISOR') {
          fetchEndorsements(data.role)
        }
      } else if (response.status === 401) {
        console.log('User not authenticated - clearing profile data')
        // User not authenticated - clear profile data instead of showing demo data
        setProfile({
          first_name: '',
          middle_name: '',
          last_name: '',
          ahpra_registration_number: '',
          email: '',
          provisional_start_date: '',
          principal_supervisor: '',
          secondary_supervisor: '',
          supervisor_emails: '',
          role: 'PROVISIONAL',
          prior_hours: {
            section_a_direct_client: 0,
            section_a_client_related: 0,
            section_b_professional_development: 0,
            section_c_supervision: 0
          },
          // Clear new fields instead of demo data
          program_type: '',
          start_date: '',
          target_weeks: 0,
          weekly_commitment: 0,
          aope: '',
          qualification_level: '',
          city: '',
          state: '',
          timezone: '',
          mobile: ''
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
    setIsDirty(true)
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
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
    setIsDirty(true)
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setProfile(prev => ({ ...prev, provisional_start_date: format(date, 'yyyy-MM-dd') }))
      setIsDirty(true)
    }
  }

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleSignatureUpload called')
    console.log('e.target.files:', e.target.files)
    const file = e.target.files?.[0]
    if (file) {
      console.log('Signature file selected:', file.name, file.size)
      
      // Validate file size (max 2MB)
      const maxSize = 2 * 1024 * 1024 // 2MB
      if (file.size > maxSize) {
        alert(`File is too large. Maximum size is 2MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`)
        return
      }
      
      console.log('Setting signatureFile state to:', file)
      setSignatureFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        setSignaturePreview(dataUrl)
        // Don't set signature_url in profile state - let backend handle it
        console.log('Signature preview generated, length:', dataUrl.length)
      }
      reader.readAsDataURL(file)
    } else {
      console.log('No file selected')
    }
  }

  const removeSignature = () => {
    setSignatureFile(null)
    setSignaturePreview(null)
    setProfile(prev => ({ ...prev, signature_url: '' }))
  }

  const handleInitialsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleInitialsUpload called')
    console.log('e.target.files:', e.target.files)
    const file = e.target.files?.[0]
    if (file) {
      console.log('Initials file selected:', file.name, file.size)
      
      // Validate file size (max 2MB)
      const maxSize = 2 * 1024 * 1024 // 2MB
      if (file.size > maxSize) {
        alert(`File is too large. Maximum size is 2MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`)
        return
      }
      
      console.log('Setting initialsFile state to:', file)
      setInitialsFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        setInitialsPreview(dataUrl)
        // Don't set initials_url in profile state - let backend handle it
        console.log('Initials preview generated, length:', dataUrl.length)
      }
      reader.readAsDataURL(file)
    } else {
      console.log('No file selected')
    }
  }

  const removeInitials = () => {
    setInitialsFile(null)
    setInitialsPreview(null)
    setProfile(prev => ({ ...prev, initials_url: '' }))
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

  // Validation function for mobile number
  const validateMobileNumber = (mobile: string) => {
    if (!mobile || mobile.trim() === '') return true // Mobile is optional
    
    // Strip spaces and dashes
    const cleanMobile = mobile.replace(/[\s\-]/g, '')
    
    // Validate format: (+61|0)4xxxxxxxx
    const mobileRegex = /^(\+61|0)4\d{8}$/
    
    if (!mobileRegex.test(cleanMobile)) {
      alert('Mobile number must be in format: 04xx xxx xxx or +61 4xx xxx xxx')
      return false
    }
    
    return true
  }

  // Validation function for supervisor requirements
  const validateSupervisorProfile = () => {
    if (profile.role !== 'SUPERVISOR') return true

    // If user is board-approved supervisor, validate required fields
    if (profile.is_board_approved_supervisor) {
      // Supervisor registration date is required if board-approved
      if (!profile.supervisor_registration_date) {
        alert('Supervisor registration date is required for board-approved supervisors.')
        return false
      }

      // Must select at least one supervision scope
      if (!profile.can_supervise_provisionals && !profile.can_supervise_registrars) {
        alert('Please select at least one supervision scope (provisionals or registrars).')
        return false
      }
    }

    return true
  }

  // Handle supervisor welcome overlay
  const handleWelcomeOverlayClose = () => {
    setShowWelcomeOverlay(false)
  }

  const handleWelcomeOverlayAcknowledge = async () => {
    try {
      // Update the profile to mark welcome as seen
      const response = await apiFetch('/api/user-profile/', {
        method: 'PATCH',
        body: JSON.stringify({ supervisor_welcome_seen: true })
      })

      if (response.ok) {
        // Update local state
        setProfile(prev => ({ ...prev, supervisor_welcome_seen: true }))
        setShowWelcomeOverlay(false)
        setOverlayJustAcknowledged(true) // Prevent overlay from showing again in this session
        console.log('Supervisor welcome acknowledged')
      } else {
        console.error('Failed to acknowledge supervisor welcome')
      }
    } catch (error) {
      console.error('Error acknowledging supervisor welcome:', error)
    }
  }

  const handleProvisionalWelcomeOverlayClose = () => {
    setShowProvisionalWelcomeOverlay(false)
  }

  const handleProvisionalWelcomeOverlayContinue = async () => {
    console.log('Continue button clicked - starting process...')
    try {
      // Update the profile to mark first login as completed
      // Include required provisional fields to pass validation
      console.log('Sending PATCH request to /api/user-profile/')
      const response = await apiFetch('/api/user-profile/', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          first_login_completed: true,
          provisional_registration_date: profile.provisional_registration_date || '2025-07-01',
          internship_start_date: profile.internship_start_date || '2025-09-01',
          program_type: profile.program_type || '5+1',
          estimated_completion_weeks: profile.estimated_completion_weeks || profile.target_weeks || 44,
          weekly_commitment_hours: profile.weekly_commitment_hours || profile.weekly_commitment || 17.5,
          is_full_time: profile.is_full_time !== undefined ? profile.is_full_time : true
        })
      })

      console.log('Response received:', response.status, response.ok)
      
      if (response.ok) {
        // Update local state
        setProfile(prev => ({ ...prev, first_login_completed: true }))
        setShowProvisionalWelcomeOverlay(false)
        console.log('Provisional psychologist welcome acknowledged - staying on profile page')
        
        // Stay on profile page to complete profile information
        // No redirect - user should complete their profile first
      } else {
        const errorData = await response.json()
        console.error('Failed to acknowledge provisional psychologist welcome:', errorData)
        alert('Failed to acknowledge welcome. Please try again.')
      }
    } catch (error) {
      console.error('Error acknowledging provisional psychologist welcome:', error)
      alert('Error acknowledging welcome. Please try again.')
    }
  }

  const handleWelcomeOverlay = () => {
    setShowWelcomeOverlay(true)
  }

  // Prior hours processing functions
  const handleDeclinePriorHours = async () => {
    try {
      const response = await apiFetch('/api/user-profile/', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          prior_hours_declined: true,
          prior_hours_submitted: true 
        })
      })

      if (response.ok) {
        setProfile(prev => ({ 
          ...prev, 
          prior_hours_declined: true,
          prior_hours_submitted: true 
        }))
        setHasPriorHoursDecision(true)
        console.log('Prior hours declined and locked')
      } else {
        console.error('Failed to decline prior hours')
        alert('Failed to decline prior hours. Please try again.')
      }
    } catch (error) {
      console.error('Error declining prior hours:', error)
      alert('Error declining prior hours. Please try again.')
    }
  }

  const handleSubmitPriorHours = () => {
    // Show confirmation dialog
    setPriorHoursToSubmit(profile.prior_hours)
    setShowPriorHoursConfirmation(true)
  }

  const handleConfirmPriorHoursSubmission = async () => {
    try {
      const response = await apiFetch('/api/user-profile/', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          prior_hours: priorHoursToSubmit,
          prior_hours_submitted: true 
        })
      })

      if (response.ok) {
        // Update local state immediately
        setProfile(prev => ({ 
          ...prev, 
          prior_hours: priorHoursToSubmit,
          prior_hours_submitted: true 
        }))
        setHasPriorHoursDecision(true)
        setShowPriorHoursConfirmation(false)
        setPriorHoursToSubmit(null)
        console.log('Prior hours submitted and locked')
        
        // Remain on profile so first-time users complete their profile
        navigate('/profile')
      } else {
        console.error('Failed to submit prior hours')
        alert('Failed to submit prior hours. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting prior hours:', error)
      alert('Error submitting prior hours. Please try again.')
    }
  }

  const handleCancelPriorHoursSubmission = () => {
    setShowPriorHoursConfirmation(false)
    setPriorHoursToSubmit(null)
  }

  const handlePriorHoursAcknowledgmentDecline = async () => {
    try {
      const response = await apiFetch('/api/user-profile/', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          prior_hours_declined: true,
          prior_hours_submitted: true 
        })
      })

      if (response.ok) {
        // Update local state immediately
        setProfile(prev => ({ 
          ...prev, 
          prior_hours_declined: true,
          prior_hours_submitted: true 
        }))
        setHasPriorHoursDecision(true)
        setShowPriorHoursAcknowledgment(false)
        
        console.log('Prior hours declined and locked')
        
        // Remain on profile so first-time users complete their profile
        navigate('/profile')
      } else {
        console.error('Failed to decline prior hours')
        alert('Failed to decline prior hours. Please try again.')
      }
    } catch (error) {
      console.error('Error declining prior hours:', error)
      alert('Error declining prior hours. Please try again.')
    }
  }

  const handlePriorHoursAcknowledgmentSubmit = () => {
    // Show the confirmation dialog with current prior hours values
    setPriorHoursToSubmit(profile.prior_hours)
    setShowPriorHoursConfirmation(true)
    setShowPriorHoursAcknowledgment(false)
  }

  const handleCancelPriorHoursAcknowledgment = () => {
    setShowPriorHoursAcknowledgment(false)
  }

  // Function to check if user should see prior hours acknowledgment
  const checkPriorHoursRequirement = () => {
    // Never show prior hours overlay for supervisors or org admins
    if (profile.role === 'SUPERVISOR' || profile.role === 'ORG_ADMIN') {
      return false
    }
    if ((profile.role === 'PROVISIONAL' || profile.role === 'REGISTRAR') && !hasPriorHoursDecision) {
      setShowPriorHoursAcknowledgment(true)
      return true
    }
    return false
  }

  // Custom navigation function that checks prior hours requirements
  const navigateWithPriorHoursCheck = (path: string) => {
    // Never check prior hours for supervisors or org admins
    if (profile.role === 'SUPERVISOR' || profile.role === 'ORG_ADMIN') {
      navigate(path)
      return true
    }
    if ((profile.role === 'PROVISIONAL' || profile.role === 'REGISTRAR') && !hasPriorHoursDecision) {
      setShowPriorHoursAcknowledgment(true)
      return false // Prevent navigation
    }
    navigate(path)
    return true
  }

  const handleSave = async () => {
    // Prevent multiple simultaneous submissions
    if (saving) {
      console.log('Save already in progress, ignoring duplicate submission')
      return
    }

    // Validate mobile number
    if (!validateMobileNumber(profile.mobile || '')) {
      return
    }

    // Validate supervisor requirements
    if (!validateSupervisorProfile()) {
      return
    }

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
        } else if (value !== null && value !== undefined) {
          // Handle different data types properly
          if (typeof value === 'boolean') {
            // Convert boolean to string properly for FormData
            formData.append(key, value ? 'true' : 'false')
          } else if (typeof value === 'number') {
            formData.append(key, value.toString())
          } else if (typeof value === 'string') {
            // Always include critical date fields, even if empty (for validation)
            const criticalFields = ['provisional_registration_date', 'internship_start_date', 'start_date']
            if (value !== '' || criticalFields.includes(key)) {
              // Clean mobile number before sending
              if (key === 'mobile') {
                const cleanMobile = value.replace(/[\s\-]/g, '')
                formData.append(key, cleanMobile)
              } else {
                formData.append(key, value)
              }
            }
          } else if (typeof value === 'object' && value !== null) {
            formData.append(key, JSON.stringify(value))
          }
          console.log(`Adding field ${key}: ${value} (type: ${typeof value})`)
        }
      })

      // Add signature file if selected
      console.log('signatureFile state:', signatureFile)
      console.log('initialsFile state:', initialsFile)
      
      if (signatureFile) {
        console.log('Adding signature file to FormData:', signatureFile.name, signatureFile.size)
        formData.append('signature', signatureFile)
      } else {
        console.log('No signature file to add')
      }

      // Add initials file if selected
      if (initialsFile) {
        console.log('Adding initials file to FormData:', initialsFile.name, initialsFile.size)
        formData.append('initials', initialsFile)
      } else {
        console.log('No initials file to add')
      }

      console.log('Sending profile update request...')
      console.log('FormData contents:')
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value)
      }
      
      // Add timeout handling for large file uploads
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      try {
        const response = await apiFetch('/api/user-profile/', {
          method: 'PATCH',
          body: formData,
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        console.log('Response status:', response.status)
        console.log('Response ok:', response.ok)
      
        if (!response.ok) {
          const errorData = await response.json()
          console.error('Profile update failed:', errorData)
          
          // For validation errors, extract the specific error message and field errors
          if (response.status === 400 && errorData.error) {
            // Check if it's a string that starts with "Validation failed:"
            if (typeof errorData.error === 'string' && errorData.error.startsWith('Validation failed: ')) {
              // Extract the Python dict part after "Validation failed: "
              const dictPart = errorData.error.substring('Validation failed: '.length)
              
              // Extract the error message using regex to find the ErrorDetail string content
              const errorMatch = dictPart.match(/ErrorDetail\(string='([^']+)', code='invalid'\)/)
              
              if (errorMatch) {
                const cleanMessage = errorMatch[1]
                
                // Extract field name from the dict structure
                const fieldMatch = dictPart.match(/'([^']+)': \[ErrorDetail/)
                
                if (fieldMatch) {
                  const fieldName = fieldMatch[1]
                  
                  // Set field errors for highlighting
                  setFieldErrors({ [fieldName]: cleanMessage })
                  
                  // Throw the clean error message
                  throw new Error(cleanMessage)
                }
              }
              
              // If regex extraction fails, throw the raw error
              throw new Error(errorData.error)
            }
            // If it's a field-specific error object, extract the actual message and track field errors
            else if (typeof errorData.error === 'object') {
              const fieldErrorMessages: {[key: string]: string} = {}
              let primaryErrorMessage = ''
              
              // Extract errors for each field
              Object.entries(errorData.error).forEach(([fieldName, errors]) => {
                if (Array.isArray(errors) && errors.length > 0) {
                  // Handle ErrorDetail objects or direct strings
                  const errorDetail = errors[0]
                  const actualMessage = errorDetail.string || errorDetail.message || errorDetail
                  fieldErrorMessages[fieldName] = actualMessage
                  if (!primaryErrorMessage) {
                    primaryErrorMessage = actualMessage
                  }
                }
              })
              
              // Set field errors for highlighting
              setFieldErrors(fieldErrorMessages)
              
              // Throw the primary error message
              if (primaryErrorMessage) {
                throw new Error(primaryErrorMessage)
              }
            }
            
            // If none of the above conditions are met, throw the raw error
            throw new Error(errorData.error)
          }
          
          throw new Error(errorData.error || 'Failed to update profile')
        }

        // Show success message with role-specific text
        const successMessage = profile.role === 'SUPERVISOR' 
          ? 'Supervisor profile updated successfully!' 
          : 'Profile updated successfully!'
        alert(successMessage)
        
        // Reload profile to get updated data from server
        await loadProfile()
        setIsDirty(false)
        
        // Clear any field errors on successful save
        setFieldErrors({})
        
        // Check if prior hours decision was made during this save
        if (profile.prior_hours_submitted || profile.prior_hours_declined) {
          setHasPriorHoursDecision(true)
        }
        
      } catch (error) {
        clearTimeout(timeoutId)
        if (error.name === 'AbortError') {
          throw new Error('Upload timed out. Please try with a smaller file (max 2MB) or check your connection.')
        }
        throw error
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      
      // Check if this is a validation error (clean message format or old format)
      const isValidationError = error.message.includes('Validation failed') ||
                               error.message.includes('cannot be before') ||
                               error.message.includes('cannot be changed once set') ||
                               error.message.includes('mobile number') ||
                               error.message.includes('Mobile') ||
                               error.message.includes('already registered') ||
                               error.message.includes('already exists') ||
                               error.message.includes('not valid') ||
                               error.message.includes('required') ||
                               error.message.includes('invalid') ||
                               error.message.includes('exceed')
      
      // For validation errors, ensure form fields remain editable
      if (isValidationError) {
        // Parse the error to determine which fields failed validation
        const errorMessage = error.message.toLowerCase()
        
        // Reset savedDates for fields that failed validation
        setSavedDates(prev => {
          const newSavedDates = { ...prev }
          
          // If internship_start_date validation failed, make it editable again
          if (errorMessage.includes('internship_start_date') || errorMessage.includes('internship start date')) {
            newSavedDates.internship_start_date = false
          }
          
          // If provisional_registration_date validation failed, make it editable again
          if (errorMessage.includes('provisional_registration_date') || errorMessage.includes('provisional registration date')) {
            newSavedDates.provisional_registration_date = false
          }
          
          return newSavedDates
        })
      }
      
      // Only set retry action for non-validation errors
      if (!isValidationError) {
        setRetryAction(() => handleSave)
      }
      
      // Determine the specific error ID based on the error message
      let specificErrorId = 'PROFILE_SAVE_ERROR'
      if (error.message.includes('Internship Start Date') && error.message.includes('Provisional Registration Date')) {
        specificErrorId = 'ERR-001'
      } else if (error.message.includes('cannot be changed once set')) {
        specificErrorId = 'ERR-002'
      } else if (error.message.includes('mobile number') || error.message.includes('Mobile')) {
        specificErrorId = 'ERR-003'
      } else if (error.message.includes('already registered') && error.message.includes('email')) {
        specificErrorId = 'ERR-004'
      } else if (error.message.includes('AHPRA registration number') && error.message.includes('already exists')) {
        specificErrorId = 'ERR-005'
      } else if (error.message.includes('verification code') && (error.message.includes('incorrect') || error.message.includes('expired'))) {
        specificErrorId = 'ERR-006'
      } else if (error.message.includes('user profile') && error.message.includes('not found')) {
        specificErrorId = 'ERR-007'
      } else if (error.message.includes('simulated') && error.message.includes('exceed')) {
        specificErrorId = 'ERR-008'
      } else if (error.message.includes('minimum') && error.message.includes('weeks')) {
        specificErrorId = 'ERR-009'
      } else if (error.message.includes('email') && error.message.includes('not valid')) {
        specificErrorId = 'ERR-010'
      } else if (error.message.includes('file too large') || error.message.includes('2MB')) {
        specificErrorId = 'FILE_TOO_LARGE'
      } else if (error.message.includes('fetch') || error.message.includes('network')) {
        specificErrorId = 'NETWORK_ERROR'
      } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        specificErrorId = 'SESSION_EXPIRED'
      } else if (error.message.includes('500') || error.message.includes('server error')) {
        specificErrorId = 'SERVER_ERROR'
      } else if (error.message.includes('required') && error.message.includes('field')) {
        specificErrorId = 'REQUIRED_FIELD'
      } else if (error.message.includes('validation') || error.message.includes('invalid')) {
        specificErrorId = 'INVALID_FORMAT'
      }
      
      await showError(error as Error, {
        title: 'Profile Save Failed',
        errorId: specificErrorId
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    loadProfile()
    setIsDirty(false)
  }

  const handleDisconnectionRequest = (role: 'PRIMARY' | 'SECONDARY') => {
    setDisconnectionRole(role)
    setShowDisconnectionModal(true)
  }

  const handleDisconnectionSuccess = () => {
    // Refresh the profile to update supervisor information
    loadProfile()
  }

  if (loading) {
    return <div className="container mx-auto py-8">Loading profile...</div>
  }

  console.log('UserProfile render - profile.role:', profile.role, 'qualification_level:', profile.qualification_level)
  
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
                className={fieldErrors.mobile ? 'border-red-500 bg-red-50' : ''}
              />
              {fieldErrors.mobile && (
                <p className="text-red-600 text-sm mt-1">{fieldErrors.mobile}</p>
              )}
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
                  value={profile.weekly_commitment_hours === 17.5 || profile.weekly_commitment === 17.5 ? 'fulltime' : 'parttime'}
                  onValueChange={(value) => {
                    const weeklyHours = value === 'fulltime' ? 17.5 : 8.75
                    const completionWeeks = value === 'fulltime' ? 44 : 88 // Double the weeks for part-time
                    setProfile(prev => ({ 
                      ...prev, 
                      weekly_commitment_hours: weeklyHours,
                      weekly_commitment: weeklyHours, // Keep both for compatibility
                      estimated_completion_weeks: completionWeeks,
                      target_weeks: completionWeeks, // Keep both for compatibility
                      is_full_time: value === 'fulltime'
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

            {/* Provisional Psychologist Specific Fields */}
            {profile.role === 'PROVISIONAL' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="provisional_registration_date">Provisional Registration Date</Label>
                  {savedDates.provisional_registration_date ? (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                      {format(new Date(profile.provisional_registration_date), "PPP")}
                    </div>
                  ) : (
                    <div>
                      <Input
                        id="provisional_registration_date"
                        name="provisional_registration_date"
                        type="date"
                        value={profile.provisional_registration_date || ''}
                        onChange={(e) => {
                          setProfile(prev => ({ ...prev, provisional_registration_date: e.target.value }))
                          // Clear field error when user starts typing
                          if (fieldErrors.provisional_registration_date) {
                            setFieldErrors(prev => {
                              const newErrors = { ...prev }
                              delete newErrors.provisional_registration_date
                              return newErrors
                            })
                          }
                        }}
                        max={new Date().toISOString().split('T')[0]} // Cannot be future date
                        required
                        className={fieldErrors.provisional_registration_date ? 'border-red-500 bg-red-50' : ''}
                      />
                      {fieldErrors.provisional_registration_date && (
                        <p className="text-red-600 text-sm mt-1">{fieldErrors.provisional_registration_date}</p>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {savedDates.provisional_registration_date 
                      ? 'Date when you received provisional registration from AHPRA (cannot be changed once set)'
                      : 'Date when you received provisional registration from AHPRA'
                    }
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="internship_start_date">Internship Start Date</Label>
                  {savedDates.internship_start_date ? (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                      {format(new Date(profile.internship_start_date), "PPP")}
                    </div>
                  ) : (
                    <div>
                      <Input
                        id="internship_start_date"
                        name="internship_start_date"
                        type="date"
                        value={profile.internship_start_date || profile.provisional_start_date || ''}
                        onChange={(e) => {
                          setProfile(prev => ({ ...prev, internship_start_date: e.target.value }))
                          // Clear field error when user starts typing
                          if (fieldErrors.internship_start_date) {
                            setFieldErrors(prev => {
                              const newErrors = { ...prev }
                              delete newErrors.internship_start_date
                              return newErrors
                            })
                          }
                        }}
                        required
                        className={fieldErrors.internship_start_date ? 'border-red-500 bg-red-50' : ''}
                      />
                      {fieldErrors.internship_start_date && (
                        <p className="text-red-600 text-sm mt-1">{fieldErrors.internship_start_date}</p>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {savedDates.internship_start_date 
                      ? 'When you officially started your 5+1 internship (cannot be changed once set)'
                      : 'When you officially started your 5+1 internship'
                    }
                  </p>
                </div>

                <div>
                  <Label htmlFor="estimated_completion_weeks">Estimated Completion (Weeks)</Label>
                  <Input
                    id="estimated_completion_weeks"
                    name="estimated_completion_weeks"
                    type="number"
                    min="44"
                    value={profile.estimated_completion_weeks || profile.target_weeks || 44}
                    onChange={(e) => setProfile(prev => ({ 
                      ...prev, 
                      estimated_completion_weeks: e.target.value ? parseInt(e.target.value) : 44,
                      target_weeks: e.target.value ? parseInt(e.target.value) : 44 // Keep both for compatibility
                    }))}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 44 weeks for full-time internship
                  </p>
                </div>

                <div>
                  <Label htmlFor="weekly_commitment_hours">Weekly Commitment (Hours)</Label>
                  <Input
                    id="weekly_commitment_hours"
                    name="weekly_commitment_hours"
                    type="number"
                    step="0.5"
                    min="1"
                    max="40"
                    value={profile.weekly_commitment_hours || profile.weekly_commitment || 17.5}
                    onChange={(e) => setProfile(prev => ({ 
                      ...prev, 
                      weekly_commitment_hours: e.target.value ? Math.round(parseFloat(e.target.value) * 10) / 10 : 17.5,
                      weekly_commitment: e.target.value ? Math.round(parseFloat(e.target.value) * 10) / 10 : 17.5 // Keep both for compatibility
                    }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional: Helps track your internship pace
                  </p>
                </div>
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
                    readOnly
                    className="bg-gray-50"
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
                    readOnly
                    className="bg-gray-50"
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
                {console.log('Rendering registrar fields, profile.role:', profile.role, 'qualification_level:', profile.qualification_level)}
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
                        console.log('Qualification level changed to:', value)
                        console.log('Defaults for', value, ':', defaults)
                        setProfile(prev => ({ 
                          ...prev, 
                          qualification_level: value,
                          target_weeks: defaults.target_weeks,
                          weekly_commitment: defaults.weekly_commitment
                        }))
                      }}
                      className="mt-2"
                    >
                      {console.log('RadioGroup rendered with value:', profile.qualification_level)}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem 
                            value="MASTERS" 
                            id="qual_masters" 
                            onClick={() => console.log('MASTERS clicked')}
                          />
                          <Label htmlFor="qual_masters" className="text-sm">Masters</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem 
                            value="COMBINED" 
                            id="qual_combined" 
                            onClick={() => console.log('COMBINED clicked')}
                          />
                          <Label htmlFor="qual_combined" className="text-sm">Combined Masters/PhD</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem 
                            value="DOCTORATE" 
                            id="qual_doctorate" 
                            onClick={() => console.log('DOCTORATE clicked')}
                          />
                          <Label htmlFor="qual_doctorate" className="text-sm">Doctorate</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem 
                            value="SECOND_AOPE" 
                            id="qual_second" 
                            onClick={() => console.log('SECOND_AOPE clicked')}
                          />
                          <Label htmlFor="qual_second" className="text-sm">Second AoPE</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </>
            )}

            {/* Supervisor Status Banner - Only show if attested to being board-approved */}
            {profile.role === 'SUPERVISOR' && profile.is_board_approved_supervisor && (
              <div className="mb-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">Supervisor Status</h4>
                  <p className="text-sm text-green-700">
                    You are registered as a Board-Approved Supervisor and can provide supervision to provisional psychologists and registrars.
                  </p>
                </div>
              </div>
            )}
        </CardContent>
      </Card>


      {/* Supervisor Profile Section - Only for supervisors */}
      {profile.role === 'SUPERVISOR' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-textDark">Supervisor Profile</CardTitle>
              {profile.supervisor_welcome_seen && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleWelcomeOverlay}
                  className="text-blue-600 hover:text-blue-700"
                >
                  View Welcome Message
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Board Approval Status */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Are you a Board-approved supervisor? *</Label>
              <RadioGroup 
                value={profile.is_board_approved_supervisor ? 'yes' : 'no'} 
                onValueChange={(value) => {
                  const isApproved = value === 'yes'
                  setProfile(prev => ({ 
                    ...prev, 
                    is_board_approved_supervisor: isApproved,
                    // Clear supervision scope if not approved
                    can_supervise_provisionals: isApproved ? prev.can_supervise_provisionals : false,
                    can_supervise_registrars: isApproved ? prev.can_supervise_registrars : false
                  }))
                }}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="board-approved-yes" />
                  <Label htmlFor="board-approved-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="board-approved-no" />
                  <Label htmlFor="board-approved-no">No</Label>
                </div>
              </RadioGroup>
              
              {/* Supervisor Registration Date - Only show if approved */}
              {profile.is_board_approved_supervisor && (
                <div>
                  <Label htmlFor="supervisor_registration_date">Supervisor Registration Date *</Label>
                  <Input
                    id="supervisor_registration_date"
                    type="date"
                    value={profile.supervisor_registration_date || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, supervisor_registration_date: e.target.value }))}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Date when you were approved as a supervisor by the Psychology Board</p>
                </div>
              )}
              
              {!profile.is_board_approved_supervisor && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    <strong>Warning:</strong> You must be a Board-approved supervisor to access supervisor features. 
                    Please contact the Psychology Board to obtain approval before proceeding.
                  </p>
                </div>
              )}
            </div>

            {/* Supervision Scope */}
            {profile.is_board_approved_supervisor && (
              <div className="space-y-4">
                <Label className="text-base font-medium">Supervision Scope *</Label>
                <p className="text-sm text-gray-600">Select which types of psychologists you can supervise:</p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="can-supervise-provisionals"
                      checked={profile.can_supervise_provisionals}
                      onChange={(e) => setProfile(prev => ({ ...prev, can_supervise_provisionals: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <Label htmlFor="can-supervise-provisionals">Supervise provisionals</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="can-supervise-registrars"
                      checked={profile.can_supervise_registrars}
                      onChange={(e) => setProfile(prev => ({ ...prev, can_supervise_registrars: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <Label htmlFor="can-supervise-registrars">Supervise registrars</Label>
                  </div>
                  
                  {/* Endorsement requirement message - appears directly below the checkbox when checked */}
                  {profile.can_supervise_registrars && (
                    <div className="ml-6 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-sm text-amber-800">
                        <strong>Important:</strong> To supervise registrars, you must add your professional endorsements. 
                        Use the "Manage Endorsements" section above to add the required endorsements for the areas you can supervise.
                      </p>
                    </div>
                  )}
                </div>
                {!profile.can_supervise_provisionals && !profile.can_supervise_registrars && (
                  <p className="text-red-600 text-sm">Please select at least one supervision scope.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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

      {/* Your Supervisors Section - Only for provisionals and registrars */}
      {(profile.role === 'PROVISIONAL' || profile.role === 'REGISTRAR') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-textDark">Your Supervisors</CardTitle>
            <p className="text-sm text-gray-600">Manage your supervision relationships</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary Supervisor */}
            {profile.principal_supervisor && (
              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-textDark">Primary Supervisor</h4>
                    <p className="text-sm text-gray-600">{profile.principal_supervisor}</p>
                    {profile.principal_supervisor_email && (
                      <p className="text-xs text-gray-500">{profile.principal_supervisor_email}</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnectionRequest('PRIMARY')}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Request Disconnection
                  </Button>
                </div>
              </div>
            )}

            {/* Secondary Supervisor */}
            {profile.secondary_supervisor && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-textDark">Secondary Supervisor</h4>
                    <p className="text-sm text-gray-600">{profile.secondary_supervisor}</p>
                    {profile.secondary_supervisor_email && (
                      <p className="text-xs text-gray-500">{profile.secondary_supervisor_email}</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnectionRequest('SECONDARY')}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Request Disconnection
                  </Button>
                </div>
              </div>
            )}

            {/* No supervisors message */}
            {!profile.principal_supervisor && !profile.secondary_supervisor && (
              <div className="text-center py-8 text-gray-500">
                <p>You currently have no supervisors assigned.</p>
                <p className="text-sm">Complete your supervision details above to add supervisors.</p>
              </div>
            )}
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
          <CardTitle className="text-xl font-semibold text-textDark">Signatures & Initials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Signature Upload */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium">Signature</h4>
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
                Upload Signature
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
          </div>

          {/* Initials Upload */}
          <div className="space-y-4 border-t pt-6">
            <h4 className="text-lg font-medium">Initials</h4>
            <div className="flex items-center gap-4">
              <input
                type="file"
                id="initials-upload"
                accept="image/*"
                onChange={handleInitialsUpload}
                className="hidden"
              />
              <Button
                onClick={() => document.getElementById('initials-upload')?.click()}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Initials
              </Button>
            </div>

            {initialsPreview || profile.initials_url ? (
              <div className="border rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Current Initials</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={removeInitials}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <img
                  src={initialsPreview || (profile.initials_url as string)}
                  alt="Initials preview"
                  className="max-w-xs max-h-32 object-contain border rounded"
                />
              </div>
            ) : null}
          </div>
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
            {profile.prior_hours_submitted ? (
              // Show locked state
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold text-textDark mb-2">
                  {profile.prior_hours_declined ? 'Prior Hours Declined' : 'Prior Hours Submitted'}
                </div>
                <p className="text-sm text-textLight mb-4">
                  {profile.prior_hours_declined 
                    ? 'You have chosen not to enter prior hours. This decision cannot be changed.'
                    : 'Your prior hours have been submitted and locked. They cannot be modified.'
                  }
                </p>
                {!profile.prior_hours_declined && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    <div className="text-center p-3 border rounded-lg bg-white">
                      <div className="text-xl font-bold text-textDark">
                        {profile.prior_hours?.section_a_direct_client || 0}
                      </div>
                      <div className="text-xs text-textLight">Section A - Direct Client</div>
                    </div>
                    <div className="text-center p-3 border rounded-lg bg-white">
                      <div className="text-xl font-bold text-textDark">
                        {profile.prior_hours?.section_a_client_related || 0}
                      </div>
                      <div className="text-xs text-textLight">Section A - Client Related</div>
                    </div>
                    <div className="text-center p-3 border rounded-lg bg-white">
                      <div className="text-xl font-bold text-textDark">
                        {profile.prior_hours?.section_b_professional_development || 0}
                      </div>
                      <div className="text-xs text-textLight">Section B - Professional Development</div>
                    </div>
                    <div className="text-center p-3 border rounded-lg bg-white">
                      <div className="text-xl font-bold text-textDark">
                        {profile.prior_hours?.section_c_supervision || 0}
                      </div>
                      <div className="text-xs text-textLight">Section C - Supervision</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Show editable state
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                
                <div className="flex justify-center space-x-4">
                  <Button
                    onClick={handleSubmitPriorHours}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Submit Prior Hours
                  </Button>
                  <Button
                    onClick={handleDeclinePriorHours}
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Decline to Enter Prior Hours
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Supervisor Welcome Overlay */}
      <SupervisorWelcomeOverlay
        isOpen={showWelcomeOverlay}
        onClose={handleWelcomeOverlayClose}
        onAcknowledge={handleWelcomeOverlayAcknowledge}
      />

      {/* Provisional Psychologist Welcome Overlay */}
      <ProvisionalPsychologistWelcomeOverlay
        isOpen={showProvisionalWelcomeOverlay}
        onClose={handleProvisionalWelcomeOverlayClose}
        onContinue={handleProvisionalWelcomeOverlayContinue}
      />

      {/* Prior Hours Confirmation Dialog */}
      {showPriorHoursConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold text-textDark">Confirm Prior Hours Submission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-base text-textLight leading-relaxed">
                  You are about to submit your prior hours. Once submitted, these hours cannot be changed.
                </p>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚠️</span>
                  <span className="text-sm font-semibold text-yellow-800">Important Warning</span>
                </div>
                <p className="text-sm text-yellow-700">
                  This action will lock your prior hours permanently. Please ensure all values are correct before proceeding.
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="text-center p-4 border-2 border-gray-200 rounded-lg bg-white shadow-sm">
                  <div className="text-3xl font-bold text-textDark mb-1">
                    {priorHoursToSubmit?.section_a_direct_client || 0}
                  </div>
                  <div className="text-xs text-textLight font-medium">Section A - Direct Client</div>
                </div>
                <div className="text-center p-4 border-2 border-gray-200 rounded-lg bg-white shadow-sm">
                  <div className="text-3xl font-bold text-textDark mb-1">
                    {priorHoursToSubmit?.section_a_client_related || 0}
                  </div>
                  <div className="text-xs text-textLight font-medium">Section A - Client Related</div>
                </div>
                <div className="text-center p-4 border-2 border-gray-200 rounded-lg bg-white shadow-sm">
                  <div className="text-3xl font-bold text-textDark mb-1">
                    {priorHoursToSubmit?.section_b_professional_development || 0}
                  </div>
                  <div className="text-xs text-textLight font-medium">Section B - Professional Development</div>
                </div>
                <div className="text-center p-4 border-2 border-gray-200 rounded-lg bg-white shadow-sm">
                  <div className="text-3xl font-bold text-textDark mb-1">
                    {priorHoursToSubmit?.section_c_supervision || 0}
                  </div>
                  <div className="text-xs text-textLight font-medium">Section C - Supervision</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={handleCancelPriorHoursSubmission}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 py-3"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmPriorHoursSubmission}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3"
                >
                  Submit & Lock Hours
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Prior Hours Acknowledgment Dialog */}
      {showPriorHoursAcknowledgment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold text-textDark">Prior Hours Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-base text-textLight leading-relaxed">
                  You must make a decision about your prior hours before you can continue using the system.
                </p>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚠️</span>
                  <span className="text-sm font-semibold text-yellow-800">Important</span>
                </div>
                <p className="text-sm text-yellow-700">
                  This decision is mandatory and cannot be changed once made. Please choose one of the options below.
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="text-center p-4 border-2 border-gray-200 rounded-lg bg-white shadow-sm">
                  <div className="text-3xl font-bold text-textDark mb-1">
                    {profile.prior_hours?.section_a_direct_client || 0}
                  </div>
                  <div className="text-xs text-textLight font-medium mb-2">Section A - Direct Client</div>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={profile.prior_hours?.section_a_direct_client || 0}
                    onChange={(e) => handlePriorHoursChange('section_a_direct_client', e.target.value)}
                    className="text-center"
                  />
                </div>
                <div className="text-center p-4 border-2 border-gray-200 rounded-lg bg-white shadow-sm">
                  <div className="text-3xl font-bold text-textDark mb-1">
                    {profile.prior_hours?.section_a_client_related || 0}
                  </div>
                  <div className="text-xs text-textLight font-medium mb-2">Section A - Client Related</div>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={profile.prior_hours?.section_a_client_related || 0}
                    onChange={(e) => handlePriorHoursChange('section_a_client_related', e.target.value)}
                    className="text-center"
                  />
                </div>
                <div className="text-center p-4 border-2 border-gray-200 rounded-lg bg-white shadow-sm">
                  <div className="text-3xl font-bold text-textDark mb-1">
                    {profile.prior_hours?.section_b_professional_development || 0}
                  </div>
                  <div className="text-xs text-textLight font-medium mb-2">Section B - Professional Development</div>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={profile.prior_hours?.section_b_professional_development || 0}
                    onChange={(e) => handlePriorHoursChange('section_b_professional_development', e.target.value)}
                    className="text-center"
                  />
                </div>
                <div className="text-center p-4 border-2 border-gray-200 rounded-lg bg-white shadow-sm">
                  <div className="text-3xl font-bold text-textDark mb-1">
                    {profile.prior_hours?.section_c_supervision || 0}
                  </div>
                  <div className="text-xs text-textLight font-medium mb-2">Section C - Supervision</div>
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

              <div className="flex flex-col gap-3 pt-2">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleCancelPriorHoursAcknowledgment}
                    variant="outline"
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 py-3"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePriorHoursAcknowledgmentDecline}
                    variant="outline"
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 py-3"
                  >
                    Decline to Enter Prior Hours
                  </Button>
                </div>
                <Button
                  onClick={handlePriorHoursAcknowledgmentSubmit}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                >
                  Submit Current Hours
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Error Overlay */}
      {showErrorOverlay && currentError && (
        <ErrorOverlay
          isOpen={showErrorOverlay}
          onClose={dismissError}
          onRetry={retryAction || undefined}
          error={currentError}
        />
      )}

      {/* Disconnection Request Modal */}
      {showDisconnectionModal && (
        <DisconnectionRequestModal
          isOpen={showDisconnectionModal}
          onClose={() => setShowDisconnectionModal(false)}
          supervisorName={disconnectionRole === 'PRIMARY' ? profile.principal_supervisor : profile.secondary_supervisor || ''}
          supervisorEmail={disconnectionRole === 'PRIMARY' ? profile.principal_supervisor_email : profile.secondary_supervisor_email || ''}
          role={disconnectionRole}
          onSuccess={handleDisconnectionSuccess}
        />
      )}
    </div>
  )
}

export default UserProfile
