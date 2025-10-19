import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Filter, 
  Download, 
  Users, 
  Clock,
  User,
  Eye,
  Calendar
} from 'lucide-react'

interface SupervisionEntry {
  id: number
  date: string
  duration_minutes: number
  mode: string
  type: string
  supervisor: number
  supervisor_name: string
  supervisor_email: string
  supervisor_category: string
  topics: string
  observed: boolean
  shorter_than_60min: boolean
  notes: string
  created_at: string
  updated_at: string
}

interface Program {
  id: number
  aope: string
  qualification_tier: string
}

const MODE_OPTIONS = [
  { value: 'in_person', label: 'In Person' },
  { value: 'video', label: 'Video' },
  { value: 'phone', label: 'Phone' },
]

const TYPE_OPTIONS = [
  { value: 'individual', label: 'Individual (1:1)' },
  { value: 'group', label: 'Group' },
]

const SUPERVISOR_CATEGORY_OPTIONS = [
  { value: 'principal', label: 'Principal Supervisor' },
  { value: 'secondary_same_aope', label: 'Secondary Supervisor (Same AoPE)' },
  { value: 'secondary_other_or_not_endorsed', label: 'Secondary Supervisor (Different AoPE or Not Endorsed)' },
]

const RegistrarSupervisionLog: React.FC = () => {
  const [entries, setEntries] = useState<SupervisionEntry[]>([])
  const [program, setProgram] = useState<Program | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<SupervisionEntry | null>(null)
  const [filters, setFilters] = useState({
    supervisor_category: '',
    type: '',
    mode: '',
    date_from: '',
    date_to: ''
  })

  const [formData, setFormData] = useState({
    date: '',
    duration_minutes: '',
    mode: '',
    type: '',
    supervisor_category: '',
    topics: '',
    observed: false,
    notes: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch program
      const programResponse = await apiFetch('/api/registrar/programs/')
      if (programResponse.ok) {
        const programs = await programResponse.json()
        if (programs.length > 0) {
          setProgram(programs[0])
          
          // Fetch supervision entries
          const entriesResponse = await apiFetch(`/api/registrar/supervision-entries/?program_id=${programs[0].id}`)
          if (entriesResponse.ok) {
            const entriesData = await entriesResponse.json()
            setEntries(entriesData)
          }
        }
      }
    } catch (error) {
      toast.error('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const resetForm = () => {
    setFormData({
      date: '',
      duration_minutes: '',
      mode: '',
      type: '',
      supervisor_category: '',
      topics: '',
      observed: false,
      notes: ''
    })
    setEditingEntry(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate date is not in the future
    const selectedDate = new Date(formData.date + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (selectedDate > today) {
      toast.error('Supervision session date cannot be in the future. Please enter the actual date of the session.')
      return
    }
    
    if (!program) {
      toast.error('No program found')
      return
    }

    const entryData = {
      program: program.id,
      date: formData.date,
      duration_minutes: parseInt(formData.duration_minutes),
      mode: formData.mode,
      type: formData.type,
      supervisor_category: formData.supervisor_category,
      topics: formData.topics,
      observed: formData.observed,
      notes: formData.notes
    }

    try {
      const url = editingEntry 
        ? `/api/registrar/supervision-entries/${editingEntry.id}/`
        : '/api/registrar/supervision-entries/'
      
      const method = editingEntry ? 'PUT' : 'POST'
      
      const response = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entryData),
      })

      if (response.ok) {
        toast.success(editingEntry ? 'Entry updated successfully' : 'Entry created successfully')
        setDialogOpen(false)
        resetForm()
        fetchData()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to save entry')
      }
    } catch (error) {
      toast.error('An error occurred while saving the entry')
    }
  }

  const handleEdit = (entry: SupervisionEntry) => {
    setEditingEntry(entry)
    setFormData({
      date: entry.date,
      duration_minutes: entry.duration_minutes.toString(),
      mode: entry.mode,
      type: entry.type,
      supervisor_category: entry.supervisor_category,
      topics: entry.topics,
      observed: entry.observed,
      notes: entry.notes
    })
    setDialogOpen(true)
  }

  const handleDelete = async (entryId: number) => {
    if (!confirm('Are you sure you want to delete this entry?')) return

    try {
      const response = await apiFetch(`/api/registrar/supervision-entries/${entryId}/`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Entry deleted successfully')
        fetchData()
      } else {
        toast.error('Failed to delete entry')
      }
    } catch (error) {
      toast.error('An error occurred while deleting the entry')
    }
  }

  const handleExport = async () => {
    if (!program) return

    try {
      const response = await apiFetch(`/api/registrar/supervision-entries/export_csv/?program_id=${program.id}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'supervision_entries.csv'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Export completed')
      } else {
        toast.error('Failed to export data')
      }
    } catch (error) {
      toast.error('An error occurred during export')
    }
  }

  const filteredEntries = entries.filter(entry => {
    if (filters.supervisor_category && entry.supervisor_category !== filters.supervisor_category) return false
    if (filters.type && entry.type !== filters.type) return false
    if (filters.mode && entry.mode !== filters.mode) return false
    if (filters.date_from && entry.date < filters.date_from) return false
    if (filters.date_to && entry.date > filters.date_to) return false
    return true
  })

  const totalMinutes = filteredEntries.reduce((sum, entry) => sum + entry.duration_minutes, 0)
  const totalHours = totalMinutes / 60
  const individualMinutes = filteredEntries.filter(entry => entry.type === 'individual').reduce((sum, entry) => sum + entry.duration_minutes, 0)
  const groupMinutes = filteredEntries.filter(entry => entry.type === 'group').reduce((sum, entry) => sum + entry.duration_minutes, 0)
  const principalMinutes = filteredEntries.filter(entry => entry.supervisor_category === 'principal').reduce((sum, entry) => sum + entry.duration_minutes, 0)

  const individualPercentage = totalMinutes > 0 ? (individualMinutes / totalMinutes) * 100 : 0
  const groupPercentage = totalMinutes > 0 ? (groupMinutes / totalMinutes) * 100 : 0
  const principalPercentage = totalMinutes > 0 ? (principalMinutes / totalMinutes) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading supervision entries...</p>
        </div>
      </div>
    )
  }

  if (!program) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Registrar Program</h3>
        <p className="text-gray-600">You need to create a registrar program first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supervision Log</h1>
          <p className="text-gray-600">Track your supervision sessions and compliance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingEntry ? 'Edit Supervision Entry' : 'Add Supervision Entry'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                    <Input
                      id="duration_minutes"
                      type="number"
                      min="1"
                      max="480"
                      value={formData.duration_minutes}
                      onChange={(e) => handleInputChange('duration_minutes', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mode">Mode</Label>
                    <Select value={formData.mode} onValueChange={(value) => handleInputChange('mode', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {MODE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supervisor_category">Supervisor Category</Label>
                  <Select value={formData.supervisor_category} onValueChange={(value) => handleInputChange('supervisor_category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supervisor category" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPERVISOR_CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="observed"
                    checked={formData.observed}
                    onCheckedChange={(checked) => handleInputChange('observed', checked)}
                  />
                  <Label htmlFor="observed">Session was observed</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topics">Topics Discussed</Label>
                  <Textarea
                    id="topics"
                    value={formData.topics}
                    onChange={(e) => handleInputChange('topics', e.target.value)}
                    placeholder="Describe the supervision topics..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Any additional notes..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingEntry ? 'Update Entry' : 'Add Entry'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-blue-600" />
              Total Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
            <p className="text-sm text-gray-600">All supervision</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-green-600" />
              Individual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{individualPercentage.toFixed(1)}%</div>
            <p className="text-sm text-gray-600">{(individualMinutes / 60).toFixed(1)}h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 text-purple-600" />
              Group
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groupPercentage.toFixed(1)}%</div>
            <p className="text-sm text-gray-600">{(groupMinutes / 60).toFixed(1)}h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Eye className="h-4 w-4 text-orange-600" />
              Principal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{principalPercentage.toFixed(1)}%</div>
            <p className="text-sm text-gray-600">{(principalMinutes / 60).toFixed(1)}h</p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Supervision Mix Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Principal Supervisor</span>
                <span className={principalPercentage >= 50 ? 'text-green-600' : 'text-red-600'}>
                  {principalPercentage.toFixed(1)}% (≥50% required)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Individual Sessions</span>
                <span className={individualPercentage >= 66 ? 'text-green-600' : 'text-red-600'}>
                  {individualPercentage.toFixed(1)}% (≥66% required)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Group Sessions</span>
                <span className={groupPercentage <= 33 ? 'text-green-600' : 'text-red-600'}>
                  {groupPercentage.toFixed(1)}% (≤33% allowed)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Session Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Observed Sessions</span>
                <span>{filteredEntries.filter(e => e.observed).length} of {filteredEntries.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Short Sessions (&lt;60min)</span>
                <span className={filteredEntries.filter(e => e.shorter_than_60min).length / filteredEntries.length <= 0.25 ? 'text-green-600' : 'text-red-600'}>
                  {filteredEntries.filter(e => e.shorter_than_60min).length} of {filteredEntries.length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Supervision Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Supervisor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Observed</TableHead>
                <TableHead>Topics</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No supervision entries found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                    <TableCell>{entry.duration_minutes}min</TableCell>
                    <TableCell>{MODE_OPTIONS.find(m => m.value === entry.mode)?.label}</TableCell>
                    <TableCell>
                      <Badge variant={entry.type === 'individual' ? "default" : "secondary"}>
                        {entry.type === 'individual' ? 'Individual' : 'Group'}
                      </Badge>
                    </TableCell>
                    <TableCell>{entry.supervisor_name || entry.supervisor_email}</TableCell>
                    <TableCell>
                      <Badge variant={
                        entry.supervisor_category === 'principal' ? 'default' :
                        entry.supervisor_category === 'secondary_same_aope' ? 'secondary' : 'outline'
                      }>
                        {SUPERVISOR_CATEGORY_OPTIONS.find(c => c.value === entry.supervisor_category)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {entry.observed ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">Yes</Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{entry.topics}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(entry)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default RegistrarSupervisionLog
