import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  getPDEntriesGroupedByWeek, 
  getPDCompetencies, 
  createPDEntry, 
  updatePDEntry, 
  deletePDEntry
} from '@/lib/api'
import type { PDEntry, PDCompetency, PDWeeklyGroup } from '@/types/pd'

const SectionB: React.FC = () => {
  const [weeklyGroups, setWeeklyGroups] = useState<PDWeeklyGroup[]>([])
  const [competencies, setCompetencies] = useState<PDCompetency[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PDEntry | null>(null)
  const [formData, setFormData] = useState({
    activity_type: 'WORKSHOP',
    date_of_activity: new Date().toISOString().split('T')[0],
    duration_minutes: 60,
    is_active_activity: true,
    activity_details: '',
    topics_covered: '',
    competencies_covered: [] as string[]
  })

  const activityTypes = [
    'WORKSHOP', 'WEBINAR', 'LECTURE', 'PRESENTATION', 
    'READING', 'COURSE', 'CONFERENCE', 'TRAINING', 'OTHER'
  ]

  const durationQuickLinks = [15, 30, 60, 120, 180, 240, 480]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [groupsData, competenciesData] = await Promise.all([
        getPDEntriesGroupedByWeek(),
        getPDCompetencies()
      ])
      setWeeklyGroups(groupsData)
      setCompetencies(competenciesData)
    } catch (error) {
      console.error('Error loading data:', error)
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
      setCompetencies([
        { id: 1, name: 'Communication and Interpersonal Relationships', description: '', is_active: true },
        { id: 2, name: 'Ethical, Legal and Professional Matters', description: '', is_active: true },
        { id: 3, name: 'Intervention Strategies', description: '', is_active: true },
        { id: 4, name: 'Knowledge of the Discipline', description: '', is_active: true },
        { id: 5, name: 'Practice Across the Lifespan', description: '', is_active: true },
        { id: 6, name: 'Psychological Measurement and Assessment', description: '', is_active: true },
        { id: 7, name: 'Research and Evaluation', description: '', is_active: true },
        { id: 8, name: 'Working within a Cross Cultural Context', description: '', is_active: true }
      ])
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
      competencies_covered: []
    })
    setEditingEntry(null)
    setShowForm(true)
  }

  const handleEdit = (entry: PDEntry) => {
    setFormData({
      activity_type: entry.activity_type,
      date_of_activity: entry.date_of_activity,
      duration_minutes: entry.duration_minutes,
      is_active_activity: entry.is_active_activity,
      activity_details: entry.activity_details,
      topics_covered: entry.topics_covered,
      competencies_covered: entry.competencies_covered
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
      loadData()
    } catch (error) {
      console.error('Error saving entry:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await deletePDEntry(id)
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

  const filteredGroups = weeklyGroups.filter(group => 
    group.entries.some(entry => 
      entry.activity_details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.topics_covered.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.activity_type.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Record of Professional Development</h1>
        <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700">
          Create New PD Record
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">CURRENT WEEK STARTING (DATE)</div>
            <div className="text-lg font-semibold">
              {new Date().toISOString().split('T')[0]}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">CUMULATIVE PD HOURS</div>
            <div className="text-lg font-semibold text-green-600">
              {weeklyGroups.length > 0 ? weeklyGroups[0].cumulative_total_display : '0:00'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">REMAINING PD HOURS</div>
            <div className="text-lg font-semibold text-red-600">
              {weeklyGroups.length > 0 ? 
                (60 - parseInt(weeklyGroups[0].cumulative_total_display.split(':')[0])).toString() + ':00' : 
                '60:00'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Controls */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Button variant="outline">Go</Button>
        <select className="px-3 py-2 border rounded">
          <option>Rows 50</option>
        </select>
        <select className="px-3 py-2 border rounded">
          <option>Actions</option>
        </select>
      </div>

      {/* Weekly Groups */}
      <div className="space-y-6">
        {filteredGroups.map((group, groupIndex) => (
          <Card key={group.week_starting}>
            <CardHeader>
              <CardTitle className="text-lg">
                Week Starting: {new Date(group.week_starting).toLocaleDateString()}, 
                Week Total: {group.week_total_display}, 
                Cumulative Total: {group.cumulative_total_display}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Date of Activity</th>
                      <th className="text-left p-2">Duration in Minutes</th>
                      <th className="text-left p-2">Activity Type</th>
                      <th className="text-left p-2">Active activity?</th>
                      <th className="text-left p-2">Activity Details</th>
                      <th className="text-left p-2">Competencies</th>
                      <th className="text-left p-2">Topics/Learnings</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.entries.map((entry) => (
                      <tr key={entry.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{new Date(entry.date_of_activity).toLocaleDateString()}</td>
                        <td className="p-2">{entry.duration_minutes}</td>
                        <td className="p-2">{entry.activity_type}</td>
                        <td className="p-2">{entry.is_active_activity ? 'Y' : 'N'}</td>
                        <td className="p-2">{entry.activity_details}</td>
                        <td className="p-2">
                          <div className="flex flex-wrap gap-1">
                            {entry.competencies_covered.map((comp, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {comp}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-2">{entry.topics_covered}</td>
                        <td className="p-2">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(entry)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(entry.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* PD Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingEntry ? 'Edit Professional Development Activity' : 'Professional Development Activity Details'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
                <label className="block text-sm font-medium mb-2">Competencies Covered by Activity</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Available Competencies</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto border p-2 rounded">
                      {competencies.map(comp => (
                        <div
                          key={comp.id}
                          onClick={() => toggleCompetency(comp.name)}
                          className={`p-2 cursor-pointer rounded text-sm ${
                            formData.competencies_covered.includes(comp.name)
                              ? 'bg-blue-100 text-blue-800'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {comp.name}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Selected Competencies</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto border p-2 rounded">
                      {formData.competencies_covered.map((comp, idx) => (
                        <div key={idx} className="p-2 bg-blue-100 text-blue-800 rounded text-sm flex justify-between">
                          <span>{comp}</span>
                          <button
                            onClick={() => toggleCompetency(comp)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                  {editingEntry ? 'Update' : 'Create'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default SectionB
