import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSmartRefresh } from '@/hooks/useSmartRefresh'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  BookOpen, 
  Clock, 
  Target, 
  Filter, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  X, 
  Eye, 
  Edit, 
  Trash2,
  Calendar,
  BarChart3
} from 'lucide-react'
import { 
  getPDEntriesGroupedByWeek, 
  getPDCompetencies, 
  createPDEntry, 
  updatePDEntry, 
  deletePDEntry
} from '@/lib/api'
import type { PDEntry, PDCompetency, PDWeeklyGroup } from '@/types/pd'
import { formatDurationWithUnit, formatDurationDisplay } from '@/utils/durationUtils'
import { useSimpleFilterPersistence } from '@/hooks/useFilterPersistence'
import { useErrorHandler } from '@/lib/errors'
import UserNameDisplay from '@/components/UserNameDisplay'

const SectionB: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { showError } = useErrorHandler()
  const [weeklyGroups, setWeeklyGroups] = useState<PDWeeklyGroup[]>([])
  const [competencies, setCompetencies] = useState<PDCompetency[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PDEntry | null>(null)

  // Open create form when navigated from dashboard (+B)
  useEffect(() => {
    const st: any = location.state
    if (st?.openCreate) {
      setShowForm(true)
      // Pre-fill date to the selected logbook week if provided
      if (st.logbookWeek) {
        setFormData(prev => ({ ...prev, date_of_activity: st.logbookWeek }))
      }
      // Clear only the openCreate flag but preserve returnTo/logbookWeek so we can
      // navigate back after save and keep date consistent
      navigate(location.pathname, { replace: true, state: { returnTo: st.returnTo, logbookWeek: st.logbookWeek } })
    }
  }, [location.state])

  // Persistent filter states (matching Section A)
  const [showFilters, setShowFilters] = useState(false)
  const [dateFrom, setDateFrom] = useSimpleFilterPersistence<string>('section-b-date-from', '')
  const [dateTo, setDateTo] = useSimpleFilterPersistence<string>('section-b-date-to', '')
  const [activityType, setActivityType] = useSimpleFilterPersistence<string>('section-b-activity-type', 'all')
  const [durationMin, setDurationMin] = useSimpleFilterPersistence<string>('section-b-duration-min', '')
  const [durationMax, setDurationMax] = useSimpleFilterPersistence<string>('section-b-duration-max', '')
  const [sortBy, setSortBy] = useSimpleFilterPersistence<string>('section-b-sort-by', 'oldest') // Default to oldest first
  // Weekly organization is now the standard view - no need for toggle
  const groupByWeek = true
  const [entriesPerPage, setEntriesPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())
  
  // Tooltip toggle
  const [showTooltips, setShowTooltips] = useState(true)
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set())
  
  // New PD-specific filters
  const [competencyFilter, setCompetencyFilter] = useState<string[]>([])
  const [reviewedFilter, setReviewedFilter] = useState('all') // 'all', 'reviewed', 'not_reviewed'


  const formatDateDDMMYYYY = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    // Check if the date is valid
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
    setActivityType('all')
    setDurationMin('')
    setDurationMax('')
    // groupByWeek is now always true, no need to reset
    setSearchTerm('')
    setCompetencyFilter([])
    setReviewedFilter('all')
    setCurrentPage(1)
  }

  // Pagination helpers
  const getPaginatedEntries = (entries: PDEntry[]) => {
    const startIndex = (currentPage - 1) * entriesPerPage
    const endIndex = startIndex + entriesPerPage
    return entries.slice(startIndex, endIndex)
  }

  const getPaginatedGroups = (groups: Array<{ weekStart: string; entries: PDEntry[] }>) => {
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
  const hasActiveFilters = dateFrom || dateTo || activityType !== 'all' || durationMin || durationMax || competencyFilter.length > 0 || reviewedFilter !== 'all'

  // Get all entries from weekly groups
  const allEntries = weeklyGroups.flatMap(group => group.entries)

  // Filter entries based on current filters
  const filteredEntries = allEntries.filter(entry => {
    // Date range filter
    if (dateFrom) {
      const entryDate = new Date(entry.date_of_activity)
      const fromDate = new Date(dateFrom)
      if (entryDate < fromDate) return false
    }
    if (dateTo) {
      const entryDate = new Date(entry.date_of_activity)
      const toDate = new Date(dateTo)
      if (entryDate > toDate) return false
    }

    // Activity type filter
    if (activityType !== 'all' && entry.activity_type !== activityType) return false

    // Duration filter
    const duration = parseInt(entry.duration_minutes.toString()) || 0
    if (durationMin && duration < parseInt(durationMin)) return false
    if (durationMax && duration > parseInt(durationMax)) return false

    // Search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = 
        entry.activity_details.toLowerCase().includes(searchLower) ||
        entry.topics_covered.toLowerCase().includes(searchLower) ||
        entry.activity_type.toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }

    // Competency filter
    if (competencyFilter.length > 0) {
      const hasMatchingCompetency = entry.competencies_covered.some(comp => 
        competencyFilter.includes(comp)
      )
      if (!hasMatchingCompetency) return false
    }

    // Supervisor review filter
    if (reviewedFilter === 'reviewed' && !entry.reviewed_in_supervision) return false
    if (reviewedFilter === 'not_reviewed' && entry.reviewed_in_supervision) return false

    return true
  })

  // Sort entries
  const sortEntries = (entries: PDEntry[]) => {
    return [...entries].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.date_of_activity).getTime() - new Date(a.date_of_activity).getTime()
        case 'oldest':
          return new Date(a.date_of_activity).getTime() - new Date(b.date_of_activity).getTime()
        case 'duration':
          return (parseInt(b.duration_minutes.toString()) || 0) - (parseInt(a.duration_minutes.toString()) || 0)
        case 'activity':
          return a.activity_type.localeCompare(b.activity_type)
        default:
          return new Date(b.date_of_activity).getTime() - new Date(a.date_of_activity).getTime()
      }
    })
  }

  // Group entries by week if enabled
  const getGroupedEntries = () => {
    if (!groupByWeek) return []

    const grouped = filteredEntries.reduce((acc, entry) => {
      const weekStart = entry.week_starting
      if (!weekStart) {
        console.warn('Entry with missing week_starting:', entry)
        return acc
      }
      if (!acc[weekStart]) {
        acc[weekStart] = []
      }
      acc[weekStart].push(entry)
      return acc
    }, {} as Record<string, PDEntry[]>)

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
          const totalDurationA = grouped[a].reduce((sum, entry) => sum + (parseInt(entry.duration_minutes.toString()) || 0), 0)
          const totalDurationB = grouped[b].reduce((sum, entry) => sum + (parseInt(entry.duration_minutes.toString()) || 0), 0)
          return totalDurationB - totalDurationA // Longest duration weeks first
        case 'activity':
          // For activity, sort alphabetically by week start date string
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
  const [formData, setFormData] = useState({
    activity_type: 'WORKSHOP',
    date_of_activity: new Date().toISOString().split('T')[0],
    duration_minutes: 60,
    is_active_activity: true,
    activity_details: '',
    topics_covered: '',
    competencies_covered: [] as string[],
    reflection: '',
    reviewed_in_supervision: false
  })

  const activityTypes = [
    'WORKSHOP', 'WEBINAR', 'LECTURE', 'PRESENTATION', 
    'READING', 'COURSE', 'CONFERENCE', 'TRAINING', 'OTHER'
  ]

  const durationQuickLinks = [15, 30, 60, 120, 180, 240, 480]

  // Smart refresh hook for notification-based updates
  const { manualRefresh } = useSmartRefresh(
    () => loadData(),
    ['logbook_submitted', 'logbook_status_updated', 'supervision_invite_pending']
  )

  useEffect(() => {
    loadData()
  }, [])

  // Auto-expand first week when grouping is enabled
  useEffect(() => {
    if (groupByWeek && weeklyGroups.length > 0) {
      const allEntries = weeklyGroups.flatMap(group => group.entries)
      const filteredEntries = allEntries.filter(entry => {
        // Apply basic filters (same logic as in the component)
        if (dateFrom) {
          const entryDate = new Date(entry.date_of_activity)
          const fromDate = new Date(dateFrom)
          if (entryDate < fromDate) return false
        }
        if (dateTo) {
          const entryDate = new Date(entry.date_of_activity)
          const toDate = new Date(dateTo)
          if (entryDate > toDate) return false
        }
        if (activityType !== 'all' && entry.activity_type !== activityType) return false
        const duration = parseInt(entry.duration_minutes.toString()) || 0
        if (durationMin && duration < parseInt(durationMin)) return false
        if (durationMax && duration > parseInt(durationMax)) return false
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase()
          const matchesSearch = 
            entry.activity_details.toLowerCase().includes(searchLower) ||
            entry.topics_covered.toLowerCase().includes(searchLower) ||
            entry.activity_type.toLowerCase().includes(searchLower)
          if (!matchesSearch) return false
        }
        return true
      })

      // Group the filtered entries
      const grouped = filteredEntries.reduce((acc, entry) => {
        const weekStart = entry.week_starting
        if (!weekStart) return acc
        if (!acc[weekStart]) {
          acc[weekStart] = []
        }
        acc[weekStart].push(entry)
        return acc
      }, {} as Record<string, PDEntry[]>)

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
  }, [groupByWeek, weeklyGroups, dateFrom, dateTo, activityType, durationMin, durationMax, searchTerm, sortBy, expandedWeeks])

  const loadData = async () => {
    try {
      setLoading(true)
      const [groupsData] = await Promise.all([
        getPDEntriesGroupedByWeek(),
        getPDCompetencies()
      ])
      setWeeklyGroups(groupsData)
      
      // Always use fallback competencies data for now since API might not be implemented
      const fallbackCompetencies = [
        { 
          id: 1, 
          name: 'Applies and builds scientific knowledge of psychology', 
          description: 'Uses current psychological theory and research to inform case formulation, assessment choices, and treatment planning. Thinks critically about evidence quality and can explain the scientific rationale for clinical decisions.',
          is_active: true 
        },
        { 
          id: 2, 
          name: 'Practices ethically and professionally', 
          description: 'Acts consistently with the Code of Conduct and legal obligations. Maintains clear boundaries, confidentiality, informed consent, accurate records, and seeks supervision when dilemmas arise.',
          is_active: true 
        },
        { 
          id: 3, 
          name: 'Exercises professional reflexivity, purposeful and deliberate practice, and self‑care', 
          description: 'Regularly examines how personal values, culture, biases, and power dynamics affect practice. Uses feedback, supervision, and CPD to target growth areas, and maintains wellbeing to practise safely.',
          is_active: true 
        },
        { 
          id: 4, 
          name: 'Conducts psychological assessment', 
          description: 'Selects and administers appropriate, validated assessment methods. Integrates data from multiple sources into clear, useful formulations and reports that inform next steps.',
          is_active: true 
        },
        { 
          id: 5, 
          name: 'Conducts psychological intervention', 
          description: 'Plans and delivers evidence‑based interventions tailored to client goals, context, and preferences. Monitors outcomes and adapts approach when progress stalls or needs change.',
          is_active: true 
        },
        { 
          id: 6, 
          name: 'Communicates and relates to others effectively and appropriately', 
          description: 'Builds therapeutic rapport and communicates clearly with clients, families, and teams. Uses digital and telehealth tools appropriately, including privacy, consent, and modality‑specific limits.',
          is_active: true 
        },
        { 
          id: 7, 
          name: 'Demonstrates a health equity and human rights approach with people from diverse groups', 
          description: 'Works inclusively and without discrimination across culture, language, disability, gender, sexuality, and other identities. Applies trauma‑aware, culturally informed care and adapts practice to reduce barriers and promote equitable access.',
          is_active: true 
        },
        { 
          id: 8, 
          name: 'Demonstrates a health equity and human rights approach with Aboriginal and Torres Strait Islander peoples, families, and communities', 
          description: 'Provides culturally safe, trauma‑aware, self‑determined care as defined by Aboriginal and Torres Strait Islander peoples. Engages in ongoing critical reflection and collaborates to support community priorities and client self‑determination.',
          is_active: true 
        }
      ]
      
      setCompetencies(fallbackCompetencies)
      console.log('Using fallback competencies:', fallbackCompetencies.length)
    } catch (error) {
      console.error('Error loading data:', error)
      console.log('Using fallback data due to error')
      // Demo data fallback
      setWeeklyGroups([
        {
          week_starting: '2025-08-04',
          week_total_display: '2:10',
          cumulative_total_display: '2:10',
          entries: [
            {
              id: 1,
              activity_type: 'WORKSHOP',
              date_of_activity: '2025-08-07',
              duration_minutes: 130,
              is_active_activity: true,
              activity_details: 'IFS Introduction',
              topics_covered: 'Parts language and mapping',
              competencies_covered: ['Intervention Strategies', 'Knowledge of the Discipline'],
              week_starting: '2025-08-04',
              duration_display: '2h 10m',
              duration_hours_minutes: '2:10',
              created_at: '2025-08-07T10:00:00Z',
              updated_at: '2025-08-07T10:00:00Z'
            }
          ]
        }
      ])
      // Use the same fallback competencies as in the try block
      const fallbackCompetencies = [
        { 
          id: 1, 
          name: 'Applies and builds scientific knowledge of psychology', 
          description: 'Uses current psychological theory and research to inform case formulation, assessment choices, and treatment planning. Thinks critically about evidence quality and can explain the scientific rationale for clinical decisions.',
          is_active: true 
        },
        { 
          id: 2, 
          name: 'Practices ethically and professionally', 
          description: 'Acts consistently with the Code of Conduct and legal obligations. Maintains clear boundaries, confidentiality, informed consent, accurate records, and seeks supervision when dilemmas arise.',
          is_active: true 
        },
        { 
          id: 3, 
          name: 'Exercises professional reflexivity, purposeful and deliberate practice, and self‑care', 
          description: 'Regularly examines how personal values, culture, biases, and power dynamics affect practice. Uses feedback, supervision, and CPD to target growth areas, and maintains wellbeing to practise safely.',
          is_active: true 
        },
        { 
          id: 4, 
          name: 'Conducts psychological assessment', 
          description: 'Selects and administers appropriate, validated assessment methods. Integrates data from multiple sources into clear, useful formulations and reports that inform next steps.',
          is_active: true 
        },
        { 
          id: 5, 
          name: 'Conducts psychological intervention', 
          description: 'Plans and delivers evidence‑based interventions tailored to client goals, context, and preferences. Monitors outcomes and adapts approach when progress stalls or needs change.',
          is_active: true 
        },
        { 
          id: 6, 
          name: 'Communicates and relates to others effectively and appropriately', 
          description: 'Builds therapeutic rapport and communicates clearly with clients, families, and teams. Uses digital and telehealth tools appropriately, including privacy, consent, and modality‑specific limits.',
          is_active: true 
        },
        { 
          id: 7, 
          name: 'Demonstrates a health equity and human rights approach with people from diverse groups', 
          description: 'Works inclusively and without discrimination across culture, language, disability, gender, sexuality, and other identities. Applies trauma‑aware, culturally informed care and adapts practice to reduce barriers and promote equitable access.',
          is_active: true 
        },
        { 
          id: 8, 
          name: 'Demonstrates a health equity and human rights approach with Aboriginal and Torres Strait Islander peoples, families, and communities', 
          description: 'Provides culturally safe, trauma‑aware, self‑determined care as defined by Aboriginal and Torres Strait Islander peoples. Engages in ongoing critical reflection and collaborates to support community priorities and client self‑determination.',
          is_active: true 
        }
      ]
      setCompetencies(fallbackCompetencies)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    setFormData({
      activity_type: 'WORKSHOP',
      date_of_activity: new Date().toISOString().split('T')[0],
      duration_minutes: 60,
      is_active_activity: true,
      activity_details: '',
      topics_covered: '',
      competencies_covered: [],
      reflection: '',
      reviewed_in_supervision: false
    })
    setEditingEntry(null)
    setShowForm(true)
  }

  const handleEdit = (entry: PDEntry) => {
    // Check if entry is locked
    if (entry.locked) {
      showError(new Error('Entry is locked'), {
        title: 'Entry Cannot Be Edited',
        category: 'Validation',
        customExplanation: 'This entry is locked and cannot be edited because it is part of an approved logbook. Once a logbook is approved by your supervisor, all entries become read-only to maintain data integrity.',
        customUserAction: 'If you need to make changes to this entry, please contact your supervisor to unlock the logbook first.'
      })
      return
    }
    
    setFormData({
      activity_type: entry.activity_type,
      date_of_activity: entry.date_of_activity,
      duration_minutes: entry.duration_minutes,
      is_active_activity: entry.is_active_activity,
      activity_details: entry.activity_details,
      topics_covered: entry.topics_covered,
      competencies_covered: entry.competencies_covered,
      reflection: entry.reflection || '',
      reviewed_in_supervision: entry.reviewed_in_supervision || false
    })
    setEditingEntry(entry)
    setShowForm(true)
  }

  const handleSave = async () => {
    try {
      if (editingEntry) {
        await updatePDEntry(editingEntry.id, formData)
      } else {
        await createPDEntry(formData)
      }
      setShowForm(false)
      setEditingEntry(null)
      const returnTo = (location.state as any)?.returnTo as string | undefined
      if (returnTo) navigate(returnTo)
      loadData()
    } catch (error) {
      console.error('Error saving entry:', error)
    }
  }

  const handleDelete = async (entry: PDEntry) => {
    // Check if entry is locked
    if (entry.locked) {
      showError(new Error('Entry is locked'), {
        title: 'Entry Cannot Be Deleted',
        category: 'Validation',
        customExplanation: 'This entry is locked and cannot be deleted because it is part of an approved logbook. Once a logbook is approved by your supervisor, all entries become read-only to maintain data integrity.',
        customUserAction: 'If you need to delete this entry, please contact your supervisor to unlock the logbook first.'
      })
      return
    }
    
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await deletePDEntry(entry.id)
        loadData()
      } catch (error) {
        console.error('Error deleting entry:', error)
      }
    }
  }

  const toggleCompetency = (competencyName: string) => {
    setFormData(prev => ({
      ...prev,
      competencies_covered: prev.competencies_covered.includes(competencyName)
        ? prev.competencies_covered.filter(c => c !== competencyName)
        : [...prev.competencies_covered, competencyName]
    }))
  }


  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-bgSection">
      <div className="container mx-auto px-4 py-4">
        {/* Hero Section - PsychPathway Brand */}
        <div className="mb-4">
          <div className="bg-gradient-to-r from-green-600 to-green-600/90 rounded-card p-4 text-white shadow-md">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="text-3xl font-headings mb-1">Section B: Professional Development</h1>
                <p className="text-white/90 text-base font-body">Track your learning activities and competency development</p>
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={() => window.location.href = '/section-a'}
                    className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
                  >
                    Open Section A
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
                  onClick={handleCreateNew}
                  size="lg"
                  className="bg-white text-green-600 hover:bg-white/90 font-semibold shadow-sm rounded-lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  New PD Activity
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => window.open('/competencies-help', '_blank')}
                  className="border-white text-white hover:bg-white hover:text-green-600 font-semibold rounded-lg bg-white/10 backdrop-blur-sm"
                >
                  <BookOpen className="h-5 w-5 mr-2" />
                  Competencies Help
                </Button>
                <Button 
                  variant="outline"
                  size="lg"
                  onClick={() => window.location.href = '/logbook'}
                  className="border-white text-white hover:bg-white hover:text-green-600 font-semibold rounded-lg bg-white/10 backdrop-blur-sm"
                >
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Weekly Logbooks
                </Button>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* PD Compliance Dashboard */}
        {(() => {
          const totalEntries = allEntries.length
          const totalMinutes = allEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0)
          const uniqueCompetencies = new Set(allEntries.flatMap(entry => entry.competencies_covered || [])).size
          const activeMinutes = allEntries.filter(entry => entry.is_active_activity).reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0)

          // Mock user profile data - in real implementation, this would come from user profile
          const userProfile = {
            internship_start_date: '2024-01-01', // Mock start date
            internship_weeks_estimate: 52, // 1 year internship
            weekly_pd_commitment_hours: 2 // 2 hours per week
          }

          // Calculate internship progress
          const calculateInternshipProgress = () => {
            const startDate = new Date(userProfile.internship_start_date)
            const currentDate = new Date()
            const weeksElapsed = Math.max(1, Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)))
            const progressPercentage = Math.min(weeksElapsed / userProfile.internship_weeks_estimate, 1)
            const expectedHours = weeksElapsed * userProfile.weekly_pd_commitment_hours
            return { weeksElapsed, progressPercentage, expectedHours }
          }

          const internshipProgress = calculateInternshipProgress()
          const totalHours = totalMinutes / 60
          const progressRatio = totalHours / internshipProgress.expectedHours

          // RAG Status calculation
          const getRAGStatus = (ratio: number) => {
            if (ratio < 0.75) return { status: 'red', label: 'Non-compliant', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
            if (ratio < 1) return { status: 'amber', label: 'At Risk', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' }
            return { status: 'green', label: 'On Track', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' }
          }

          const ragStatus = getRAGStatus(progressRatio)

          // Supervisor review tracking
          const reviewedEntries = allEntries.filter(entry => entry.reviewed_in_supervision).length
          const reviewPercentage = totalEntries > 0 ? (reviewedEntries / totalEntries) * 100 : 0

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-6 mb-8">
                {/* Total PD Hours Logged */}
                <div className="relative group">
                  <Card className={`brand-card hover:shadow-md transition-all duration-300 ${ragStatus.border} ${ragStatus.bg}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <Clock className="h-6 w-6 text-primary" />
                        </div>
                        <Badge className={`${ragStatus.status === 'green' ? 'bg-green-500' : ragStatus.status === 'amber' ? 'bg-amber-500' : 'bg-red-500'} text-white text-xs font-semibold`}>
                          {ragStatus.label}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-textDark mb-1">
                        {formatDurationWithUnit(totalMinutes)}
                      </div>
                      <div className="text-xs font-semibold text-textDark mb-1 font-body">Total PD Hours Logged</div>
                      <div className="text-xs text-textLight mb-2">Goal: {userProfile.internship_weeks_estimate * userProfile.weekly_pd_commitment_hours}h total</div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${ragStatus.status === 'green' ? 'bg-green-500' : ragStatus.status === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(progressRatio * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-textLight mt-1">
                        {progressRatio >= 1 ? `✓ ${(progressRatio * 100).toFixed(1)}% complete` : `${(progressRatio * 100).toFixed(1)}% of expected`}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Tooltip */}
                    <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg transition-opacity duration-200 pointer-events-none z-50 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                    <div className="font-semibold mb-2">Total PD Hours Logged</div>
                    <div className="mb-2">Tracks all professional development activities completed during your internship.</div>
                    <div className="mb-2"><strong>Target:</strong> {userProfile.internship_weeks_estimate * userProfile.weekly_pd_commitment_hours} hours total ({userProfile.weekly_pd_commitment_hours}h/week × {userProfile.internship_weeks_estimate} weeks)</div>
                    <div className="mb-2"><strong>Current:</strong> {formatDurationWithUnit(totalMinutes)} logged</div>
                    <div className="mb-2"><strong>Status:</strong> {ragStatus.label} ({(progressRatio * 100).toFixed(1)}% of expected)</div>
                    <div className="text-xs text-gray-300">
                      <strong>Calculation:</strong> Total PD minutes ÷ 60 = hours logged
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>

                {/* Expected Hours to Date */}
                <div className="relative group">
                  <Card className="brand-card hover:shadow-md transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-12 w-12 bg-secondary/10 rounded-full flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-secondary" />
                        </div>
                        <Badge variant="outline" className="text-secondary border-secondary text-xs font-semibold">
                          Expected
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-textDark mb-1">
                        {internshipProgress.expectedHours.toFixed(1)}h
                      </div>
                      <div className="text-xs font-semibold text-textDark mb-1 font-body">Expected Hours to Date</div>
                      <div className="text-xs text-textLight mb-2">Based on {userProfile.weekly_pd_commitment_hours}h/week commitment</div>
                      <div className="text-xs text-textLight">
                        {internshipProgress.weeksElapsed} weeks elapsed ({internshipProgress.progressPercentage.toFixed(1)}% of internship)
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Tooltip */}
                    <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg transition-opacity duration-200 pointer-events-none z-50 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                    <div className="font-semibold mb-2">Expected Hours to Date</div>
                    <div className="mb-2">Calculates how many PD hours you should have completed based on your weekly commitment and internship progress.</div>
                    <div className="mb-2"><strong>Weekly Commitment:</strong> {userProfile.weekly_pd_commitment_hours} hours per week</div>
                    <div className="mb-2"><strong>Weeks Elapsed:</strong> {internshipProgress.weeksElapsed} weeks since internship start</div>
                    <div className="mb-2"><strong>Expected Total:</strong> {internshipProgress.expectedHours.toFixed(1)} hours to date</div>
                    <div className="mb-2"><strong>Internship Progress:</strong> {(internshipProgress.progressPercentage * 100).toFixed(1)}% complete</div>
                    <div className="text-xs text-gray-300">
                      <strong>Calculation:</strong> Weeks elapsed × Weekly commitment = Expected hours
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>

                {/* Progress Ratio */}
                <div className="relative group">
                  <Card className="brand-card hover:shadow-md transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center">
                          <Target className="h-6 w-6 text-accent" />
                        </div>
                        <Badge className={`${ragStatus.status === 'green' ? 'bg-green-500' : ragStatus.status === 'amber' ? 'bg-amber-500' : 'bg-red-500'} text-white text-xs font-semibold`}>
                          {progressRatio.toFixed(2)}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-textDark mb-1">
                        {(progressRatio * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs font-semibold text-textDark mb-1 font-body">Progress Ratio</div>
                      <div className="text-xs text-textLight mb-2">Actual vs Expected Hours</div>
                      <div className="text-xs text-textLight">
                        {progressRatio >= 1 ? '✓ Meeting target' : `${((1 - progressRatio) * 100).toFixed(1)}% behind schedule`}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Tooltip */}
                    <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg transition-opacity duration-200 pointer-events-none z-50 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                    <div className="font-semibold mb-2">Progress Ratio</div>
                    <div className="mb-2">Compares your actual PD hours logged against the expected hours based on your internship timeline.</div>
                    <div className="mb-2"><strong>Actual Hours:</strong> {formatDurationWithUnit(totalMinutes)} logged</div>
                    <div className="mb-2"><strong>Expected Hours:</strong> {internshipProgress.expectedHours.toFixed(1)} hours to date</div>
                    <div className="mb-2"><strong>Ratio:</strong> {progressRatio.toFixed(2)} ({(progressRatio * 100).toFixed(0)}%)</div>
                    <div className="mb-2"><strong>Status:</strong> {progressRatio >= 1 ? '✓ Meeting target' : `${((1 - progressRatio) * 100).toFixed(1)}% behind schedule`}</div>
                    <div className="text-xs text-gray-300">
                      <strong>Calculation:</strong> Actual hours ÷ Expected hours = Progress ratio
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>

                {/* RAG Status */}
                <div className="relative group">
                  <Card className={`brand-card hover:shadow-md transition-all duration-300 ${ragStatus.border} ${ragStatus.bg}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-12 w-12 bg-purple-500/10 rounded-full flex items-center justify-center">
                          <div className={`h-6 w-6 rounded-full ${ragStatus.status === 'green' ? 'bg-green-500' : ragStatus.status === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                        </div>
                        <Badge className={`${ragStatus.status === 'green' ? 'bg-green-500' : ragStatus.status === 'amber' ? 'bg-amber-500' : 'bg-red-500'} text-white text-xs font-semibold`}>
                          {ragStatus.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-textDark mb-1">
                        {ragStatus.label}
                      </div>
                      <div className="text-xs font-semibold text-textDark mb-1 font-body">Compliance Status</div>
                      <div className="text-xs text-textLight mb-2">Real-time monitoring</div>
                      <div className="text-xs text-textLight">
                        {ragStatus.status === 'green' ? '✓ All requirements met' : 
                         ragStatus.status === 'amber' ? '⚠ Close to target' : 
                         '⚠ Needs attention'}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Tooltip */}
                    <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg transition-opacity duration-200 pointer-events-none z-50 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                    <div className="font-semibold mb-2">Compliance Status</div>
                    <div className="mb-2">Real-time monitoring of your PD progress against internship requirements.</div>
                    <div className="mb-2"><strong>Current Status:</strong> {ragStatus.label}</div>
                    <div className="mb-2"><strong>Progress Ratio:</strong> {progressRatio.toFixed(2)} ({(progressRatio * 100).toFixed(0)}%)</div>
                    <div className="mb-2"><strong>Thresholds:</strong></div>
                    <div className="ml-2 text-xs text-gray-300">
                      • <span className="text-green-400">Green:</span> ≥100% (On Track)<br/>
                      • <span className="text-amber-400">Amber:</span> 75-99% (At Risk)<br/>
                      • <span className="text-red-400">Red:</span> &lt;75% (Non-compliant)
                    </div>
                    <div className="mb-2"><strong>Message:</strong> {ragStatus.status === 'green' ? '✓ All requirements met' : ragStatus.status === 'amber' ? '⚠ Close to target' : '⚠ Needs attention'}</div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>

                {/* Supervisor Reviews */}
                <div className="relative group">
                  <Card className="brand-card hover:shadow-md transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                          <Eye className="h-6 w-6 text-blue-600" />
                        </div>
                        <Badge variant="outline" className="text-blue-600 border-blue-600 text-xs font-semibold">
                          {reviewPercentage.toFixed(0)}%
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-textDark mb-1">
                        {reviewedEntries}/{totalEntries}
                      </div>
                      <div className="text-xs font-semibold text-textDark mb-1 font-body">Supervisor Reviews</div>
                      <div className="text-xs text-textLight mb-2">Target: ≥75% reviewed</div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${reviewPercentage >= 75 ? 'bg-green-500' : reviewPercentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(reviewPercentage, 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-textLight mt-1">
                        {reviewPercentage >= 75 ? '✓ Target met' : `${(75 - reviewPercentage).toFixed(1)}% to target`}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Tooltip */}
                    <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg transition-opacity duration-200 pointer-events-none z-50 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                    <div className="font-semibold mb-2">Supervisor Reviews</div>
                    <div className="mb-2">Tracks how many of your PD entries have been reviewed and discussed with your supervisor.</div>
                    <div className="mb-2"><strong>Reviewed Entries:</strong> {reviewedEntries} out of {totalEntries} total</div>
                    <div className="mb-2"><strong>Review Percentage:</strong> {reviewPercentage.toFixed(1)}%</div>
                    <div className="mb-2"><strong>Target:</strong> ≥75% of entries reviewed</div>
                    <div className="mb-2"><strong>Status:</strong> {reviewPercentage >= 75 ? '✓ Target met' : `${(75 - reviewPercentage).toFixed(1)}% to target`}</div>
                    <div className="text-xs text-gray-300">
                      <strong>Importance:</strong> Supervisor review ensures quality and learning from PD activities
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>

                {/* Active Learning */}
                <div className="relative group">
                  <Card className="brand-card hover:shadow-md transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-12 w-12 bg-green-500/10 rounded-full flex items-center justify-center">
                          <BookOpen className="h-6 w-6 text-green-600" />
                        </div>
                        <Badge variant="outline" className="text-green-600 border-green-600 text-xs font-semibold">
                          Active
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-textDark mb-1">
                        {formatDurationWithUnit(activeMinutes)}
                      </div>
                      <div className="text-xs font-semibold text-textDark mb-1 font-body">Active Learning</div>
                      <div className="text-xs text-textLight mb-2">of {formatDurationWithUnit(totalMinutes)} total</div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-500 bg-green-500"
                          style={{ width: `${totalMinutes > 0 ? (activeMinutes / totalMinutes) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-textLight mt-1">
                        {totalMinutes > 0 ? `${((activeMinutes / totalMinutes) * 100).toFixed(1)}% active learning` : 'No entries yet'}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Tooltip */}
                  <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg transition-opacity duration-200 pointer-events-none z-50 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                    <div className="font-semibold mb-2">Active Learning Hours</div>
                    <div className="mb-2">Tracks time spent in active learning activities that directly contribute to professional development.</div>
                    <div className="mb-2"><strong>Active Learning:</strong> {formatDurationWithUnit(activeMinutes)} hours</div>
                    <div className="mb-2"><strong>Total PD Hours:</strong> {formatDurationWithUnit(totalMinutes)} hours</div>
                    <div className="mb-2"><strong>Active Learning Ratio:</strong> {totalMinutes > 0 ? `${((activeMinutes / totalMinutes) * 100).toFixed(1)}%` : '0%'}</div>
                    <div className="text-xs text-gray-300">
                      <strong>Definition:</strong> Active learning includes workshops, courses, conferences, and hands-on training
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>

                {/* Competencies Covered */}
                <div className="relative group">
                  <Card className="brand-card hover:shadow-md transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-12 w-12 bg-purple-500/10 rounded-full flex items-center justify-center">
                          <BarChart3 className="h-6 w-6 text-purple-600" />
                        </div>
                        <Badge variant="outline" className="text-purple-600 border-purple-600 text-xs font-semibold">
                          {uniqueCompetencies}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-textDark mb-1">
                        {uniqueCompetencies}
                      </div>
                      <div className="text-xs font-semibold text-textDark mb-1 font-body">Competencies Covered</div>
                      <div className="text-xs text-textLight mb-2">unique areas</div>
                      <div className="text-xs text-textLight">
                        {uniqueCompetencies > 0 ? '✓ Building competency portfolio' : 'No competencies logged yet'}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Tooltip */}
                  <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg transition-opacity duration-200 pointer-events-none z-50 ${showTooltips ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                    <div className="font-semibold mb-2">Competencies Covered</div>
                    <div className="mb-2">Tracks the number of unique competency areas you've developed through your PD activities.</div>
                    <div className="mb-2"><strong>Unique Competencies:</strong> {uniqueCompetencies} different areas</div>
                    <div className="mb-2"><strong>Total PD Entries:</strong> {totalEntries} activities logged</div>
                    <div className="mb-2"><strong>Competency Diversity:</strong> {uniqueCompetencies > 0 ? 'Building a well-rounded skill set' : 'Start logging activities to build competencies'}</div>
                    <div className="text-xs text-gray-300">
                      <strong>Importance:</strong> Diverse competencies demonstrate comprehensive professional development
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
            </div>

            </>
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
                  <p className="text-sm text-textLight font-body">Refine your PD entries</p>
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
                  {activityType && activityType !== 'all' && (
                    <Badge variant="secondary" className="bg-secondary/10 text-secondary">
                      Type: {activityType.replace('_', ' ')}
                      <button onClick={() => setActivityType('all')} className="ml-2 hover:bg-secondary/20 rounded-full p-0.5">
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
                  {competencyFilter.map((comp, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-secondary/10 text-secondary">
                      Competency: {comp}
                      <button onClick={() => setCompetencyFilter(prev => prev.filter(c => c !== comp))} className="ml-2 hover:bg-secondary/20 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {reviewedFilter !== 'all' && (
                    <Badge variant="secondary" className="bg-accent/10 text-accent">
                      Review: {reviewedFilter === 'reviewed' ? 'Reviewed' : 'Not Reviewed'}
                      <button onClick={() => setReviewedFilter('all')} className="ml-2 hover:bg-accent/20 rounded-full p-0.5">
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
              
              {/* Activity Type */}
              <div>
                <label className="block text-sm font-medium mb-1">Activity Type</label>
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="WORKSHOP">Workshop</SelectItem>
                    <SelectItem value="WEBINAR">Webinar</SelectItem>
                    <SelectItem value="LECTURE">Lecture</SelectItem>
                    <SelectItem value="PRESENTATION">Presentation</SelectItem>
                    <SelectItem value="READING">Reading</SelectItem>
                    <SelectItem value="COURSE">Course</SelectItem>
                    <SelectItem value="CONFERENCE">Conference</SelectItem>
                    <SelectItem value="TRAINING">Training</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
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
            </div>

            {/* Additional PD-specific filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Competency Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">Competency Tags</label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {competencyFilter.map((comp, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-primary/10 text-primary">
                        {comp}
                        <button 
                          onClick={() => setCompetencyFilter(prev => prev.filter(c => c !== comp))} 
                          className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <Select onValueChange={(value) => {
                    if (value && !competencyFilter.includes(value)) {
                      setCompetencyFilter(prev => [...prev, value])
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add competency filter..." />
                    </SelectTrigger>
                    <SelectContent>
                      {competencies
                        .filter(comp => !competencyFilter.includes(comp.name))
                        .map(comp => (
                          <SelectItem key={comp.id} value={comp.name}>
                            {comp.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
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
                      <SelectItem value="activity">Activity Type (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
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
                  placeholder="Search activities, topics, or details..."
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
          {groupByWeek ? (
            // Grouped by week display
            getPaginatedGroups(getGroupedEntries()).map((group) => (
              <div key={group.weekStart} className="space-y-4">
                {/* Week Header */}
                <div 
                  className="bg-green-50 border border-green-200 rounded-lg p-4 cursor-pointer hover:bg-green-100 transition-colors duration-200"
                  onClick={() => toggleWeekExpansion(group.weekStart)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-green-600" />
                      <div>
                        <h3 className="text-lg font-semibold text-green-700">
                          Week Starting {formatDateDDMMYYYY(group.weekStart)}
                        </h3>
                        <p className="text-sm text-green-600">
                          {group.entries.length} {group.entries.length === 1 ? 'activity' : 'activities'}
                        </p>
                  </div>
                </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-700">
                          {formatDurationWithUnit(group.entries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0))}
                </div>
                        <div className="text-xs text-green-600">Total Duration</div>
                      </div>
                      {expandedWeeks.has(group.weekStart) ? (
                        <ChevronUp className="h-5 w-5 text-green-600" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Week Entries */}
                {expandedWeeks.has(group.weekStart) && (
                  <div className="space-y-3">
                    {group.entries.map((entry) => (
                      <Card key={entry.id} className="group relative brand-card hover:shadow-md transition-all duration-300">
                        <CardContent className="p-4 pr-32">
                            {/* Entry Type and Status Identification */}
                            <div className="mb-3 flex gap-2 flex-wrap">
                              <Badge className="bg-orange-100 text-orange-800 border-orange-200 font-semibold">
                                PD - Professional Development
                              </Badge>
                              {entry.locked && (
                                <Badge className="bg-red-100 text-red-800 border-red-200 font-semibold">
                                  🔒 Locked
                                </Badge>
                              )}
                            </div>

                            {/* Action Buttons - Top Right */}
                            <div className="absolute top-4 right-4 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleEntryExpansion(entry.id.toString())}
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
                                title={entry.locked ? "Locked - Cannot Edit" : "Edit"}
                                disabled={entry.locked}
                                className={`h-9 w-9 p-0 bg-bgCard/95 backdrop-blur-sm shadow-sm hover:shadow-md border-border rounded-lg ${
                                  entry.locked ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              >
                                <Edit className="h-4 w-4 text-textDark" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(entry)}
                                title={entry.locked ? "Locked - Cannot Delete" : "Delete"}
                                disabled={entry.locked}
                                className={`h-9 w-9 p-0 text-accent hover:text-accent hover:bg-accent/10 bg-bgCard/95 backdrop-blur-sm shadow-sm hover:shadow-md border-accent/20 rounded-lg ${
                                  entry.locked ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                            {/* Row 1: Basic Info */}
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-sm font-medium text-gray-700 break-words">
                                {formatDateDDMMYYYY(entry.date_of_activity)}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-sm font-medium text-gray-700">
                                {formatDurationDisplay(entry.duration_minutes)}
                              </span>
                              <Badge variant={entry.is_active_activity ? "default" : "secondary"} className="text-xs">
                                {entry.is_active_activity ? 'Active' : 'Passive'}
                              </Badge>
                              {entry.reviewed_in_supervision && (
                                <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                                  ✓ Reviewed
                                </Badge>
                              )}
                            </div>
                            
                            {/* Row 2: Activity Type */}
                            <div className="flex items-center gap-2 lg:col-span-2 xl:col-span-3">
                              <BookOpen className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <Badge variant="outline" className="text-xs">
                                {entry.activity_type}
                              </Badge>
                            </div>
                          </div>


                          {/* Expanded Details */}
                          {expandedEntries.has(entry.id.toString()) && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-2">Session Details</h4>
                                  <div className="space-y-2 text-sm">
                                    <div><span className="font-medium">Date:</span> {formatDateDDMMYYYY(entry.date_of_activity)}</div>
                                    <div><span className="font-medium">Duration:</span> {formatDurationDisplay(entry.duration_minutes)}</div>
                                    <div><span className="font-medium">Type:</span> {entry.activity_type}</div>
                                    <div><span className="font-medium">Active:</span> {entry.is_active_activity ? 'Yes' : 'No'}</div>
                                    <div><span className="font-medium">Reviewed:</span> {entry.reviewed_in_supervision ? 'Yes' : 'No'}</div>
                                    {entry.activity_details && (
                                      <div><span className="font-medium">Details:</span> {entry.activity_details}</div>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-2">Learning Content</h4>
                                  <div className="space-y-2 text-sm">
                                    {entry.topics_covered && (
                                      <div><span className="font-medium">Topics:</span> {entry.topics_covered}</div>
                                    )}
                                    {entry.competencies_covered.length > 0 && (
                                      <div>
                                        <span className="font-medium">Competencies:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {entry.competencies_covered.map((comp, idx) => (
                                            <Badge key={idx} variant="outline" className="text-xs">
                                              {comp}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {entry.reflection && (
                                      <div className="mt-3">
                                        <span className="font-medium">Reflection:</span>
                                        <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-2 rounded mt-1">
                                          {entry.reflection}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            // Individual entries display
            getPaginatedEntries(sortEntries(filteredEntries)).map((entry) => (
              <Card key={entry.id} className="brand-card hover:shadow-md transition-all duration-300">
                <CardContent className="p-4 pr-32">
                  {/* Entry Type and Status Identification */}
                  <div className="mb-3 flex gap-2 flex-wrap">
                    <Badge className="bg-orange-100 text-orange-800 border-orange-200 font-semibold">
                      PD - Professional Development
                    </Badge>
                    {entry.locked && (
                      <Badge className="bg-red-100 text-red-800 border-red-200 font-semibold">
                        🔒 Locked
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    {/* Row 1: Basic Info */}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700 break-words">
                        {formatDateDDMMYYYY(entry.date_of_activity)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700">
                        {formatDurationDisplay(entry.duration_minutes)}
                      </span>
                      <Badge variant={entry.is_active_activity ? "default" : "secondary"} className="text-xs">
                        {entry.is_active_activity ? 'Active' : 'Passive'}
                      </Badge>
                      {entry.reviewed_in_supervision && (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                          ✓ Reviewed
                        </Badge>
                      )}
                    </div>
                    
                    {/* Row 2: Activity Type */}
                    <div className="flex items-center gap-2 lg:col-span-2 xl:col-span-3">
                      <BookOpen className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <Badge variant="outline" className="text-xs">
                        {entry.activity_type}
                      </Badge>
                    </div>
                  </div>


                  {/* Expanded Details */}
                  {expandedEntries.has(entry.id.toString()) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Session Details</h4>
                          <div className="space-y-2 text-sm">
                            <div><span className="font-medium">Date:</span> {formatDateDDMMYYYY(entry.date_of_activity)}</div>
                            <div><span className="font-medium">Duration:</span> {formatDurationDisplay(entry.duration_minutes)}</div>
                            <div><span className="font-medium">Type:</span> {entry.activity_type}</div>
                            <div><span className="font-medium">Active:</span> {entry.is_active_activity ? 'Yes' : 'No'}</div>
                            <div><span className="font-medium">Reviewed:</span> {entry.reviewed_in_supervision ? 'Yes' : 'No'}</div>
                            {entry.activity_details && (
                              <div><span className="font-medium">Details:</span> {entry.activity_details}</div>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Learning Content</h4>
                          <div className="space-y-2 text-sm">
                            {entry.topics_covered && (
                              <div><span className="font-medium">Topics:</span> {entry.topics_covered}</div>
                            )}
                            {entry.competencies_covered.length > 0 && (
                              <div>
                                <span className="font-medium">Competencies:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {entry.competencies_covered.map((comp, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {comp}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {entry.reflection && (
                              <div className="mt-3">
                                <span className="font-medium">Reflection:</span>
                                <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-2 rounded mt-1">
                                  {entry.reflection}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
          
          {/* No entries message */}
          {filteredEntries.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">No PD activities found</div>
              <p className="text-gray-400 text-sm">
                {hasActiveFilters 
                  ? "Try adjusting your filters or search criteria" 
                  : "Create your first professional development activity to get started"
                }
              </p>
            </div>
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

      {/* PD Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="flex-shrink-0 p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">
                    {editingEntry ? 'Edit Professional Development Activity' : 'Professional Development Activity Details'}
                  </h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ minHeight: '400px', maxHeight: '60vh' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">ACTIVITY TYPE</label>
                  <select
                    value={formData.activity_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, activity_type: e.target.value }))}
                    className="w-full p-2 border rounded"
                  >
                    {activityTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date of Activity</label>
                  <Input
                    type="date"
                    value={formData.date_of_activity}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData(prev => ({ ...prev, date_of_activity: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Duration in Minutes</label>
                  <Input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {durationQuickLinks.map(minutes => (
                      <button
                        key={minutes}
                        onClick={() => setFormData(prev => ({ ...prev, duration_minutes: minutes }))}
                        className="text-blue-600 underline text-sm hover:text-blue-800"
                      >
                        {minutes < 60 ? `${minutes} Minutes` : `${minutes / 60} Hour${minutes / 60 !== 1 ? 's' : ''}`}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Active Activity?</label>
                  <select
                    value={formData.is_active_activity ? 'YES' : 'NO'}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active_activity: e.target.value === 'YES' }))}
                    className="w-full p-2 border rounded"
                  >
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Activity Details</label>
                <textarea
                  value={formData.activity_details}
                  onChange={(e) => setFormData(prev => ({ ...prev, activity_details: e.target.value }))}
                  className="w-full p-2 border rounded h-20"
                  placeholder="E.g. name of course, presenter, institution etc"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Topics Covered by Activity</label>
                <textarea
                  value={formData.topics_covered}
                  onChange={(e) => setFormData(prev => ({ ...prev, topics_covered: e.target.value }))}
                  className="w-full p-2 border rounded h-20"
                  placeholder="E.g. behavioural interventions for ADHD in adolescents"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Competencies Covered by Activity</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('/competencies-help', '_blank')}
                    className="text-xs"
                  >
                    Help
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3 text-gray-700">Available Competencies</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 p-3 rounded-lg bg-gray-50">
                      {competencies.length === 0 ? (
                        <div className="text-gray-500 text-sm text-center py-4">
                          Loading competencies...
                        </div>
                      ) : (
                        competencies
                          .filter(comp => !formData.competencies_covered.includes(comp.name))
                          .map(comp => (
                            <div
                              key={comp.id}
                              onClick={() => toggleCompetency(comp.name)}
                              className="p-3 cursor-pointer rounded-md text-sm border border-transparent hover:border-blue-300 hover:bg-blue-50 transition-colors"
                            >
                              <div className="font-medium text-gray-800">{comp.name}</div>
                              <div className="text-xs text-gray-600 mt-1" style={{ 
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}>
                                {comp.description}
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Click on a competency to select it
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3 text-gray-700">Selected Competencies</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 p-3 rounded-lg bg-blue-50">
                      {formData.competencies_covered.length === 0 ? (
                        <div className="text-gray-500 text-sm text-center py-4">
                          No competencies selected yet
                        </div>
                      ) : (
                        formData.competencies_covered.map((comp, idx) => (
                          <div key={idx} className="p-3 bg-blue-100 text-blue-800 rounded-md text-sm border border-blue-200">
                            <div className="flex justify-between items-start">
                              <span className="font-medium flex-1">{comp}</span>
                              <button
                                onClick={() => toggleCompetency(comp)}
                                className="ml-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                title="Remove competency"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {formData.competencies_covered.length} competency(ies) selected
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Reflection</label>
                <textarea
                  value={formData.reflection}
                  onChange={(e) => setFormData(prev => ({ ...prev, reflection: e.target.value }))}
                  className="w-full p-2 border rounded h-24"
                  placeholder="Reflect on how this activity contributed to your professional development..."
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.reviewed_in_supervision}
                    onChange={(e) => setFormData(prev => ({ ...prev, reviewed_in_supervision: e.target.checked }))}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium">Reviewed with Supervisor</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">Mark this if you've discussed this PD activity with your supervisor</p>
              </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6 px-6 pb-6">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false)
                    const returnTo = (location.state as any)?.returnTo as string | undefined
                    if (returnTo) navigate(returnTo)
                  }}
                  className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {editingEntry ? 'Update Activity' : 'Create Activity'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default SectionB

