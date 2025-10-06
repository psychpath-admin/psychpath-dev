import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, 
  Download, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PracticeEntry {
  id: string
  date: string
  start_time: string | null
  end_time: string | null
  duration_minutes: number
  duration_hours: number
  dcc_minutes: number
  dcc_hours: number
  dcc_ratio: number
  dcc_categories: string[]
  setting: string
  setting_display: string
  modality: string
  modality_display: string
  client_code: string
  client_age_band: string
  client_age_band_display: string
  presenting_issue: string | null
  tasks: string
  competency_tags: string[]
  observed: boolean
  supervisor_followup_date: string | null
  created_at: string
  updated_at: string
}

interface PracticeStats {
  total_entries: number
  total_duration_minutes: number
  total_duration_hours: number
  total_dcc_minutes: number
  total_dcc_hours: number
  dcc_ratio: number
  settings_distribution: Record<string, number>
  dcc_categories_distribution: Record<string, number>
  competency_distribution: Record<string, number>
  date_range: {
    start: string | null
    end: string | null
  }
}

interface FilterState {
  start_date: string
  end_date: string
  dcc_only: boolean
  setting: string
  modality: string
  competency: string
}

const RegistrarPracticeLog: React.FC = () => {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<PracticeEntry[]>([])
  const [stats, setStats] = useState<PracticeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  
  const [filters, setFilters] = useState<FilterState>({
    start_date: '',
    end_date: '',
    dcc_only: false,
    setting: '',
    modality: '',
    competency: '',
  })

  // Load practice entries and stats
  useEffect(() => {
    loadEntries()
  }, [filters])

  const loadEntries = async () => {
    setLoading(true)
    try {
      // Build query parameters
      const params = new URLSearchParams()
      if (filters.start_date) params.append('start_date', filters.start_date)
      if (filters.end_date) params.append('end_date', filters.end_date)
      if (filters.dcc_only) params.append('dcc_only', 'true')
      if (filters.setting) params.append('setting', filters.setting)
      if (filters.modality) params.append('modality', filters.modality)
      if (filters.competency) params.append('competency', filters.competency)

      const [entriesResponse, statsResponse] = await Promise.all([
        apiFetch(`/api/registrar/practice-entries/?${params.toString()}`),
        apiFetch(`/api/registrar/practice-entries/summary_stats/?${params.toString()}`)
      ])

      if (entriesResponse.ok) {
        const entriesData = await entriesResponse.json()
        setEntries(entriesData)
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }
    } catch (error) {
      toast.error('Failed to load practice entries')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this practice entry?')) {
      return
    }

    try {
      const response = await apiFetch(`/api/registrar/practice-entries/${entryId}/`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Practice entry deleted successfully')
        loadEntries()
        setSelectedEntries(prev => {
          const newSet = new Set(prev)
          newSet.delete(entryId)
          return newSet
        })
      } else {
        toast.error('Failed to delete practice entry')
      }
    } catch (error) {
      toast.error('An error occurred while deleting the entry')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedEntries.size === 0) {
      toast.error('Please select entries to delete')
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedEntries.size} practice entries?`)) {
      return
    }

    try {
      const deletePromises = Array.from(selectedEntries).map(entryId =>
        apiFetch(`/api/registrar/practice-entries/${entryId}/`, { method: 'DELETE' })
      )

      const results = await Promise.all(deletePromises)
      const failed = results.filter(response => !response.ok)

      if (failed.length === 0) {
        toast.success(`${selectedEntries.size} practice entries deleted successfully`)
      } else {
        toast.error(`Failed to delete ${failed.length} of ${selectedEntries.size} entries`)
      }

      setSelectedEntries(new Set())
      loadEntries()
    } catch (error) {
      toast.error('An error occurred during bulk delete')
    }
  }

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.start_date) params.append('start_date', filters.start_date)
      if (filters.end_date) params.append('end_date', filters.end_date)
      if (filters.dcc_only) params.append('dcc_only', 'true')
      if (filters.setting) params.append('setting', filters.setting)
      if (filters.modality) params.append('modality', filters.modality)
      if (filters.competency) params.append('competency', filters.competency)

      const response = await apiFetch(`/api/registrar/practice-entries/export_csv/?${params.toString()}`, {
        responseType: 'blob'
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `practice_entries_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
        toast.success('Practice entries exported to CSV')
      } else {
        toast.error('Failed to export CSV')
      }
    } catch (error) {
      toast.error('An error occurred while exporting CSV')
    }
  }

  const handleSelectEntry = (entryId: string, selected: boolean) => {
    setSelectedEntries(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(entryId)
      } else {
        newSet.delete(entryId)
      }
      return newSet
    })
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedEntries(new Set(entries.map(entry => entry.id)))
    } else {
      setSelectedEntries(new Set())
    }
  }

  const clearFilters = () => {
    setFilters({
      start_date: '',
      end_date: '',
      dcc_only: false,
      setting: '',
      modality: '',
      competency: '',
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return ''
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const getDccRatioColor = (ratio: number) => {
    if (ratio >= 80) return 'text-green-600'
    if (ratio >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading practice entries...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-textDark">Practice Log</h1>
          <p className="text-gray-600">Track your clinical practice activities and DCC hours</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => navigate('/registrar/practice/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Entries</p>
                  <p className="text-2xl font-bold">{stats.total_entries}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Hours</p>
                  <p className="text-2xl font-bold">{stats.total_duration_hours.toFixed(1)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">DCC Hours</p>
                  <p className="text-2xl font-bold">{stats.total_dcc_hours.toFixed(1)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className={cn("h-5 w-5 rounded-full", 
                  stats.dcc_ratio >= 50 ? "bg-green-500" : "bg-red-500"
                )} />
                <div>
                  <p className="text-sm text-gray-600">DCC Ratio</p>
                  <p className={cn("text-2xl font-bold", getDccRatioColor(stats.dcc_ratio))}>
                    {stats.dcc_ratio.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>DCC Only</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dcc_only"
                    checked={filters.dcc_only}
                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, dcc_only: !!checked }))}
                  />
                  <Label htmlFor="dcc_only" className="text-sm">DCC entries only</Label>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="setting">Setting</Label>
                <Select
                  value={filters.setting}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, setting: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All settings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All settings</SelectItem>
                    <SelectItem value="outpatient">Outpatient</SelectItem>
                    <SelectItem value="inpatient">Inpatient</SelectItem>
                    <SelectItem value="community">Community</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="management">Management</SelectItem>
                    <SelectItem value="telehealth">Telehealth</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="modality">Modality</Label>
                <Select
                  value={filters.modality}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, modality: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All modalities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All modalities</SelectItem>
                    <SelectItem value="in_person">In Person</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="asynchronous">Asynchronous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="competency">Competency</Label>
                <Input
                  id="competency"
                  placeholder="Filter by competency"
                  value={filters.competency}
                  onChange={(e) => setFilters(prev => ({ ...prev, competency: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Bulk Actions */}
      {selectedEntries.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-800">
                {selectedEntries.size} entry{selectedEntries.size !== 1 ? 'ies' : 'y'} selected
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Practice Entries ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No practice entries found</h3>
              <p className="text-gray-600 mb-4">
                {Object.values(filters).some(f => f) 
                  ? 'Try adjusting your filters or clear them to see all entries.'
                  : 'Get started by adding your first practice entry.'
                }
              </p>
              <Button onClick={() => navigate('/registrar/practice/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Entry
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedEntries.size === entries.length && entries.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>DCC</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Setting</TableHead>
                    <TableHead>Modality</TableHead>
                    <TableHead>Competencies</TableHead>
                    <TableHead>Observed</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedEntries.has(entry.id)}
                          onCheckedChange={(checked) => handleSelectEntry(entry.id, !!checked)}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <div className="font-medium">{formatDate(entry.date)}</div>
                        {entry.supervisor_followup_date && (
                          <div className="text-xs text-blue-600">
                            Follow-up: {formatDate(entry.supervisor_followup_date)}
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {entry.start_time && entry.end_time ? (
                          <div className="text-sm">
                            <div>{formatTime(entry.start_time)} - {formatTime(entry.end_time)}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No times</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="font-medium">{entry.duration_hours.toFixed(1)}h</div>
                        <div className="text-xs text-gray-500">{entry.duration_minutes}min</div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{entry.dcc_hours.toFixed(1)}h</div>
                          <Badge 
                            variant={entry.dcc_ratio >= 50 ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {entry.dcc_ratio.toFixed(0)}%
                          </Badge>
                          {entry.dcc_categories.length > 0 && (
                            <div className="text-xs text-gray-500">
                              {entry.dcc_categories.join(', ')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{entry.client_code}</div>
                          <div className="text-xs text-gray-500">{entry.client_age_band_display}</div>
                          {entry.presenting_issue && (
                            <div className="text-xs text-gray-500 truncate max-w-32">
                              {entry.presenting_issue}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline">{entry.setting_display}</Badge>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline">{entry.modality_display}</Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {entry.competency_tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {entry.competency_tags.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{entry.competency_tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {entry.observed ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/registrar/practice/${entry.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sticky Footer with Selected Totals */}
      {selectedEntries.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {selectedEntries.size} entries selected
              </span>
              <div className="flex items-center gap-4 text-sm">
                <span>
                  Total: {entries
                    .filter(entry => selectedEntries.has(entry.id))
                    .reduce((sum, entry) => sum + entry.duration_hours, 0)
                    .toFixed(1)}h
                </span>
                <span>
                  DCC: {entries
                    .filter(entry => selectedEntries.has(entry.id))
                    .reduce((sum, entry) => sum + entry.dcc_hours, 0)
                    .toFixed(1)}h
                </span>
              </div>
            </div>
            <Button variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default RegistrarPracticeLog