import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Users, Clock, User, Target, ChevronDown, ChevronUp } from 'lucide-react'
import { 
  getSupervisionEntriesGroupedByWeek, 
  createSupervisionEntry, 
  updateSupervisionEntry, 
  deleteSupervisionEntry
} from '@/lib/api'
import type { SupervisionEntry, SupervisionWeeklyGroup } from '@/types/supervision'
import { formatDurationWithUnit, formatDurationDisplay } from '../utils/durationUtils'

const SectionC: React.FC = () => {
  const [weeklyGroups, setWeeklyGroups] = useState<SupervisionWeeklyGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<SupervisionEntry | null>(null)
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set())
  const [formData, setFormData] = useState({
    date_of_supervision: new Date().toISOString().split('T')[0],
    supervisor_name: '',
    supervisor_type: 'PRINCIPAL' as 'PRINCIPAL' | 'SECONDARY',
    supervision_type: 'INDIVIDUAL' as 'INDIVIDUAL' | 'GROUP' | 'OTHER',
    duration_minutes: 60,
    summary: ''
  })

  const supervisorTypes = [
    { value: 'PRINCIPAL', label: 'Principal' },
    { value: 'SECONDARY', label: 'Secondary' }
  ]

  const supervisionTypes = [
    { value: 'INDIVIDUAL', label: 'Individual' },
    { value: 'GROUP', label: 'Group' },
    { value: 'OTHER', label: 'Other' }
  ]

  const durationQuickLinks = [30, 60, 90, 120, 180, 240]

  useEffect(() => {
    loadData()
  }, [])

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
      duration_minutes: entry.duration_minutes,
      summary: entry.summary
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingEntry) {
        await updateSupervisionEntry(editingEntry.id, formData)
      } else {
        await createSupervisionEntry(formData)
      }
      setShowForm(false)
      loadData()
    } catch (error) {
      console.error('Error saving supervision entry:', error)
    }
  }

  const handleDeleteEntry = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this supervision entry?')) {
      try {
        await deleteSupervisionEntry(id)
        loadData()
      } catch (error) {
        console.error('Error deleting supervision entry:', error)
      }
    }
  }

  const filteredGroups = weeklyGroups.filter(group =>
    group.entries.some(entry =>
      entry.supervisor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.summary.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  // Calculate total supervision hours (use the maximum cumulative value)
  const totalMinutes = weeklyGroups.length > 0 ? Math.max(...weeklyGroups.map(group => group.cumulative_total_minutes)) : 0
  const totalHours = Math.floor(totalMinutes / 60)
  const totalMins = totalMinutes % 60
  const totalHoursDisplay = `${totalHours}:${totalMins.toString().padStart(2, '0')}`

  // Calculate remaining hours (assuming 80 hours required)
  const requiredMinutes = 80 * 60
  const remainingMinutes = Math.max(0, requiredMinutes - totalMinutes)
  const remainingHours = Math.floor(remainingMinutes / 60)
  const remainingMins = remainingMinutes % 60
  const remainingHoursDisplay = `${remainingHours}:${remainingMins.toString().padStart(2, '0')}`

  return (
    <div className="min-h-screen bg-bgSection">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section - PsychPathway Brand */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-primary to-primary/90 rounded-card p-8 text-white shadow-md">
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
                  className="bg-white text-primary hover:bg-white/90 font-semibold shadow-sm rounded-lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  New Supervision Record
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white hover:text-primary font-semibold rounded-lg bg-white/10 backdrop-blur-sm"
                >
                  <Users className="h-5 w-5 mr-2" />
                  View Reports
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {(() => {
          const totalEntries = weeklyGroups.reduce((sum, group) => sum + group.entries.length, 0)
          const totalMinutes = weeklyGroups.reduce((sum, group) => 
            sum + group.entries.reduce((groupSum, entry) => groupSum + (entry.duration_minutes || 0), 0), 0)
          const totalHours = totalMinutes / 60
          const individualMinutes = weeklyGroups.reduce((sum, group) => 
            sum + group.entries.filter(entry => entry.supervision_type === 'INDIVIDUAL')
              .reduce((groupSum, entry) => groupSum + (entry.duration_minutes || 0), 0), 0)
          const individualHours = individualMinutes / 60
          const groupMinutes = weeklyGroups.reduce((sum, group) => 
            sum + group.entries.filter(entry => entry.supervision_type === 'GROUP')
              .reduce((groupSum, entry) => groupSum + (entry.duration_minutes || 0), 0), 0)
          const groupHours = groupMinutes / 60

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
            </div>
          )
        })()}

        {/* AHPRA 5+1 Program Progress Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-8 bg-accent rounded-full flex items-center justify-center">
              <Target className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-2xl font-headings text-textDark">AHPRA 5+1 PROGRAM PROGRESS</h2>
          </div>
          <p className="text-textLight mb-6 font-body">Track your supervision requirements</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Total Supervision Card */}
            <Card className="brand-card hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-textDark mb-1">
                  {totalHoursDisplay}
                </div>
                <div className="text-xs font-semibold text-textDark mb-1 font-body">Total Supervision</div>
                <div className="text-xs text-textLight mb-2">Target: 100h</div>
                {remainingMinutes > 0 ? (
                  <Badge variant="outline" className="text-accent border-accent text-xs font-semibold">
                    {remainingHoursDisplay} remaining
                  </Badge>
                ) : (
                  <Badge className="bg-secondary text-white border-secondary text-xs font-semibold">
                    ✓ Met
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Individual Supervision Card */}
            <Card className="brand-card hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 bg-secondary/10 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-secondary" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-textDark mb-1">
                  {(() => {
                    const individualHours = weeklyGroups.reduce((sum, group) => 
                      sum + group.entries.filter(entry => entry.supervision_type === 'INDIVIDUAL')
                        .reduce((groupSum, entry) => groupSum + (entry.duration_minutes || 0), 0), 0) / 60
                    return `${Math.floor(individualHours)}:${Math.round((individualHours % 1) * 60).toString().padStart(2, '0')}`
                  })()}
                </div>
                <div className="text-xs font-semibold text-textDark mb-1 font-body">Individual Supervision</div>
                <div className="text-xs text-textLight mb-2">Target: 66h (66%)</div>
                <Badge variant="outline" className="text-secondary border-secondary text-xs font-semibold">
                  Ongoing Development
                </Badge>
              </CardContent>
            </Card>

            {/* Group Supervision Card */}
            <Card className="brand-card hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-accent" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-textDark mb-1">
                  {(() => {
                    const groupHours = weeklyGroups.reduce((sum, group) => 
                      sum + group.entries.filter(entry => entry.supervision_type === 'GROUP')
                        .reduce((groupSum, entry) => groupSum + (entry.duration_minutes || 0), 0), 0) / 60
                    return `${Math.floor(groupHours)}:${Math.round((groupHours % 1) * 60).toString().padStart(2, '0')}`
                  })()}
                </div>
                <div className="text-xs font-semibold text-textDark mb-1 font-body">Group Supervision</div>
                <div className="text-xs text-textLight mb-2">Target: 34h (34%)</div>
                <Badge variant="outline" className="text-secondary border-secondary text-xs font-semibold">
                  Ongoing Development
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Overall Progress Bar */}
          <div className="bg-bgCard p-4 rounded-lg border border-border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-textDark font-body">Overall Progress</span>
              <span className="text-lg font-bold text-primary">{(() => {
                const progressPercentage = Math.min((totalMinutes / 6000) * 100, 100) // 100 hours = 6000 minutes
                return progressPercentage.toFixed(1)
              })()}%</span>
            </div>
            <div className="relative">
              <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-primary via-secondary to-accent h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min((totalMinutes / 6000) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-textLight mt-1">
                <span>{totalHoursDisplay}</span>
                <span>100h target</span>
              </div>
            </div>
          </div>
        </div>

      {/* Search and Actions */}
      <div className="flex items-center gap-4">
        <Input
          type="text"
          placeholder="Search activities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button variant="outline">Go</Button>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm">Rows 50</Button>
          <Button variant="outline" size="sm">Actions</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading supervision entries...</div>
      ) : (
        <div className="space-y-6">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No supervision entries found. Click "Create New Supervision Record" to get started.</div>
          ) : (
            filteredGroups.map((group) => (
              <Card key={group.week_starting} className="shadow-sm">
                <CardHeader className="bg-backgroundSection rounded-t-lg py-3 px-4">
                  <CardTitle className="text-lg font-semibold text-textDark">
                    Week Starting: {new Date(group.week_starting).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </CardTitle>
                  <p className="text-sm text-textLight">
                    Week Total: {group.week_total_display} | Cumulative Total: {group.cumulative_total_display}
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-3">
                    {group.entries.map((entry) => {
                      const isExpanded = expandedEntries.has(entry.id)
                      
                      return (
                        <div key={entry.id} className="border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white">
                          {/* Main entry details */}
                          <div className="px-4 py-3 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {new Date(entry.date_of_supervision).toLocaleDateString('en-AU', { 
                                  day: '2-digit', 
                                  month: 'short', 
                                  year: 'numeric' 
                                })}
                              </div>
                              <div className="text-sm text-gray-600">
                                {formatDurationDisplay(entry.duration_minutes)}
                              </div>
                              <div className="text-sm text-gray-900 font-medium">
                                {entry.supervisor_name}
                              </div>
                              <Badge variant={entry.supervisor_type === 'PRINCIPAL' ? 'default' : 'secondary'} className="text-xs">
                                {entry.supervisor_type}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {entry.supervision_type}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="outline" size="sm" onClick={() => handleEditEntry(entry)} className="h-7 px-2 text-xs">
                                Edit
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteEntry(entry.id)} className="h-7 px-2 text-xs">
                                Delete
                              </Button>
                            </div>
                          </div>
                          
                          {/* Summary section */}
                          <div className="px-4 pb-3">
                            <div className="text-xs text-gray-500 mb-1 font-medium">Summary:</div>
                            <div className={`text-sm text-gray-700 ${!isExpanded ? 'line-clamp-3' : ''}`}>
                              {entry.summary}
                            </div>
                            {entry.summary.length > 200 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newExpanded = new Set(expandedEntries)
                                  if (isExpanded) {
                                    newExpanded.delete(entry.id)
                                  } else {
                                    newExpanded.add(entry.id)
                                  }
                                  setExpandedEntries(newExpanded)
                                }}
                                className="mt-1 h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="h-3 w-3 mr-1" />
                                    Show less
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3 w-3 mr-1" />
                                    Show more
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <Input
                      type="date"
                      value={formData.date_of_supervision}
                      onChange={(e) => setFormData({ ...formData, date_of_supervision: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor Name</label>
                    <Input
                      type="text"
                      value={formData.supervisor_name}
                      onChange={(e) => setFormData({ ...formData, supervisor_name: e.target.value })}
                      placeholder="Enter supervisor name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Principal or Secondary?</label>
                    <select
                      value={formData.supervisor_type}
                      onChange={(e) => setFormData({ ...formData, supervisor_type: e.target.value as 'PRINCIPAL' | 'SECONDARY' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primaryBlue"
                      required
                    >
                      {supervisorTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Principal, Secondary</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Individual/Group/Other</label>
                    <select
                      value={formData.supervision_type}
                      onChange={(e) => setFormData({ ...formData, supervision_type: e.target.value as 'INDIVIDUAL' | 'GROUP' | 'OTHER' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primaryBlue"
                      required
                    >
                      {supervisionTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Individual, Group, Other</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Minutes)</label>
                    <Input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                      min="1"
                      required
                    />
                    <div className="flex gap-1 mt-1">
                      {durationQuickLinks.map(minutes => (
                        <Button
                          key={minutes}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFormData({ ...formData, duration_minutes: minutes })}
                          className="text-xs"
                        >
                          {minutes === 30 ? '30 Minutes' : 
                           minutes === 60 ? '1 Hour' : 
                           minutes === 90 ? '90 Minutes' : 
                           minutes === 120 ? '2 Hours' : 
                           `${minutes} min`}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sup Summ</label>
                  <textarea
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primaryBlue"
                    rows={4}
                    placeholder="Enter supervision summary and key points discussed"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  {editingEntry && (
                    <Button type="button" variant="destructive" onClick={() => handleDeleteEntry(editingEntry.id)}>
                      Delete
                    </Button>
                  )}
                  <Button type="submit" className="bg-primaryBlue hover:bg-primaryBlue/90 text-white">
                    Save
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
