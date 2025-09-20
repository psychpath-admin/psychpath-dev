import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Eye, Edit, Plus, Trash2, Calendar, Clock, User, FileText } from 'lucide-react'
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Section A: Direct Client Contact</h1>
          <p className="text-gray-600">Manage your direct client contact records and related activities</p>
        </div>

        {/* Filters and Controls */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <CardTitle className="text-lg">Filters & Controls</CardTitle>
              <div className="flex gap-2">
                <Button onClick={() => navigate('/section-a/create')} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New DCC Entry
                </Button>
                {hasActiveFilters && (
                  <Button onClick={clearFilters} variant="outline" size="sm">
                    Clear Filters
                  </Button>
                )}
              </div>
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

        {/* DCC Cards */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : dccEntries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No DCC Records Found</h3>
              <p className="text-gray-500 text-center mb-4">
                {hasActiveFilters 
                  ? "No records match your current filters. Try adjusting your search criteria."
                  : "You haven't created any Direct Client Contact records yet."
                }
              </p>
              <Button onClick={() => setShowEntryForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First DCC Entry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {dccEntries.map((entry, index) => {
              // Create subtle color variations
              const colorVariations = [
                'bg-white border-blue-200 hover:border-blue-300',
                'bg-blue-50 border-blue-100 hover:border-blue-200',
                'bg-green-50 border-green-100 hover:border-green-200',
                'bg-purple-50 border-purple-100 hover:border-purple-200',
                'bg-orange-50 border-orange-100 hover:border-orange-200',
                'bg-pink-50 border-pink-100 hover:border-pink-200',
                'bg-indigo-50 border-indigo-100 hover:border-indigo-200',
                'bg-teal-50 border-teal-100 hover:border-teal-200',
                'bg-rose-50 border-rose-100 hover:border-rose-200',
                'bg-cyan-50 border-cyan-100 hover:border-cyan-200'
              ]
              const cardColorClass = colorVariations[index % colorVariations.length]
              
              return (
                <Card key={entry.id} className={`hover:shadow-lg transition-all duration-200 relative ${cardColorClass}`}>
                  {/* Action buttons in top right corner */}
                  <div className="absolute top-4 right-4 flex gap-1 z-10">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(entry)}
                      title="View Details"
                      className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(entry)}
                      title="Edit"
                      className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddCRA(entry)}
                      title="Add CRA"
                      className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(entry)}
                      title="Delete"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 bg-white/90 backdrop-blur-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <CardContent className="p-6 pr-32">
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
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
                      
                      {/* CRA Count */}
                      {entry.cra_entries && entry.cra_entries.length > 0 && (
                        <div className="lg:col-span-1">
                          <Badge variant="secondary" className="text-xs">
                            {entry.cra_entries.length} CRA
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  {/* Nested CRA Entries */}
                  {entry.cra_entries && entry.cra_entries.length > 0 && (
                    <div className="px-6 pb-6">
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">
                          Client Related Activities ({entry.cra_entries.length})
                        </h4>
                        <div className="space-y-3">
                          {entry.cra_entries.map((craEntry) => (
                            <Card key={craEntry.id} className="bg-gray-50 border-gray-200 ml-4 relative">
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

                              <CardContent className="p-4 pr-16">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-3 w-3 text-gray-500" />
                                    <span className="text-xs font-medium text-gray-600">
                                      {formatDuration(parseInt(craEntry.duration_minutes))}
                                    </span>
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-1">
                                    {craEntry.session_activity_types.map((type, typeIndex) => (
                                      <Badge key={typeIndex} variant="outline" className="text-xs">
                                        {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                      </Badge>
                                    ))}
                                  </div>
                                  
                                  <div className="md:col-span-2">
                                    <span className="text-xs text-gray-600">
                                      {craEntry.place_of_practice}
                                    </span>
                                  </div>
                                  
                                  {craEntry.presenting_issues && (
                                    <div className="md:col-span-2">
                                      <p className="text-xs text-gray-700 break-words">
                                        {truncateText(craEntry.presenting_issues, 80)}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {craEntry.reflections_on_experience && (
                                    <div className="md:col-span-2">
                                      <p className="text-xs text-gray-600 italic break-words">
                                        "{truncateText(craEntry.reflections_on_experience, 100)}"
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
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
              showClientIdInput={false}
            />
          </div>
        </div>
      )}
    </div>
  )
}
