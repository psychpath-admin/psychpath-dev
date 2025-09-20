import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  getSupervisionEntriesGroupedByWeek, 
  createSupervisionEntry, 
  updateSupervisionEntry, 
  deleteSupervisionEntry
} from '@/lib/api'
import type { SupervisionEntry, SupervisionWeeklyGroup } from '@/types/supervision'

const SectionC: React.FC = () => {
  const [weeklyGroups, setWeeklyGroups] = useState<SupervisionWeeklyGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<SupervisionEntry | null>(null)
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
      // Demo data fallback
      setWeeklyGroups([
        {
          id: 1,
          week_starting: '2025-08-18',
          week_total_minutes: 120,
          cumulative_total_minutes: 375,
          week_total_display: '2:00',
          cumulative_total_display: '6:15',
          entries: [
            {
              id: 1,
              date_of_supervision: '2025-08-19',
              supervisor_name: 'Demo Supervisor',
              supervisor_type: 'SECONDARY',
              supervision_type: 'GROUP',
              duration_minutes: 120,
              summary: 'Cultural considerations; interpreter debrief',
              week_starting: '2025-08-18',
              duration_display: '2:00',
              duration_hours_minutes: '2h 0m',
              created_at: '2025-08-19T10:00:00Z',
              updated_at: '2025-08-19T10:00:00Z'
            }
          ],
          created_at: '2025-08-18T10:00:00Z',
          updated_at: '2025-08-18T10:00:00Z'
        },
        {
          id: 2,
          week_starting: '2025-08-11',
          week_total_minutes: 60,
          cumulative_total_minutes: 255,
          week_total_display: '1:00',
          cumulative_total_display: '4:15',
          entries: [
            {
              id: 2,
              date_of_supervision: '2025-08-11',
              supervisor_name: 'Demo Supervisor',
              supervisor_type: 'PRINCIPAL',
              supervision_type: 'INDIVIDUAL',
              duration_minutes: 60,
              summary: 'Ethical consent in complex trauma',
              week_starting: '2025-08-11',
              duration_display: '1:00',
              duration_hours_minutes: '1h 0m',
              created_at: '2025-08-11T10:00:00Z',
              updated_at: '2025-08-11T10:00:00Z'
            }
          ],
          created_at: '2025-08-11T10:00:00Z',
          updated_at: '2025-08-11T10:00:00Z'
        },
        {
          id: 3,
          week_starting: '2025-08-04',
          week_total_minutes: 195,
          cumulative_total_minutes: 195,
          week_total_display: '3:15',
          cumulative_total_display: '3:15',
          entries: [
            {
              id: 3,
              date_of_supervision: '2025-08-05',
              supervisor_name: 'Demo Supervisor',
              supervisor_type: 'PRINCIPAL',
              supervision_type: 'INDIVIDUAL',
              duration_minutes: 45,
              summary: 'Review reflections; session timing',
              week_starting: '2025-08-04',
              duration_display: '0:45',
              duration_hours_minutes: '45m',
              created_at: '2025-08-05T10:00:00Z',
              updated_at: '2025-08-05T10:00:00Z'
            },
            {
              id: 4,
              date_of_supervision: '2025-08-05',
              supervisor_name: 'Demo Supervisor',
              supervisor_type: 'PRINCIPAL',
              supervision_type: 'INDIVIDUAL',
              duration_minutes: 60,
              summary: 'Case review - trauma pacing (AC-1992-F)',
              week_starting: '2025-08-04',
              duration_display: '1:00',
              duration_hours_minutes: '1h 0m',
              created_at: '2025-08-05T11:00:00Z',
              updated_at: '2025-08-05T11:00:00Z'
            },
            {
              id: 5,
              date_of_supervision: '2025-08-06',
              supervisor_name: 'Demo Supervisor',
              supervisor_type: 'PRINCIPAL',
              supervision_type: 'INDIVIDUAL',
              duration_minutes: 60,
              summary: 'Grief case KZ-1999-F - use of silence',
              week_starting: '2025-08-04',
              duration_display: '1:00',
              duration_hours_minutes: '1h 0m',
              created_at: '2025-08-06T10:00:00Z',
              updated_at: '2025-08-06T10:00:00Z'
            },
            {
              id: 6,
              date_of_supervision: '2025-08-07',
              supervisor_name: 'Demo Supervisor',
              supervisor_type: 'SECONDARY',
              supervision_type: 'GROUP',
              duration_minutes: 30,
              summary: 'Boundaries & scope check-in',
              week_starting: '2025-08-04',
              duration_display: '0:30',
              duration_hours_minutes: '30m',
              created_at: '2025-08-07T10:00:00Z',
              updated_at: '2025-08-07T10:00:00Z'
            }
          ],
          created_at: '2025-08-04T10:00:00Z',
          updated_at: '2025-08-04T10:00:00Z'
        }
      ])
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

  // Calculate current week starting date
  const today = new Date()
  const daysSinceMonday = today.getDay() === 0 ? 6 : today.getDay() - 1
  const currentWeekStart = new Date(today)
  currentWeekStart.setDate(today.getDate() - daysSinceMonday)
  const currentWeekStartStr = currentWeekStart.toISOString().split('T')[0]

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headings text-3xl text-textDark">Record of Supervision (Section C)</h1>
        <Button onClick={handleCreateNewEntry} className="bg-primaryBlue hover:bg-primaryBlue/90 text-white">
          Create New Supervision Record
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-textLight mb-1">CURRENT WEEK STARTING (DATE)</div>
            <div className="text-lg font-semibold text-textDark">{currentWeekStartStr}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-textLight mb-1">CUMULATIVE SUPERVISION HOURS</div>
            <div className="text-lg font-semibold text-green-600">{totalHoursDisplay}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-textLight mb-1">REMAINING SUPERVISION HOURS</div>
            <div className="text-lg font-semibold text-red-600">{remainingHoursDisplay}</div>
          </CardContent>
        </Card>
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
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supervisor Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Principal or Secondary</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Individual/Group/Other</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Summary</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {group.entries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleEditEntry(entry)}>
                                  Edit
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDeleteEntry(entry.id)}>
                                  Delete
                                </Button>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(entry.date_of_supervision).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {entry.duration_minutes}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {entry.supervisor_name}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {entry.supervisor_type}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {entry.supervision_type}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">
                              {entry.summary}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
  )
}

export default SectionC
