import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, Save, Trash2, Download, ArrowLeft } from 'lucide-react'
import { 
  getLogbook, 
  updateLogbook, 
  submitLogbook, 
  downloadLogbookPDF,
  createLogbookEntry,
  updateLogbookEntry,
  deleteLogbookEntry
} from '@/lib/api'

interface LogbookEntry {
  id: number
  date: string
  client_age: number
  client_issue: string
  activity_description: string
  duration_hours: number
  reflection: string
}

interface Logbook {
  id: number
  week_start_date: string
  week_end_date: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'locked'
  total_dcc_hours: number
  total_cra_hours: number
  total_pd_hours: number
  total_sup_hours: number
  total_weekly_hours: number
  cumulative_dcc_hours: number
  cumulative_cra_hours: number
  cumulative_pd_hours: number
  cumulative_sup_hours: number
  cumulative_total_hours: number
  dcc_entries: LogbookEntry[]
  cra_entries: LogbookEntry[]
  pd_entries: LogbookEntry[]
  sup_entries: LogbookEntry[]
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  locked: 'bg-purple-100 text-purple-800',
}

const statusLabels = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  locked: 'Locked',
}

export default function LogbookEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [logbook, setLogbook] = useState<Logbook | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<'section_a' | 'section_b' | 'section_c'>('section_a')
  const [showEntryForm, setShowEntryForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<LogbookEntry | null>(null)
  const [entryForm, setEntryForm] = useState({
    date: '',
    client_age: '',
    client_issue: '',
    activity_description: '',
    duration_hours: '',
    reflection: '',
    entryType: '',
  })

  useEffect(() => {
    if (id) {
      loadLogbook()
    }
  }, [id])

  const loadLogbook = async () => {
    try {
      setLoading(true)
      const data = await getLogbook(parseInt(id!))
      setLogbook(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logbook')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveLogbook = async () => {
    if (!logbook) return
    try {
      setSaving(true)
      await updateLogbook(logbook.id, {
        week_start_date: logbook.week_start_date,
        week_end_date: logbook.week_end_date,
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save logbook')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitLogbook = async () => {
    if (!logbook) return
    try {
      setSaving(true)
      await submitLogbook(logbook.id)
      loadLogbook()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit logbook')
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!logbook) return
    try {
      const blob = await downloadLogbookPDF(logbook.id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `logbook_${logbook.week_start_date}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download PDF')
    }
  }

  const handleCreateEntry = (entryType?: string) => {
    setEditingEntry(null)
    setEntryForm({
      date: '',
      client_age: '',
      client_issue: '',
      activity_description: '',
      duration_hours: '',
      reflection: '',
      entryType: '',
    })
    setShowEntryForm(true)
    // Store the entry type for the form
    if (entryType) {
      setEntryForm(prev => ({ ...prev, entryType }))
    }
  }

  const handleEditEntry = (entry: LogbookEntry) => {
    setEditingEntry(entry)
    setEntryForm({
      date: entry.date,
      client_age: entry.client_age.toString(),
      client_issue: entry.client_issue,
      activity_description: entry.activity_description,
      duration_hours: entry.duration_hours.toString(),
      reflection: entry.reflection,
    })
    setShowEntryForm(true)
  }

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!logbook) return

    try {
      setSaving(true)
      const entryData = {
        date: entryForm.date,
        client_age: parseInt(entryForm.client_age),
        client_issue: entryForm.client_issue,
        activity_description: entryForm.activity_description,
        duration_hours: parseFloat(entryForm.duration_hours),
        reflection: entryForm.reflection,
      }

      // Map frontend sections to backend API sections
      let backendSection: 'dcc' | 'cra' | 'pd' | 'sup'
      if (activeSection === 'section_a') {
        // For Section A, we need to determine if this is DCC or CRA
        // For now, default to DCC - we can add a selector later if needed
        backendSection = 'dcc'
      } else if (activeSection === 'section_b') {
        backendSection = 'pd'
      } else {
        backendSection = 'sup'
      }

      if (editingEntry) {
        await updateLogbookEntry(logbook.id, backendSection, editingEntry.id, entryData)
      } else {
        await createLogbookEntry(logbook.id, backendSection, entryData)
      }

      setShowEntryForm(false)
      loadLogbook()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entry')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEntry = async (entryId: number) => {
    if (!logbook) return
    if (!confirm('Are you sure you want to delete this entry?')) return

    try {
      setSaving(true)
      // Map frontend sections to backend API sections
      let backendSection: 'dcc' | 'cra' | 'pd' | 'sup'
      if (activeSection === 'section_a') {
        // For Section A, we need to determine if this is DCC or CRA
        // For now, default to DCC - we can add a selector later if needed
        backendSection = 'dcc'
      } else if (activeSection === 'section_b') {
        backendSection = 'pd'
      } else {
        backendSection = 'sup'
      }
      await deleteLogbookEntry(logbook.id, backendSection, entryId)
      loadLogbook()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry')
    } finally {
      setSaving(false)
    }
  }

  const getSectionEntries = () => {
    if (!logbook) return []
    switch (activeSection) {
      case 'section_a': 
        // Combine DCC and CRA entries for Section A
        return [...(logbook.dcc_entries || []), ...(logbook.cra_entries || [])]
      case 'section_b': return logbook.pd_entries || []
      case 'section_c': return logbook.sup_entries || []
      default: return []
    }
  }

  const getSectionTotal = () => {
    if (!logbook) return 0
    switch (activeSection) {
      case 'section_a': 
        // Combine DCC and CRA hours for Section A
        return (logbook.total_dcc_hours || 0) + (logbook.total_cra_hours || 0)
      case 'section_b': return logbook.total_pd_hours || 0
      case 'section_c': return logbook.total_sup_hours || 0
      default: return 0
    }
  }

  const getSectionCumulative = () => {
    if (!logbook) return 0
    switch (activeSection) {
      case 'section_a': 
        // Combine DCC and CRA cumulative hours for Section A
        return (logbook.cumulative_dcc_hours || 0) + (logbook.cumulative_cra_hours || 0)
      case 'section_b': return logbook.cumulative_pd_hours || 0
      case 'section_c': return logbook.cumulative_sup_hours || 0
      default: return 0
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading logbook with ID: {id}...</div>
        </div>
      </div>
    )
  }

  if (!logbook) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Logbook not found</h1>
          <Button onClick={() => navigate('/logbook')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Logbooks
          </Button>
        </div>
      </div>
    )
  }

  const canEdit = logbook.status === 'draft' || logbook.status === 'rejected'

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/logbook')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primaryBlue">
              Week of {formatDate(logbook.week_start_date)}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={statusColors[logbook.status]}>
                {statusLabels[logbook.status]}
              </Badge>
              <span className="text-sm text-gray-600">
                {logbook.total_weekly_hours} hours this week, {logbook.cumulative_total_hours} total
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button
              onClick={handleSaveLogbook}
              disabled={saving}
              className="bg-primaryBlue hover:bg-primaryBlue/90"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          )}
          {canEdit && logbook.status === 'draft' && (
            <Button
              onClick={handleSubmitLogbook}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Submit for Review
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'section_a', label: 'Section A', total: (logbook.total_dcc_hours || 0) + (logbook.total_cra_hours || 0), description: 'Direct Client Contact + Client Related Activities', color: 'bg-blue-600' },
          { key: 'section_b', label: 'Section B', total: logbook.total_pd_hours || 0, description: 'Professional Development', color: 'bg-green-600' },
          { key: 'section_c', label: 'Section C', total: logbook.total_sup_hours || 0, description: 'Supervision', color: 'bg-purple-600' },
        ].map((section) => (
          <Button
            key={section.key}
            variant={activeSection === section.key ? 'default' : 'outline'}
            onClick={() => setActiveSection(section.key as any)}
            className={activeSection === section.key ? section.color : ''}
          >
            {section.label} ({section.total}h)
          </Button>
        ))}
      </div>

      {/* Section Content */}
      {activeSection === 'section_a' ? (
        <div className="space-y-6">
          {/* Section A Header */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-primaryBlue mb-2">
              Section A: Record of Professional Practice
            </h2>
            <div className="text-sm text-gray-600 mb-4">
              Current Week Starting: {formatDate(logbook.week_start_date)}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cumulative Hours Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">CUMULATIVE PSYCHOLOGICAL PRACTICE HOURS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div>Contact: {Math.floor((logbook.cumulative_dcc_hours || 0) / 60)}:{(logbook.cumulative_dcc_hours || 0) % 60 < 10 ? '0' : ''}{(logbook.cumulative_dcc_hours || 0) % 60}</div>
                  <div>Related: {Math.floor((logbook.cumulative_cra_hours || 0) / 60)}:{(logbook.cumulative_cra_hours || 0) % 60 < 10 ? '0' : ''}{(logbook.cumulative_cra_hours || 0) % 60}</div>
                  <div className="font-bold">Total: {Math.floor(((logbook.cumulative_dcc_hours || 0) + (logbook.cumulative_cra_hours || 0)) / 60)}:{((logbook.cumulative_dcc_hours || 0) + (logbook.cumulative_cra_hours || 0)) % 60 < 10 ? '0' : ''}{((logbook.cumulative_dcc_hours || 0) + (logbook.cumulative_cra_hours || 0)) % 60}</div>
                </div>
              </CardContent>
            </Card>

            {/* Remaining Hours Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">REMAINING PSYCHOLOGICAL PRACTICE HOURS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div>Contact: {Math.floor((500 - (logbook.cumulative_dcc_hours || 0)) / 60)}:{((500 - (logbook.cumulative_dcc_hours || 0)) % 60) < 10 ? '0' : ''}{(500 - (logbook.cumulative_dcc_hours || 0)) % 60}</div>
                  <div>Related: {Math.floor((860 - (logbook.cumulative_cra_hours || 0)) / 60)}:{((860 - (logbook.cumulative_cra_hours || 0)) % 60) < 10 ? '0' : ''}{(860 - (logbook.cumulative_cra_hours || 0)) % 60}</div>
                  <div className="font-bold">Total: {Math.floor((1360 - ((logbook.cumulative_dcc_hours || 0) + (logbook.cumulative_cra_hours || 0))) / 60)}:{((1360 - ((logbook.cumulative_dcc_hours || 0) + (logbook.cumulative_cra_hours || 0))) % 60) < 10 ? '0' : ''}{(1360 - ((logbook.cumulative_dcc_hours || 0) + (logbook.cumulative_cra_hours || 0))) % 60}</div>
                </div>
                <div className="mt-2 text-xs">
                  <button className="text-blue-600 hover:underline mr-2">Goto SECTION B</button>
                  <button className="text-blue-600 hover:underline">Goto SECTION C</button>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">ACTIONS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {canEdit && (
                  <>
                    <Button className="w-full bg-primaryBlue hover:bg-primaryBlue/90" onClick={() => handleCreateEntry('client_contact')}>
                      + New Client Contact Record
                    </Button>
                    <Button className="w-full bg-primaryBlue hover:bg-primaryBlue/90" onClick={() => handleCreateEntry('simulated_contact')}>
                      + Simulated Client Contact Record
                    </Button>
                    <Button className="w-full bg-primaryBlue hover:bg-primaryBlue/90" onClick={() => handleCreateEntry('independent_activity')}>
                      + Independent Client Related Activity
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Client List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Client Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {getSectionEntries().length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No records found or selected yet. Press CREATE to begin adding Section A: Professional Practice records.
                    </div>
                  ) : (
                    getSectionEntries()
                      .filter(entry => entry.client_issue) // Only show entries with client pseudonyms
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((entry) => (
                        <div key={entry.id} className="p-2 border rounded cursor-pointer hover:bg-gray-50">
                          <div className="font-medium text-sm">{entry.client_issue}</div>
                          <div className="text-xs text-gray-500">{formatDate(entry.date)}</div>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Independent Activities */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Independent Client Related Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {getSectionEntries().filter(entry => !entry.client_issue || entry.activity_description.includes('Independent')).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    There are no independent client related activities.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getSectionEntries()
                      .filter(entry => !entry.client_issue || entry.activity_description.includes('Independent'))
                      .map((entry) => (
                        <div key={entry.id} className="border rounded p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex gap-4 text-sm text-gray-600">
                              <span>{formatDate(entry.date)}</span>
                              <span>{entry.duration_hours}h</span>
                            </div>
                            {canEdit && (
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleEditEntry(entry)}>
                                  Edit
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDeleteEntry(entry.id)} className="text-red-600 hover:text-red-700">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div><span className="font-medium">Activity:</span> {entry.activity_description}</div>
                            <div><span className="font-medium">Reflection:</span> {entry.reflection}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                {
                  activeSection === 'section_b' ? 'Section B: Professional Development' :
                  'Section C: Supervision'
                }
              </CardTitle>
              {canEdit && (
                <Button onClick={() => handleCreateEntry()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Entry
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">This Week:</span> {getSectionTotal()} hours
              </div>
              <div>
                <span className="font-medium">Cumulative:</span> {getSectionCumulative()} hours
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {getSectionEntries().length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No entries yet. {canEdit && 'Click "Add Entry" to get started.'}
              </div>
            ) : (
              getSectionEntries().map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>{formatDate(entry.date)}</span>
                      <span>Age: {entry.client_age}</span>
                      <span>{entry.duration_hours}h</span>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditEntry(entry)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Issue:</span> {entry.client_issue}
                    </div>
                    <div>
                      <span className="font-medium">Activity:</span> {entry.activity_description}
                    </div>
                    <div>
                      <span className="font-medium">Reflection:</span> {entry.reflection}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Entry Form Modal */}
      {showEntryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingEntry ? 'Edit Entry' : 'Add Entry'} - Section {activeSection.toUpperCase()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveEntry} className="space-y-4">
                {activeSection === 'section_a' && !editingEntry && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Entry Type</label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={entryForm.entryType}
                      onChange={(e) => setEntryForm({ ...entryForm, entryType: e.target.value })}
                      required
                    >
                      <option value="">Select entry type...</option>
                      <option value="client_contact">Client Contact</option>
                      <option value="simulated_contact">Simulated Client Contact</option>
                      <option value="independent_activity">Independent Client Related Activity</option>
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Date</label>
                    <Input
                      type="date"
                      value={entryForm.date}
                      onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
                      max={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Client Age</label>
                    <Input
                      type="number"
                      value={entryForm.client_age}
                      onChange={(e) => setEntryForm({ ...entryForm, client_age: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {entryForm.entryType === 'independent_activity' ? 'Activity Description' : 'Client Pseudonym (e.g., BM-1961-M)'}
                  </label>
                  <Input
                    value={entryForm.client_issue}
                    onChange={(e) => setEntryForm({ ...entryForm, client_issue: e.target.value })}
                    placeholder={entryForm.entryType === 'independent_activity' ? 'Describe the independent activity...' : 'Enter client pseudonym...'}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Activity Description</label>
                  <Textarea
                    value={entryForm.activity_description}
                    onChange={(e) => setEntryForm({ ...entryForm, activity_description: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Duration (hours)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={entryForm.duration_hours}
                      onChange={(e) => setEntryForm({ ...entryForm, duration_hours: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Reflection</label>
                  <Textarea
                    value={entryForm.reflection}
                    onChange={(e) => setEntryForm({ ...entryForm, reflection: e.target.value })}
                    required
                  />
                </div>
                <div className="flex gap-4 pt-6">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => setShowEntryForm(false)}
                    className="px-6 py-2 border-blue-300 text-blue-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={saving}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingEntry ? 'Update Entry' : 'Add Entry'}
                      </>
                    )}
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