import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSmartRefresh } from '@/hooks/useSmartRefresh'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ChevronLeft, ChevronRight, Eye, Edit, Plus, Trash2, Calendar, Clock, User, FileText, TrendingUp, Target, Award, Filter, X, Search, BarChart3, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { 
  getSectionAEntries, 
  createSectionAEntry, 
  updateSectionAEntry, 
  deleteSectionAEntry,
  getClientAutocomplete,
  getLastSessionData,
  getCustomActivityTypes,
  createCustomActivityType,
  deleteCustomActivityType
} from '@/lib/api'
import CRAForm from '@/components/CRAForm'
import UserNameDisplay from '@/components/UserNameDisplay'
import { minutesToHoursMinutes, formatDurationWithUnit, formatDurationDisplay } from '../utils/durationUtils'
import { useFilterPersistence, useSimpleFilterPersistence } from '@/hooks/useFilterPersistence'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import ErrorOverlay from '@/components/ErrorOverlay'

// Helper function to format dates in dd/mm/yyyy format
const formatDateDDMMYYYY = (dateString: string) => {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

interface DCCEntry {
  id: number
  client_id: string
  client_pseudonym?: string
  session_date: string
  week_starting: string
  place_of_practice: string
  presenting_issues: string
  session_activity_types: string[]
  duration_minutes: string
  reflections_on_experience: string
  entry_type: 'client_contact' | 'cra' | 'independent_activity'
  parent_dcc_entry?: number
  cra_entries: DCCEntry[]
  simulated: boolean
  simulated_hours_info?: {
    total_hours: number
    remaining_hours: number
    limit_reached: boolean
  }
  total_sessions?: number
  total_duration_minutes?: number
  total_duration_display?: string
  created_at: string
  updated_at: string
}

interface PaginationInfo {
  current_page: number
  total_pages: number
  total_records: number
  records_per_page: number
}

export default function SectionADashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showError, showErrorOverlay, currentError, dismissError, retryAction, setRetryAction } = useErrorHandler()
  const [dccEntries, setDccEntries] = useState<DCCEntry[]>([])
  const [allEntries, setAllEntries] = useState<DCCEntry[]>([]) // Store unfiltered entries for cumulative totals
  const [pagination, setPagination] = useState<PaginationInfo>({
    current_page: 1,
    total_pages: 1,
    total_records: 0,
    records_per_page: 10
  })
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<DCCEntry | null>(null)
  const [showEntryForm, setShowEntryForm] = useState(false)
  const [showCRAForm, setShowCRAForm] = useState(false)
  const [showICRAForm, setShowICRAForm] = useState(false)
  const [showSmartForm, setShowSmartForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState(false)
  const [editingCRAId, setEditingCRAId] = useState<number | null>(null)
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set())
  
  // Custom activity types state
  const [customActivityTypes, setCustomActivityTypes] = useState<Array<{id: number, name: string}>>([])
  const [newCustomActivityType, setNewCustomActivityType] = useState('')
  
  // Filters state
  const [showFilters, setShowFilters] = useState(false)
  const [craFormData, setCraFormData] = useState({
    client_id: '',
    client_pseudonym: '',
    session_date: '',
    place_of_practice: '',
    presenting_issues: '',
    session_activity_types: [],
    duration_minutes: '50',
    reflections_on_experience: '',
    simulated: false
  })
  const [icraFormData, setIcraFormData] = useState({
    client_id: '',
    client_pseudonym: '',
    session_date: '',
    place_of_practice: '',
    presenting_issues: '',
    session_activity_types: [],
    duration_minutes: '50',
    reflections_on_experience: '',
    simulated: false
  })

  // Smart form state
  const [smartFormData, setSmartFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    client_pseudonym: '',
    place_of_practice: '',
    presenting_issues: '',
    dcc_activity_types: [] as string[],
    description: '',
    duration: 50, // Default 50 minutes
    simulated_client: false
  })
  const [clientSuggestions, setClientSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  
  // Tooltip toggle
  const [showTooltips, setShowTooltips] = useState(true)
  
  // Persistent filters and sorting
  const [sortBy, setSortBy] = useSimpleFilterPersistence<'newest' | 'oldest' | 'duration' | 'client'>('section-a-sort-by', 'oldest') // Default to oldest first
  const [dateFrom, setDateFrom] = useSimpleFilterPersistence<string>('section-a-date-from', '')
  const [dateTo, setDateTo] = useSimpleFilterPersistence<string>('section-a-date-to', '')
  const [sessionType, setSessionType] = useSimpleFilterPersistence<string>('section-a-session-type', 'all')
  const [durationMin, setDurationMin] = useSimpleFilterPersistence<string>('section-a-duration-min', '')
  const [durationMax, setDurationMax] = useSimpleFilterPersistence<string>('section-a-duration-max', '')
  // Weekly organization is now the standard view - no need for toggle
  const groupByWeek = true
  
  // New Section A-specific filters
  const [clientPseudonym, setClientPseudonym] = useSimpleFilterPersistence<string>('section-a-client-pseudonym', '')
  const [activityType, setActivityType] = useSimpleFilterPersistence<string>('section-a-activity-type', 'all') // 'all', 'DCC', 'CRA', 'ICRA'
  const [reviewedFilter, setReviewedFilter] = useSimpleFilterPersistence<string>('section-a-reviewed-filter', 'all') // 'all', 'reviewed', 'not_reviewed'

  // Smart refresh hook for notification-based updates
  const { manualRefresh } = useSmartRefresh(
    () => loadDCCEntries(),
    ['logbook_submitted', 'logbook_status_updated', 'supervision_invite_pending']
  )

  useEffect(() => {
    loadDCCEntries()
  }, [pagination.current_page, pagination.records_per_page, sortBy, dateFrom, dateTo, sessionType, durationMin, durationMax, clientPseudonym, activityType, reviewedFilter])

  // Load custom activity types from localStorage
  useEffect(() => {
    const savedCustomTypes = localStorage.getItem(`customActivityTypes_${user?.id}`)
    if (savedCustomTypes) {
      try {
        setCustomActivityTypes(JSON.parse(savedCustomTypes))
      } catch (error) {
        console.error('Error loading custom activity types:', error)
      }
    }
  }, [user?.id])

  // Save custom activity types to localStorage
  useEffect(() => {
    if (user?.id && customActivityTypes.length > 0) {
      localStorage.setItem(`customActivityTypes_${user.id}`, JSON.stringify(customActivityTypes))
    }
  }, [customActivityTypes, user?.id])

  const loadDCCEntries = async () => {
    setLoading(true)
    try {
      // For now, we'll use the existing API and filter on frontend
      // TODO: Update backend to support pagination and filtering
      const fetchedEntries = await getSectionAEntries({
        include_locked: true
      })
      
      
      // Store unfiltered entries for cumulative totals calculation
      setAllEntries(fetchedEntries)
      
      // Include all Section A entry types (DCC, CRA, ICRA)
      // Filter out CRA entries that have a parent_dcc_entry (they'll be shown nested in their parent DCC)
      let filteredEntries = fetchedEntries.filter((entry: DCCEntry) => {
        if (entry.entry_type === 'cra' && entry.parent_dcc_entry) {
          // Don't show CRA entries with a parent DCC as standalone entries
          return false
        }
        return entry.entry_type === 'client_contact' || entry.entry_type === 'cra' || entry.entry_type === 'independent_activity'
      })
      
      // Apply filters
      if (dateFrom) {
        filteredEntries = filteredEntries.filter((entry: DCCEntry) => {
          // Parse dates properly for comparison
          const entryDate = new Date(entry.session_date + 'T00:00:00') // Add time to avoid timezone issues
          const fromDate = new Date(dateFrom + 'T00:00:00')
          return entryDate >= fromDate
        })
      }
      if (dateTo) {
        filteredEntries = filteredEntries.filter((entry: DCCEntry) => {
          // Parse dates properly for comparison
          const entryDate = new Date(entry.session_date + 'T00:00:00') // Add time to avoid timezone issues
          const toDate = new Date(dateTo + 'T23:59:59') // End of day
          return entryDate <= toDate
        })
      }
      if (sessionType && sessionType !== 'all') {
        filteredEntries = filteredEntries.filter((entry: DCCEntry) => 
          entry.session_activity_types.includes(sessionType)
        )
      }
      if (durationMin) {
        filteredEntries = filteredEntries.filter((entry: DCCEntry) => 
          parseInt(entry.duration_minutes) >= parseInt(durationMin)
        )
      }
      if (durationMax) {
        filteredEntries = filteredEntries.filter((entry: DCCEntry) => 
          parseInt(entry.duration_minutes) <= parseInt(durationMax)
        )
      }

      // Client pseudonym filter
      if (clientPseudonym) {
        filteredEntries = filteredEntries.filter((entry: DCCEntry) => 
          entry.client_id.toLowerCase().includes(clientPseudonym.toLowerCase()) ||
          (entry.client_pseudonym && entry.client_pseudonym.toLowerCase().includes(clientPseudonym.toLowerCase()))
        )
      }

      // Activity type filter (DCC, CRA, ICRA)
      if (activityType !== 'all') {
        filteredEntries = filteredEntries.filter((entry: DCCEntry) => {
          if (activityType === 'DCC') return entry.entry_type === 'client_contact'
          if (activityType === 'CRA') return entry.entry_type === 'cra'
          if (activityType === 'ICRA') return entry.entry_type === 'independent_activity'
          return true
        })
      }

      // Note: Supervisor review filtering removed as this field doesn't exist in the backend model
      
      // Apply sorting
      filteredEntries.sort((a: DCCEntry, b: DCCEntry) => {
        switch (sortBy) {
          case 'newest':
            return new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
          case 'oldest':
            return new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
          case 'duration':
            return parseInt(b.duration_minutes) - parseInt(a.duration_minutes)
          case 'client':
            return a.client_id.localeCompare(b.client_id)
          default:
            return 0
        }
      })
      
      // Apply pagination
      const startIndex = (pagination.current_page - 1) * pagination.records_per_page
      const endIndex = startIndex + pagination.records_per_page
      const paginatedEntries = filteredEntries.slice(startIndex, endIndex)
      
      setDccEntries(paginatedEntries)
      setPagination(prev => ({
        ...prev,
        total_records: filteredEntries.length,
        total_pages: Math.ceil(filteredEntries.length / pagination.records_per_page)
      }))
      
    } catch (error) {
      console.error('Error loading DCC entries:', error)
      setDccEntries([])
    } finally {
      setLoading(false)
    }
  }


  const calculateWeekStarting = (dateString: string) => {
    const date = new Date(dateString)
    const dayOfWeek = date.getDay() // 0 for Sunday, 1 for Monday, etc.
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust to Monday
    const weekStart = new Date(date.setDate(diff))
    return weekStart.toISOString().split('T')[0]
  }

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, current_page: page }))
  }

  const handleRecordsPerPageChange = (recordsPerPage: number) => {
    setPagination(prev => ({ ...prev, records_per_page: recordsPerPage, current_page: 1 }))
  }

  const handleViewDetails = (entry: DCCEntry) => {
    const entryId = entry.id.toString()
    setExpandedEntries(prev => {
      const newSet = new Set(prev)
      if (newSet.has(entryId)) {
        newSet.delete(entryId)
      } else {
        newSet.add(entryId)
      }
      return newSet
    })
  }

  const handleEdit = (entry: DCCEntry) => {
    console.log('Edit button clicked for entry:', entry.id, 'type:', entry.entry_type)
    
    if (entry.entry_type === 'independent_activity') {
      // Edit ICRA entry in CRA form modal
      setSelectedEntry(entry)
      setEditingCRAId(entry.id)
      setIcraFormData({
        client_id: entry.client_id,
        client_pseudonym: entry.client_pseudonym,
        session_date: entry.session_date,
        place_of_practice: entry.place_of_practice || '',
        presenting_issues: entry.presenting_issues || '',
        session_activity_types: entry.session_activity_types || [],
        duration_minutes: entry.duration_minutes?.toString() || '50',
        reflections_on_experience: entry.reflections_on_experience || '',
        simulated: entry.simulated || false
      })
      setShowICRAForm(true)
    } else {
      // Edit DCC entry in separate form
      console.log('Navigating to:', `/section-a/edit/${entry.id}`)
      navigate(`/section-a/edit/${entry.id}`)
    }
  }

  const handleAddCRA = (entry: DCCEntry) => {
    setSelectedEntry(entry)
    setCraFormData({
      client_id: entry.client_id,
      client_pseudonym: entry.client_id, // Default to same as client_id for consistency
      session_date: entry.session_date ? new Date(entry.session_date).toISOString().split('T')[0] : '',
      place_of_practice: '',
      presenting_issues: '',
      session_activity_types: [],
      duration_minutes: '50',
      reflections_on_experience: '',
      simulated: false
    })
    setShowCRAForm(true)
  }

  const handleAddICRA = () => {
    setIcraFormData({
      client_id: '',
      client_pseudonym: '',
      session_date: new Date().toISOString().split('T')[0],
      place_of_practice: '',
      presenting_issues: '',
      session_activity_types: [],
      duration_minutes: '50',
      reflections_on_experience: '',
      simulated: false
    })
    setShowICRAForm(true)
  }

  const handleDelete = async (entry: DCCEntry) => {
    if (window.confirm(`Are you sure you want to delete this DCC record for ${entry.client_id}?`)) {
      try {
        await deleteSectionAEntry(entry.id)
        loadDCCEntries()
      } catch (error) {
        console.error('Error deleting entry:', error)
      }
    }
  }

  const handleEditCRA = (craEntry: DCCEntry) => {
    setSelectedEntry(craEntry)
    setCraFormData({
      client_id: craEntry.client_id,
      client_pseudonym: craEntry.client_pseudonym || craEntry.client_id,
      session_date: craEntry.session_date,
      place_of_practice: craEntry.place_of_practice || '',
      presenting_issues: craEntry.presenting_issues || '',
      session_activity_types: craEntry.session_activity_types || [],
      duration_minutes: craEntry.duration_minutes?.toString() || '50',
      reflections_on_experience: craEntry.reflections_on_experience || '',
      simulated: craEntry.simulated || false
    })
    setShowCRAForm(true)
  }

  const handleDeleteCRA = async (craEntry: DCCEntry) => {
    if (window.confirm(`Are you sure you want to delete this CRA record?`)) {
      try {
        await deleteSectionAEntry(craEntry.id)
        loadDCCEntries()
      } catch (error) {
        console.error('Error deleting CRA entry:', error)
      }
    }
  }

  const handleCRAFormSubmit = async (formData: any) => {
    try {
      setLoading(true)
      
      const entryData = {
        ...formData,
        entry_type: 'cra',
        parent_dcc_entry: selectedEntry?.id,
        week_starting: calculateWeekStarting(formData.session_date)
      }

      if (editingCRAId) {
        await updateSectionAEntry(editingCRAId, entryData)
        toast.success('CRA entry updated successfully!')
      } else {
        await createSectionAEntry(entryData)
        toast.success('CRA entry created successfully!')
      }

      setShowCRAForm(false)
      setSelectedEntry(null)
      setEditingCRAId(null)
      setCraFormData({
        client_id: '',
        client_pseudonym: '',
        session_date: '',
        place_of_practice: '',
        presenting_issues: '',
        session_activity_types: [],
        duration_minutes: '50',
        reflections_on_experience: '',
        simulated: false
      })
      loadDCCEntries()
    } catch (error) {
      console.error('Error submitting CRA form:', error)
      showError(new Error('Failed to save CRA entry'), {
        title: 'Unable to Save CRA Entry',
        summary: 'There was a problem saving your CRA entry.',
        explanation: 'This could be due to validation errors, network issues, or server problems.',
        userAction: 'Please check your entries and try again. If the problem persists, contact support.',
        errorId: 'CRA_SAVE_ERROR'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleICRAFormSubmit = async (formData: any) => {
    try {
      setLoading(true)
      
      const entryData = {
        ...formData,
        entry_type: 'independent_activity', // Backend expects 'independent_activity' for ICRA
        parent_dcc_entry: null, // ICRA entries are independent
        week_starting: calculateWeekStarting(formData.session_date)
      }

      if (editingCRAId) {
        await updateSectionAEntry(editingCRAId, entryData)
        toast.success('ICRA entry updated successfully!')
        setShowICRAForm(false)
        setSelectedEntry(null)
        setEditingCRAId(null)
      } else {
        const response = await createSectionAEntry(entryData)
        
        // Close modal first
        setShowICRAForm(false)
        setSelectedEntry(null)
        setEditingCRAId(null)
        
        // Check for conversion notice
        if (response && response.conversion_notice) {
          // Longer delay to ensure modal is completely closed and DOM updated
          setTimeout(() => {
            toast.info(response.conversion_notice, {
              duration: 8000,
              style: {
                backgroundColor: '#f0f9ff',
                border: '1px solid #0ea5e9',
                color: '#0c4a6e',
                zIndex: 9999
              }
            })
          }, 300)
        } else {
          toast.success('ICRA entry created successfully!')
        }
      }
      setIcraFormData({
        client_id: '',
        client_pseudonym: '',
        session_date: new Date().toISOString().split('T')[0],
        place_of_practice: '',
        presenting_issues: '',
        session_activity_types: [],
        duration_minutes: '50',
        reflections_on_experience: '',
        simulated: false
      })
      loadDCCEntries()
    } catch (error) {
      console.error('Error submitting ICRA form:', error)
      showError(new Error('Failed to save ICRA entry'), {
        title: 'Unable to Save ICRA Entry',
        summary: 'There was a problem saving your ICRA entry.',
        explanation: 'This could be due to validation errors, network issues, or server problems.',
        userAction: 'Please check your entries and try again. If the problem persists, contact support.',
        errorId: 'ICRA_SAVE_ERROR'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddCustomActivityType = () => {
    if (newCustomActivityType.trim() && !customActivityTypes.some(type => type.name.toLowerCase() === newCustomActivityType.toLowerCase())) {
      const newType = {
        id: Date.now(), // Simple ID generation
        name: newCustomActivityType.trim()
      }
      setCustomActivityTypes([...customActivityTypes, newType])
      setNewCustomActivityType('')
      toast.success(`Added custom activity type: ${newCustomActivityType.trim()}`)
    }
  }

  const handleDeleteCustomActivityType = (id: number) => {
    setCustomActivityTypes(customActivityTypes.filter(type => type.id !== id))
    toast.success('Custom activity type removed')
  }

  const formatDuration = (minutes: string) => {
    return formatDurationDisplay(minutes)
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  // Smart form handlers
  const getClientSuggestions = async (query: string) => {
    if (query.length < 2) {
      setClientSuggestions([])
      return
    }
    
    try {
      const entries = await getSectionAEntries({ include_locked: true })
      console.log('Fetched entries for suggestions:', entries)
      const uniqueClients = [...new Set(
        entries
          .filter(entry => 
            entry.client_pseudonym?.toLowerCase().includes(query.toLowerCase()) ||
            entry.client_id?.toLowerCase().includes(query.toLowerCase())
          )
          .map(entry => entry.client_pseudonym || entry.client_id)
      )].filter(Boolean) as string[]
      
      console.log('Client suggestions:', uniqueClients)
      setClientSuggestions(uniqueClients.slice(0, 10))
    } catch (error) {
      console.error('Error fetching client suggestions:', error)
    }
  }

  const handleClientSelect = async (clientPseudonym: string) => {
    console.log('handleClientSelect called with:', clientPseudonym)
    try {
      const entries = await getSectionAEntries({ include_locked: true })
      // Filter for DCC entries only (client_contact type)
      const lastDCCEntry = entries
        .filter(entry => 
          (entry.client_pseudonym || entry.client_id) === clientPseudonym &&
          entry.entry_type === 'client_contact'
        )
        .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())[0]
      
      console.log('Found last DCC entry:', lastDCCEntry)
      
      if (lastDCCEntry) {
        setSmartFormData(prev => ({
          ...prev,
          client_pseudonym: clientPseudonym,
          place_of_practice: lastDCCEntry.place_of_practice || '',
          presenting_issues: lastDCCEntry.presenting_issues || ''
        }))
        console.log('Updated form data with last DCC entry data:', {
          place_of_practice: lastDCCEntry.place_of_practice,
          presenting_issues: lastDCCEntry.presenting_issues
        })
      } else {
        setSmartFormData(prev => ({
          ...prev,
          client_pseudonym: clientPseudonym
        }))
        console.log('No previous DCC entry found, just setting client pseudonym')
      }
      setShowSuggestions(false)
    } catch (error) {
      console.error('Error fetching client data:', error)
    }
  }

  const validateSmartForm = () => {
    const errors: Record<string, string> = {}
    
    if (!smartFormData.date) errors.date = 'Date is required'
    if (!smartFormData.client_pseudonym) errors.client_pseudonym = 'Client pseudonym is required'
    if (!smartFormData.place_of_practice) errors.place_of_practice = 'Place of practice is required'
    if (!smartFormData.presenting_issues) errors.presenting_issues = 'Presenting issues are required'
    if (smartFormData.dcc_activity_types.length === 0) errors.dcc_activity_types = 'At least one DCC activity type is required'
    if (!smartFormData.description) errors.description = 'Activity description is required'
    if (smartFormData.duration <= 0) errors.duration = 'Duration must be greater than 0'
    
    // Note: Simulated DCC (SDCC) is a valid entry type - no validation needed here
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSmartFormSubmit = async () => {
    if (!validateSmartForm()) {
      showError(new Error('Form validation failed'), {
        title: 'Form Errors Detected',
        summary: 'Please fix the form errors before submitting.',
        explanation: 'One or more fields have validation errors that need to be corrected.',
        userAction: 'Review the highlighted fields and correct any errors before submitting.',
        errorId: 'FORM_VALIDATION_ERROR'
      })
      return
    }

    try {
      const entryData = {
        client_id: smartFormData.client_pseudonym,
        client_pseudonym: smartFormData.client_pseudonym,
        session_date: smartFormData.date,
        place_of_practice: smartFormData.place_of_practice,
        presenting_issues: smartFormData.presenting_issues,
        session_activity_types: smartFormData.dcc_activity_types,
        duration_minutes: smartFormData.duration.toString(),
        reflections_on_experience: smartFormData.description,
        simulated: smartFormData.simulated_client,
        entry_type: 'client_contact',
        week_starting: calculateWeekStarting(smartFormData.date)
      }

      await createSectionAEntry(entryData)
      
      // Reset form
      setSmartFormData({
        date: new Date().toISOString().split('T')[0],
        client_pseudonym: '',
        place_of_practice: '',
        presenting_issues: '',
        dcc_activity_types: [],
        description: '',
        duration: 1.0,
        simulated_client: false
      })
      setFormErrors({})
      setShowSmartForm(false)
      loadDCCEntries()
      
      toast.success('Entry saved successfully. Consider logging supervision if applicable.')
    } catch (error) {
      console.error('Error saving entry:', error)
      showError(new Error('Failed to save entry'), {
        title: 'Unable to Save Entry',
        summary: 'There was a problem saving your DCC entry.',
        explanation: 'This could be due to validation errors, network issues, or server problems.',
        userAction: 'Please check your entries and try again. If the problem persists, contact support.',
        errorId: 'DCC_SAVE_ERROR'
      })
    }
  }

  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setSessionType('all')
    setDurationMin('')
    setDurationMax('')
    // groupByWeek is now always true, no need to reset
    setClientPseudonym('')
    setActivityType('all')
    setReviewedFilter('all')
    setPagination(prev => ({ ...prev, current_page: 1 }))
  }

  const hasActiveFilters = dateFrom || dateTo || (sessionType && sessionType !== 'all') || durationMin || durationMax || clientPseudonym || activityType !== 'all' || reviewedFilter !== 'all'

  const toggleWeekExpansion = (weekStart: string) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(weekStart)) {
        newSet.delete(weekStart)
      } else {
        newSet.add(weekStart)
      }
      return newSet
    })
  }

  // Group entries by week if groupByWeek is enabled
  const getGroupedEntries = () => {
    if (!groupByWeek) {
      return dccEntries.map(entry => ({ entry, weekStart: null }))
    }
    
    const grouped = dccEntries.reduce((groups, entry) => {
      const weekStart = entry.week_starting
      if (!groups[weekStart]) {
        groups[weekStart] = []
      }
      groups[weekStart].push(entry)
      return groups
    }, {} as Record<string, DCCEntry[]>)
    
    // Sort entries within each group based on the current sort order
    const sortEntries = (entries: DCCEntry[]) => {
      switch (sortBy) {
        case 'newest':
          return entries.sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())
        case 'oldest':
          return entries.sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime())
        case 'duration':
          return entries.sort((a, b) => (parseInt(b.duration_minutes) || 0) - (parseInt(a.duration_minutes) || 0))
        case 'client':
          return entries.sort((a, b) => a.client_id.localeCompare(b.client_id))
        default:
          return entries.sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())
      }
    }
    
    // Convert to array and sort by week start date based on the selected sort order
    const sortedWeeks = Object.entries(grouped).sort(([a], [b]) => {
      const dateA = new Date(a).getTime()
      const dateB = new Date(b).getTime()
      
      // Apply the same sort logic as entries, but for week groups
      switch (sortBy) {
        case 'newest':
          return dateB - dateA // Newest weeks first
        case 'oldest':
          return dateA - dateB // Oldest weeks first
        case 'duration':
          // For duration, sort by total duration of all entries in the week
          const totalDurationA = grouped[a].reduce((sum, entry) => sum + (parseInt(entry.duration_minutes) || 0), 0)
          const totalDurationB = grouped[b].reduce((sum, entry) => sum + (parseInt(entry.duration_minutes) || 0), 0)
          return totalDurationB - totalDurationA // Longest duration weeks first
        case 'client':
          // For client, sort alphabetically by week start date string
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

  return (
    <div className="min-h-screen bg-bgSection">
      <div className="container mx-auto px-4 py-4">
        {/* Hero Section - PsychPathway Brand */}
        <div className="mb-4">
          <div className="bg-gradient-to-r from-blue-600 to-blue-600/90 rounded-card p-4 text-white shadow-md">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="text-3xl font-headings mb-1">Section A: Direct Client Contact</h1>
                <p className="text-white/90 text-base font-body">Track your client interactions and build your professional portfolio</p>
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={() => window.location.href = '/section-b'}
                    className="px-3 py-2 rounded-md bg-green-600 text-white text-sm hover:bg-green-700"
                  >
                    Open Section B
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/section-c'}
                    className="px-3 py-2 rounded-md bg-purple-600 text-white text-sm hover:bg-purple-700"
                  >
                    Open Section C
                  </Button>
                </div>
              </div>
                  <div className="flex flex-col items-end">
                    <div className="mb-3">
                      <UserNameDisplay 
                        className="text-white" 
                        variant="small" 
                        showRole={true}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={() => setShowSmartForm(true)}
                      size="lg"
                      className="bg-white text-primary hover:bg-white/90 font-semibold shadow-sm rounded-lg"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Log DCC Entry
                    </Button>
                    <Button 
                      onClick={() => handleAddICRA()}
                      size="lg"
                      className="bg-white/20 text-white hover:bg-white/30 font-semibold shadow-sm rounded-lg border border-white/30"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      New ICRA Entry
                    </Button>
                <Button 
                  variant="outline"
                  size="lg"
                  onClick={() => window.location.href = '/logbook'}
                  className="border-white text-white hover:bg-white hover:text-primary font-semibold rounded-lg bg-white/10 backdrop-blur-sm"
                >
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Weekly Logbooks
                </Button>
                    </div>
                  </div>
            </div>
          </div>
        </div>


        {/* Section A Client Hours Compliance Dashboard */}
        {(() => {
          // Calculate hours summary - use ALL entries for cumulative totals, not filtered ones
          let totalDccHours = 0
          let totalCRAHours = 0
          let totalICRAHours = 0
          let simulatedDccHours = 0

          allEntries.forEach(entry => {
            const entryMinutes = parseInt(entry.duration_minutes) || 0
            const entryHours = entryMinutes / 60
            
            if (entry.entry_type === 'client_contact') {
              totalDccHours += entryHours
              if (entry.simulated) {
                simulatedDccHours += entryHours
              }
            } else if (entry.entry_type === 'cra') {
              totalCRAHours += entryHours
            } else if (entry.entry_type === 'independent_activity') {
              totalICRAHours += entryHours
            }

            // Add CRA hours from nested entries
            if (entry.cra_entries) {
              entry.cra_entries.forEach(craEntry => {
                const craMinutes = parseInt(craEntry.duration_minutes) || 0
                const craHours = craMinutes / 60
                totalCRAHours += craHours
              })
            }
          })

          // Mock user profile data - in real implementation, this would come from user profile
          const userProfile = {
            internship_start_date: '2024-01-01', // Mock start date
            internship_weeks_estimate: 52, // 1 year internship
            weekly_clinical_commitment_hours: 26 // 26 hours per week (assume 60% DCC, 40% CRA)
          }

          // Calculate internship progress
          const calculateInternshipProgress = () => {
            const startDate = new Date(userProfile.internship_start_date)
            const currentDate = new Date()
            const weeksElapsed = Math.max(1, Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)))
            const progressPercentage = Math.min(weeksElapsed / userProfile.internship_weeks_estimate, 1) * 100 // Convert to percentage
            const expectedDccHours = weeksElapsed * userProfile.weekly_clinical_commitment_hours * 0.6 // 60% DCC
            const expectedCRAHours = weeksElapsed * userProfile.weekly_clinical_commitment_hours * 0.4 // 40% CRA
            return { weeksElapsed, progressPercentage, expectedDccHours, expectedCRAHours }
          }

          const internshipProgress = calculateInternshipProgress()

          // Calculate progress ratios
          const dccProgressRatio = totalDccHours / internshipProgress.expectedDccHours
          const craProgressRatio = totalCRAHours / internshipProgress.expectedCRAHours

          // RAG Status calculation
          const getRAGStatus = (ratio: number) => {
            if (ratio < 0.75) return { status: 'red', label: 'Non-compliant', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
            if (ratio < 1) return { status: 'amber', label: 'At Risk', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' }
            return { status: 'green', label: 'On Track', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' }
          }

          const dccRAGStatus = getRAGStatus(dccProgressRatio)
          const craRAGStatus = getRAGStatus(craProgressRatio)

          // Note: Supervisor review tracking removed as this field doesn't exist in the backend model

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
                {/* Total DCC Logged */}
                <div className="relative group">
                  <Card className={`brand-card hover:shadow-md transition-all duration-300 ${dccRAGStatus.border} ${dccRAGStatus.bg}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Target className="h-6 w-6 text-primary" />
                      </div>
                      <Badge className={`${dccRAGStatus.status === 'green' ? 'bg-green-500' : dccRAGStatus.status === 'amber' ? 'bg-amber-500' : 'bg-red-500'} text-white text-xs font-semibold`}>
                        {dccRAGStatus.label}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-textDark mb-1">
                      {formatDurationWithUnit(totalDccHours * 60)}
                    </div>
                    <div className="text-xs font-semibold text-textDark mb-1 font-body">Total DCC Logged</div>
                    <div className="text-xs text-textLight mb-2">Goal: {(userProfile.internship_weeks_estimate * userProfile.weekly_clinical_commitment_hours * 0.6).toFixed(0)}h total</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${dccRAGStatus.status === 'green' ? 'bg-green-500' : dccRAGStatus.status === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(dccProgressRatio * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-textLight mt-1">
                      {dccProgressRatio >= 1 ? `✓ ${(dccProgressRatio * 100).toFixed(1)}% complete` : `${(dccProgressRatio * 100).toFixed(1)}% of expected`}
                    </div>
                  </CardContent>
                </Card>
                  {/* Tooltip */}
                  <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-gray-900 text-white text-sm rounded-lg transition-opacity duration-200 pointer-events-none z-50 w-80 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                    <div className="space-y-1">
                      <p className="font-semibold">Direct Client Contact (DCC) Hours</p>
                      <p>Time spent in direct face-to-face or virtual contact with clients for assessment, intervention, or consultation.</p>
                      <p>Target: 60% of your clinical commitment hours. Current status: {dccRAGStatus.label.toLowerCase()}.</p>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>

                {/* Total CRA Logged */}
                <div className="relative group">
                  <Card className={`brand-card hover:shadow-md transition-all duration-300 ${craRAGStatus.border} ${craRAGStatus.bg}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 bg-secondary/10 rounded-full flex items-center justify-center">
                        <FileText className="h-6 w-6 text-secondary" />
                      </div>
                      <Badge className={`${craRAGStatus.status === 'green' ? 'bg-green-500' : craRAGStatus.status === 'amber' ? 'bg-amber-500' : 'bg-red-500'} text-white text-xs font-semibold`}>
                        {craRAGStatus.label}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-textDark mb-1">
                      {formatDurationWithUnit(totalCRAHours * 60)}
                    </div>
                    <div className="text-xs font-semibold text-textDark mb-1 font-body">Total CRA Logged</div>
                    <div className="text-xs text-textLight mb-2">Goal: {(userProfile.internship_weeks_estimate * userProfile.weekly_clinical_commitment_hours * 0.4).toFixed(0)}h total</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${craRAGStatus.status === 'green' ? 'bg-green-500' : craRAGStatus.status === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(craProgressRatio * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-textLight mt-1">
                      {craProgressRatio >= 1 ? `✓ ${(craProgressRatio * 100).toFixed(1)}% complete` : `${(craProgressRatio * 100).toFixed(1)}% of expected`}
                    </div>
                  </CardContent>
                </Card>
                  {/* Tooltip */}
                  <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-gray-900 text-white text-sm rounded-lg transition-opacity duration-200 pointer-events-none z-50 w-80 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                    <div className="space-y-1">
                      <p className="font-semibold">Client Related Activities (CRA) Hours</p>
                      <p>Time spent on client-related work outside direct contact, including case notes, report writing, treatment planning, and consultation.</p>
                      <p>Target: 40% of your clinical commitment hours. Current status: {craRAGStatus.label.toLowerCase()}.</p>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>

                {/* Total ICRA Logged */}
                <div className="relative group">
                  <Card className="brand-card hover:shadow-md transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-accent" />
                      </div>
                      <Badge variant="outline" className="text-accent border-accent text-xs font-semibold">
                        ICRA
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-textDark mb-1">
                      {formatDurationWithUnit(totalICRAHours * 60)}
                    </div>
                    <div className="text-xs font-semibold text-textDark mb-1 font-body">Total ICRA Logged</div>
                    <div className="text-xs text-textLight mb-2">Independent activities</div>
                    <div className="text-xs text-textLight">
                      {totalICRAHours > 0 ? '✓ Activities logged' : 'No ICRA entries'}
                    </div>
                  </CardContent>
                </Card>
                  {/* Tooltip */}
                  <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-gray-900 text-white text-sm rounded-lg transition-opacity duration-200 pointer-events-none z-50 w-80 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                    <div className="space-y-1">
                      <p className="font-semibold">Independent Client Related Activities (ICRA)</p>
                      <p>Independent client-related work performed outside supervised practice, including research, case studies, and professional development activities.</p>
                      <p>These activities supplement your supervised practice and contribute to your overall professional development.</p>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>

                {/* Expected DCC to Date */}
                <div className="relative group">
                  <Card className="brand-card hover:shadow-md transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-blue-600" />
                      </div>
                      <Badge variant="outline" className="text-blue-600 border-blue-600 text-xs font-semibold">
                        Expected
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-textDark mb-1">
                      {internshipProgress.expectedDccHours.toFixed(0)}h
                    </div>
                    <div className="text-xs font-semibold text-textDark mb-1 font-body">Expected DCC to Date</div>
                    <div className="text-xs text-textLight mb-2">Based on 60% DCC commitment</div>
                    <div className="text-xs text-textLight">
                      {internshipProgress.weeksElapsed} weeks elapsed
                    </div>
                  </CardContent>
                </Card>
                  {/* Tooltip */}
                  <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-gray-900 text-white text-sm rounded-lg transition-opacity duration-200 pointer-events-none z-50 w-80 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                    <div className="space-y-1">
                      <p className="font-semibold">Expected DCC Hours to Date</p>
                      <p>Calculated based on your internship start date, weekly clinical commitment, and the 60% DCC allocation.</p>
                      <p>Formula: {internshipProgress.weeksElapsed} weeks × {userProfile.weekly_clinical_commitment_hours} hours/week × 60% = {internshipProgress.expectedDccHours.toFixed(0)} hours</p>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>

                {/* Expected CRA to Date */}
                <div className="relative group">
                  <Card className="brand-card hover:shadow-md transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 bg-purple-500/10 rounded-full flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-purple-600" />
                      </div>
                      <Badge variant="outline" className="text-purple-600 border-purple-600 text-xs font-semibold">
                        Expected
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-textDark mb-1">
                      {internshipProgress.expectedCRAHours.toFixed(0)}h
                    </div>
                    <div className="text-xs font-semibold text-textDark mb-1 font-body">Expected CRA to Date</div>
                    <div className="text-xs text-textLight mb-2">Based on 40% CRA commitment</div>
                    <div className="text-xs text-textLight">
                      {internshipProgress.weeksElapsed} weeks elapsed
                    </div>
                  </CardContent>
                </Card>
                  {/* Tooltip */}
                  <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-gray-900 text-white text-sm rounded-lg transition-opacity duration-200 pointer-events-none z-50 w-80 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                    <div className="space-y-1">
                      <p className="font-semibold">Expected CRA Hours to Date</p>
                      <p>Calculated based on your internship start date, weekly clinical commitment, and the 40% CRA allocation.</p>
                      <p>Formula: {internshipProgress.weeksElapsed} weeks × {userProfile.weekly_clinical_commitment_hours} hours/week × 40% = {internshipProgress.expectedCRAHours.toFixed(0)} hours</p>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>


            </div>
            </>
          )
        })()}

        {/* Enhanced Filters and Controls */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
        </div>
        {/* Quick Stats Cards */}
        {(() => {
          const totalEntries = dccEntries.length
          const totalMinutes = dccEntries.reduce((sum, entry) => sum + (parseInt(entry.duration_minutes) || 0), 0)
          const totalHours = totalMinutes / 60
          const uniqueClients = new Set(dccEntries.map(entry => entry.client_id)).size
          const simulatedMinutes = dccEntries.filter(entry => entry.simulated).reduce((sum, entry) => sum + (parseInt(entry.duration_minutes) || 0), 0)
          const simulatedHours = simulatedMinutes / 60

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="brand-card hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="brand-label">Total Entries</p>
                      <p className="text-3xl font-bold text-primary">{totalEntries}</p>
                    </div>
                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
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
                      <p className="brand-label">Unique Clients</p>
                      <p className="text-3xl font-bold text-accent">{uniqueClients}</p>
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
                      <p className="brand-label">Simulated Hours</p>
                      <p className="text-3xl font-bold text-primary">{formatDurationWithUnit(simulatedMinutes)}</p>
                    </div>
                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })()}

        <Card className="mb-8 brand-card">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Filter className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-headings text-textDark">Filters & Search</CardTitle>
                  <p className="text-sm text-textLight font-body">Refine your DCC entries</p>
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
                  {sessionType && sessionType !== 'all' && (
                    <Badge variant="secondary" className="bg-secondary/10 text-secondary">
                      Type: {sessionType.replace('_', ' ')}
                      <button onClick={() => setSessionType('all')} className="ml-2 hover:bg-secondary/20 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {(durationMin || durationMax) && (
                    <Badge variant="secondary" className="bg-accent/10 text-accent">
                      Duration: {durationMin || '0'} - {durationMax || '∞'} min
                      <button onClick={() => { setDurationMin(''); setDurationMax('') }} className="ml-2 hover:bg-accent/20 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {clientPseudonym && (
                    <Badge variant="secondary" className="bg-secondary/10 text-secondary">
                      Client: {clientPseudonym}
                      <button onClick={() => setClientPseudonym('')} className="ml-2 hover:bg-secondary/20 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {activityType !== 'all' && (
                    <Badge variant="secondary" className="bg-accent/10 text-accent">
                      Type: {activityType}
                      <button onClick={() => setActivityType('all')} className="ml-2 hover:bg-accent/20 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {reviewedFilter !== 'all' && (
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                      Review: {reviewedFilter === 'reviewed' ? 'Reviewed' : 'Not Reviewed'}
                      <button onClick={() => setReviewedFilter('all')} className="ml-2 hover:bg-blue-500/20 rounded-full p-0.5">
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
              
              {/* Client Pseudonym */}
              <div>
                <label className="block text-sm font-medium mb-1">Client Pseudonym</label>
                <Input
                  type="text"
                  value={clientPseudonym}
                  onChange={(e) => setClientPseudonym(e.target.value)}
                  placeholder="Search by client..."
                />
              </div>
              
              {/* Activity Type */}
              <div>
                <label className="block text-sm font-medium mb-1">Activity Type</label>
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="DCC">Direct Client Contact</SelectItem>
                    <SelectItem value="CRA">Client Related Activity</SelectItem>
                    <SelectItem value="ICRA">Independent CRA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Additional filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Session Type */}
              <div>
                <label className="block text-sm font-medium mb-1">Session Type</label>
                <Select value={sessionType} onValueChange={setSessionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="psychological_assessment">Psychological Assessment</SelectItem>
                    <SelectItem value="intervention">Intervention</SelectItem>
                    <SelectItem value="prevention">Prevention</SelectItem>
                    <SelectItem value="evaluation">Evaluation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Duration Range */}
              <div>
                <label className="block text-sm font-medium mb-1">Duration (min)</label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                    placeholder="Min"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={durationMax}
                    onChange={(e) => setDurationMax(e.target.value)}
                    placeholder="Max"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Supervisor Review Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">Supervisor Review</label>
                <Select value={reviewedFilter} onValueChange={setReviewedFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All entries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All entries</SelectItem>
                    <SelectItem value="reviewed">Reviewed only</SelectItem>
                    <SelectItem value="not_reviewed">Not reviewed</SelectItem>
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
                      <SelectItem value="client">Client Pseudonym (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Records per page:</label>
                <Select 
                  value={pagination.records_per_page?.toString() || '10'} 
                  onValueChange={(value) => handleRecordsPerPageChange(parseInt(value))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            </CardContent>
          )}
        </Card>

        {/* Enhanced DCC Cards */}
        {loading ? (
          <Card className="brand-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20"></div>
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent absolute top-0 left-0"></div>
              </div>
              <h3 className="text-xl font-semibold text-textDark mt-6 mb-2 font-body">Loading your entries...</h3>
              <p className="text-textLight text-center font-body">Fetching your Direct Client Contact records</p>
            </CardContent>
          </Card>
        ) : dccEntries.length === 0 ? (
          <Card className="brand-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <FileText className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-textDark mb-3 font-headings">
                {hasActiveFilters ? "No matching records found" : "No DCC Records Yet"}
              </h3>
              <p className="text-textLight text-center mb-8 max-w-md font-body">
                {hasActiveFilters 
                  ? "No records match your current filters. Try adjusting your search criteria or clear filters to see all entries."
                  : "Start building your professional portfolio by creating your first Direct Client Contact entry."
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => navigate('/section-a/create')}
                  size="lg"
                  className="brand-button-primary px-8"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First DCC Entry
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
        ) : (
          <div className="space-y-4">
            {getGroupedEntries().map((group, groupIndex) => {
              // If not grouped, render individual entries
              if (!groupByWeek) {
                const entry = group.entry!
                const index = groupIndex
                
                // Create vibrant color variations using PsychPathway brand colors
              const colorVariations = [
                'bg-blue-50 border-blue-200 hover:border-blue-300',
                'bg-amber-50 border-amber-200 hover:border-amber-300', 
                'bg-orange-50 border-orange-200 hover:border-orange-300',
                'bg-green-50 border-green-200 hover:border-green-300',
                'bg-purple-50 border-purple-200 hover:border-purple-300',
                'bg-pink-50 border-pink-200 hover:border-pink-300',
                'bg-indigo-50 border-indigo-200 hover:border-indigo-300',
                'bg-teal-50 border-teal-200 hover:border-teal-300',
                'bg-rose-50 border-rose-200 hover:border-rose-300',
                'bg-cyan-50 border-cyan-200 hover:border-cyan-300'
              ]
              const cardColorClass = colorVariations[index % colorVariations.length]
              
              return (
                <Card key={entry.id} className={`hover:shadow-md transition-all duration-300 relative shadow-sm group rounded-card ${cardColorClass}`}>
                  {/* Enhanced Action buttons */}
                  <div className="absolute top-4 right-4 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(entry)}
                      title={expandedEntries.has(entry.id.toString()) ? "Collapse Details" : "Expand Details"}
                      className="h-9 w-9 p-0 bg-bgCard/95 backdrop-blur-sm shadow-sm hover:shadow-md border-border rounded-lg"
                    >
                      {expandedEntries.has(entry.id.toString()) ? (
                        <ChevronUp className="h-4 w-4 text-textDark" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-textDark" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(entry)}
                      title="Edit"
                      className="h-9 w-9 p-0 bg-bgCard/95 backdrop-blur-sm shadow-sm hover:shadow-md border-border rounded-lg"
                    >
                      <Edit className="h-4 w-4 text-textDark" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddCRA(entry)}
                      title="Add CRA"
                      className="h-9 w-9 p-0 bg-bgCard/95 backdrop-blur-sm shadow-sm hover:shadow-md border-border rounded-lg"
                    >
                      <Plus className="h-4 w-4 text-textDark" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(entry)}
                      title="Delete"
                      className="h-9 w-9 p-0 text-accent hover:text-accent hover:bg-accent/10 bg-bgCard/95 backdrop-blur-sm shadow-sm hover:shadow-md border-accent/20 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <CardContent className="p-4 pr-32">
                    {/* ICRA Identification */}
                    {entry.entry_type === 'independent_activity' && (
                      <div className="mb-3">
                        <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-semibold">
                          📋 Independent Client Related Activity (ICRA)
                        </Badge>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                      {/* Row 1: Basic Info */}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-700 break-words">
                          {formatDateDDMMYYYY(entry.session_date)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="font-semibold text-gray-900 break-words">{entry.client_id}</span>
                        {entry.simulated && (
                          <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">
                            Simulated
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm text-gray-600">
                          {formatDuration(entry.duration_minutes)}
                        </span>
                      </div>

                      {/* Row 2: Session Types - Full Width */}
                      <div className="lg:col-span-2 xl:col-span-3">
                        <div className="flex flex-wrap gap-1">
                          {entry.session_activity_types.map((type, typeIndex) => (
                            <Badge key={typeIndex} variant="outline" className="text-xs">
                              {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      {/* Row 3: Location and Reflections */}
                      <div className="lg:col-span-1">
                        <span className="text-sm text-gray-600 break-words">{entry.place_of_practice}</span>
                      </div>
                      
                      {entry.reflections_on_experience && (
                        <div className="lg:col-span-2">
                          <p className="text-sm text-gray-700 break-words line-clamp-2">
                            {truncateText(entry.reflections_on_experience, 120)}
                          </p>
                        </div>
                      )}
                      
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
                          {/* Client Information */}
                          <div className="space-y-2">
                            <h5 className="font-medium text-gray-700">Client Details</h5>
                            <div className="space-y-1 text-gray-600">
                              <div><span className="font-medium">Client ID:</span> {entry.client_id}</div>
                              {entry.client_pseudonym && (
                                <div><span className="font-medium">Pseudonym:</span> {entry.client_pseudonym}</div>
                              )}
                              {entry.presenting_issues && (
                                <div><span className="font-medium">Presenting Issues:</span> {entry.presenting_issues}</div>
                              )}
                            </div>
                          </div>

                          {/* Session Information */}
                          <div className="space-y-2">
                            <h5 className="font-medium text-gray-700">Session Details</h5>
                            <div className="space-y-1 text-gray-600">
                              <div><span className="font-medium">Date:</span> {formatDateDDMMYYYY(entry.session_date)}</div>
                              <div><span className="font-medium">Duration:</span> {formatDuration(entry.duration_minutes)}</div>
                              <div><span className="font-medium">Location:</span> {entry.place_of_practice}</div>
                              {entry.simulated && (
                                <div><span className="font-medium">Type:</span> <Badge variant="secondary" className="text-xs ml-1">Simulated</Badge></div>
                              )}
                            </div>
                          </div>

                          {/* Activity Types */}
                          <div className="md:col-span-2 space-y-2">
                            <h5 className="font-medium text-gray-700">Activity Types</h5>
                            <div className="flex flex-wrap gap-1">
                              {entry.session_activity_types.map((type, typeIndex) => (
                                <Badge key={typeIndex} variant="outline" className="text-xs">
                                  {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Reflections */}
                          {entry.reflections_on_experience && (
                            <div className="md:col-span-2 space-y-2">
                              <h5 className="font-medium text-gray-700">Reflections</h5>
                              <p className="text-gray-600 text-sm leading-relaxed bg-white p-3 rounded border">
                                {entry.reflections_on_experience}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </div>
                  )}

                  {/* Nested CRA Entries */}
                  {entry.cra_entries && entry.cra_entries.length > 0 && (
                    <div className="px-4 pb-4">
                      <div className="border-t border-gray-200 pt-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Client Related Activities ({entry.cra_entries.length})
                        </h4>
                        <div className="space-y-2">
                          {entry.cra_entries.map((craEntry, craIndex) => {
                            // Create vibrant color variations for each CRA entry
                            const craColorVariations = [
                              'bg-blue-100 border-blue-300 hover:border-blue-400',
                              'bg-green-100 border-green-300 hover:border-green-400',
                              'bg-purple-100 border-purple-300 hover:border-purple-400',
                              'bg-orange-100 border-orange-300 hover:border-orange-400',
                              'bg-pink-100 border-pink-300 hover:border-pink-400',
                              'bg-indigo-100 border-indigo-300 hover:border-indigo-400',
                              'bg-teal-100 border-teal-300 hover:border-teal-400',
                              'bg-rose-100 border-rose-300 hover:border-rose-400',
                              'bg-cyan-100 border-cyan-300 hover:border-cyan-400',
                              'bg-emerald-100 border-emerald-300 hover:border-emerald-400'
                            ]
                            const craCardColorClass = craColorVariations[craIndex % craColorVariations.length]
                            
                            return (
                            <Card key={craEntry.id} className={`${craCardColorClass} ml-4 relative`}>
                              {/* CRA Action buttons */}
                              <div className="absolute top-2 right-2 flex gap-1 z-10">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditCRA(craEntry)}
                                  title="Edit CRA"
                                  className="h-6 w-6 p-0 bg-white/90 backdrop-blur-sm"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteCRA(craEntry)}
                                  title="Delete CRA"
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700 bg-white/90 backdrop-blur-sm"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>

                              <CardContent className="p-3 pr-16">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-3 w-3 text-textLight" />
                                    <span className="text-xs font-semibold text-textDark">
                                      {formatDuration(parseInt(craEntry.duration_minutes))}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <User className="h-3 w-3 text-textLight" />
                                    <span className="text-xs font-semibold text-textDark">
                                      {craEntry.client_pseudonym || craEntry.client_id}
                                    </span>
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-1 md:col-span-2">
                                    {craEntry.session_activity_types.map((type, typeIndex) => (
                                      <Badge key={typeIndex} variant="outline" className="text-xs">
                                        {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                      </Badge>
                                    ))}
                                  </div>
                                  
                                  <div className="md:col-span-2">
                                    <span className="text-xs text-textLight font-medium">
                                      {craEntry.place_of_practice}
                                    </span>
                                  </div>
                                  
                                  {craEntry.presenting_issues && (
                                    <div className="md:col-span-2">
                                      <p className="text-xs text-textDark break-words font-medium">
                                        {truncateText(craEntry.presenting_issues, 80)}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {craEntry.reflections_on_experience && (
                                    <div className="md:col-span-2">
                                      <p className="text-xs text-textLight italic break-words">
                                        "{truncateText(craEntry.reflections_on_experience, 100)}"
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              )
              } else {
                // Grouped by week - render week header and entries
                return (
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
                              {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="flex gap-4 text-sm">
                              {/* DCC Total */}
                              <div className="text-center">
                                <p className="font-medium text-primary">DCC</p>
                                <p className="text-primary/70">
                                  {formatDurationWithUnit(
                                    group.entries
                                      .filter(entry => entry.entry_type === 'client_contact')
                                      .reduce((sum, entry) => sum + (parseInt(entry.duration_minutes) || 0), 0)
                                  )}
                                </p>
                              </div>
                              
                              {/* CRA Total */}
                              <div className="text-center">
                                <p className="font-medium text-secondary">CRA</p>
                                <p className="text-secondary/70">
                                  {formatDurationWithUnit(
                                    group.entries
                                      .filter(entry => entry.entry_type === 'cra')
                                      .reduce((sum, entry) => sum + (parseInt(entry.duration_minutes) || 0), 0)
                                  )}
                                </p>
                              </div>
                              
                              {/* ICRA Total */}
                              <div className="text-center">
                                <p className="font-medium text-accent">ICRA</p>
                                <p className="text-accent/70">
                                  {formatDurationWithUnit(
                                    group.entries
                                      .filter(entry => entry.entry_type === 'independent_activity')
                                      .reduce((sum, entry) => sum + (parseInt(entry.duration_minutes) || 0), 0)
                                  )}
                                </p>
                              </div>
                              
                              {/* Total */}
                              <div className="text-center border-l border-primary/20 pl-4">
                                <p className="font-medium text-primary">Total</p>
                                <p className="text-primary/70">
                                  {formatDurationWithUnit(
                                    group.entries.reduce((sum, entry) => sum + (parseInt(entry.duration_minutes) || 0), 0)
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            {expandedWeeks.has(group.weekStart) ? (
                              <ChevronUp className="h-5 w-5 text-primary" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Week Entries */}
                    {expandedWeeks.has(group.weekStart) && (
                      <div className="space-y-3">
                        {group.entries.map((entry, entryIndex) => {
                        const colorVariations = [
                          'bg-blue-50 border-blue-200 hover:border-blue-300',
                          'bg-amber-50 border-amber-200 hover:border-amber-300', 
                          'bg-orange-50 border-orange-200 hover:border-orange-300',
                          'bg-green-50 border-green-200 hover:border-green-300',
                          'bg-purple-50 border-purple-200 hover:border-purple-300',
                          'bg-pink-50 border-pink-200 hover:border-pink-300',
                          'bg-indigo-50 border-indigo-200 hover:border-indigo-300',
                          'bg-teal-50 border-teal-200 hover:border-teal-300',
                          'bg-rose-50 border-rose-200 hover:border-rose-300',
                          'bg-cyan-50 border-cyan-200 hover:border-cyan-300'
                        ]
                        const cardColorClass = colorVariations[entryIndex % colorVariations.length]
                        
                        return (
                          <Card key={entry.id} className={`hover:shadow-md transition-all duration-300 relative shadow-sm group rounded-card ${cardColorClass}`}>
                            {/* Enhanced Action buttons */}
                            <div className="absolute top-4 right-4 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewDetails(entry)}
                                title={expandedEntries.has(entry.id.toString()) ? "Collapse Details" : "Expand Details"}
                                className="h-9 w-9 p-0 bg-bgCard/95 backdrop-blur-sm shadow-sm hover:shadow-md border-border rounded-lg"
                              >
                                {expandedEntries.has(entry.id.toString()) ? (
                                  <ChevronUp className="h-4 w-4 text-textDark" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-textDark" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(entry)}
                                title="Edit"
                                className="h-9 w-9 p-0 bg-bgCard/95 backdrop-blur-sm shadow-sm hover:shadow-md border-border rounded-lg"
                              >
                                <Edit className="h-4 w-4 text-textDark" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddCRA(entry)}
                                title="Add CRA"
                                className="h-9 w-9 p-0 bg-bgCard/95 backdrop-blur-sm shadow-sm hover:shadow-md border-border rounded-lg"
                              >
                                <Plus className="h-4 w-4 text-textDark" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(entry)}
                                title="Delete"
                                className="h-9 w-9 p-0 text-accent hover:text-accent hover:bg-accent/10 bg-bgCard/95 backdrop-blur-sm shadow-sm hover:shadow-md border-accent/20 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <CardContent className="p-4 pr-32">
                              {/* ICRA Identification */}
                              {entry.entry_type === 'independent_activity' && (
                                <div className="mb-3">
                                  <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-semibold">
                                    📋 Independent Client Related Activity (ICRA)
                                  </Badge>
                                </div>
                              )}
                              
                              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                                {/* Row 1: Basic Info */}
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                  <span className="text-sm font-medium text-gray-700 break-words">
                                    {formatDateDDMMYYYY(entry.session_date)}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                  <span className="font-semibold text-gray-900 break-words">{entry.client_id}</span>
                                  {entry.simulated && (
                                    <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">
                                      Simulated
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                  <span className="text-sm font-medium text-gray-700">
                                    {formatDurationDisplay(entry.duration_minutes)}
                                  </span>
                                </div>
                                
                                {/* Row 2: Activity Types */}
                                <div className="flex items-center gap-2 lg:col-span-2 xl:col-span-3">
                                  <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                  <div className="flex flex-wrap gap-1">
                                    {entry.session_activity_types.map((activity, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {activity}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Expanded Details */}
                              {expandedEntries.has(entry.id.toString()) && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-semibold text-gray-900 mb-2">Session Details</h4>
                                      <div className="space-y-2 text-sm">
                                        <div><span className="font-medium">Date:</span> {formatDateDDMMYYYY(entry.session_date)}</div>
                                        <div><span className="font-medium">Duration:</span> {formatDurationDisplay(entry.duration_minutes)}</div>
                                        <div><span className="font-medium">Location:</span> {entry.place_of_practice}</div>
                                        {entry.simulated && (
                                          <div><span className="font-medium">Type:</span> <Badge variant="secondary" className="text-xs ml-1">Simulated</Badge></div>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-gray-900 mb-2">Presenting Issues</h4>
                                      <p className="text-sm text-gray-700">{entry.presenting_issues || 'No issues recorded'}</p>
                                    </div>
                                  </div>
                                  
                                  {entry.reflections_on_experience && (
                                    <div className="mt-4">
                                      <h4 className="font-semibold text-gray-900 mb-2">Reflections</h4>
                                      <p className="text-sm text-gray-700">{entry.reflections_on_experience}</p>
                                    </div>
                                  )}

                                  {/* CRA Entries */}
                                  {entry.cra_entries && entry.cra_entries.length > 0 && (
                                    <div className="mt-4">
                                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Client Related Activities ({entry.cra_entries.length})
                                      </h4>
                                      <div className="space-y-3">
                                        {entry.cra_entries.map((craEntry, craIndex) => (
                                          <Card key={craEntry.id} className="bg-green-50 border-green-200 hover:bg-green-100 transition-colors">
                                            <CardContent className="p-4">
                                              <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2">
                                                  <Badge className="bg-green-100 text-green-800 border-green-300">
                                                    CRA
                                                  </Badge>
                                                  <span className="font-medium text-green-900">
                                                    {formatDateDDMMYYYY(craEntry.session_date)}
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleEditCRA(craEntry)}
                                                    title="Edit CRA"
                                                    className="h-8 w-8 p-0 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md border-green-300 hover:border-green-400 rounded-lg"
                                                  >
                                                    <Edit className="h-3 w-3 text-green-700" />
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDeleteCRA(craEntry)}
                                                    title="Delete CRA"
                                                    className="h-8 w-8 p-0 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md border-red-300 hover:border-red-400 rounded-lg"
                                                  >
                                                    <Trash2 className="h-3 w-3 text-red-600" />
                                                  </Button>
                                                </div>
                                              </div>
                                              
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                  <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />
                                                  <span className="font-medium text-green-800">Activity:</span>
                                                  <span className="text-green-700">
                                                    {craEntry.session_activity_types.join(', ')}
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <Clock className="h-4 w-4 text-green-600 flex-shrink-0" />
                                                  <span className="font-medium text-green-800">Duration:</span>
                                                  <span className="text-green-700">
                                                    {formatDurationDisplay(craEntry.duration_minutes)}
                                                  </span>
                                                </div>
                                              </div>
                                              
                                              {craEntry.presenting_issues && (
                                                <div className="mt-3 pt-3 border-t border-green-200">
                                                  <div className="flex items-start gap-2">
                                                    <span className="font-medium text-green-800 text-sm">Description:</span>
                                                    <span className="text-green-700 text-sm">{craEntry.presenting_issues}</span>
                                                  </div>
                                                </div>
                                              )}
                                              
                                              {craEntry.reflections_on_experience && (
                                                <div className="mt-3 pt-3 border-t border-green-200">
                                                  <div className="flex items-start gap-2">
                                                    <span className="font-medium text-green-800 text-sm">Reflections:</span>
                                                    <span className="text-green-700 text-sm">{craEntry.reflections_on_experience}</span>
                                                  </div>
                                                </div>
                                              )}
                                            </CardContent>
                                          </Card>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )
                        })}
                      </div>
                    )}
                  </div>
                )
              }
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <Card className="mt-6">
            <CardContent className="flex items-center justify-between py-4">
              <div className="text-sm text-gray-600">
                Showing {((pagination.current_page - 1) * pagination.records_per_page) + 1} to{' '}
                {Math.min(pagination.current_page * pagination.records_per_page, pagination.total_records)} of{' '}
                {pagination.total_records} records
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                  disabled={pagination.current_page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                    let pageNum;
                    if (pagination.total_pages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.current_page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.current_page >= pagination.total_pages - 2) {
                      pageNum = pagination.total_pages - 4 + i;
                    } else {
                      pageNum = pagination.current_page - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={pagination.current_page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                  disabled={pagination.current_page === pagination.total_pages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ICRA Entries Section */}
      {(() => {
        const icraEntries = dccEntries.filter(entry => entry.entry_type === 'independent_activity')
        if (icraEntries.length === 0) return null

        return (
          <div className="mt-8">
            <Card className="brand-card">
              <CardHeader>
                <CardTitle className="text-2xl font-headings text-textDark flex items-center gap-3">
                  <div className="h-8 w-8 bg-accent rounded-full flex items-center justify-center">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  Independent Client Related Activities (ICRA)
                  <Badge variant="outline" className="ml-2">
                    {icraEntries.length} entries
                  </Badge>
                </CardTitle>
                <p className="text-textLight font-body">
                  Independent client-related activities not linked to specific DCC sessions
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {icraEntries.map((entry, index) => {
                    const icraColorVariations = [
                      'bg-blue-100 border-blue-300 hover:border-blue-400',
                      'bg-green-100 border-green-300 hover:border-green-400',
                      'bg-purple-100 border-purple-300 hover:border-purple-400',
                      'bg-orange-100 border-orange-300 hover:border-orange-400',
                      'bg-pink-100 border-pink-300 hover:border-pink-400',
                      'bg-indigo-100 border-indigo-300 hover:border-indigo-400',
                      'bg-teal-100 border-teal-300 hover:border-teal-400',
                      'bg-rose-100 border-rose-300 hover:border-rose-400',
                      'bg-cyan-100 border-cyan-300 hover:border-cyan-400',
                      'bg-emerald-100 border-emerald-300 hover:border-emerald-400'
                    ]
                    const cardColorClass = icraColorVariations[index % icraColorVariations.length]

                    return (
                      <Card key={entry.id} className={`${cardColorClass} hover:shadow-md transition-all duration-300 relative group rounded-card`}>
                        {/* ICRA Action buttons */}
                        <div className="absolute top-4 right-4 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(entry)}
                            title="Edit ICRA"
                            className="h-9 w-9 p-0 bg-bgCard/95 backdrop-blur-sm shadow-sm hover:shadow-md border-border rounded-lg"
                          >
                            <Edit className="h-4 w-4 text-textDark" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(entry)}
                            title="Delete ICRA"
                            className="h-9 w-9 p-0 text-accent hover:text-accent hover:bg-accent/10 bg-bgCard/95 backdrop-blur-sm shadow-sm hover:shadow-md border-accent/20 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <CardContent className="p-4 pr-32">
                          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                            {/* Client Information */}
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="font-semibold text-gray-900 break-words">
                                {entry.client_pseudonym || entry.client_id}
                              </span>
                            </div>
                            
                            {/* Date */}
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-sm font-medium text-gray-700 break-words">
                                {formatDateDDMMYYYY(entry.session_date)}
                              </span>
                            </div>
                            
                            {/* Duration */}
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-sm text-gray-600">
                                {formatDuration(entry.duration_minutes)}
                              </span>
                            </div>

                            {/* Activity Types */}
                            <div className="lg:col-span-2 xl:col-span-3">
                              <div className="flex flex-wrap gap-1">
                                {entry.session_activity_types.map((type, typeIndex) => (
                                  <Badge key={typeIndex} variant="outline" className="text-xs">
                                    {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            
                            {/* Location */}
                            <div className="lg:col-span-1">
                              <span className="text-sm text-gray-600 break-words">{entry.place_of_practice}</span>
                            </div>
                            
                            {/* Reflections */}
                            {entry.reflections_on_experience && (
                              <div className="lg:col-span-2">
                                <p className="text-sm text-gray-700 break-words line-clamp-2">
                                  {truncateText(entry.reflections_on_experience, 120)}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )
      })()}

      {/* CRA Form Modal */}
      {showCRAForm && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <CRAForm
              onSubmit={async (data) => {
                try {
                  if (selectedEntry?.parent_dcc_entry) {
                    // Editing existing CRA entry
                    await updateSectionAEntry(selectedEntry.id, data)
                  } else {
                    // Creating new CRA entry
                    const craData = {
                      ...data,
                      entry_type: 'cra',
                      parent_dcc_entry: selectedEntry.id,
                      week_starting: calculateWeekStarting(data.session_date)
                    }
                    const response = await createSectionAEntry(craData)
                    
                    // Close modal first
                    setShowCRAForm(false)
                    setSelectedEntry(null)
                    loadDCCEntries()
                    
                    // Then show conversion notice if applicable
                    if (response && response.conversion_notice) {
                      // Longer delay to ensure modal is completely closed and DOM updated
                      setTimeout(() => {
                        toast.info(response.conversion_notice, {
                          duration: 8000,
                          style: {
                            backgroundColor: '#f0f9ff',
                            border: '1px solid #0ea5e9',
                            color: '#0c4a6e',
                            zIndex: 9999
                          }
                        })
                      }, 300)
                    }
                  }
                } catch (error) {
                  console.error('Error saving CRA entry:', error)
                }
              }}
              onCancel={() => {
                setShowCRAForm(false)
                setSelectedEntry(null)
              }}
              saving={false}
              entryForm={craFormData}
              setEntryForm={setCraFormData}
              handleActivityTypeToggle={(type: string) => {
                const currentTypes = craFormData.session_activity_types
                const updatedTypes = currentTypes.includes(type)
                  ? currentTypes.filter(t => t !== type)
                  : [...currentTypes, type]
                setCraFormData({ ...craFormData, session_activity_types: updatedTypes })
              }}
              handleAddCustomActivityType={handleAddCustomActivityType}
              newCustomActivityType={newCustomActivityType}
              setNewCustomActivityType={setNewCustomActivityType}
              customActivityTypes={customActivityTypes}
              handleDeleteCustomActivityType={handleDeleteCustomActivityType}
              calculateWeekStarting={(date: string) => date}
              title={selectedEntry?.parent_dcc_entry ? "Edit Client Related Activity (CRA)" : "Add Client Related Activity (CRA)"}
              showClientIdInput={true}
              isEditing={!!selectedEntry?.parent_dcc_entry}
            />
          </div>
        </div>
      )}

      {/* ICRA Form Modal */}
      {showICRAForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-8">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <CRAForm
              onSubmit={handleICRAFormSubmit}
              onCancel={() => {
                setShowICRAForm(false)
                setSelectedEntry(null)
                setEditingCRAId(null)
                setIcraFormData({
                  client_id: '',
                  client_pseudonym: '',
                  session_date: new Date().toISOString().split('T')[0],
                  place_of_practice: '',
                  presenting_issues: '',
                  session_activity_types: [],
                  duration_minutes: '50',
                  reflections_on_experience: '',
                  simulated: false
                })
              }}
              saving={loading}
              entryForm={icraFormData}
              setEntryForm={setIcraFormData}
              handleActivityTypeToggle={(type: string) => {
                const currentTypes = icraFormData.session_activity_types
                const updatedTypes = currentTypes.includes(type)
                  ? currentTypes.filter(t => t !== type)
                  : [...currentTypes, type]
                setIcraFormData({ ...icraFormData, session_activity_types: updatedTypes })
              }}
              handleAddCustomActivityType={handleAddCustomActivityType}
              newCustomActivityType={newCustomActivityType}
              setNewCustomActivityType={setNewCustomActivityType}
              customActivityTypes={customActivityTypes}
              handleDeleteCustomActivityType={handleDeleteCustomActivityType}
              calculateWeekStarting={calculateWeekStarting}
              title={editingCRAId ? "Edit Independent Client Related Activity (ICRA)" : "Add Independent Client Related Activity (ICRA)"}
              showClientIdInput={true}
              isEditing={!!editingCRAId}
            />
          </div>
        </div>
      )}

      {/* Smart Form Modal */}
      {showSmartForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Log Direct Client Contact (DCC)</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowSmartForm(false)
                  setFormErrors({})
                  setShowSuggestions(false)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSmartFormSubmit(); }} className="space-y-6">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Activity <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={smartFormData.date}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSmartFormData(prev => ({ ...prev, date: e.target.value }))}
                  className={formErrors.date ? 'border-red-500' : ''}
                />
                {formErrors.date && <p className="text-red-500 text-xs mt-1">{formErrors.date}</p>}
              </div>

              {/* Client Pseudonym with Autosuggest */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Pseudonym <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={smartFormData.client_pseudonym}
                  onChange={(e) => {
                    console.log('Input changed:', e.target.value)
                    setSmartFormData(prev => ({ ...prev, client_pseudonym: e.target.value }))
                    getClientSuggestions(e.target.value)
                    setShowSuggestions(true)
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Type to search previous clients..."
                  className={formErrors.client_pseudonym ? 'border-red-500' : ''}
                />
                {/* Debug info */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-gray-500 mt-1">
                    Debug: showSuggestions={showSuggestions.toString()}, suggestions={clientSuggestions.length}
                  </div>
                )}
                {showSuggestions && clientSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {clientSuggestions.map((client, index) => (
                      <div
                        key={index}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => {
                          console.log('Suggestion clicked:', client)
                          handleClientSelect(client)
                        }}
                      >
                        {client}
                      </div>
                    ))}
                  </div>
                )}
                {formErrors.client_pseudonym && <p className="text-red-500 text-xs mt-1">{formErrors.client_pseudonym}</p>}
              </div>

              {/* Place of Practice */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Place of Practice <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={smartFormData.place_of_practice}
                  onChange={(e) => setSmartFormData(prev => ({ ...prev, place_of_practice: e.target.value }))}
                  className={formErrors.place_of_practice ? 'border-red-500' : ''}
                />
                {formErrors.place_of_practice && <p className="text-red-500 text-xs mt-1">{formErrors.place_of_practice}</p>}
              </div>

              {/* Presenting Issues */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Presenting Issues <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-vertical min-h-[80px]"
                  value={smartFormData.presenting_issues}
                  onChange={(e) => setSmartFormData(prev => ({ ...prev, presenting_issues: e.target.value }))}
                  placeholder="Describe the client's presenting issues..."
                />
                {formErrors.presenting_issues && <p className="text-red-500 text-xs mt-1">{formErrors.presenting_issues}</p>}
              </div>

              {/* DCC Activity Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  DCC Activity Type(s) <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    'Psychological Assessment',
                    'Intervention',
                    'Prevention',
                    'Evaluation'
                  ].map((type) => (
                    <label key={type} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={smartFormData.dcc_activity_types.includes(type)}
                        onChange={(e) => {
                          const updatedTypes = e.target.checked
                            ? [...smartFormData.dcc_activity_types, type]
                            : smartFormData.dcc_activity_types.filter(t => t !== type)
                          setSmartFormData(prev => ({ ...prev, dcc_activity_types: updatedTypes }))
                        }}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
                {formErrors.dcc_activity_types && <p className="text-red-500 text-xs mt-1">{formErrors.dcc_activity_types}</p>}
              </div>

              {/* Activity Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activity Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-vertical min-h-[100px]"
                  value={smartFormData.description}
                  onChange={(e) => setSmartFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="E.g., Trauma-focused CBT session using grounding techniques..."
                />
                {formErrors.description && <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>}
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="5"
                  step="5"
                  value={smartFormData.duration}
                  onChange={(e) => setSmartFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                  className={formErrors.duration ? 'border-red-500' : ''}
                />
                
                {/* Quick Duration Options */}
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="text-xs text-gray-500 mr-2">Quick options:</span>
                  {[30, 50, 60, 75, 90].map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => setSmartFormData(prev => ({ ...prev, duration: minutes }))}
                      className={`px-2 py-1 text-xs rounded border ${
                        smartFormData.duration === minutes
                          ? 'bg-primary text-white border-primary'
                          : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {minutes}min
                    </button>
                  ))}
                </div>
                
                {formErrors.duration && <p className="text-red-500 text-xs mt-1">{formErrors.duration}</p>}
              </div>

              {/* Simulated Client */}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={smartFormData.simulated_client}
                    onChange={(e) => setSmartFormData(prev => ({ ...prev, simulated_client: e.target.checked }))}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">Simulated Client</span>
                </label>
                {formErrors.simulated_client && <p className="text-red-500 text-xs mt-1">{formErrors.simulated_client}</p>}
              </div>


              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowSmartForm(false)
                    setFormErrors({})
                    setShowSuggestions(false)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90"
                >
                  Save Entry
                </Button>
              </div>
            </form>
          </div>
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
    </div>
  )
}
