import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Eye, Edit, Plus, Trash2, Calendar, Clock, User, FileText, TrendingUp, Target, Award, Filter, X, Search, BarChart3 } from 'lucide-react'
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

interface DCCEntry {
  id: number
  client_id: string
  session_date: string
  week_starting: string
  place_of_practice: string
  presenting_issues: string
  session_activity_types: string[]
  duration_minutes: string
  reflections_on_experience: string
  entry_type: 'client_contact' | 'cra' | 'icra'
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
  const navigate = useNavigate()
  const [dccEntries, setDccEntries] = useState<DCCEntry[]>([])
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
  const [editingEntry, setEditingEntry] = useState(false)
  const [editingCRAId, setEditingCRAId] = useState<number | null>(null)
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
  
  // Filters and sorting
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'duration' | 'client'>('newest')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sessionType, setSessionType] = useState('all')
  const [durationMin, setDurationMin] = useState('')
  const [durationMax, setDurationMax] = useState('')

  useEffect(() => {
    loadDCCEntries()
  }, [pagination.current_page, pagination.records_per_page, sortBy, dateFrom, dateTo, sessionType, durationMin, durationMax])

  const loadDCCEntries = async () => {
    setLoading(true)
    try {
      // For now, we'll use the existing API and filter on frontend
      // TODO: Update backend to support pagination and filtering
      const allEntries = await getSectionAEntries()
      
      // Filter for DCC entries only
      let filteredEntries = allEntries.filter(entry => entry.entry_type === 'client_contact')
      
      // Apply filters
      if (dateFrom) {
        filteredEntries = filteredEntries.filter(entry => entry.session_date >= dateFrom)
      }
      if (dateTo) {
        filteredEntries = filteredEntries.filter(entry => entry.session_date <= dateTo)
      }
      if (sessionType && sessionType !== 'all') {
        filteredEntries = filteredEntries.filter(entry => 
          entry.session_activity_types.includes(sessionType)
        )
      }
      if (durationMin) {
        filteredEntries = filteredEntries.filter(entry => 
          parseInt(entry.duration_minutes) >= parseInt(durationMin)
        )
      }
      if (durationMax) {
        filteredEntries = filteredEntries.filter(entry => 
          parseInt(entry.duration_minutes) <= parseInt(durationMax)
        )
      }
      
      // Apply sorting
      filteredEntries.sort((a, b) => {
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

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, current_page: page }))
  }

  const handleRecordsPerPageChange = (recordsPerPage: number) => {
    setPagination(prev => ({ ...prev, records_per_page: recordsPerPage, current_page: 1 }))
  }

  const handleViewDetails = (entry: DCCEntry) => {
    setSelectedEntry(entry)
    // TODO: Navigate to detailed view or open modal
  }

  const handleEdit = (entry: DCCEntry) => {
    console.log('Edit button clicked for entry:', entry.id)
    console.log('Navigating to:', `/section-a/edit/${entry.id}`)
    navigate(`/section-a/edit/${entry.id}`)
  }

  const handleAddCRA = (entry: DCCEntry) => {
    setSelectedEntry(entry)
    setCraFormData({
      client_id: entry.client_id,
      client_pseudonym: entry.client_id, // Default to same as client_id for consistency
      session_date: entry.session_date,
      place_of_practice: '',
      presenting_issues: '',
      session_activity_types: [],
      duration_minutes: '50',
      reflections_on_experience: '',
      simulated: false
    })
    setShowCRAForm(true)
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

  const formatDuration = (minutes: string) => {
    const mins = parseInt(minutes)
    if (mins >= 60) {
      const hours = Math.floor(mins / 60)
      const remainingMins = mins % 60
      return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
    }
    return `${mins}m`
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setSessionType('all')
    setDurationMin('')
    setDurationMax('')
    setPagination(prev => ({ ...prev, current_page: 1 }))
  }

  const hasActiveFilters = dateFrom || dateTo || (sessionType && sessionType !== 'all') || durationMin || durationMax

  return (
    <div className="min-h-screen bg-bgSection">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section - PsychPathway Brand */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-primary to-primary/90 rounded-card p-8 text-white shadow-md">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="text-4xl font-headings mb-2">Section A: Direct Client Contact</h1>
                <p className="text-white/90 text-lg font-body">Track your client interactions and build your professional portfolio</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => navigate('/section-a/create')}
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 font-semibold shadow-sm rounded-lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  New DCC Entry
                </Button>
                <Button 
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white hover:text-primary font-semibold rounded-lg"
                >
                  <BarChart3 className="h-5 w-5 mr-2" />
                  View Reports
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Cards */}
        {(() => {
          const totalEntries = dccEntries.length
          const totalHours = dccEntries.reduce((sum, entry) => sum + (parseInt(entry.duration_minutes) || 0), 0) / 60
          const uniqueClients = new Set(dccEntries.map(entry => entry.client_id)).size
          const simulatedHours = dccEntries.filter(entry => entry.simulated).reduce((sum, entry) => sum + (parseInt(entry.duration_minutes) || 0), 0) / 60

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
                      <p className="text-3xl font-bold text-secondary">{totalHours.toFixed(1)}h</p>
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
                      <p className="text-3xl font-bold text-primary">{simulatedHours.toFixed(1)}h</p>
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

        {/* Hours Summary */}
        {(() => {
          // Calculate hours summary
          let totalDccHours = 0
          let totalCRAHours = 0
          let simulatedDccHours = 0

          dccEntries.forEach(entry => {
            const entryHours = parseInt(entry.duration_minutes) / 60
            
            if (entry.entry_type === 'client_contact') {
              totalDccHours += entryHours
              if (entry.simulated) {
                simulatedDccHours += entryHours
              }
            } else if (entry.entry_type === 'cra') {
              totalCRAHours += entryHours
            }

            // Add CRA hours from nested entries
            if (entry.cra_entries) {
              entry.cra_entries.forEach(craEntry => {
                const craHours = parseInt(craEntry.duration_minutes) / 60
                totalCRAHours += craHours
              })
            }
          })

          // AHPRA 5+1 Requirements (assuming provisional/intern role)
          const dccMinimum = 500 // hours
          const simulatedMaximum = 60 // hours
          const practiceHoursTotal = 1360 // hours (DCC + CRA combined)
          
          const remainingDcc = Math.max(0, dccMinimum - totalDccHours)
          const remainingPractice = Math.max(0, practiceHoursTotal - (totalDccHours + totalCRAHours))
          const simulatedOverflow = Math.max(0, simulatedDccHours - simulatedMaximum)

              const progressPercentage = Math.min((totalDccHours + totalCRAHours) / 1360 * 100, 100)
              
              return (
                <Card className="mb-6 brand-card">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                        <Award className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-headings text-textDark">AHPRA 5+1 Program Progress</h2>
                        <p className="text-textLight font-body text-sm">Track your internship requirements</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {/* DCC Hours */}
                      <div className="text-center p-4 bg-bgCard rounded-lg border border-border hover:shadow-sm transition-all duration-300">
                        <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center mx-auto mb-2">
                          <Target className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-2xl font-bold text-textDark mb-1">
                          {totalDccHours.toFixed(1)}h
                        </div>
                        <div className="text-xs font-semibold text-textDark mb-1 font-body">Direct Client Contact</div>
                        <div className="text-xs text-textLight mb-2">Target: 500h</div>
                        {remainingDcc > 0 ? (
                          <Badge variant="outline" className="text-accent border-accent text-xs font-semibold">
                            {remainingDcc.toFixed(1)}h remaining
                          </Badge>
                        ) : (
                          <Badge className="bg-secondary text-white border-secondary text-xs font-semibold">
                            ✓ Met
                          </Badge>
                        )}
                        {simulatedDccHours > 0 && (
                          <div className="mt-2 p-1 bg-primary/10 rounded text-xs border border-primary/20">
                            <div className="font-semibold text-primary">
                              {simulatedDccHours.toFixed(1)}h simulated
                            </div>
                            {simulatedOverflow > 0 && (
                              <div className="text-accent font-semibold">
                                +{simulatedOverflow.toFixed(1)}h over
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* CRA Hours */}
                      <div className="text-center p-4 bg-bgCard rounded-lg border border-border hover:shadow-sm transition-all duration-300">
                        <div className="h-10 w-10 bg-secondary rounded-full flex items-center justify-center mx-auto mb-2">
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-2xl font-bold text-textDark mb-1">
                          {totalCRAHours.toFixed(1)}h
                        </div>
                        <div className="text-xs font-semibold text-textDark mb-1 font-body">Client Related Activities</div>
                        <div className="text-xs text-textLight mb-2">(includes ICRA)</div>
                        <Badge variant="outline" className="text-secondary border-secondary text-xs font-semibold">
                          Supporting DCC
                        </Badge>
                      </div>

                      {/* Total Practice Hours */}
                      <div className="text-center p-4 bg-bgCard rounded-lg border border-border hover:shadow-sm transition-all duration-300">
                        <div className="h-10 w-10 bg-accent rounded-full flex items-center justify-center mx-auto mb-2">
                          <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-2xl font-bold text-textDark mb-1">
                          {(totalDccHours + totalCRAHours).toFixed(1)}h
                        </div>
                        <div className="text-xs font-semibold text-textDark mb-1 font-body">Total Practice Hours</div>
                        <div className="text-xs text-textLight mb-2">Target: 1,360h</div>
                        {remainingPractice > 0 ? (
                          <Badge variant="outline" className="text-accent border-accent text-xs font-semibold">
                            {remainingPractice.toFixed(1)}h remaining
                          </Badge>
                        ) : (
                          <Badge className="bg-secondary text-white border-secondary text-xs font-semibold">
                            ✓ Met
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Compact Progress Bar */}
                    <div className="bg-bgCard p-4 rounded-lg border border-border">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-textDark font-body">Overall Progress</span>
                        <span className="text-lg font-bold text-primary">{progressPercentage.toFixed(1)}%</span>
                      </div>
                      <div className="relative">
                        <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-primary via-secondary to-accent h-2 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progressPercentage}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-textLight mt-1">
                          <span>0h</span>
                          <span className="font-medium">1,360h target</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
        })()}

        {/* Enhanced Filters and Controls */}
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
                      From: {new Date(dateFrom).toLocaleDateString()}
                      <button onClick={() => setDateFrom('')} className="ml-2 hover:bg-primary/20 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {dateTo && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      To: {new Date(dateTo).toLocaleDateString()}
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
                </>
              )}
            </div>
          </CardHeader>
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
            </div>
            
            {/* Sort and Pagination Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4">
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
            {dccEntries.map((entry, index) => {
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
                      title="View Details"
                      className="h-9 w-9 p-0 bg-bgCard/95 backdrop-blur-sm shadow-sm hover:shadow-md border-border rounded-lg"
                    >
                      <Eye className="h-4 w-4 text-textDark" />
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                      {/* Row 1: Basic Info */}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-700 break-words">
                          {new Date(entry.session_date).toLocaleDateString()}
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
                      client_id: selectedEntry.client_id,
                      session_date: selectedEntry.session_date,
                      week_starting: selectedEntry.week_starting
                    }
                    await createSectionAEntry(craData)
                  }
                  setShowCRAForm(false)
                  setSelectedEntry(null)
                  loadDCCEntries()
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
              handleAddCustomActivityType={() => {}}
              newCustomActivityType=""
              setNewCustomActivityType={() => {}}
              customActivityTypes={[]}
              handleDeleteCustomActivityType={() => {}}
              calculateWeekStarting={(date: string) => date}
              title={selectedEntry?.parent_dcc_entry ? "Edit Client Related Activity (CRA)" : "Add Client Related Activity (CRA)"}
              showClientIdInput={true}
              isEditing={!!selectedEntry?.parent_dcc_entry}
            />
          </div>
        </div>
      )}
    </div>
  )
}
