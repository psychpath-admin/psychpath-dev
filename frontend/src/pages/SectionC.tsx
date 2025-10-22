import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiFetch } from '@/lib/api'
import { 
  Plus, 
  Users, 
  Clock, 
  User, 
  Target, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Monitor,
  Save
} from 'lucide-react'
import { 
  getSupervisionEntriesGroupedByWeek, 
  createSupervisionEntry, 
  updateSupervisionEntry, 
  deleteSupervisionEntry,
  checkSupervisionQuality
} from '@/lib/api'
import type { SupervisionEntry, SupervisionWeeklyGroup, ShortSessionStats } from '@/types/supervision'
import { formatDurationWithUnit, formatDurationDisplay } from '../utils/durationUtils'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { InfoIcon } from 'lucide-react'
import { QualityFeedback } from '@/components/QualityFeedback'

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
  city?: string
  state?: string
  timezone?: string
  mobile?: string
  organization?: number
  profile_completed?: boolean
  first_login_completed?: boolean
}

const SectionC: React.FC = () => {
  const [weeklyGroups, setWeeklyGroups] = useState<SupervisionWeeklyGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<SupervisionEntry | null>(null)
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set())

  // Filter states (matching Section A/B)
  const [showFilters, setShowFilters] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [supervisorType, setSupervisorType] = useState('all')
  const [supervisionType, setSupervisionType] = useState('all')
  const [durationMin, setDurationMin] = useState('')
  const [durationMax, setDurationMax] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [groupByWeek, setGroupByWeek] = useState(false)
  const [entriesPerPage, setEntriesPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  
  // Tooltip toggle
  const [showTooltips, setShowTooltips] = useState(true)
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({})
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  
  // Quality checking state
  const [summaryQuality, setSummaryQuality] = useState<any>(null)
  const [showSummaryPrompts, setShowSummaryPrompts] = useState(false)
  const [formData, setFormData] = useState({
    date_of_supervision: new Date().toISOString().split('T')[0],
    supervisor_name: '',
    supervisor_type: 'PRINCIPAL' as 'PRINCIPAL' | 'SECONDARY',
    supervision_type: 'INDIVIDUAL' as 'INDIVIDUAL' | 'GROUP' | 'OTHER',
    supervision_medium: 'IN_PERSON' as 'IN_PERSON' | 'VIDEO' | 'PHONE' | 'ASYNC',
    supervision_mode: 'CLINICAL' as 'CLINICAL' | 'PROFESSIONAL' | 'ADMINISTRATIVE',
    is_cultural_supervision: false,
    supervisor_is_board_approved: true,
    duration_minutes: 60,
    summary: ''
  })
  const [supervisorName, setSupervisorName] = useState('')
  const [showAHPRAInfo, setShowAHPRAInfo] = useState(false) // AHPRA collapsible state
  const [saving, setSaving] = useState(false) // Form saving state
  const [shortSessionStats, setShortSessionStats] = useState<ShortSessionStats | null>(null)

  // Debug form data changes
  useEffect(() => {
    console.log('Form data updated:', formData)
  }, [formData])

  // Debug AHPRA state
  useEffect(() => {
    console.log('AHPRA info state:', showAHPRAInfo)
  }, [showAHPRAInfo])

  const supervisorTypes = [
    { value: 'PRINCIPAL', label: 'Principal' },
    { value: 'SECONDARY', label: 'Secondary' }
  ]

  const supervisionTypes = [
    { value: 'INDIVIDUAL', label: 'Individual' },
    { value: 'GROUP', label: 'Group' },
    { value: 'OTHER', label: 'Other' }
  ]

  const supervisionMediums = [
    { value: 'IN_PERSON', label: 'In-Person (Visual)' },
    { value: 'VIDEO', label: 'Video Conference (Visual)' },
    { value: 'PHONE', label: 'Telephone (Audio Only)' },
    { value: 'ASYNC', label: 'Asynchronous (Written)' }
  ]

  const durationQuickLinks = [30, 50, 60, 75, 90]

  // Load user profile
  const loadUserProfile = async () => {
    try {
      const res = await apiFetch('/api/user-profile/')
      if (res.ok) {
        const profile = await res.json()
        setUserProfile(profile)
        console.log('🔍 User profile loaded:', profile)
        console.log('🔍 Principal supervisor:', profile.principal_supervisor)
        console.log('🔍 Secondary supervisor:', profile.secondary_supervisor)
        console.log('🔍 Current supervisor type:', formData.supervisor_type)
        
        // Force set supervisor name immediately
        if (profile.principal_supervisor) {
          console.log('✅ FORCE SETTING principal supervisor name:', profile.principal_supervisor)
          setSupervisorName(profile.principal_supervisor)
          setFormData(prev => {
            console.log('🔄 Previous form data:', prev)
            const newData = { ...prev, supervisor_name: profile.principal_supervisor || '' }
            console.log('🔄 New form data:', newData)
            return newData
          })
        } else {
          console.log('❌ No principal supervisor found in profile')
        }
      } else {
        console.error('❌ Failed to load user profile:', res.status, res.statusText)
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error)
    }
  }

  // Load short session stats
  const loadShortSessionStats = async () => {
    try {
      const res = await apiFetch('/api/section-c/entries/short-session-stats/')
      if (res.ok) {
        const stats = await res.json()
        setShortSessionStats(stats)
        console.log('📊 Short session stats loaded:', stats)
      } else {
        console.error('❌ Failed to load short session stats:', res.status, res.statusText)
      }
    } catch (error) {
      console.error('❌ Error loading short session stats:', error)
    }
  }

  // Form validation function
  const validateForm = () => {
    const errors: {[key: string]: string} = {}
    
    if (!formData.date_of_supervision) {
      errors.date_of_supervision = 'Date is required'
    }
    
    const currentSupervisorName = supervisorName || formData.supervisor_name
    if (!currentSupervisorName) {
      errors.supervisor_name = 'Please enter supervisor name'
    }
    
    if (!formData.supervisor_type) {
      errors.supervisor_type = 'Please select principal or secondary'
    }
    
    if (!formData.supervision_type) {
      errors.supervision_type = 'Please select individual, group, or other'
    }
    
    if (!formData.supervision_medium) {
      errors.supervision_medium = 'Please select supervision medium'
    }
    
    if (!formData.duration_minutes || formData.duration_minutes < 1) {
      errors.duration_minutes = 'Duration must be at least 1 minute'
    }
    
    if (!formData.summary || formData.summary.trim().length < 10) {
      errors.summary = 'Please provide a detailed supervision summary (at least 10 characters)'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Helper functions
  const formatDateDDMMYYYY = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString)
      return 'Invalid Date'
    }
    return date.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatDuration = (minutes: number | string) => {
    return formatDurationDisplay(minutes)
  }

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return ''
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
  }

  // Toggle entry expansion
  const toggleEntryExpansion = (entryId: string) => {
    const newExpanded = new Set(expandedEntries)
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId)
    } else {
      newExpanded.add(entryId)
    }
    setExpandedEntries(newExpanded)
  }

  // Toggle week expansion
  const toggleWeekExpansion = (weekStart: string) => {
    const newExpanded = new Set(expandedWeeks)
    if (newExpanded.has(weekStart)) {
      newExpanded.delete(weekStart)
    } else {
      newExpanded.add(weekStart)
    }
    setExpandedWeeks(newExpanded)
  }

  // Clear all filters
  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setSupervisorType('all')
    setSupervisionType('all')
    setDurationMin('')
    setDurationMax('')
    setGroupByWeek(false)
    setSearchTerm('')
    setCurrentPage(1)
  }

  // Pagination helpers
  const getPaginatedEntries = (entries: SupervisionEntry[]) => {
    const startIndex = (currentPage - 1) * entriesPerPage
    const endIndex = startIndex + entriesPerPage
    return entries.slice(startIndex, endIndex)
  }

  const getPaginatedGroups = (groups: Array<{ weekStart: string; entries: SupervisionEntry[] }>) => {
    const startIndex = (currentPage - 1) * entriesPerPage
    const endIndex = startIndex + entriesPerPage
    return groups.slice(startIndex, endIndex)
  }

  const getTotalPages = (totalEntries: number) => {
    return Math.ceil(totalEntries / entriesPerPage)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleEntriesPerPageChange = (newPerPage: number) => {
    setEntriesPerPage(newPerPage)
    setCurrentPage(1) // Reset to first page when changing page size
  }

  // Check if any filters are active
  const hasActiveFilters = dateFrom || dateTo || supervisorType !== 'all' || supervisionType !== 'all' || durationMin || durationMax || groupByWeek

  // Get all entries from weekly groups
  const allEntries = weeklyGroups.flatMap(group => group.entries)

  // Filter entries based on current filters
  const filteredEntries = allEntries.filter(entry => {
    // Date range filter
    if (dateFrom) {
      const entryDate = new Date(entry.date_of_supervision)
      const fromDate = new Date(dateFrom)
      if (entryDate < fromDate) return false
    }
    if (dateTo) {
      const entryDate = new Date(entry.date_of_supervision)
      const toDate = new Date(dateTo)
      if (entryDate > toDate) return false
    }

    // Supervisor type filter
    if (supervisorType !== 'all' && entry.supervisor_type !== supervisorType) return false

    // Supervision type filter
    if (supervisionType !== 'all' && entry.supervision_type !== supervisionType) return false

    // Duration filter
    const duration = entry.duration_minutes || 0
    if (durationMin && duration < parseInt(durationMin)) return false
    if (durationMax && duration > parseInt(durationMax)) return false

    // Search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = 
        entry.supervisor_name.toLowerCase().includes(searchLower) ||
        entry.summary.toLowerCase().includes(searchLower) ||
        entry.supervisor_type.toLowerCase().includes(searchLower) ||
        entry.supervision_type.toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }

    return true
  })

  // Sort entries
  const sortEntries = (entries: SupervisionEntry[]) => {
    return [...entries].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.date_of_supervision).getTime() - new Date(a.date_of_supervision).getTime()
        case 'oldest':
          return new Date(a.date_of_supervision).getTime() - new Date(b.date_of_supervision).getTime()
        case 'duration':
          return (b.duration_minutes || 0) - (a.duration_minutes || 0)
        case 'supervisor':
          return a.supervisor_name.localeCompare(b.supervisor_name)
        default:
          return new Date(b.date_of_supervision).getTime() - new Date(a.date_of_supervision).getTime()
      }
    })
  }

  // Group entries by week if enabled
  const getGroupedEntries = () => {
    if (!groupByWeek) return []

    const grouped = filteredEntries.reduce((acc, entry) => {
      const weekStart = entry.week_starting || calculateWeekStarting(entry.date_of_supervision)
      if (!acc[weekStart]) {
        acc[weekStart] = []
      }
      acc[weekStart].push(entry)
      return acc
    }, {} as Record<string, SupervisionEntry[]>)

    // Sort weeks based on sortBy
    const sortedWeeks = Object.entries(grouped).sort(([a], [b]) => {
      const dateA = new Date(a).getTime()
      const dateB = new Date(b).getTime()
      
      switch (sortBy) {
        case 'newest':
          return dateB - dateA // Newest weeks first
        case 'oldest':
          return dateA - dateB // Oldest weeks first
        case 'duration':
          // For duration, sort by total duration of all entries in the week
          const totalDurationA = grouped[a].reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0)
          const totalDurationB = grouped[b].reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0)
          return totalDurationB - totalDurationA // Longest duration weeks first
        case 'supervisor':
          // For supervisor, sort alphabetically by week start date string
          return a.localeCompare(b)
        default:
          return dateB - dateA // Default to newest first
      }
    })
    
    return sortedWeeks.map(([weekStart, entries]) => ({ 
      weekStart, 
      entries: sortEntries(entries)
    }))
  }

  const calculateWeekStarting = (dateString: string) => {
    const date = new Date(dateString)
    const dayOfWeek = date.getDay() // 0 for Sunday, 1 for Monday, etc.
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust to Monday
    const weekStart = new Date(date.setDate(diff))
    return weekStart.toISOString().split('T')[0]
  }

  // Auto-expand first week when grouping is enabled
  useEffect(() => {
    if (groupByWeek && weeklyGroups.length > 0) {
      const allEntries = weeklyGroups.flatMap(group => group.entries)
      const filteredEntries = allEntries.filter(entry => {
        // Apply basic filters (same logic as in the component)
        if (dateFrom) {
          const entryDate = new Date(entry.date_of_supervision)
          const fromDate = new Date(dateFrom)
          if (entryDate < fromDate) return false
        }
        if (dateTo) {
          const entryDate = new Date(entry.date_of_supervision)
          const toDate = new Date(dateTo)
          if (entryDate > toDate) return false
        }
        if (supervisorType !== 'all' && entry.supervisor_type !== supervisorType) return false
        if (supervisionType !== 'all' && entry.supervision_type !== supervisionType) return false
        const duration = entry.duration_minutes || 0
        if (durationMin && duration < parseInt(durationMin)) return false
        if (durationMax && duration > parseInt(durationMax)) return false
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase()
          const matchesSearch = 
            entry.supervisor_name.toLowerCase().includes(searchLower) ||
            entry.summary.toLowerCase().includes(searchLower) ||
            entry.supervisor_type.toLowerCase().includes(searchLower) ||
            entry.supervision_type.toLowerCase().includes(searchLower)
          if (!matchesSearch) return false
        }
        return true
      })

      // Group the filtered entries
      const grouped = filteredEntries.reduce((acc, entry) => {
        const weekStart = entry.week_starting || calculateWeekStarting(entry.date_of_supervision)
        if (!acc[weekStart]) {
          acc[weekStart] = []
        }
        acc[weekStart].push(entry)
        return acc
      }, {} as Record<string, SupervisionEntry[]>)

      const sortedWeeks = Object.entries(grouped).sort(([a], [b]) => {
        const dateA = new Date(a).getTime()
        const dateB = new Date(b).getTime()
        return sortBy === 'oldest' ? dateA - dateB : dateB - dateA
      })

      if (sortedWeeks.length > 0) {
        const firstWeek = sortedWeeks[0][0]
        if (!expandedWeeks.has(firstWeek)) {
          setExpandedWeeks(prev => new Set([...prev, firstWeek]))
        }
      }
    }
  }, [groupByWeek, weeklyGroups, dateFrom, dateTo, supervisorType, supervisionType, durationMin, durationMax, searchTerm, sortBy, expandedWeeks])

  useEffect(() => {
    loadData()
    loadUserProfile()
    loadShortSessionStats()
  }, [])

  // Auto-select supervisor when supervisor type changes
  useEffect(() => {
    console.log('useEffect triggered - supervisor type:', formData.supervisor_type, 'userProfile:', userProfile)
    if (formData.supervisor_type === 'PRINCIPAL' && userProfile?.principal_supervisor) {
      console.log('Auto-setting principal supervisor:', userProfile.principal_supervisor)
      setFormData(prev => ({ ...prev, supervisor_name: userProfile.principal_supervisor || '' }))
    } else if (formData.supervisor_type === 'SECONDARY' && userProfile?.secondary_supervisor) {
      console.log('Auto-setting secondary supervisor:', userProfile.secondary_supervisor)
      setFormData(prev => ({ ...prev, supervisor_name: userProfile.secondary_supervisor || '' }))
    } else {
      console.log('No supervisor name available for type:', formData.supervisor_type)
    }
  }, [formData.supervisor_type, userProfile])

  // Force set supervisor name when profile loads
  useEffect(() => {
    if (userProfile && userProfile.principal_supervisor) {
      console.log('🚀 useEffect: Force setting principal supervisor from profile:', userProfile.principal_supervisor)
      setSupervisorName(userProfile.principal_supervisor)
      setFormData(prev => {
        console.log('🚀 useEffect: Previous form data:', prev)
        const newData = { ...prev, supervisor_name: userProfile.principal_supervisor }
        console.log('🚀 useEffect: New form data:', newData)
        return newData
      })
    } else {
      console.log('🚀 useEffect: No profile or supervisor found', { userProfile, principal_supervisor: userProfile?.principal_supervisor })
    }
  }, [userProfile])

  const loadData = async () => {
    try {
      setLoading(true)
      const groupsData = await getSupervisionEntriesGroupedByWeek()
      setWeeklyGroups(groupsData)
    } catch (error) {
      console.error('Error loading data:', error)
      // No demo data - show empty state
      setWeeklyGroups([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNewEntry = () => {
    setEditingEntry(null)
    setFormData({
      date_of_supervision: new Date().toISOString().split('T')[0],
      supervisor_name: '',
      supervisor_type: 'PRINCIPAL',
      supervision_type: 'INDIVIDUAL',
      supervision_medium: 'IN_PERSON',
      supervision_mode: 'CLINICAL',
      is_cultural_supervision: false,
      supervisor_is_board_approved: true,
      duration_minutes: 60,
      summary: ''
    })
    setShowForm(true)
  }

  const handleEditEntry = (entry: SupervisionEntry) => {
    setEditingEntry(entry)
    setFormData({
      date_of_supervision: entry.date_of_supervision,
      supervisor_name: entry.supervisor_name,
      supervisor_type: entry.supervisor_type,
      supervision_type: entry.supervision_type,
      supervision_medium: (entry as any).supervision_medium || 'IN_PERSON',
      supervision_mode: (entry as any).supervision_mode || 'CLINICAL',
      is_cultural_supervision: (entry as any).is_cultural_supervision || false,
      supervisor_is_board_approved: (entry as any).supervisor_is_board_approved || true,
      duration_minutes: entry.duration_minutes,
      summary: entry.summary
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate future date
    const selectedDate = new Date(formData.date_of_supervision + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (selectedDate > today) {
      toast.error('Supervision session date cannot be in the future.')
      return
    }
    
    // Validate form
    if (!validateForm()) {
      toast.error('Please fix the form errors before submitting')
      return
    }
    
    try {
      setSaving(true)
      // Ensure supervisor name is included in form data
      const submissionData = {
        ...formData,
        supervisor_name: supervisorName || formData.supervisor_name
      }
      
      const response = editingEntry 
        ? await updateSupervisionEntry(editingEntry.id, submissionData)
        : await createSupervisionEntry(submissionData)
      
      // Check for warning message
      if ((response as any)._warning_message) {
        toast.warning((response as any)._warning_message, { duration: 10000 })
      } else {
        toast.success('Supervision entry saved successfully')
      }
      
      setShowForm(false)
      loadData()
      loadShortSessionStats() // Refresh short session stats
    } catch (error) {
      console.error('Error saving supervision entry:', error)
      toast.error('Failed to save supervision entry')
    } finally {
      setSaving(false)
    }
  }

  const handleSummaryBlur = async () => {
    if (!formData.summary || formData.summary.trim().length < 5) {
      return
    }

    try {
      const result = await checkSupervisionQuality(formData.summary, 'supervision_summary')
      setSummaryQuality(result)
    } catch (error) {
      console.error('Error checking summary quality:', error)
    }
  }

  const handleDeleteEntry = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this supervision entry?')) {
      try {
        console.log('🗑️ Deleting entry with ID:', id)
        console.log('🗑️ Current editingEntry:', editingEntry)
        console.log('🗑️ Will close modal?', editingEntry && editingEntry.id === id)
        
        await deleteSupervisionEntry(id)
        loadData()
        loadShortSessionStats() // Refresh short session stats
        
        // Close modal if we're deleting the currently edited entry
        if (editingEntry && editingEntry.id === id) {
          console.log('✅ Closing modal after delete')
          setEditingEntry(null)
          setShowForm(false) // This is the key missing piece!
          setFormData({
            date_of_supervision: new Date().toISOString().split('T')[0],
            supervisor_name: '',
            supervisor_type: 'PRINCIPAL' as 'PRINCIPAL' | 'SECONDARY',
            supervision_type: 'INDIVIDUAL' as 'INDIVIDUAL' | 'GROUP' | 'OTHER',
            supervision_medium: 'IN_PERSON' as 'IN_PERSON' | 'VIDEO' | 'PHONE' | 'ASYNC',
            supervision_mode: 'CLINICAL' as 'CLINICAL' | 'PROFESSIONAL' | 'ADMINISTRATIVE',
            is_cultural_supervision: false,
            supervisor_is_board_approved: true,
            duration_minutes: 60,
            summary: ''
          })
          setSupervisorName('')
          setFormErrors({})
        } else {
          console.log('❌ Not closing modal - editingEntry:', editingEntry, 'deleting ID:', id)
        }
      } catch (error) {
        console.error('Error deleting supervision entry:', error)
      }
    }
  }

  // Remove old filtering logic - now handled by filteredEntries

  // Calculate total supervision hours (use the maximum cumulative value)
  const totalMinutes = weeklyGroups.length > 0 ? Math.max(...weeklyGroups.map(group => group.cumulative_total_minutes)) : 0

  return (
    <div className="min-h-screen bg-bgSection">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section - PsychPathway Brand */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-card p-8 text-white shadow-md">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="text-4xl font-headings mb-2">Section C: Supervision</h1>
                <p className="text-white/90 text-lg font-body">Track your supervision sessions and professional development</p>
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => window.location.href = '/section-a'}
                    className="px-3 py-2 rounded-md bg-primaryBlue text-white text-sm hover:bg-blue-700"
                  >
                    Open Section A
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/section-b'}
                    className="px-3 py-2 rounded-md bg-green-600 text-white text-sm hover:bg-green-700"
                  >
                    Open Section B
                  </Button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleCreateNewEntry}
                  size="lg"
                  className="bg-white text-purple-600 hover:bg-white/90 font-semibold shadow-sm rounded-lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  New Supervision Record
                </Button>
                <Button
                  size="lg"
                  onClick={() => window.location.href = '/logbook'}
                  className="bg-orange-500 text-white hover:bg-orange-600 font-semibold rounded-lg shadow-sm"
                >
                  <Users className="h-5 w-5 mr-2" />
                  Weekly Logbooks
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* AHPRA Info Banner - Collapsible */}
        <Alert variant="default" className="mb-8 border-blue-200 bg-blue-50">
          <div 
            className="flex items-center justify-between cursor-pointer hover:bg-blue-100/50 -m-4 p-4 rounded-lg transition-colors"
            onClick={() => {
              console.log('Toggling AHPRA info, current state:', showAHPRAInfo);
              setShowAHPRAInfo(!showAHPRAInfo);
            }}
          >
            <div className="flex items-center gap-2">
              <InfoIcon className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">AHPRA Supervision Requirements</AlertTitle>
            </div>
            {showAHPRAInfo ? <ChevronUp className="h-4 w-4 text-blue-600" /> : <ChevronDown className="h-4 w-4 text-blue-600" />}
          </div>
          {showAHPRAInfo && (
            <AlertDescription className="text-blue-700 pt-2">
              <div className="space-y-2">
                <div><strong>Total:</strong> At least 80 hours over the internship</div>
                <div><strong>Principal:</strong> At least 50 hours of individual supervision with principal supervisor</div>
                <div><strong>Ratio:</strong> 1 hour supervision for every 17 hours of internship</div>
                <div><strong>Frequency:</strong> Usually weekly throughout internship</div>
                <div><strong>Medium:</strong> Primarily visual (in-person/video). Max 20h phone, max 10h written</div>
                <div><strong>Session Length:</strong> Primarily 1h+ sessions. Max 10h of shorter sessions</div>
              </div>
            </AlertDescription>
          )}
        </Alert>

        {/* Summary Cards */}
        {(() => {
          const totalEntries = weeklyGroups.reduce((sum, group) => sum + group.entries.length, 0)
          const totalMinutes = weeklyGroups.reduce((sum, group) => 
            sum + group.entries.reduce((groupSum, entry) => groupSum + (entry.duration_minutes || 0), 0), 0)
          const individualMinutes = weeklyGroups.reduce((sum, group) => 
            sum + group.entries.filter(entry => entry.supervision_type === 'INDIVIDUAL')
              .reduce((groupSum, entry) => groupSum + (entry.duration_minutes || 0), 0), 0)
          const groupMinutes = weeklyGroups.reduce((sum, group) => 
            sum + group.entries.filter(entry => entry.supervision_type === 'GROUP')
              .reduce((groupSum, entry) => groupSum + (entry.duration_minutes || 0), 0), 0)
          const secondaryMinutes = weeklyGroups.reduce((sum, group) => 
            sum + group.entries.filter(entry => entry.supervisor_type === 'SECONDARY')
              .reduce((groupSum, entry) => groupSum + (entry.duration_minutes || 0), 0), 0)

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <Card className="brand-card hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="brand-label">Total Sessions</p>
                      <p className="text-3xl font-bold text-primary">{totalEntries}</p>
                    </div>
                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="brand-card hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="brand-label">Total Hours</p>
                      <p className="text-3xl font-bold text-secondary">{formatDurationWithUnit(totalMinutes)}</p>
                    </div>
                    <div className="h-12 w-12 bg-secondary/10 rounded-full flex items-center justify-center">
                      <Clock className="h-6 w-6 text-secondary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="brand-card hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="brand-label">Individual Hours</p>
                      <p className="text-3xl font-bold text-accent">{formatDurationWithUnit(individualMinutes)}</p>
                    </div>
                    <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-accent" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="brand-card hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="brand-label">Group Hours</p>
                      <p className="text-3xl font-bold text-primary">{formatDurationWithUnit(groupMinutes)}</p>
                    </div>
                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="brand-card hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="brand-label">Secondary Hours</p>
                      <p className="text-3xl font-bold text-secondary">{formatDurationWithUnit(secondaryMinutes)}</p>
                    </div>
                    <div className="h-12 w-12 bg-secondary/10 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-secondary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })()}

        {/* Short Session Tracking Widget */}
        {shortSessionStats && (
          <Card className="mb-8 border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Short Session Tracking</h3>
                  <p className="text-sm text-gray-600">AHPRA Rule: Max 10 hours from sessions under 60 minutes</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {shortSessionStats.short_session_hours.toFixed(1)} / {shortSessionStats.limit_hours} hours
                  </div>
                  <div className="text-sm text-gray-600">
                    {shortSessionStats.remaining_hours.toFixed(1)} hours remaining
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${
                    shortSessionStats.limit_exceeded 
                      ? 'bg-red-500' 
                      : shortSessionStats.warning_threshold_reached 
                        ? 'bg-yellow-500' 
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(shortSessionStats.percentage_used, 100)}%` }}
                ></div>
              </div>
              
              {/* Status Message */}
              {shortSessionStats.limit_exceeded ? (
                <div className="flex items-center gap-2 text-red-600 font-medium">
                  <InfoIcon className="h-4 w-4" />
                  <span>⚠️ Short session limit exceeded! You have {shortSessionStats.short_session_hours.toFixed(1)} hours from short sessions.</span>
                </div>
              ) : shortSessionStats.warning_threshold_reached ? (
                <div className="flex items-center gap-2 text-yellow-600 font-medium">
                  <InfoIcon className="h-4 w-4" />
                  <span>⚠️ Approaching short session limit. You have {shortSessionStats.short_session_hours.toFixed(1)}/10.0 hours from short sessions.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <InfoIcon className="h-4 w-4" />
                  <span>✅ Within short session limits. You have {shortSessionStats.short_session_hours.toFixed(1)}/10.0 hours from short sessions.</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* AHPRA Supervision Compliance Dashboard */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-8 bg-accent rounded-full flex items-center justify-center">
              <Target className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-2xl font-headings text-textDark">AHPRA SUPERVISION COMPLIANCE</h2>
          </div>
          <p className="text-textLight mb-6 font-body">Track your supervision requirements and compliance status</p>
          
          {(() => {
            // Calculate all supervision metrics
            const totalSupervisionMinutes = totalMinutes
            const totalSupervisionHours = totalSupervisionMinutes / 60
            
            const principalMinutes = weeklyGroups.reduce((sum, group) => 
              sum + group.entries.filter(entry => entry.supervisor_type === 'PRINCIPAL')
                .reduce((groupSum, entry) => groupSum + (entry.duration_minutes || 0), 0), 0)
            const principalHours = principalMinutes / 60
            
            const secondaryMinutes = weeklyGroups.reduce((sum, group) => 
              sum + group.entries.filter(entry => entry.supervisor_type === 'SECONDARY')
                .reduce((groupSum, entry) => groupSum + (entry.duration_minutes || 0), 0), 0)
            const secondaryHours = secondaryMinutes / 60
            
            const individualMinutes = weeklyGroups.reduce((sum, group) => 
              sum + group.entries.filter(entry => entry.supervision_type === 'INDIVIDUAL')
                .reduce((groupSum, entry) => groupSum + (entry.duration_minutes || 0), 0), 0)
            const individualHours = individualMinutes / 60
            
            const groupMinutes = weeklyGroups.reduce((sum, group) => 
              sum + group.entries.filter(entry => entry.supervision_type === 'GROUP')
                .reduce((groupSum, entry) => groupSum + (entry.duration_minutes || 0), 0), 0)
            const groupHours = groupMinutes / 60

            // AHPRA Requirements
            const requirements = {
              totalHours: 80,
              principalHours: 48, // ≥ 60%
              secondaryHours: 32, // ≤ 40%
              individualHours: 60,
              groupHours: 20, // ≤ 20 hours
              frequencyHours: 1, // per week minimum
              supervisionRatio: 1/17 // 1 hour supervision per 17 hours practice
            }

            // Calculate internship progress
            const calculateInternshipProgress = () => {
              // Get the earliest supervision entry date as internship start
              const allEntries = weeklyGroups.flatMap(group => group.entries)
              if (allEntries.length === 0) {
                return { weeksElapsed: 0, expectedSupervisionHours: 0, progressPercentage: 0 }
              }

              const earliestDate = new Date(Math.min(...allEntries.map(entry => new Date(entry.date_of_supervision).getTime())))
              const currentDate = new Date()
              const weeksElapsed = Math.max(1, Math.ceil((currentDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24 * 7)))
              
              // Calculate expected supervision hours based on progress
              // Assuming 52 weeks total internship (1 year)
              const totalInternshipWeeks = 52
              const progressPercentage = Math.min(weeksElapsed / totalInternshipWeeks, 1)
              
              // Expected supervision hours based on progress through internship
              const expectedSupervisionHours = requirements.totalHours * progressPercentage
              
              return { weeksElapsed, expectedSupervisionHours, progressPercentage }
            }

            const internshipProgress = calculateInternshipProgress()

            // Calculate compliance status considering internship progress (RAG - Red/Amber/Green)
            const getRAGStatus = (current: number, target: number, isMaximum = false, considerProgress = false) => {
              let adjustedTarget = target
              
              if (considerProgress && !isMaximum) {
                // For minimum requirements, adjust target based on internship progress
                adjustedTarget = target * internshipProgress.progressPercentage
              }

              if (isMaximum) {
                // For maximum limits (group, secondary) - these should be proportional to progress
                const progressAdjustedLimit = target * internshipProgress.progressPercentage
                if (current <= progressAdjustedLimit * 0.8) return 'green'
                if (current <= progressAdjustedLimit) return 'amber'
                return 'red'
              } else {
                // For minimum requirements
                if (current >= adjustedTarget) return 'green'
                if (current >= adjustedTarget * 0.8) return 'amber'
                return 'red'
              }
            }

            // Calculate supervision ratio compliance (future implementation)
            // const getSupervisionRatioStatus = () => {
            //   // This would need practice hours data from Section A/B
            //   // For now, we'll show it as informational
            //   return 'info'
            // }

            const getRAGBadge = (status: string, text: string) => {
              const baseClasses = "text-xs font-semibold"
              switch (status) {
                case 'green':
                  return <Badge className={`bg-green-500 text-white border-green-500 ${baseClasses}`}>✓ {text}</Badge>
                case 'amber':
                  return <Badge variant="outline" className={`text-amber-600 border-amber-600 ${baseClasses}`}>⚠ {text}</Badge>
                case 'red':
                  return <Badge variant="outline" className={`text-red-600 border-red-600 ${baseClasses}`}>⚠ {text}</Badge>
                case 'info':
                  return <Badge variant="outline" className={`text-blue-600 border-blue-600 ${baseClasses}`}>ℹ {text}</Badge>
                default:
                  return <Badge variant="outline" className={`text-gray-600 border-gray-600 ${baseClasses}`}>{text}</Badge>
              }
            }

            // Calculate status considering internship progress
            const totalStatus = getRAGStatus(totalSupervisionHours, requirements.totalHours, false, true)
            const principalStatus = getRAGStatus(principalHours, requirements.principalHours, false, true)
            const secondaryStatus = getRAGStatus(secondaryHours, requirements.secondaryHours, true, true)
            const individualStatus = getRAGStatus(individualHours, requirements.individualHours, false, true)
            const groupStatus = getRAGStatus(groupHours, requirements.groupHours, true, true)
            // const ratioStatus = getSupervisionRatioStatus() // Future implementation

            return (
              <>
                {/* Tooltip Toggle */}
                <div className="flex justify-end mb-4">
                  <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-sm border border-gray-200">
                    <span className="text-sm text-gray-600 font-medium">Show Tooltips</span>
                    <button
                      onClick={() => setShowTooltips(!showTooltips)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        showTooltips ? 'bg-primary' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          showTooltips ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Compliance Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {/* Total Hours Compliance */}
                  <div className="relative group">
                    <Card className={`brand-card hover:shadow-md transition-all duration-300 ${totalStatus === 'red' ? 'ring-2 ring-red-200' : totalStatus === 'amber' ? 'ring-2 ring-amber-200' : ''}`}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-6 w-6 text-primary" />
                          </div>
                          {getRAGBadge(totalStatus, totalStatus === 'green' ? 'Compliant' : totalStatus === 'amber' ? 'At Risk' : 'Non-Compliant')}
                        </div>
                        <div className="text-2xl font-bold text-textDark mb-1">
                          {formatDurationWithUnit(totalSupervisionMinutes)}
                        </div>
                        <div className="text-xs font-semibold text-textDark mb-1 font-body">Total Supervision</div>
                        <div className="text-xs text-textLight mb-2">Target: {requirements.totalHours}h total ({internshipProgress.progressPercentage.toFixed(1)}% progress)</div>
                        <div className="text-xs text-textLight">
                          {totalSupervisionHours >= internshipProgress.expectedSupervisionHours ? 
                            `✓ On track (${(totalSupervisionHours - internshipProgress.expectedSupervisionHours).toFixed(1)}h ahead)` : 
                            `${(internshipProgress.expectedSupervisionHours - totalSupervisionHours).toFixed(1)}h behind schedule`}
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Tooltip */}
                    <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg transition-opacity duration-200 pointer-events-none z-50 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                      <div className="font-semibold mb-2">Total Supervision Hours</div>
                      <div className="mb-2">Tracks all supervision hours (individual + group) from both principal and secondary supervisors.</div>
                      <div className="mb-2"><strong>Total Target:</strong> {requirements.totalHours} hours for entire internship</div>
                      <div className="mb-2"><strong>Current Progress:</strong> {internshipProgress.progressPercentage.toFixed(1)}% of internship completed</div>
                      <div className="mb-2"><strong>Expected to Date:</strong> {internshipProgress.expectedSupervisionHours.toFixed(1)} hours</div>
                      <div className="mb-2"><strong>Actual Hours:</strong> {formatDurationWithUnit(totalSupervisionMinutes)} logged</div>
                      <div className="mb-2"><strong>Status:</strong> {totalStatus === 'green' ? '✓ Compliant' : totalStatus === 'amber' ? '⚠ At Risk' : '⚠ Non-Compliant'}</div>
                      <div className="text-xs text-gray-300">
                        <strong>Calculation:</strong> Progress % × Total target = Expected hours to date
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>

                  {/* Principal Supervisor Compliance */}
                  <div className="relative group">
                    <Card className={`brand-card hover:shadow-md transition-all duration-300 ${principalStatus === 'red' ? 'ring-2 ring-red-200' : principalStatus === 'amber' ? 'ring-2 ring-amber-200' : ''}`}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="h-12 w-12 bg-secondary/10 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-secondary" />
                          </div>
                          {getRAGBadge(principalStatus, principalStatus === 'green' ? 'Compliant' : principalStatus === 'amber' ? 'At Risk' : 'Non-Compliant')}
                        </div>
                        <div className="text-2xl font-bold text-textDark mb-1">
                          {formatDurationWithUnit(principalMinutes)}
                        </div>
                        <div className="text-xs font-semibold text-textDark mb-1 font-body">Principal Supervisor</div>
                        <div className="text-xs text-textLight mb-2">Target: ≥{requirements.principalHours}h (≥60% of total)</div>
                        <div className="text-xs text-textLight">
                          {principalHours >= (requirements.principalHours * internshipProgress.progressPercentage) ? 
                            `✓ On track (${((principalHours / totalSupervisionHours) * 100).toFixed(1)}% of total)` : 
                            `${((requirements.principalHours * internshipProgress.progressPercentage) - principalHours).toFixed(1)}h behind schedule`}
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Tooltip */}
                    <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg transition-opacity duration-200 pointer-events-none z-50 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                      <div className="font-semibold mb-2">Principal Supervisor Hours</div>
                      <div className="mb-2">Tracks supervision hours with your primary/principal supervisor. Must be at least 60% of total supervision.</div>
                      <div className="mb-2"><strong>Minimum Target:</strong> ≥{requirements.principalHours} hours (≥60% of total)</div>
                      <div className="mb-2"><strong>Current Hours:</strong> {formatDurationWithUnit(principalMinutes)} logged</div>
                      <div className="mb-2"><strong>Percentage of Total:</strong> {totalSupervisionHours > 0 ? ((principalHours / totalSupervisionHours) * 100).toFixed(1) : 0}%</div>
                      <div className="mb-2"><strong>Status:</strong> {principalStatus === 'green' ? '✓ Compliant' : principalStatus === 'amber' ? '⚠ At Risk' : '⚠ Non-Compliant'}</div>
                      <div className="text-xs text-gray-300">
                        <strong>Requirement:</strong> Principal supervisor must provide majority of supervision hours
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>

                  {/* Secondary Supervisor Compliance */}
                  <div className="relative group">
                    <Card className={`brand-card hover:shadow-md transition-all duration-300 ${secondaryStatus === 'red' ? 'ring-2 ring-red-200' : secondaryStatus === 'amber' ? 'ring-2 ring-amber-200' : ''}`}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-accent" />
                          </div>
                          {getRAGBadge(secondaryStatus, secondaryStatus === 'green' ? 'Compliant' : secondaryStatus === 'amber' ? 'At Risk' : 'Non-Compliant')}
                        </div>
                        <div className="text-2xl font-bold text-textDark mb-1">
                          {formatDurationWithUnit(secondaryMinutes)}
                        </div>
                        <div className="text-xs font-semibold text-textDark mb-1 font-body">Secondary Supervisor</div>
                        <div className="text-xs text-textLight mb-2">Target: ≤{requirements.secondaryHours}h (≤40% of total)</div>
                        <div className="text-xs text-textLight">
                          {secondaryHours <= (requirements.secondaryHours * internshipProgress.progressPercentage) ? 
                            `✓ Within limit (${((secondaryHours / totalSupervisionHours) * 100).toFixed(1)}% of total)` : 
                            `${(secondaryHours - (requirements.secondaryHours * internshipProgress.progressPercentage)).toFixed(1)}h over progress limit`}
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Tooltip */}
                    <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg transition-opacity duration-200 pointer-events-none z-50 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                      <div className="font-semibold mb-2">Secondary Supervisor Hours</div>
                      <div className="mb-2">Tracks supervision hours with secondary/additional supervisors. Must not exceed 40% of total supervision.</div>
                      <div className="mb-2"><strong>Maximum Target:</strong> ≤{requirements.secondaryHours} hours (≤40% of total)</div>
                      <div className="mb-2"><strong>Current Hours:</strong> {formatDurationWithUnit(secondaryMinutes)} logged</div>
                      <div className="mb-2"><strong>Percentage of Total:</strong> {totalSupervisionHours > 0 ? ((secondaryHours / totalSupervisionHours) * 100).toFixed(1) : 0}%</div>
                      <div className="mb-2"><strong>Status:</strong> {secondaryStatus === 'green' ? '✓ Compliant' : secondaryStatus === 'amber' ? '⚠ At Risk' : '⚠ Non-Compliant'}</div>
                      <div className="text-xs text-gray-300">
                        <strong>Requirement:</strong> Secondary supervision must be supplementary, not primary
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>

                  {/* Individual Supervision Compliance */}
                  <div className="relative group">
                    <Card className={`brand-card hover:shadow-md transition-all duration-300 ${individualStatus === 'red' ? 'ring-2 ring-red-200' : individualStatus === 'amber' ? 'ring-2 ring-amber-200' : ''}`}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="h-12 w-12 bg-green-500/10 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-green-600" />
                          </div>
                          {getRAGBadge(individualStatus, individualStatus === 'green' ? 'Compliant' : individualStatus === 'amber' ? 'At Risk' : 'Non-Compliant')}
                        </div>
                        <div className="text-2xl font-bold text-textDark mb-1">
                          {formatDurationWithUnit(individualMinutes)}
                        </div>
                        <div className="text-xs font-semibold text-textDark mb-1 font-body">Individual Supervision</div>
                        <div className="text-xs text-textLight mb-2">Target: ≥{requirements.individualHours}h minimum</div>
                        <div className="text-xs text-textLight">
                          {individualHours >= (requirements.individualHours * internshipProgress.progressPercentage) ? 
                            `✓ On track (${((individualHours / totalSupervisionHours) * 100).toFixed(1)}% of total)` : 
                            `${((requirements.individualHours * internshipProgress.progressPercentage) - individualHours).toFixed(1)}h behind schedule`}
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Tooltip */}
                    <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg transition-opacity duration-200 pointer-events-none z-50 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                      <div className="font-semibold mb-2">Individual Supervision Hours</div>
                      <div className="mb-2">Tracks one-on-one supervision sessions with your supervisor(s). This is the primary mode of supervision.</div>
                      <div className="mb-2"><strong>Minimum Target:</strong> ≥{requirements.individualHours} hours for entire internship</div>
                      <div className="mb-2"><strong>Current Hours:</strong> {formatDurationWithUnit(individualMinutes)} logged</div>
                      <div className="mb-2"><strong>Percentage of Total:</strong> {totalSupervisionHours > 0 ? ((individualHours / totalSupervisionHours) * 100).toFixed(1) : 0}%</div>
                      <div className="mb-2"><strong>Status:</strong> {individualStatus === 'green' ? '✓ Compliant' : individualStatus === 'amber' ? '⚠ At Risk' : '⚠ Non-Compliant'}</div>
                      <div className="text-xs text-gray-300">
                        <strong>Requirement:</strong> Individual supervision is mandatory and must be the majority of supervision time
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>

                  {/* Group Supervision Compliance */}
                  <div className="relative group">
                    <Card className={`brand-card hover:shadow-md transition-all duration-300 ${groupStatus === 'red' ? 'ring-2 ring-red-200' : groupStatus === 'amber' ? 'ring-2 ring-amber-200' : ''}`}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                            <Users className="h-6 w-6 text-blue-600" />
                          </div>
                          {getRAGBadge(groupStatus, groupStatus === 'green' ? 'Compliant' : groupStatus === 'amber' ? 'At Risk' : 'Non-Compliant')}
                        </div>
                        <div className="text-2xl font-bold text-textDark mb-1">
                          {formatDurationWithUnit(groupMinutes)}
                        </div>
                        <div className="text-xs font-semibold text-textDark mb-1 font-body">Group Supervision</div>
                        <div className="text-xs text-textLight mb-2">Target: ≤{requirements.groupHours}h maximum</div>
                        <div className="text-xs text-textLight">
                          {groupHours <= (requirements.groupHours * internshipProgress.progressPercentage) ? 
                            `✓ Within limit (${((groupHours / totalSupervisionHours) * 100).toFixed(1)}% of total)` : 
                            `${(groupHours - (requirements.groupHours * internshipProgress.progressPercentage)).toFixed(1)}h over progress limit`}
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Tooltip */}
                    <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg transition-opacity duration-200 pointer-events-none z-50 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                      <div className="font-semibold mb-2">Group Supervision Hours</div>
                      <div className="mb-2">Tracks group supervision sessions with multiple supervisees. Limited to supplement individual supervision.</div>
                      <div className="mb-2"><strong>Maximum Target:</strong> ≤{requirements.groupHours} hours for entire internship</div>
                      <div className="mb-2"><strong>Current Hours:</strong> {formatDurationWithUnit(groupMinutes)} logged</div>
                      <div className="mb-2"><strong>Percentage of Total:</strong> {totalSupervisionHours > 0 ? ((groupHours / totalSupervisionHours) * 100).toFixed(1) : 0}%</div>
                      <div className="mb-2"><strong>Status:</strong> {groupStatus === 'green' ? '✓ Compliant' : groupStatus === 'amber' ? '⚠ At Risk' : '⚠ Non-Compliant'}</div>
                      <div className="text-xs text-gray-300">
                        <strong>Requirement:</strong> Group supervision is supplementary and must not exceed maximum limits
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>

                  {/* Internship Progress */}
                  <div className="relative group">
                    <Card className="brand-card hover:shadow-md transition-all duration-300">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="h-12 w-12 bg-purple-500/10 rounded-full flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-purple-600" />
                          </div>
                          {getRAGBadge('info', 'Progress')}
                        </div>
                        <div className="text-2xl font-bold text-textDark mb-1">
                          {internshipProgress.weeksElapsed}w
                        </div>
                        <div className="text-xs font-semibold text-textDark mb-1 font-body">Internship Progress</div>
                        <div className="text-xs text-textLight mb-2">Target: {requirements.totalHours}h total supervision</div>
                        <div className="text-xs text-textLight">
                          Expected: {internshipProgress.expectedSupervisionHours.toFixed(1)}h by now
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Tooltip */}
                    <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg transition-opacity duration-200 pointer-events-none z-50 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                      <div className="font-semibold mb-2">Internship Progress</div>
                      <div className="mb-2">Shows your progress through the internship timeline and expected supervision hours to date.</div>
                      <div className="mb-2"><strong>Weeks Elapsed:</strong> {internshipProgress.weeksElapsed} weeks since first supervision entry</div>
                      <div className="mb-2"><strong>Total Internship:</strong> 52 weeks (1 year)</div>
                      <div className="mb-2"><strong>Progress Percentage:</strong> {(internshipProgress.progressPercentage * 100).toFixed(1)}% complete</div>
                      <div className="mb-2"><strong>Expected Hours:</strong> {internshipProgress.expectedSupervisionHours.toFixed(1)} hours by now</div>
                      <div className="mb-2"><strong>Total Target:</strong> {requirements.totalHours} hours for entire internship</div>
                      <div className="text-xs text-gray-300">
                        <strong>Calculation:</strong> Weeks elapsed ÷ 52 weeks × Total target = Expected hours
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>

                {/* Compliance Summary */}
                <div className="bg-bgCard p-6 rounded-lg border border-border">
                  <h3 className="text-lg font-semibold text-textDark mb-4 font-headings">Compliance Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${totalStatus === 'green' ? 'bg-green-500' : totalStatus === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                        <span className="font-medium">Total Hours: {formatDurationWithUnit(totalSupervisionMinutes)} / {requirements.totalHours}h</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${principalStatus === 'green' ? 'bg-green-500' : principalStatus === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                        <span className="font-medium">Principal: {formatDurationWithUnit(principalMinutes)} / ≥{requirements.principalHours}h</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${secondaryStatus === 'green' ? 'bg-green-500' : secondaryStatus === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                        <span className="font-medium">Secondary: {formatDurationWithUnit(secondaryMinutes)} / ≤{requirements.secondaryHours}h</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${individualStatus === 'green' ? 'bg-green-500' : individualStatus === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                        <span className="font-medium">Individual: {formatDurationWithUnit(individualMinutes)} / ≥{requirements.individualHours}h</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${groupStatus === 'green' ? 'bg-green-500' : groupStatus === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                        <span className="font-medium">Group: {formatDurationWithUnit(groupMinutes)} / ≤{requirements.groupHours}h</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span className="font-medium">Progress: {internshipProgress.weeksElapsed} weeks elapsed ({internshipProgress.progressPercentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-6 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-textLight">Compliant</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span className="text-textLight">At Risk (80% threshold)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-textLight">Non-Compliant</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )
          })()}
        </div>

        {/* Filters & Search Section */}
        <Card className="mb-8 brand-card">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Filter className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-headings text-textDark">Filters & Search</CardTitle>
                  <p className="text-sm text-textLight font-body">Refine your supervision entries</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowFilters(!showFilters)} 
                  variant="outline" 
                  size="sm"
                  className="text-primary border-primary/20 hover:bg-primary/5"
                >
                  {showFilters ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Hide Filters
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Show Filters
                    </>
                  )}
                </Button>
                {hasActiveFilters && (
                  <Button onClick={clearFilters} variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                    <X className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                )}
              </div>
            </div>
            
            {/* Quick Filter Chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              {hasActiveFilters && (
                <>
                  {dateFrom && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      From: {formatDateDDMMYYYY(dateFrom)}
                      <button onClick={() => setDateFrom('')} className="ml-2 hover:bg-primary/20 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {dateTo && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      To: {formatDateDDMMYYYY(dateTo)}
                      <button onClick={() => setDateTo('')} className="ml-2 hover:bg-primary/20 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {supervisorType && supervisorType !== 'all' && (
                    <Badge variant="secondary" className="bg-secondary/10 text-secondary">
                      Supervisor: {supervisorType}
                      <button onClick={() => setSupervisorType('all')} className="ml-2 hover:bg-secondary/20 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {supervisionType && supervisionType !== 'all' && (
                    <Badge variant="secondary" className="bg-accent/10 text-accent">
                      Type: {supervisionType}
                      <button onClick={() => setSupervisionType('all')} className="ml-2 hover:bg-accent/20 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {(durationMin || durationMax) && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      Duration: {durationMin || '0'} - {durationMax || '∞'} min
                      <button onClick={() => { setDurationMin(''); setDurationMax('') }} className="ml-2 hover:bg-primary/20 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {groupByWeek && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      Grouped by Week
                      <button onClick={() => setGroupByWeek(false)} className="ml-2 hover:bg-primary/20 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </>
              )}
            </div>
          </CardHeader>
          {showFilters && (
            <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium mb-1">Date From</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="Start date"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date To</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="End date"
                />
              </div>
              
              {/* Supervisor Type */}
              <div>
                <label className="block text-sm font-medium mb-1">Supervisor Type</label>
                <Select value={supervisorType} onValueChange={setSupervisorType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="PRINCIPAL">Principal</SelectItem>
                    <SelectItem value="SECONDARY">Secondary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Supervision Type */}
              <div>
                <label className="block text-sm font-medium mb-1">Supervision Type</label>
                <Select value={supervisionType} onValueChange={setSupervisionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                    <SelectItem value="GROUP">Group</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Sort and Pagination Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Sort by:</label>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest to Oldest</SelectItem>
                      <SelectItem value="oldest">Oldest to Newest</SelectItem>
                      <SelectItem value="duration">Duration (Longest to Shortest)</SelectItem>
                      <SelectItem value="supervisor">Supervisor (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="groupByWeek"
                    checked={groupByWeek}
                    onChange={(e) => setGroupByWeek(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="groupByWeek" className="text-sm font-medium">
                    Group by Week
                  </label>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Show:</label>
                <Select value={entriesPerPage.toString()} onValueChange={(value) => handleEntriesPerPageChange(parseInt(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-textLight">entries</span>
              </div>
            </div>
            
            {/* Search */}
            <div className="mt-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search supervisors, summaries, or types..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Filter className="h-4 w-4 text-textLight" />
                </div>
              </div>
            </div>
            </CardContent>
          )}
        </Card>

        {/* Entries Display */}
        <div className="space-y-4">
          {loading ? (
            <Card className="brand-card">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20"></div>
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent absolute top-0 left-0"></div>
                </div>
                <h3 className="text-xl font-semibold text-textDark mt-6 mb-2 font-body">Loading your entries...</h3>
                <p className="text-textLight text-center font-body">Fetching your supervision records</p>
              </CardContent>
            </Card>
          ) : filteredEntries.length === 0 ? (
            <Card className="brand-card">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <Users className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-textDark mb-3 font-headings">
                  {hasActiveFilters ? "No matching records found" : "No Supervision Records Yet"}
                </h3>
                <p className="text-textLight text-center mb-8 max-w-md font-body">
                  {hasActiveFilters 
                    ? "No records match your current filters. Try adjusting your search criteria or clear filters to see all entries."
                    : "Start tracking your supervision sessions by creating your first supervision record."
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handleCreateNewEntry}
                    size="lg"
                    className="brand-button-primary px-8"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create Your First Supervision Record
                  </Button>
                  {hasActiveFilters && (
                    <Button 
                      onClick={clearFilters}
                      variant="outline"
                      size="lg"
                      className="border-border text-textDark hover:bg-bgSection rounded-lg"
                    >
                      <X className="h-5 w-5 mr-2" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : groupByWeek ? (
            // Grouped by week display
            getPaginatedGroups(getGroupedEntries()).map((group) => (
              <div key={group.weekStart} className="space-y-4">
                {/* Week Header */}
                <div 
                  className="bg-primary/5 border border-primary/20 rounded-lg p-4 cursor-pointer hover:bg-primary/10 transition-colors duration-200"
                  onClick={() => toggleWeekExpansion(group.weekStart)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="text-lg font-semibold text-primary">
                          Week Starting {formatDateDDMMYYYY(group.weekStart)}
                        </h3>
                        <p className="text-sm text-primary/70">
                          {group.entries.length} {group.entries.length === 1 ? 'session' : 'sessions'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium text-primary">
                          {formatDurationWithUnit(group.entries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0))}
                        </div>
                        <div className="text-xs text-primary/70">Total Duration</div>
                      </div>
                      {expandedWeeks.has(group.weekStart) ? (
                        <ChevronUp className="h-5 w-5 text-primary" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Week Entries */}
                {expandedWeeks.has(group.weekStart) && (
                  <div className="space-y-3">
                    {group.entries.map((entry) => {
                      return (
                        <Card key={entry.id} className="brand-card hover:shadow-md transition-all duration-300">
                          <CardContent className="p-4">
                            <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
                              <div className="lg:col-span-2">
                                <div className="flex items-center gap-2 mb-2">
                                  <Clock className="h-4 w-4 text-textLight" />
                                  <span className="text-sm font-semibold text-textDark">
                                    {formatDuration(entry.duration_minutes)}
                                  </span>
                                  <Badge variant={entry.supervisor_type === 'PRINCIPAL' ? "default" : "secondary"} className="text-xs">
                                    {entry.supervisor_type}
                                  </Badge>
                                  {(entry as any).is_registrar_session && (
                                    <Badge variant="outline" className="border-purple-500 text-purple-700 text-xs">
                                      Registrar Program
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-textLight" />
                                  <span className="text-sm font-semibold text-textDark">
                                    {formatDateDDMMYYYY(entry.date_of_supervision)}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="lg:col-span-2">
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="h-4 w-4 text-textLight" />
                                  <span className="text-sm font-semibold text-textDark">
                                    {entry.supervisor_name}
                                  </span>
                                </div>
                                <div className="text-sm text-textDark break-words">
                                  {truncateText(entry.summary, 80)}
                                </div>
                              </div>
                              
                              <div className="lg:col-span-2">
                                <div className="flex items-center gap-2 mb-2">
                                  <Users className="h-4 w-4 text-textLight" />
                                  <span className="text-sm font-semibold text-textDark">
                                    {entry.supervision_type}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Monitor className="h-4 w-4 text-textLight" />
                                  <span className="text-sm text-textDark">
                                    {entry.supervision_medium.replace('_', ' ')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleEntryExpansion(entry.id.toString())}
                                className="text-primary border-primary/20 hover:bg-primary/5"
                              >
                                {expandedEntries.has(entry.id.toString()) ? (
                                  <>
                                    <ChevronUp className="h-4 w-4 mr-2" />
                                    Hide Details
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </>
                                )}
                              </Button>
                              
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditEntry(entry)}
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </CardContent>

                          {/* Expanded Details Section */}
                          {expandedEntries.has(entry.id.toString()) && (
                            <div className="border-t border-gray-200 bg-gray-50/50">
                              <CardContent className="p-4">
                                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                  <Eye className="h-4 w-4" />
                                  Detailed Information
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  {/* Supervision Information */}
                                  <div className="space-y-2">
                                    <h5 className="font-medium text-gray-700">Supervision Details</h5>
                                    <div className="space-y-1 text-gray-600">
                                      <div><span className="font-medium">Date:</span> {formatDateDDMMYYYY(entry.date_of_supervision)}</div>
                                      <div><span className="font-medium">Duration:</span> {formatDuration(entry.duration_minutes)}</div>
                                      <div><span className="font-medium">Supervisor:</span> {entry.supervisor_name}</div>
                                      <div><span className="font-medium">Type:</span> {entry.supervisor_type}</div>
                                      <div><span className="font-medium">Format:</span> {entry.supervision_type}</div>
                                    </div>
                                  </div>

                                  {/* Summary */}
                                  <div className="space-y-2">
                                    <h5 className="font-medium text-gray-700">Summary</h5>
                                    <p className="text-gray-600 text-sm leading-relaxed bg-white p-3 rounded border">
                                      {entry.summary}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </div>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            ))
          ) : (
            // Individual entries display
            getPaginatedEntries(sortEntries(filteredEntries)).map((entry) => {
              return (
                <Card key={entry.id} className="brand-card hover:shadow-md transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
                      <div className="lg:col-span-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-textLight" />
                          <span className="text-sm font-semibold text-textDark">
                            {formatDuration(entry.duration_minutes)}
                          </span>
                          <Badge variant={entry.supervisor_type === 'PRINCIPAL' ? "default" : "secondary"} className="text-xs">
                            {entry.supervisor_type}
                          </Badge>
                          {(entry as any).is_registrar_session && (
                            <Badge variant="outline" className="border-purple-500 text-purple-700 text-xs">
                              Registrar Program
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-textLight" />
                          <span className="text-sm font-semibold text-textDark">
                            {formatDateDDMMYYYY(entry.date_of_supervision)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="lg:col-span-2">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-textLight" />
                          <span className="text-sm font-semibold text-textDark">
                            {entry.supervisor_name}
                          </span>
                        </div>
                        <div className="text-sm text-textDark break-words">
                          {truncateText(entry.summary, 80)}
                        </div>
                      </div>
                      
                      <div className="lg:col-span-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-textLight" />
                          <span className="text-sm font-semibold text-textDark">
                            {entry.supervision_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4 text-textLight" />
                          <span className="text-sm text-textDark">
                            {entry.supervision_medium.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleEntryExpansion(entry.id.toString())}
                        className="text-primary border-primary/20 hover:bg-primary/5"
                      >
                        {expandedEntries.has(entry.id.toString()) ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-2" />
                            Hide Details
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </>
                        )}
                      </Button>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditEntry(entry)}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>

                  {/* Expanded Details Section */}
                  {expandedEntries.has(entry.id.toString()) && (
                    <div className="border-t border-gray-200 bg-gray-50/50">
                      <CardContent className="p-4">
                        <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Detailed Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {/* Supervision Information */}
                          <div className="space-y-2">
                            <h5 className="font-medium text-gray-700">Supervision Details</h5>
                            <div className="space-y-1 text-gray-600">
                              <div><span className="font-medium">Date:</span> {formatDateDDMMYYYY(entry.date_of_supervision)}</div>
                              <div><span className="font-medium">Duration:</span> {formatDuration(entry.duration_minutes)}</div>
                              <div><span className="font-medium">Supervisor:</span> {entry.supervisor_name}</div>
                              <div><span className="font-medium">Type:</span> {entry.supervisor_type}</div>
                              <div><span className="font-medium">Format:</span> {entry.supervision_type}</div>
                            </div>
                          </div>

                          {/* Summary */}
                          <div className="space-y-2">
                            <h5 className="font-medium text-gray-700">Summary</h5>
                            <p className="text-gray-600 text-sm leading-relaxed bg-white p-3 rounded border">
                              {entry.summary}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  )}
                </Card>
              )
            })
          )}
        </div>

        {/* Pagination */}
        {getTotalPages(groupByWeek ? getGroupedEntries().length : filteredEntries.length) > 1 && (
          <Card className="mt-6">
            <CardContent className="flex items-center justify-between py-4">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * entriesPerPage) + 1} to{' '}
                {Math.min(currentPage * entriesPerPage, groupByWeek ? getGroupedEntries().length : filteredEntries.length)} of{' '}
                {groupByWeek ? getGroupedEntries().length : filteredEntries.length} {groupByWeek ? 'weeks' : 'records'}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, getTotalPages(filteredEntries.length)) }, (_, i) => {
                    let pageNum;
                    const totalPages = getTotalPages(filteredEntries.length);
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === getTotalPages(filteredEntries.length)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Supervision Entry Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Supervision Activity Details</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>×</Button>
              </div>
              <p className="text-sm text-textLight">Section C: Record of Supervision / Supervision Activity Details</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Supervision <span className="text-red-500">*</span></label>
                    <Input
                      type="date"
                      value={formData.date_of_supervision}
                      onChange={(e) => setFormData({ ...formData, date_of_supervision: e.target.value })}
                      max={new Date().toISOString().split('T')[0]}
                      className={formErrors.date_of_supervision ? 'border-red-500 ring-2 ring-red-200' : ''}
                      required
                    />
                    {formErrors.date_of_supervision && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.date_of_supervision}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor Name <span className="text-red-500">*</span></label>
                    <Input
                      type="text"
                      value={supervisorName || formData.supervisor_name}
                      onChange={(e) => {
                        setSupervisorName(e.target.value)
                        setFormData(prev => ({ ...prev, supervisor_name: e.target.value }))
                      }}
                      placeholder="Supervisor name will be auto-populated"
                      className={`w-full ${formErrors.supervisor_name ? 'border-red-500 ring-2 ring-red-200' : ''} ${supervisorName ? 'bg-green-50' : ''}`}
                      required
                    />
                    {formErrors.supervisor_name && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.supervisor_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Principal or Secondary? <span className="text-red-500">*</span></label>
                    <select
                      value={formData.supervisor_type}
                      onChange={(e) => setFormData({ ...formData, supervisor_type: e.target.value as 'PRINCIPAL' | 'SECONDARY' })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primaryBlue ${formErrors.supervisor_type ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                      required
                    >
                      {supervisorTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Principal, Secondary</p>
                    {formErrors.supervisor_type && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.supervisor_type}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Individual/Group/Other <span className="text-red-500">*</span></label>
                    <select
                      value={formData.supervision_type}
                      onChange={(e) => setFormData({ ...formData, supervision_type: e.target.value as 'INDIVIDUAL' | 'GROUP' | 'OTHER' })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primaryBlue ${formErrors.supervision_type ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                      required
                    >
                      {supervisionTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Individual, Group, Other</p>
                    {formErrors.supervision_type && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.supervision_type}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supervision Medium *</label>
                    <select
                      value={formData.supervision_medium}
                      onChange={(e) => setFormData({ ...formData, supervision_medium: e.target.value as 'IN_PERSON' | 'VIDEO' | 'PHONE' | 'ASYNC' })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primaryBlue ${formErrors.supervision_medium ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                      required
                    >
                      {supervisionMediums.map(medium => (
                        <option key={medium.value} value={medium.value}>{medium.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Visual medium preferred. Max 20h phone, max 10h async</p>
                    {formErrors.supervision_medium && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.supervision_medium}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Minutes) <span className="text-red-500">*</span></label>
                    <Input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                      min="1"
                      className={formErrors.duration_minutes ? 'border-red-500 ring-2 ring-red-200' : ''}
                      required
                    />
                    {formErrors.duration_minutes && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.duration_minutes}</p>
                    )}
                    
                    {/* Short Session Indicator */}
                    {formData.duration_minutes < 60 && (
                      <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <InfoIcon className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium text-orange-800">
                            ⚠️ Short Session (&lt; 60 min)
                          </span>
                        </div>
                        <p className="text-xs text-orange-700 mt-1">
                          This session will count toward your 10-hour short session limit.
                        </p>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-1 mt-1">
                      {durationQuickLinks.map(minutes => (
                        <button
                          key={minutes}
                          type="button"
                          onClick={() => setFormData({ ...formData, duration_minutes: minutes })}
                          className={`px-2 py-1 text-xs rounded border ${
                            formData.duration_minutes === minutes
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {minutes < 60 ? `${minutes}min` : `${minutes / 60}h`}
                        </button>
                      ))}
                    </div>
                    {formData.duration_minutes < 60 && (
                      <p className="text-xs text-orange-500 mt-1">
                        ⚠️ Sessions should primarily be 1h+. Max 10h of short sessions allowed.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supervision Summary <span className="text-red-500">*</span></label>
                  <textarea
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    onBlur={handleSummaryBlur}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primaryBlue placeholder:text-gray-600 ${formErrors.summary ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                    rows={4}
                    placeholder="Enter supervision summary and key points discussed"
                    required
                  />
                  {formErrors.summary && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.summary}</p>
                  )}
                  {summaryQuality && (
                    <QualityFeedback
                      quality={summaryQuality.quality === 'excellent' ? 'strong' : summaryQuality.quality === 'good' ? 'adequate' : 'basic'}
                      score={summaryQuality.score || 0}
                      feedback={summaryQuality.feedback || []}
                      prompts={summaryQuality.prompts || []}
                      showPrompts={showSummaryPrompts}
                      onGetSuggestions={() => setShowSummaryPrompts(!showSummaryPrompts)}
                      fieldType={'supervision_summary'}
                    />
                  )}
                </div>


                <div className="flex justify-end gap-4 pt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowForm(false)}
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
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingEntry ? 'Update Entry' : 'Create Entry'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </div>
  )
}

export default SectionC
