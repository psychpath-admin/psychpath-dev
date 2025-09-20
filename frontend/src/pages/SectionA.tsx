import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CRAForm from '@/components/CRAForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LogbookEntryValidator } from '@/components/LogbookEntryValidator'
import { useInternshipValidation } from '@/hooks/useInternshipValidation'
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

interface SectionAEntry {
  id: number
  client_id: string
  session_date: string
  week_starting: string
  place_of_practice: string
  client_age: string
  presenting_issues: string
  session_activity_types: string[]
  duration_minutes: string
  reflections_on_experience: string
  entry_type: 'client_contact' | 'cra' | 'icra'
  parent_dcc_entry?: number
  cra_entries: SectionAEntry[]
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

interface CustomActivityType {
  id: number
  name: string
  trainee: number
}

export default function SectionA() {
  const [entries, setEntries] = useState<SectionAEntry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<SectionAEntry | null>(null)
  const [showEntryForm, setShowEntryForm] = useState(false)
  const [showCRAForm, setShowCRAForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState(false)
  const [editingCRAId, setEditingCRAId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'dcc' | 'cra' | 'icra'>('dcc')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'client_id' | 'session_date'>('session_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [clientSuggestions, setClientSuggestions] = useState<string[]>([])
  const [customActivityTypes, setCustomActivityTypes] = useState<CustomActivityType[]>([])
  const [showAddCustomType, setShowAddCustomType] = useState(false)
  const [newCustomActivityType, setNewCustomActivityType] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const { validateEntry } = useInternshipValidation()

  const [entryForm, setEntryForm] = useState({
    client_id: '',
    session_date: '',
    week_starting: '',
    place_of_practice: '',
    client_age: '',
    presenting_issues: '',
    session_activity_types: [] as string[],
    duration_minutes: '50',
    reflections_on_experience: '',
    entry_type: 'client_contact' as 'client_contact' | 'cra' | 'icra',
    parent_dcc_entry: undefined as number | undefined,
    simulated: false
  })

  useEffect(() => {
    loadEntries()
    loadCustomActivityTypes()
    // Listen for CRA save from popup
    const handler = (event: MessageEvent) => {
      if (event?.data?.type === 'CRA_SAVED') {
        loadEntries()
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const loadEntries = async () => {
    try {
      const data = await getSectionAEntries()
      setEntries(data)
      return data
    } catch (error) {
      console.error('Error loading entries:', error)
      // Use demo data when not authenticated
      const demoData = [
        {
          id: 1,
          client_id: 'BM-1961-M',
          session_date: '2025-01-15',
          week_starting: '2025-01-13',
          place_of_practice: 'Private Practice',
          client_age: '35',
          presenting_issues: 'Anxiety and depression',
          session_activity_types: ['evaluation', 'intervention'],
          duration_minutes: '50',
          reflections_on_experience: 'Client showed good progress in managing anxiety symptoms.',
          entry_type: 'client_contact' as const,
          parent_dcc_entry: undefined,
          cra_entries: [],
          simulated: false,
          total_sessions: 3,
          total_duration_minutes: 150,
          total_duration_display: '2h 30m',
          created_at: '2025-01-15T10:00:00Z',
          updated_at: '2025-01-15T10:00:00Z'
        }
      ]
      setEntries(demoData)
      return demoData
    }
  }

  const loadCustomActivityTypes = async () => {
    try {
      const data = await getCustomActivityTypes()
      setCustomActivityTypes(data)
    } catch (error) {
      console.error('Error loading custom activity types:', error)
      // Use empty array when not authenticated
      setCustomActivityTypes([])
    }
  }

  const calculateWeekStarting = (date: string): string => {
    if (!date) return ''
    const sessionDate = new Date(date)
    const dayOfWeek = sessionDate.getDay()
    const monday = new Date(sessionDate)
    monday.setDate(sessionDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    return monday.toISOString().split('T')[0]
  }

  const handleClientIdChange = async (value: string) => {
    setEntryForm({ ...entryForm, client_id: value })
    if (value) {
      try {
        const suggestions = await getClientAutocomplete(value)
        setClientSuggestions(suggestions)
        const lastSessionData = await getLastSessionData(value)
        if (lastSessionData) {
          setEntryForm(prev => ({
            ...prev,
            place_of_practice: lastSessionData.place_of_practice || '',
            client_age: lastSessionData.client_age || '',
            presenting_issues: lastSessionData.presenting_issues || ''
          }))
        }
      } catch (error) {
        console.error('Error loading client data:', error)
      }
    }
  }

  const handleActivityTypeToggle = (type: string) => {
    setEntryForm(prev => ({
      ...prev,
      session_activity_types: prev.session_activity_types.includes(type)
        ? prev.session_activity_types.filter(t => t !== type)
        : [...prev.session_activity_types, type]
    }))
  }

  const handleAddCustomActivityType = async () => {
    if (!newCustomActivityType.trim()) return
    try {
      const newType = await createCustomActivityType(newCustomActivityType)
      setCustomActivityTypes(prev => [...prev, newType])
      setNewCustomActivityType('')
      setShowAddCustomType(false)
    } catch (error) {
      console.error('Error adding custom activity type:', error)
    }
  }

  const handleDeleteCustomActivityType = async (id: number) => {
    try {
      await deleteCustomActivityType(id)
      setCustomActivityTypes(prev => prev.filter(type => type.id !== id))
      await loadCustomActivityTypes()
    } catch (error) {
      console.error('Error deleting custom activity type:', error)
    }
  }

  const handleCreateEntry = (tabType?: 'dcc' | 'cra' | 'icra') => {
    const currentTab = tabType || activeTab
    
    setEntryForm({
      client_id: '',
      session_date: '',
      week_starting: '',
      place_of_practice: '',
      client_age: '',
      presenting_issues: '',
      session_activity_types: [],
      duration_minutes: currentTab === 'cra' || currentTab === 'icra' ? '15' : '50',
      reflections_on_experience: '',
      entry_type: currentTab === 'cra' ? 'cra' : currentTab === 'icra' ? 'icra' : 'client_contact',
      parent_dcc_entry: currentTab === 'cra' && selectedEntry ? selectedEntry.id : undefined,
      simulated: false
    })
    
    if (currentTab === 'cra' && selectedEntry) {
      setEntryForm(prev => ({
        ...prev,
        session_date: selectedEntry.session_date,
        week_starting: selectedEntry.week_starting,
        reflections_on_experience: ''
      }))
      setShowEntryForm(false)
      setShowCRAForm(true)
    } else if (currentTab === 'icra') {
      // ICRA uses the CRA modal but is independent of a DCC
      // Auto-populate client pseudonym from selected DCC if available
      if (selectedEntry) {
        setEntryForm(prev => ({
          ...prev,
          client_id: selectedEntry.client_id
        }))
      }
      setShowEntryForm(false)
      setShowCRAForm(true)
    } else {
      setShowEntryForm(true)
    }
    setEditingEntry(false)
  }

  const handleEditEntry = (entry: SectionAEntry) => {
    setEntryForm({
      client_id: entry.client_id || '',
      session_date: entry.session_date || entry.created_at?.split('T')[0] || '',
      week_starting: entry.week_starting || '',
      place_of_practice: entry.place_of_practice || '',
      client_age: entry.client_age || '',
      presenting_issues: entry.presenting_issues || '',
      session_activity_types: entry.session_activity_types || [],
      duration_minutes: entry.duration_minutes || '50',
      reflections_on_experience: entry.reflections_on_experience || '',
      entry_type: entry.entry_type || 'client_contact',
      parent_dcc_entry: entry.parent_dcc_entry,
      simulated: entry.simulated || false
    })
    // Open the appropriate form based on entry type
    if (entry.entry_type === 'cra' || entry.entry_type === 'icra') {
      // Distinguish CRA vs ICRA by parent_dcc_entry
      if (entry.parent_dcc_entry) {
        setActiveTab('cra')
      } else {
        setActiveTab('icra')
      }
      setEditingCRAId(entry.id)
      setShowCRAForm(true)
    } else {
      setShowEntryForm(true)
    }
    setEditingEntry(true)
  }

  const handleEditCRA = (craEntry: SectionAEntry) => {
    setEntryForm({
      client_id: craEntry.client_id || '',
      session_date: craEntry.session_date || craEntry.created_at?.split('T')[0] || '',
      week_starting: craEntry.week_starting || '',
      place_of_practice: craEntry.place_of_practice || '',
      client_age: craEntry.client_age || '',
      presenting_issues: craEntry.presenting_issues || '',
      session_activity_types: craEntry.session_activity_types || [],
      duration_minutes: craEntry.duration_minutes || '15',
      reflections_on_experience: craEntry.reflections_on_experience || '',
      entry_type: 'cra',
      parent_dcc_entry: craEntry.parent_dcc_entry,
      simulated: false
    })
    setActiveTab('cra')
    setEditingEntry(true)
    setEditingCRAId(craEntry.id)
    setShowCRAForm(true)
  }

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (entryForm.session_activity_types.length === 0) {
      alert('Please select at least one session activity type')
      return
    }

    try {
      const finalEntryType: 'client_contact' | 'cra' | 'icra' = showCRAForm ? 'cra' : entryForm.entry_type
      const entryData = {
        ...entryForm,
        // For CRA linked to DCC, attach parent; for ICRA, leave undefined
        parent_dcc_entry: (activeTab === 'cra' && selectedEntry) ? selectedEntry.id : undefined,
        simulated: activeTab === 'dcc' ? entryForm.simulated : false,
        entry_type: finalEntryType === 'icra' ? 'cra' : finalEntryType
      }

      // Validate entry for internship requirements
      setIsValidating(true)
      setValidationErrors([])
      
      const validationResult = await validateEntry({
        entry_type: entryData.entry_type,
        duration_minutes: parseInt(entryData.duration_minutes) || 0,
        simulated: entryData.simulated
      })

      if (!validationResult.isValid) {
        setValidationErrors(validationResult.errors)
        setIsValidating(false)
        return
      }

      if (editingEntry) {
        if (showCRAForm && editingCRAId) {
          // Covers both CRA and ICRA (entry_type coerced to 'cra')
          await updateSectionAEntry(editingCRAId, entryData)
        } else if (selectedEntry) {
          await updateSectionAEntry(selectedEntry.id, entryData)
        }
      } else {
        await createSectionAEntry(entryData)
      }

      const updatedEntries = await loadEntries()
      if (updatedEntries) {
        setEntries(updatedEntries)
        if (activeTab === 'cra' && selectedEntry) {
          setSelectedEntry(updatedEntries.find(e => e.id === selectedEntry.id) || selectedEntry)
        }
      }

      setShowEntryForm(false)
      setShowCRAForm(false)
      setEditingCRAId(null)
      setValidationErrors([])
      setEntryForm({
        client_id: '',
        session_date: '',
        week_starting: '',
        place_of_practice: '',
        client_age: '',
        presenting_issues: '',
        session_activity_types: [],
        duration_minutes: '50',
        reflections_on_experience: '',
        entry_type: 'client_contact',
        parent_dcc_entry: undefined,
        simulated: false
      })
    } catch (error) {
      console.error('Error saving entry:', error)
    } finally {
      setIsValidating(false)
    }
  }

  const handleDeleteEntry = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        // Optimistic update: remove from UI immediately
        setEntries((prev) => prev.filter((e) => e.id !== id))
        if (selectedEntry?.id === id) setSelectedEntry(null)

        await deleteSectionAEntry(id)
        // Sync with server as a follow-up to ensure state matches backend
        await loadEntries()
      } catch (error) {
        console.error('Error deleting entry:', error)
      }
    }
  }

  const getFilteredEntries = () => {
    let filtered = entries

    if (activeTab === 'dcc') {
      filtered = entries.filter(entry => entry.entry_type === 'client_contact')
    } else if (activeTab === 'cra') {
      filtered = entries.filter(entry => 
        entry.entry_type === 'client_contact' && entry.cra_entries && entry.cra_entries.length > 0
      )
    } else if (activeTab === 'icra') {
      // ICRA are CRA entries with no parent DCC; also support possible 'icra' type
      filtered = entries.filter(entry => (entry.entry_type === 'cra' && !entry.parent_dcc_entry) || entry.entry_type === 'icra')
    }

    if (searchTerm) {
      filtered = filtered.filter(entry => 
        entry.client_id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    filtered.sort((a, b) => {
      const aValue = sortBy === 'client_id' ? a.client_id : a.session_date
      const bValue = sortBy === 'client_id' ? b.client_id : b.session_date
      
      if (sortOrder === 'asc') {
        return aValue.localeCompare(bValue)
      } else {
        return bValue.localeCompare(aValue)
      }
    })

    return filtered
  }

  const filteredEntries = getFilteredEntries()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Section A: Direct Client Contact</h1>
          <p className="text-gray-600">Manage your client contact records and related activities</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Entries List */}
          <div className="lg:col-span-1">
            <Card className="h-[600px]">
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <CardTitle>Client Records</CardTitle>
                  <Button onClick={handleCreateEntry} size="sm">
                    + New Entry
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <Input
                    placeholder="Search by client ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  
                  <div className="flex gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'client_id' | 'session_date')}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="session_date">Sort by Date</option>
                      <option value="client_id">Sort by Client ID</option>
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="overflow-y-auto">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'dcc' | 'cra' | 'icra')}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="dcc">DCC</TabsTrigger>
                    <TabsTrigger value="cra">CRA</TabsTrigger>
                    <TabsTrigger value="icra">ICRA</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="dcc" className="mt-4">
                    <div className="space-y-2">
                      {filteredEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                            selectedEntry?.id === entry.id ? 'bg-blue-50 border-blue-300' : 'border-gray-200'
                          }`}
                          onClick={() => setSelectedEntry(entry)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-sm">
                                {entry.client_id} {entry.simulated && '(Simulated)'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(entry.session_date).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {entry.total_sessions} sessions, {entry.total_duration_display}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditEntry(entry)
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteEntry(entry.id)
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="cra" className="mt-4">
                    <div className="space-y-2">
                      {filteredEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                            selectedEntry?.id === entry.id ? 'bg-blue-50 border-blue-300' : 'border-gray-200'
                          }`}
                          onClick={() => setSelectedEntry(entry)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-sm">
                                {entry.client_id}
                                {entry.cra_entries && entry.cra_entries.length > 0 && (
                                  <Badge className="ml-2 bg-green-100 text-green-800">
                                    {entry.cra_entries.length} CRA
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(entry.session_date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditEntry(entry)
                                }}
                              >
                                Edit
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="icra" className="mt-4">
                    <div className="space-y-2">
                      {filteredEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                            selectedEntry?.id === entry.id ? 'bg-blue-50 border-blue-300' : 'border-gray-200'
                          }`}
                          onClick={() => setSelectedEntry(entry)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-sm">{entry.client_id}</div>
                              <div className="text-xs text-gray-500">
                                {new Date(entry.session_date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditEntry(entry)
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteEntry(entry.id)
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Entry Details */}
          <div className="lg:col-span-2">
            {selectedEntry ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Entry Details</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEditEntry(selectedEntry)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteEntry(selectedEntry.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Client ID</label>
                      <p className="text-lg">{selectedEntry.client_id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Session Date</label>
                      <p className="text-lg">{new Date(selectedEntry.session_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Week Starting</label>
                      <p className="text-lg">{new Date(selectedEntry.week_starting).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Duration</label>
                      <p className="text-lg">{selectedEntry.duration_minutes} minutes</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Place of Practice</label>
                      <p className="text-lg">{selectedEntry.place_of_practice}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Client Age</label>
                      <p className="text-lg">{selectedEntry.client_age}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Session Activity Types</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedEntry.session_activity_types?.map((type, index) => (
                        <Badge key={index} className="bg-primaryBlue text-white">
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Presenting Issues</label>
                    <p className="text-lg mt-1">{selectedEntry.presenting_issues}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Reflections</label>
                    <p className="text-lg mt-1">{selectedEntry.reflections_on_experience}</p>
                  </div>

                  {/* Simulated Hours Info for DCC entries */}
                  {selectedEntry.entry_type === 'client_contact' && selectedEntry.simulated_hours_info && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-800 mb-2">Simulated Hours Tracking</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-yellow-700">Total Simulated Hours:</span>
                          <span className="ml-2 font-medium">{selectedEntry.simulated_hours_info.total_hours.toFixed(1)}</span>
                        </div>
                        <div>
                          <span className="text-yellow-700">Remaining Hours:</span>
                          <span className={`ml-2 font-medium ${
                            selectedEntry.simulated_hours_info.remaining_hours <= 10 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {selectedEntry.simulated_hours_info.remaining_hours.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      {selectedEntry.simulated_hours_info.limit_reached && (
                        <div className="mt-2 text-sm text-red-600 font-medium">
                          ⚠️ 60-hour limit reached for simulated contact
                        </div>
                      )}
                    </div>
                  )}

                  {/* CRA Section */}
                  {selectedEntry.entry_type === 'client_contact' && (
                    <div className="border-t pt-6">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-lg">CLIENT RELATED ACTIVITY</h4>
                        <Button
                          size="sm"
                          onClick={() => handleCreateEntry('cra')}
                          className="bg-green-600 hover:bg-green-700 text-white w-8 h-8 p-0 rounded-full"
                        >
                          +
                        </Button>
                      </div>
                      
                      {selectedEntry.cra_entries && selectedEntry.cra_entries.length > 0 ? (
                        <div className="space-y-3">
                          {selectedEntry.cra_entries.map((craEntry) => (
                            <div key={craEntry.id} className="bg-green-50 border border-green-200 p-4 rounded-lg">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="grid grid-cols-2 gap-4 mb-3">
                                    <div>
                                      <label className="text-sm font-medium text-gray-500">Activity Types</label>
                                      <p className="text-lg">{craEntry.session_activity_types?.join(', ')}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-gray-500">Duration</label>
                                      <p className="text-lg">{craEntry.duration_minutes} minutes</p>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">Reflections</label>
                                    <p className="text-lg mt-1">{craEntry.reflections_on_experience}</p>
                                  </div>
                                </div>
                                <div className="flex gap-2 ml-4">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditCRA(craEntry)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteEntry(craEntry.id)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-500 italic py-4">
                          There are no client related activities for the selected client session.
                        </div>
                      )}
                    </div>
                  )}

                  {/* ICRA Section */}
                  {selectedEntry.entry_type === 'client_contact' && (
                    <div className="border-t pt-6">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-lg">INDEPENDENT CLIENT RELATED ACTIVITY</h4>
                        <Button
                          size="sm"
                          onClick={() => handleCreateEntry('icra')}
                          className="bg-blue-600 hover:bg-blue-700 text-white w-8 h-8 p-0 rounded-full"
                        >
                          +
                        </Button>
                      </div>
                      
                      <div className="text-gray-500 italic py-4">
                        There are no independent client related activities.
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Entry Selected</h3>
                    <p className="text-gray-500 mb-4">Select an entry from the list to view details</p>
                    <Button onClick={handleCreateEntry}>Create New Entry</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Entry Form Modal (DCC only) */}
        {showEntryForm && activeTab === 'dcc' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {editingEntry ? 'Edit Entry' : 'Create New Entry'}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEntryForm(false)}
                  className="h-8 w-8 p-0"
                >
                  <span className="text-lg">×</span>
                </Button>
              </div>
              
              <form onSubmit={handleSaveEntry} className="space-y-4">
                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="flex">
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Validation Error
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                          <ul className="list-disc pl-5 space-y-1">
                            {validationErrors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Activity Date */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Activity Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={entryForm.session_date}
                    onChange={(e) => {
                      const date = e.target.value
                      setEntryForm({ ...entryForm, session_date: date, week_starting: calculateWeekStarting(date) })
                    }}
                    required
                  />
                </div>

                {/* Week Starting (auto-calculated, read-only) */}
                <div>
                  <label className="block text-sm font-medium mb-2">WEEK STARTING</label>
                  <Input
                    type="date"
                    value={entryForm.week_starting}
                    readOnly
                    disabled
                  />
                </div>

                {/* Client ID */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    CLIENT ID (PSEUDONYM) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={entryForm.client_id}
                    onChange={(e) => handleClientIdChange(e.target.value)}
                    placeholder="e.g., BM-1961-M"
                    required
                    list="client-suggestions"
                  />
                  <datalist id="client-suggestions">
                    {clientSuggestions.map((suggestion, index) => (
                      <option key={index} value={suggestion} />
                    ))}
                  </datalist>
                </div>

                {/* Place of Practice */}
                <div>
                  <label className="block text-sm font-medium mb-2">PLACE OF PRACTICE</label>
                  <Input
                    value={entryForm.place_of_practice}
                    onChange={(e) => setEntryForm({ ...entryForm, place_of_practice: e.target.value })}
                    placeholder="e.g., Private Practice, Hospital, Clinic"
                    required
                  />
                </div>

                {/* Client Age */}
                <div>
                  <label className="block text-sm font-medium mb-2">CLIENT AGE</label>
                  <Input
                    type="number"
                    value={entryForm.client_age}
                    onChange={(e) => setEntryForm({ ...entryForm, client_age: e.target.value })}
                    placeholder="Age in years"
                    required
                  />
                </div>

                {/* Session Activity Types */}
                <div>
                  <label className="block text-sm font-medium mb-2">SESSION ACTIVITY TYPES</label>
                  <div className="space-y-2">
                    {/* Standard activity types */}
                    <div className="flex flex-wrap gap-2">
                      {activeTab === 'dcc' && ['evaluation', 'intervention', 'assessment', 'consultation', 'supervision', 'other'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleActivityTypeToggle(type)}
                          className={`px-3 py-1 text-sm rounded-full border ${
                            entryForm.session_activity_types.includes(type)
                              ? 'bg-primaryBlue text-white border-primaryBlue'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                      {activeTab === 'cra' && ['report_writing', 'case_formulation', 'test_scoring', 'documentation', 'file_review', 'other'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleActivityTypeToggle(type)}
                          className={`px-3 py-1 text-sm rounded-full border ${
                            entryForm.session_activity_types.includes(type)
                              ? 'bg-primaryBlue text-white border-primaryBlue'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                        </button>
                      ))}
                      {activeTab === 'icra' && ['report_writing', 'case_formulation', 'test_scoring', 'documentation', 'file_review', 'other'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleActivityTypeToggle(type)}
                          className={`px-3 py-1 text-sm rounded-full border ${
                            entryForm.session_activity_types.includes(type)
                              ? 'bg-primaryBlue text-white border-primaryBlue'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                    
                    {/* Custom activity types */}
                    {customActivityTypes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {customActivityTypes.map((type) => (
                          <div key={type.id} className="flex items-center">
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => handleActivityTypeToggle(type.name)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleActivityTypeToggle(type.name) }}
                              className={`px-3 py-1 text-sm rounded-full border cursor-pointer ${
                                entryForm.session_activity_types.includes(type.name)
                                  ? 'bg-primaryBlue text-white border-primaryBlue'
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {type.name}
                            </div>
                            <button
                              type="button"
                              aria-label={`Delete ${type.name}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteCustomActivityType(type.id)
                              }}
                              className="ml-1 text-xs text-gray-500 hover:text-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Add custom activity type */}
                    {showAddCustomType ? (
                      <div className="flex gap-2">
                        <Input
                          value={newCustomActivityType}
                          onChange={(e) => setNewCustomActivityType(e.target.value)}
                          placeholder="Enter custom activity type"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          onClick={handleAddCustomActivityType}
                          size="sm"
                        >
                          Add
                        </Button>
                        <Button
                          type="button"
                          onClick={() => {
                            setShowAddCustomType(false)
                            setNewCustomActivityType('')
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => setShowAddCustomType(true)}
                        variant="outline"
                        size="sm"
                      >
                        + Add Custom Type
                      </Button>
                    )}
                  </div>
                </div>

                {/* Presenting Issues */}
                <div>
                  <label className="block text-sm font-medium mb-2">PRESENTING ISSUE(S)</label>
                  <Textarea
                    value={entryForm.presenting_issues}
                    onChange={(e) => setEntryForm({ ...entryForm, presenting_issues: e.target.value })}
                    placeholder="Detailed description of presenting issues..."
                    rows={6}
                    required
                    className="resize-y"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium mb-2">DURATION (MINUTES)</label>
                  <div className="grid grid-cols-4 gap-2">
                    <Input
                      type="number"
                      value={entryForm.duration_minutes}
                      onChange={(e) => setEntryForm({ ...entryForm, duration_minutes: e.target.value })}
                      placeholder="50"
                      required
                    />
                    <div className="col-span-3"></div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[30, 45, 60, 90].map((duration) => (
                      <button
                        key={duration}
                        type="button"
                        onClick={() => setEntryForm({ ...entryForm, duration_minutes: duration.toString() })}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
                      >
                        {duration} min
                      </button>
                    ))}
                  </div>
                  
                  {/* Validation Display */}
                  <LogbookEntryValidator
                    entryData={{
                      entry_type: entryForm.entry_type,
                      duration_minutes: parseInt(entryForm.duration_minutes) || 0,
                      simulated: entryForm.simulated
                    }}
                    onValidationChange={(isValid, errors) => {
                      setValidationErrors(errors)
                    }}
                    showDetails={true}
                    className="mt-2"
                  />
                </div>

                {/* Simulated Contact Checkbox (only for DCC) */}
                {activeTab === 'dcc' && (
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={entryForm.simulated}
                        onChange={(e) => setEntryForm({ ...entryForm, simulated: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium">Simulated Contact (SDCC)</span>
                    </label>
                  </div>
                )}

                {/* Reflections */}
                <div>
                  <label className="block text-sm font-medium mb-2">REFLECTIONS ON EXPERIENCE</label>
                  <Textarea
                    value={entryForm.reflections_on_experience}
                    onChange={(e) => setEntryForm({ ...entryForm, reflections_on_experience: e.target.value })}
                    placeholder="Reflect on your experience, what you learned, and how it contributes to your professional development..."
                    rows={6}
                    required
                    className="resize-y"
                  />
                </div>

                {/* Hidden fields for CRA */}
                {activeTab === 'cra' && (
                  <>
                    <input type="hidden" name="parent_dcc_entry" value={selectedEntry?.id || ''} />
                    <input type="hidden" name="client_id" value={selectedEntry?.client_id || ''} />
                    <input type="hidden" name="place_of_practice" value={selectedEntry?.place_of_practice || ''} />
                    <input type="hidden" name="client_age" value={selectedEntry?.client_age || ''} />
                    <input type="hidden" name="presenting_issues" value={selectedEntry?.presenting_issues || ''} />
                  </>
                )}

                {/* Form Actions */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEntryForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isValidating || validationErrors.length > 0}
                  >
                    {isValidating ? 'Validating...' : (editingEntry ? 'Update Entry' : 'Create Entry')}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CRA Modal (for CRA and ICRA) */}
        {showCRAForm && (
          <CRAForm
            onSubmit={handleSaveEntry}
            onCancel={() => setShowCRAForm(false)}
            saving={false}
            entryForm={entryForm}
            setEntryForm={setEntryForm}
            handleActivityTypeToggle={handleActivityTypeToggle}
            handleAddCustomActivityType={handleAddCustomActivityType}
            newCustomActivityType={newCustomActivityType}
            setNewCustomActivityType={setNewCustomActivityType}
            customActivityTypes={customActivityTypes}
            handleDeleteCustomActivityType={handleDeleteCustomActivityType}
            calculateWeekStarting={calculateWeekStarting}
            title={activeTab === 'icra' ? 'Section A: Independent CRA' : 'Section A: Client Related Activity'}
            showClientIdInput={activeTab === 'icra'}
            onClientIdChange={handleClientIdChange}
            clientSuggestions={clientSuggestions}
          />
        )}
      </div>
    </div>
  )
}