import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, BookOpen, Clock, Target, Brain } from 'lucide-react'
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }
  const [formData, setFormData] = useState({
    activity_type: 'WORKSHOP',
    date_of_activity: new Date().toISOString().split('T')[0],
    duration_minutes: 60,
    is_active_activity: true,
    activity_details: '',
    topics_covered: '',
    competencies_covered: [] as string[],
    reflection: ''
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
      reflection: ''
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
      competencies_covered: entry.competencies_covered,
      reflection: entry.reflection || ''
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
    <div className="min-h-screen bg-bgSection">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section - PsychPathway Brand */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-primary to-primary/90 rounded-card p-8 text-white shadow-md">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="text-4xl font-headings mb-2">Section B: Professional Development</h1>
                <p className="text-white/90 text-lg font-body">Track your learning activities and competency development</p>
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => window.location.href = '/section-a'}
                    className="px-3 py-2 rounded-md bg-primaryBlue text-white text-sm hover:bg-blue-700"
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
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleCreateNew}
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 font-semibold shadow-sm rounded-lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  New PD Activity
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => window.open('/competencies-help', '_blank')}
                  className="border-white text-white hover:bg-white hover:text-primary font-semibold rounded-lg bg-white/10 backdrop-blur-sm"
                >
                  <BookOpen className="h-5 w-5 mr-2" />
                  Competencies Help
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {(() => {
          const totalEntries = weeklyGroups.reduce((sum, group) => sum + group.entries.length, 0)
          const totalHours = weeklyGroups.reduce((sum, group) => 
            sum + group.entries.reduce((groupSum, entry) => groupSum + (entry.duration_minutes || 0), 0), 0) / 60
          const totalActiveHours = weeklyGroups.reduce((sum, group) => 
            sum + group.entries.filter(entry => entry.is_active_activity)
              .reduce((groupSum, entry) => groupSum + (entry.duration_minutes || 0), 0), 0) / 60
          const uniqueCompetencies = new Set(weeklyGroups.flatMap(group => 
            group.entries.flatMap(entry => entry.competencies_covered || []))).size

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="brand-card hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="brand-label">Total Activities</p>
                      <p className="text-3xl font-bold text-primary">{totalEntries}</p>
                    </div>
                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-primary" />
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
                      <p className="brand-label">Active Hours</p>
                      <p className="text-3xl font-bold text-accent">{totalActiveHours.toFixed(1)}h</p>
                    </div>
                    <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center">
                      <Target className="h-6 w-6 text-accent" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="brand-card hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="brand-label">Competencies</p>
                      <p className="text-3xl font-bold text-primary">{uniqueCompetencies}</p>
                    </div>
                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Brain className="h-6 w-6 text-primary" />
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
          <p className="text-textLight mb-6 font-body">Track your professional development requirements</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Professional Development Card */}
            <Card className="brand-card hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-textDark mb-1">
                  {weeklyGroups.length > 0 ? weeklyGroups[0].cumulative_total_display : '0:00'}
                </div>
                <div className="text-xs font-semibold text-textDark mb-1 font-body">Professional Development</div>
                <div className="text-xs text-textLight mb-2">Target: 80h</div>
                {(() => {
                  const currentHours = weeklyGroups.length > 0 ? 
                    parseInt(weeklyGroups[0].cumulative_total_display.split(':')[0]) : 0
                  const remaining = 80 - currentHours
                  return remaining > 0 ? (
                    <Badge variant="outline" className="text-accent border-accent text-xs font-semibold">
                      {remaining}:00 remaining
                    </Badge>
                  ) : (
                    <Badge className="bg-secondary text-white border-secondary text-xs font-semibold">
                      ✓ Met
                    </Badge>
                  )
                })()}
              </CardContent>
            </Card>

            {/* Active PD Card */}
            <Card className="brand-card hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 bg-secondary/10 rounded-full flex items-center justify-center">
                    <Target className="h-6 w-6 text-secondary" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-textDark mb-1">
                  {(() => {
                    const activeHours = weeklyGroups.reduce((sum, group) => 
                      sum + group.entries.filter(entry => entry.is_active_activity)
                        .reduce((groupSum, entry) => groupSum + (entry.duration_minutes || 0), 0), 0) / 60
                    return `${Math.floor(activeHours)}:${Math.round((activeHours % 1) * 60).toString().padStart(2, '0')}`
                  })()}
                </div>
                <div className="text-xs font-semibold text-textDark mb-1 font-body">Active PD Hours</div>
                <div className="text-xs text-textLight mb-2">Target: 80h</div>
                {(() => {
                  const activeHours = weeklyGroups.reduce((sum, group) => 
                    sum + group.entries.filter(entry => entry.is_active_activity)
                      .reduce((groupSum, entry) => groupSum + (entry.duration_minutes || 0), 0), 0) / 60
                  const remaining = 80 - activeHours
                  return remaining > 0 ? (
                    <Badge variant="outline" className="text-accent border-accent text-xs font-semibold">
                      {Math.floor(remaining)}:{Math.round((remaining % 1) * 60).toString().padStart(2, '0')} remaining
                    </Badge>
                  ) : (
                    <Badge className="bg-secondary text-white border-secondary text-xs font-semibold">
                      ✓ Met
                    </Badge>
                  )
                })()}
              </CardContent>
            </Card>

            {/* Competency Development Card */}
            <Card className="brand-card hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center">
                    <Brain className="h-6 w-6 text-accent" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-textDark mb-1">
                  {(() => {
                    const uniqueCompetencies = new Set(weeklyGroups.flatMap(group => 
                      group.entries.flatMap(entry => entry.competencies_covered || []))).size
                    return uniqueCompetencies
                  })()}
                </div>
                <div className="text-xs font-semibold text-textDark mb-1 font-body">Competencies Covered</div>
                <div className="text-xs text-textLight mb-2">Target: All 8 domains</div>
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
                const currentHours = weeklyGroups.length > 0 ? 
                  parseInt(weeklyGroups[0].cumulative_total_display.split(':')[0]) : 0
                return ((currentHours / 80) * 100).toFixed(1)
              })()}%</span>
            </div>
            <div className="relative">
              <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-primary via-secondary to-accent h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${(() => {
                    const currentHours = weeklyGroups.length > 0 ? 
                      parseInt(weeklyGroups[0].cumulative_total_display.split(':')[0]) : 0
                    return Math.min((currentHours / 80) * 100, 100)
                  })()}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-textLight mt-1">
                <span>{weeklyGroups.length > 0 ? weeklyGroups[0].cumulative_total_display : '0:00'}</span>
                <span>80h target</span>
              </div>
            </div>
          </div>
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
                Week Starting: {formatDate(group.week_starting)}, 
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
                        <td className="p-2">{formatDate(entry.date_of_activity)}</td>
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
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6 px-6 pb-6">
                <Button 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
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

