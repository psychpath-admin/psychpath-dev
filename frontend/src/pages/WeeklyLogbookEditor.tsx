import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft,
  Lock,
  Edit,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Calendar,
  FileText
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { formatDurationWithUnit } from '../utils/durationUtils'

interface LogbookEntry {
  id: number | null
  week_start_date: string
  week_end_date: string
  week_display: string
  week_starting_display: string
  status: 'ready' | 'submitted' | 'approved' | 'rejected'
  rag_status: 'red' | 'amber' | 'green'
  is_overdue: boolean
  has_supervisor_comments: boolean
  is_editable: boolean
  supervisor_comments: string | null
  submitted_at: string | null
  reviewed_at: string | null
  reviewed_by_name: string | null
  section_totals: {
    section_a: {
      weekly_hours: number
      cumulative_hours: number
      dcc?: {
        weekly_hours: number
        cumulative_hours: number
      }
      cra?: {
        weekly_hours: number
        cumulative_hours: number
      }
    }
    section_b: {
      weekly_hours: number
      cumulative_hours: number
    }
    section_c: {
      weekly_hours: number
      cumulative_hours: number
    }
    total: {
      weekly_hours: number
      cumulative_hours: number
    }
  }
  active_unlock: {
    unlock_expires_at: string
    duration_minutes: number
    remaining_minutes: number
  } | null
  has_logbook: boolean
}

interface UserProfile {
  first_name: string
  last_name: string
  ahpra_registration_number?: string
  middle_name?: string
}

export default function WeeklyLogbookEditor() {
  const { weekStart } = useParams<{ weekStart: string }>()
  const navigate = useNavigate()
  const [logbook, setLogbook] = useState<LogbookEntry | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [sectionAEntries, setSectionAEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)

  useEffect(() => {
    if (weekStart) {
      fetchLogbookData()
      fetchUserProfile()
      fetchSectionAEntries()
    }
  }, [weekStart])

  const fetchLogbookData = async () => {
    try {
      setLoading(true)
      const response = await apiFetch(`/api/logbook/dashboard/`)
      if (response.ok) {
        const logbooks = await response.json()
        const selectedLogbook = logbooks.find((lb: LogbookEntry) => 
          lb.week_start_date === weekStart
        )
        setLogbook(selectedLogbook || null)
      } else {
        toast.error('Failed to load logbook data')
      }
    } catch (error) {
      console.error('Error fetching logbook data:', error)
      toast.error('Failed to load logbook data')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async () => {
    try {
      const response = await apiFetch('/api/user-profile/')
      if (response.ok) {
        const profile = await response.json()
        setUserProfile(profile)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchSectionAEntries = async () => {
    if (!weekStart) return
    
    try {
      const response = await apiFetch(`/api/section-a/entries/?week_starting=${weekStart}`)
      if (response.ok) {
        const entries = await response.json()
        setSectionAEntries(Array.isArray(entries) ? entries : [])
      }
    } catch (error) {
      console.error('Error fetching Section A entries:', error)
      setSectionAEntries([])
    }
  }

  const handleCreateLogbook = async () => {
    if (!logbook) return

    // Check if logbook already exists
    if (logbook.has_logbook && logbook.status === 'approved') {
      toast.error('Cannot regenerate approved logbook')
      return
    }

    if (logbook.has_logbook && logbook.status === 'submitted') {
      toast.error('Cannot regenerate submitted logbook')
      return
    }

    if (logbook.has_logbook && (logbook.status === 'ready' || logbook.status === 'rejected')) {
      setShowRegenerateModal(true)
      return
    }

    // Create new logbook
    await createNewLogbook()
  }

  const createNewLogbook = async () => {
    if (!logbook) return

    try {
      setCreating(true)
      const response = await apiFetch('/api/logbook/create/', {
        method: 'POST',
        body: JSON.stringify({
          week_start_date: logbook.week_start_date
        })
      })

      if (response.ok) {
        const newLogbook = await response.json()
        setLogbook(newLogbook) // Use the complete new logbook data from backend
        toast.success('Logbook created successfully')
        setShowRegenerateModal(false)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create logbook')
      }
    } catch (error) {
      console.error('Error creating logbook:', error)
      toast.error('Failed to create logbook')
    } finally {
      setCreating(false)
    }
  }

  const handleRegenerateConfirm = () => {
    createNewLogbook()
  }

  const handleBackToDashboard = () => {
    navigate('/logbook')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>
      case 'submitted':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Submitted</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200"><AlertTriangle className="h-3 w-3 mr-1" />Rejected</Badge>
      case 'ready':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Edit className="h-3 w-3 mr-1" />Ready</Badge>
      default:
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Ready</Badge>
    }
  }

  const formatDateDDMMYYYY = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!logbook) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Logbook data not found. Please return to the dashboard and select a valid week.
          </AlertDescription>
        </Alert>
        <Button onClick={handleBackToDashboard} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    )
  }

  const isLocked = logbook.status === 'approved' || logbook.status === 'submitted'
  const canEdit = logbook.is_editable && !isLocked

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={handleBackToDashboard} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Weekly Logbook</h1>
            <p className="text-gray-600">{logbook.week_starting_display}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(logbook.status)}
          {isLocked && <Lock className="h-5 w-5 text-gray-500" />}
        </div>
      </div>

      {/* Logbook Header Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Logbook Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Provisional Psychologist's Name
            </label>
            <div className="p-3 bg-gray-50 border rounded-md">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">
                  {userProfile ? `${userProfile.first_name} ${userProfile.middle_name || ''} ${userProfile.last_name}`.trim() : 'Loading...'}
                </span>
              </div>
            </div>
          </div>

          {/* Registration Number and Week Beginning */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Registration Number
              </label>
              <div className="p-3 bg-gray-50 border rounded-md">
                <span className="font-mono text-sm">
                  {userProfile?.ahpra_registration_number || 'Not provided'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Week Beginning
              </label>
              <div className="p-3 bg-gray-50 border rounded-md">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{formatDateDDMMYYYY(logbook.week_start_date)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section A */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">SECTION A: Weekly record of professional practice</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Section A Table Header */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-3 text-left font-medium">Session</th>
                  <th className="border border-gray-300 p-3 text-left font-medium">Psychological practice: Client contact</th>
                  <th className="border border-gray-300 p-3 text-left font-medium">Duration</th>
                  <th className="border border-gray-300 p-3 text-left font-medium">Psychological practice: Client-related activity</th>
                  <th className="border border-gray-300 p-3 text-left font-medium">Duration</th>
                  <th className="border border-gray-300 p-3 text-left font-medium">Reflections on experience</th>
                </tr>
                <tr className="bg-gray-100">
                  <td className="border border-gray-300 p-2 text-sm text-gray-600">
                    Provide details of:<br />
                    • place of practice<br />
                    • client ID<br />
                    • presenting issues
                  </td>
                  <td className="border border-gray-300 p-2 text-sm text-gray-600">
                    Provide details of:<br />
                    • date of activity<br />
                    • psychological assessment and/or intervention/prevention/evaluation
                  </td>
                  <td className="border border-gray-300 p-2 text-sm text-gray-600">
                    Hours
                  </td>
                  <td className="border border-gray-300 p-2 text-sm text-gray-600">
                    Provide details of:<br />
                    • date of activity<br />
                    • problem formulation, diagnosis, treatment planning/modification, reporting/consultation
                  </td>
                  <td className="border border-gray-300 p-2 text-sm text-gray-600">
                    Hours
                  </td>
                  <td className="border border-gray-300 p-2 text-sm text-gray-600">
                    Comments
                  </td>
                </tr>
              </thead>
              <tbody>
                {sectionAEntries.length === 0 ? (
                  <tr>
                    <td className="border border-gray-300 p-3 text-center text-gray-500" colSpan={6}>
                      {logbook.has_logbook ? (
                        canEdit ? 'No Section A entries recorded for this week' : 'Logbook is locked'
                      ) : (
                        'No Section A entries recorded for this week'
                      )}
                    </td>
                  </tr>
                ) : (
                  sectionAEntries.map((entry, index) => (
                    <tr key={entry.id || index}>
                      <td className="border border-gray-300 p-3">
                        <div className="text-sm">
                          <div><strong>Place:</strong> {entry.place_of_practice || ''}</div>
                          <div><strong>Client ID:</strong> {entry.client_id || ''}</div>
                          <div><strong>Issues:</strong> {entry.presenting_issues || ''}</div>
                        </div>
                      </td>
                      <td className="border border-gray-300 p-3">
                        <div className="text-sm">
                          <div><strong>Date:</strong> {entry.session_date ? formatDateDDMMYYYY(entry.session_date) : ''}</div>
                          <div><strong>Activity:</strong> {
                            entry.session_activity_types && entry.session_activity_types.length > 0 
                              ? entry.session_activity_types.join(', ').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                              : entry.activity_description || ''
                          }</div>
                        </div>
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        <span className="font-medium">
                          {entry.entry_type === 'client_contact' && entry.duration_minutes ? formatDurationWithUnit(entry.duration_minutes) : ''}
                        </span>
                      </td>
                      <td className="border border-gray-300 p-3">
                        <div className="text-sm">
                          {(entry.entry_type === 'cra' || entry.entry_type === 'independent_activity') ? (
                            <>
                              <div><strong>Date:</strong> {entry.session_date ? formatDateDDMMYYYY(entry.session_date) : ''}</div>
                              <div><strong>Activity:</strong> {
                                entry.session_activity_types && entry.session_activity_types.length > 0 
                                  ? entry.session_activity_types.join(', ').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                                  : entry.activity_description || entry.client_related_activity || ''
                              }</div>
                            </>
                          ) : (
                            <div className="text-gray-400 italic">No CRA activity</div>
                          )}
                        </div>
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        <span className="font-medium">
                          {(entry.entry_type === 'cra' || entry.entry_type === 'independent_activity') && entry.duration_minutes ? formatDurationWithUnit(entry.duration_minutes) : ''}
                        </span>
                      </td>
                      <td className="border border-gray-300 p-3">
                        <div className="text-sm">
                          {entry.reflections || 'No reflections recorded'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Section A Cumulative Totals */}
          <div className="mt-6">
            <h4 className="text-md font-semibold mb-3">Section A Totals</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 p-3 text-left font-medium"></th>
                    <th className="border border-gray-300 p-3 text-left font-medium">Direct client contact</th>
                    <th className="border border-gray-300 p-3 text-left font-medium">Client-related activity</th>
                    <th className="border border-gray-300 p-3 text-left font-medium">Total psychological practice (hours)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-3 font-medium">Weekly total</td>
                    <td className="border border-gray-300 p-3">
                      {logbook.section_totals.section_a.dcc?.weekly_hours || 0}h
                    </td>
                    <td className="border border-gray-300 p-3">
                      {logbook.section_totals.section_a.cra?.weekly_hours || 0}h
                    </td>
                    <td className="border border-gray-300 p-3 font-medium">
                      {(logbook.section_totals.section_a.dcc?.weekly_hours || 0) + (logbook.section_totals.section_a.cra?.weekly_hours || 0)}h
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3 font-medium">Cumulative total</td>
                    <td className="border border-gray-300 p-3">{logbook.section_totals.section_a.dcc?.cumulative_hours || 0}h</td>
                    <td className="border border-gray-300 p-3">{logbook.section_totals.section_a.cra?.cumulative_hours || 0}h</td>
                    <td className="border border-gray-300 p-3 font-medium">{(logbook.section_totals.section_a.dcc?.cumulative_hours || 0) + (logbook.section_totals.section_a.cra?.cumulative_hours || 0)}h</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        {!logbook.has_logbook ? (
          <Button onClick={handleCreateLogbook} disabled={creating}>
            {creating ? 'Creating...' : 'Create Logbook'}
          </Button>
        ) : canEdit ? (
          <Button onClick={handleCreateLogbook} variant="outline" disabled={creating}>
            <Edit className="h-4 w-4 mr-2" />
            {creating ? 'Regenerating...' : 'Regenerate Logbook'}
          </Button>
        ) : (
          <Button disabled>
            <Lock className="h-4 w-4 mr-2" />
            Logbook Locked
          </Button>
        )}
      </div>

      {/* Regenerate Confirmation Modal */}
      {showRegenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Confirm Regeneration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                A logbook already exists for this week. Do you want to regenerate it? 
                This will replace existing data.
              </p>
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowRegenerateModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleRegenerateConfirm}
                  disabled={creating}
                >
                  {creating ? 'Regenerating...' : 'Yes (Regenerate)'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
