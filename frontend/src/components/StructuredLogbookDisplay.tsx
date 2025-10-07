import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  X, 
  Clock, 
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
  Edit,
  RefreshCw,
  Send
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'

interface SectionAEntry {
  id: number
  entry_type: 'client_contact' | 'simulated_contact' | 'independent_activity' | 'cra'
  simulated: boolean
  parent_dcc_entry?: number
  client_id: string
  session_date: string
  place_of_practice: string
  presenting_issues: string
  session_activity_types: string[]
  duration_minutes: number
  reflections_on_experience: string
  locked: boolean
  supervisor_comment?: string
  trainee_response?: string
}

interface Logbook {
  id: number
  trainee_name: string
  week_start_date: string
  week_end_date: string
  week_display: string
  status: 'draft' | 'submitted' | 'under_review' | 'returned_for_edits' | 'approved' | 'rejected' | 'locked'
  supervisor_name?: string
  reviewed_by_name?: string
  submitted_at: string
  reviewed_at?: string
  supervisor_comments?: string
  section_totals: {
    section_a: { 
      weekly_hours: number
      cumulative_hours: number
      dcc?: { weekly_hours: number; cumulative_hours: number }
      cra?: { weekly_hours: number; cumulative_hours: number }
    }
    section_b: { weekly_hours: number; cumulative_hours: number }
    section_c: { weekly_hours: number; cumulative_hours: number }
    total: { weekly_hours: number; cumulative_hours: number }
  }
}

interface StructuredLogbookDisplayProps {
  logbook: Logbook
  onClose: () => void
  onRegenerate?: () => void
}

export default function StructuredLogbookDisplay({ logbook, onClose, onRegenerate }: StructuredLogbookDisplayProps) {
  const [sectionAEntries, setSectionAEntries] = useState<SectionAEntry[]>([])
  const [sectionBEntries, setSectionBEntries] = useState<any[]>([])
  const [sectionCEntries, setSectionCEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    fetchAllSections()
  }, [logbook.id])

  const fetchAllSections = async () => {
    try {
      setLoading(true)
      const [aRes, bRes, cRes] = await Promise.all([
        apiFetch(`/api/logbook/${logbook.id}/section-a-entries/`),
        apiFetch(`/api/logbook/${logbook.id}/section-b-entries/`),
        apiFetch(`/api/logbook/${logbook.id}/section-c-entries/`)
      ])
      if (aRes.ok) setSectionAEntries(await aRes.json())
      if (bRes.ok) setSectionBEntries(await bRes.json())
      if (cRes.ok) setSectionCEntries(await cRes.json())
    } catch (error) {
      console.error('Error fetching logbook sections:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Submitted</Badge>
      case 'under_review':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Under Review</Badge>
      case 'returned_for_edits':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Returned for Edits</Badge>
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>
      case 'locked':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Locked</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'under_review':
        return <AlertCircle className="h-4 w-4 text-blue-500" />
      case 'returned_for_edits':
        return <Edit className="h-4 w-4 text-orange-500" />
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'locked':
        return <Lock className="h-4 w-4 text-purple-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`
    } else if (hours > 0) {
      return `${hours}h`
    } else {
      return `${mins}m`
    }
  }

  const isEditable = () => {
    return ['draft', 'returned_for_edits'].includes(logbook.status)
  }

  const canRegenerate = () => {
    return ['draft', 'rejected'].includes(logbook.status)
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const response = await apiFetch(`/api/logbook/${logbook.id}/regenerate/`, {
        method: 'POST'
      })
      
      if (response.ok) {
        toast.success('Logbook regenerated successfully!')
        onRegenerate?.()
        setShowRegenerateModal(false)
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to regenerate logbook')
      }
    } catch (error) {
      console.error('Error regenerating logbook:', error)
      toast.error('Error regenerating logbook')
    } finally {
      setRegenerating(false)
    }
  }

  // Separate entries into DCC and CRA
  const dccEntries = sectionAEntries.filter(entry => 
    entry.entry_type === 'client_contact' || entry.entry_type === 'simulated_contact'
  )
  const craEntries = sectionAEntries.filter(entry => 
    entry.entry_type === 'cra' || entry.entry_type === 'independent_activity'
  )

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-7xl max-h-[95vh] overflow-y-auto bg-white">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  {getStatusIcon(logbook.status)}
                  PsychPATH Online Logbook - {logbook.week_display}
                </DialogTitle>
                <DialogDescription>
                  Provisional Psychologist: {logbook.trainee_name}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(logbook.status)}
                {!isEditable() && (
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                    <Lock className="h-3 w-3 mr-1" />
                    Read Only
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* AHPRA HEADER */}
            <div className="text-center bg-blue-50 border-2 border-blue-200 p-6 rounded-lg">
              <h1 className="text-2xl font-bold text-blue-900 mb-2">Logbook: Record of professional practice</h1>
              <h2 className="text-xl font-semibold text-blue-800 mb-3">Psychology Board Ahpra</h2>
              <div className="text-sm text-blue-700 font-medium">
                <strong>LBPP-76</strong> | <strong>5+1 provisional psychologists</strong> | <strong>Psychology</strong>
              </div>
            </div>

            {/* AHPRA PREAMBLE */}
            <div className="bg-gray-50 border border-gray-300 p-4 rounded-lg text-sm leading-relaxed">
              <p className="font-semibold mb-2">
                Provisional psychologists must maintain a record of professional practice throughout their internship. This record needs to be regularly sighted and signed by the supervisor (usually weekly) and specifically when reviewing the supervision plan or preparing a progress report/change of principal supervisor form.
              </p>
              <p>
                The Psychology Board of Australia (the Board) can request this record at any time, requiring submission within 14 days if requested. It explicitly states that this record does not need to be attached to progress reports or final assessment reports.
              </p>
            </div>

            {/* INFORMATION AND DEFINITIONS */}
            <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-lg text-sm">
              <h3 className="font-bold text-yellow-900 mb-3">Information and definitions</h3>
              <p className="mb-2">
                <strong>Client contact:</strong> Defined as performing specific tasks like psychological assessment, diagnosis, intervention, prevention, treatment, consultation, and providing advice/strategies directly with clients under supervisor guidance.
              </p>
              <p>
                <strong>Client-related activity:</strong> Defined as activities necessary to provide high-standard client service and support the provisional psychologist's achievement of core competencies. This includes supervisor guidance on relevant activities, considering individual development needs and work role context, and encompasses reading, researching for problem formulation/diagnosis, case consultation with colleagues, and formal/informal reporting.
              </p>
            </div>

            {/* PROVISIONAL PSYCHOLOGIST DETAILS */}
            <Card className="border-2 border-orange-300 bg-orange-50">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Full name - top field */}
                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-1">
                      Provisional Psychologist's Full Name
                    </label>
                    <div className="text-lg font-semibold text-gray-900 bg-white p-3 border rounded">
                      {logbook.trainee_name}
                    </div>
                  </div>
                  
                  {/* Registration Number and Week Beginning - side by side */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-1">
                        Registration Number
                      </label>
                      <div className="text-lg font-semibold text-gray-900 bg-white p-3 border rounded">
                        [Auto-filled from profile]
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-1">
                        Week Beginning
                      </label>
                      <div className="text-lg font-semibold text-gray-900 bg-white p-3 border rounded">
                        {formatDate(logbook.week_start_date)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          {/* Section A Totals already rendered above */}

          {/* SECTION B: Professional development (hidden placeholder to preserve diff) */}
          {false && (
          <Card className="border-2 border-amber-300 mt-6">
            <CardHeader className="bg-amber-50 border-b border-amber-200">
              <CardTitle className="text-lg font-bold text-amber-900">
                SECTION B: Professional development
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <Clock className="h-8 w-8 mx-auto mb-4 text-gray-400 animate-spin" />
                  <p className="text-gray-600">Loading Section B entries...</p>
                </div>
              ) : (
                <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-amber-100 border-b border-amber-200">
                        <th className="border border-amber-300 p-3 text-left font-semibold text-amber-900">Date</th>
                        <th className="border border-amber-300 p-3 text-left font-semibold text-amber-900">Activity</th>
                        <th className="border border-amber-300 p-3 text-center font-semibold text-amber-900">Duration</th>
                        <th className="border border-amber-300 p-3 text-left font-semibold text-amber-900">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionBEntries.map((e, i) => (
                        <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="border p-3">{e.date_of_activity || e.activity_date || ''}</td>
                          <td className="border p-3">{e.activity_title || e.activity_type || e.title || '—'}</td>
                          <td className="border p-3 text-center">{formatDuration(Number(e.duration_minutes || e.duration || 0))}</td>
                          <td className="border p-3">{e.notes || e.summary || ''}</td>
                        </tr>
                      ))}
                      {sectionBEntries.length === 0 && (
                        <tr>
                          <td colSpan={4} className="border p-6 text-center text-gray-500">
                            No Section B entries found for this week
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Section B Totals */}
                <div className="p-4 bg-gray-50 border-t">
                  <h4 className="font-semibold text-gray-900 mb-3">Section B Totals</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b border-gray-200">
                          <th className="border border-gray-300 p-3 text-left font-semibold text-gray-900"></th>
                          <th className="border border-gray-300 p-3 text-center font-semibold text-gray-900">Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="border p-3 font-medium">Weekly total</td>
                          <td className="border p-3 text-center font-bold">{logbook.section_totals.section_b.weekly_hours}h</td>
                        </tr>
                        <tr>
                          <td className="border p-3 font-medium">Cumulative total</td>
                          <td className="border p-3 text-center font-bold">{logbook.section_totals.section_b.cumulative_hours}h</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                </>
              )}
            </CardContent>
          </Card>
          )}

          {/* SECTION C: Supervision (hidden placeholder to preserve diff) */}
          {false && (
          <Card className="border-2 border-purple-300 mt-6">
            <CardHeader className="bg-purple-50 border-b border-purple-200">
              <CardTitle className="text-lg font-bold text-purple-900">
                SECTION C: Supervision
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <Clock className="h-8 w-8 mx-auto mb-4 text-gray-400 animate-spin" />
                  <p className="text-gray-600">Loading Section C entries...</p>
                </div>
              ) : (
                <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-purple-100 border-b border-purple-200">
                        <th className="border border-purple-300 p-3 text-left font-semibold text-purple-900">Date</th>
                        <th className="border border-purple-300 p-3 text-left font-semibold text-purple-900">Supervisor</th>
                        <th className="border border-purple-300 p-3 text-left font-semibold text-purple-900">Type</th>
                        <th className="border border-purple-300 p-3 text-center font-semibold text-purple-900">Duration</th>
                        <th className="border border-purple-300 p-3 text-left font-semibold text-purple-900">Summary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionCEntries.map((e, i) => (
                        <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="border p-3">{e.date_of_supervision || e.date || ''}</td>
                          <td className="border p-3">{e.supervisor_name || e.supervisor || '—'}</td>
                          <td className="border p-3">{e.supervision_type || '—'}</td>
                          <td className="border p-3 text-center">{formatDuration(Number(e.duration_minutes || e.duration || 0))}</td>
                          <td className="border p-3">{e.summary || ''}</td>
                        </tr>
                      ))}
                      {sectionCEntries.length === 0 && (
                        <tr>
                          <td colSpan={5} className="border p-6 text-center text-gray-500">
                            No Section C entries found for this week
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Section C Totals */}
                <div className="p-4 bg-gray-50 border-t">
                  <h4 className="font-semibold text-gray-900 mb-3">Section C Totals</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b border-gray-200">
                          <th className="border border-gray-300 p-3 text-left font-semibold text-gray-900"></th>
                          <th className="border border-gray-300 p-3 text-center font-semibold text-gray-900">Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="border p-3 font-medium">Weekly total</td>
                          <td className="border p-3 text-center font-bold">{logbook.section_totals.section_c.weekly_hours}h</td>
                        </tr>
                        <tr>
                          <td className="border p-3 font-medium">Cumulative total</td>
                          <td className="border p-3 text-center font-bold">{logbook.section_totals.section_c.cumulative_hours}h</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                </>
              )}
            </CardContent>
          </Card>
          )}

          {/* SECTION A: Weekly record of professional practice */}
          <div className="mt-6">
            {/* AHPRA Section A Header */}
            <div className="bg-blue-600 text-white p-4 font-bold text-lg text-center">
              SECTION A: Weekly record of professional practice
            </div>
          </div>

          {/* Section A Content Card */}
          <Card className="border-2 border-blue-300">
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center">
                    <Clock className="h-8 w-8 mx-auto mb-4 text-gray-400 animate-spin" />
                    <p className="text-gray-600">Loading Section A entries...</p>
                  </div>
                ) : (
                  <>
                    {/* Section A Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          {/* Main column headers */}
                          <tr className="bg-blue-100 border-b border-blue-200">
                            <th className="border border-blue-300 p-3 text-left font-semibold text-blue-900 min-w-[200px]">
                              Session
                            </th>
                            <th className="border border-blue-300 p-3 text-left font-semibold text-blue-900 min-w-[250px]">
                              Psychological practice: Client contact
                            </th>
                            <th className="border border-blue-300 p-3 text-center font-semibold text-blue-900 min-w-[80px]">
                              Duration
                            </th>
                            <th className="border border-blue-300 p-3 text-left font-semibold text-blue-900 min-w-[250px]">
                              Psychological practice: Client-related activity
                            </th>
                            <th className="border border-blue-300 p-3 text-center font-semibold text-blue-900 min-w-[80px]">
                              Duration
                            </th>
                            <th className="border border-blue-300 p-3 text-left font-semibold text-blue-900 min-w-[200px]">
                              Reflections on experience
                            </th>
                          </tr>
                          
                          {/* Instructional row */}
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <td className="border border-gray-300 p-2 text-xs text-gray-600 italic">
                              Provide details of:<br/>
                              • place of practice<br/>
                              • client ID<br/>
                              • presenting issues
                            </td>
                            <td className="border border-gray-300 p-2 text-xs text-gray-600 italic">
                              Provide details of:<br/>
                              • date of activity<br/>
                              • psychological assessment and/or intervention/prevention/evaluation
                            </td>
                            <td className="border border-gray-300 p-2 text-xs text-gray-600 italic text-center">
                              Hours
                            </td>
                            <td className="border border-gray-300 p-2 text-xs text-gray-600 italic">
                              Provide details of:<br/>
                              • date of activity<br/>
                              • problem formulation, diagnosis, treatment planning/modification, reporting/consultation
                            </td>
                            <td className="border border-gray-300 p-2 text-xs text-gray-600 italic text-center">
                              Hours
                            </td>
                            <td className="border border-gray-300 p-2 text-xs text-gray-600 italic">
                              Comments
                            </td>
                          </tr>
                        </thead>
                        
                        <tbody>
                          {/* Render DCC entries with their related CRA entries */}
                          {dccEntries.map((dccEntry) => {
                            const relatedCraEntries = craEntries.filter(cra => cra.parent_dcc_entry === dccEntry.id)
                            const maxRows = Math.max(1, relatedCraEntries.length)
                            
                            return Array.from({ length: maxRows }).map((_, rowIndex) => (
                              <tr key={`${dccEntry.id}-${rowIndex}`} className="border-b border-gray-200 hover:bg-gray-50">
                                {/* Session column - only show on first row */}
                                <td className="border border-gray-300 p-3 align-top">
                                  {rowIndex === 0 && (
                                    <div className="space-y-1">
                                      <div className="font-medium text-sm">
                                        <strong>Place:</strong> {dccEntry.place_of_practice || 'Not specified'}
                                      </div>
                                      <div className="text-sm">
                                        <strong>Client ID:</strong> {dccEntry.client_id || 'Not specified'}
                                      </div>
                                      <div className="text-sm">
                                        <strong>Issues:</strong> {dccEntry.presenting_issues || 'Not specified'}
                                      </div>
                                    </div>
                                  )}
                                </td>
                                
                                {/* Client contact column - only show on first row */}
                                <td className="border border-gray-300 p-3 align-top">
                                  {rowIndex === 0 && (
                                    <div className="space-y-1">
                                      <div className="font-medium text-sm">
                                        <strong>Date:</strong> {formatDate(dccEntry.session_date)}
                                      </div>
                                      <div className="text-sm">
                                        <strong>Activity:</strong> {dccEntry.session_activity_types?.join(', ') || 'Not specified'}
                                      </div>
                                      {dccEntry.simulated && (
                                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                                          Simulated
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </td>
                                
                                {/* Client contact duration - only show on first row */}
                                <td className="border border-gray-300 p-3 text-center align-top">
                                  {rowIndex === 0 && (
                                    <div className="font-medium">
                                      {formatDuration(dccEntry.duration_minutes)}
                                    </div>
                                  )}
                                </td>
                                
                                {/* Client-related activity column */}
                                <td className="border border-gray-300 p-3 align-top">
                                  {relatedCraEntries[rowIndex] ? (
                                    <div className="space-y-1">
                                      <div className="font-medium text-sm">
                                        <strong>Date:</strong> {formatDate(relatedCraEntries[rowIndex].session_date)}
                                      </div>
                                      <div className="text-sm">
                                        <strong>Activity:</strong> {relatedCraEntries[rowIndex].session_activity_types?.join(', ') || 'Not specified'}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-gray-400 text-sm">No related activity</div>
                                  )}
                                </td>
                                
                                {/* Client-related activity duration */}
                                <td className="border border-gray-300 p-3 text-center align-top">
                                  {relatedCraEntries[rowIndex] && (
                                    <div className="font-medium">
                                      {formatDuration(relatedCraEntries[rowIndex].duration_minutes)}
                                    </div>
                                  )}
                                </td>
                                
                                {/* Reflections column - only show on first row */}
                                <td className="border border-gray-300 p-3 align-top">
                                  {rowIndex === 0 && (
                                    <div className="text-sm">
                                      {dccEntry.reflections_on_experience || 'No reflections provided'}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))
                          })}
                          
                          {/* Show standalone CRA entries */}
                          {craEntries.filter(cra => !cra.parent_dcc_entry).map((craEntry) => (
                            <tr key={`standalone-cra-${craEntry.id}`} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="border border-gray-300 p-3 align-top">
                                <div className="space-y-1">
                                  <div className="font-medium text-sm">
                                    <strong>Place:</strong> {craEntry.place_of_practice || 'Not specified'}
                                  </div>
                                  <div className="text-sm">
                                    <strong>Client ID:</strong> {craEntry.client_id || 'Not specified'}
                                  </div>
                                  <div className="text-sm">
                                    <strong>Issues:</strong> {craEntry.presenting_issues || 'Not specified'}
                                  </div>
                                </div>
                              </td>
                              
                              <td className="border border-gray-300 p-3 align-top">
                                <div className="text-gray-400 text-sm">No client contact</div>
                              </td>
                              
                              <td className="border border-gray-300 p-3 text-center align-top">
                                <div className="text-gray-400">-</div>
                              </td>
                              
                              <td className="border border-gray-300 p-3 align-top">
                                <div className="space-y-1">
                                  <div className="font-medium text-sm">
                                    <strong>Date:</strong> {formatDate(craEntry.session_date)}
                                  </div>
                                  <div className="text-sm">
                                    <strong>Activity:</strong> {craEntry.session_activity_types?.join(', ') || 'Not specified'}
                                  </div>
                                </div>
                              </td>
                              
                              <td className="border border-gray-300 p-3 text-center align-top">
                                <div className="font-medium">
                                  {formatDuration(craEntry.duration_minutes)}
                                </div>
                              </td>
                              
                              <td className="border border-gray-300 p-3 align-top">
                                <div className="text-sm">
                                  {craEntry.reflections_on_experience || 'No reflections provided'}
                                </div>
                              </td>
                            </tr>
                          ))}
                          
                          {/* Show empty state if no entries */}
                          {sectionAEntries.length === 0 && (
                            <tr>
                              <td colSpan={6} className="border border-gray-300 p-8 text-center text-gray-500">
                                <FileText className="h-8 w-8 mx-auto mb-2" />
                                No Section A entries found for this week
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Section A Cumulative Totals Table */}
                    <div className="mt-4 border-t border-gray-300">
                      <div className="p-4 bg-gray-50">
                        <h4 className="font-semibold text-gray-900 mb-3">Section A Totals</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-100 border-b border-gray-200">
                                <th className="border border-gray-300 p-3 text-left font-semibold text-gray-900"></th>
                                <th className="border border-gray-300 p-3 text-center font-semibold text-gray-900">
                                  Direct client contact
                                </th>
                                <th className="border border-gray-300 p-3 text-center font-semibold text-gray-900">
                                  Client-related activity
                                </th>
                                <th className="border border-gray-300 p-3 text-center font-semibold text-gray-900">
                                  Total psychological practice (hours)
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-gray-200">
                                <td className="border border-gray-300 p-3 font-medium text-gray-900">
                                  Weekly total
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-medium">
                                  {logbook.section_totals.section_a.dcc?.weekly_hours || 0}h
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-medium">
                                  {logbook.section_totals.section_a.cra?.weekly_hours || 0}h
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-bold">
                                  {logbook.section_totals.section_a.weekly_hours}h
                                </td>
                              </tr>
                              <tr>
                                <td className="border border-gray-300 p-3 font-medium text-gray-900">
                                  Cumulative total
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-medium">
                                  {logbook.section_totals.section_a.dcc?.cumulative_hours || 0}h
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-medium">
                                  {logbook.section_totals.section_a.cra?.cumulative_hours || 0}h
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-bold">
                                  {logbook.section_totals.section_a.cumulative_hours}h
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

          {/* SECTION B: Professional development - after A */}
          <div className="mt-6">
            {/* AHPRA Section B Header */}
            <div className="bg-blue-600 text-white p-4 font-bold text-lg">
              SECTION B: Record of professional development
            </div>
            
            {/* Metadata */}
            <div className="flex justify-between items-center py-2 px-4 bg-white border-b border-gray-300">
              <span className="text-sm text-gray-700">Effective from: 28 October 2020</span>
            </div>
            
            {/* Professional Development Definition Box */}
            <div className="bg-gray-100 border-2 border-green-600 p-4 text-sm">
              <p className="mb-3">
                Professional development (PD) is the means by which provisional psychologists maintain, improve and broaden their knowledge, gain competence, and develop the personal qualities required in their professional practice. Professional development activities can include attending lectures, seminars, symposia, presentations, workshops, short courses, conferences, and learning by reading and using audiovisual material, including readings and PD activities undertaken to prepare for the national psychology examination, and other self directed learning. Active PD refers to activities that engage the participant and reinforce learning through written or oral activities designed to enhance and test learning. The active component may already be part of the PD activity or the supervisor may set tasks to reinforce learning.
              </p>
              <p>
                The supervisor should approve all PD activities to ensure they address the provisional psychologist's learning goals and practice requirements, and they relate to the core competencies of the internship. The provisional psychologist should update this list as required and provide this record to their supervisor for review at each supervision meeting or as required and discuss the PD outcomes with their supervisor. The supervisor should initial each activity on this record to confirm it has been reviewed and discussed.
              </p>
            </div>
          </div>

          {/* Section B Content Card */}
          <Card className="border-2 border-amber-300 mt-6">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <Clock className="h-8 w-8 mx-auto mb-4 text-gray-400 animate-spin" />
                  <p className="text-gray-600">Loading Section B entries...</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-800 text-white">
                          <th className="border border-gray-400 p-2 text-left font-semibold">Date of activity</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Type of activity</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Active PD?</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Activity details</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Specify core competency area(s)</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Specific topics covered</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Duration</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Supervisor initials</th>
                        </tr>
                        <tr className="bg-gray-100 text-gray-600 text-xs">
                          <td className="border border-gray-300 p-1"></td>
                          <td className="border border-gray-300 p-1 italic">E.g. workshop, reading, seminar, conference etc</td>
                          <td className="border border-gray-300 p-1 italic">Specify Yes or No</td>
                          <td className="border border-gray-300 p-1 italic">E.g. name of course, presenter, institution etc</td>
                          <td className="border border-gray-300 p-1 italic">E.g. intervention strategies, practice across the lifespan etc</td>
                          <td className="border border-gray-300 p-1 italic">E.g. behavioural interventions for ADHD in adolescents</td>
                          <td className="border border-gray-300 p-1 italic">Hours/mins</td>
                          <td className="border border-gray-300 p-1"></td>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionBEntries.map((e, i) => (
                          <tr key={i} className="border-b border-gray-300 hover:bg-gray-50">
                            <td className="border border-gray-300 p-2">{e.date_of_activity || e.activity_date || ''}</td>
                            <td className="border border-gray-300 p-2">{e.activity_title || e.activity_type || e.title || '—'}</td>
                            <td className="border border-gray-300 p-2">{e.active_pd || 'No'}</td>
                            <td className="border border-gray-300 p-2">{e.activity_details || e.presenter || ''}</td>
                            <td className="border border-gray-300 p-2">{e.core_competency_areas || ''}</td>
                            <td className="border border-gray-300 p-2">{e.specific_topics || e.notes || e.summary || ''}</td>
                            <td className="border border-gray-300 p-2">{formatDuration(Number(e.duration_minutes || e.duration || 0))}</td>
                            <td className="border border-gray-300 p-2">{e.supervisor_initials || ''}</td>
                          </tr>
                        ))}
                        {sectionBEntries.length === 0 && (
                          <tr>
                            <td colSpan={8} className="border border-gray-300 p-6 text-center text-gray-500">No Section B entries found for this week</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Section B Footer with Totals */}
                  <div className="flex justify-between items-center p-4 bg-gray-50 border-t">
                    <div className="text-sm text-gray-600">
                      Please insert additional rows as required
                    </div>
                    <div className="flex gap-4">
                      <div className="text-sm">
                        <span className="font-semibold">Total hours:</span>
                        <div className="border border-gray-300 p-1 w-16 text-center bg-white inline-block ml-2">
                          {logbook.section_totals.section_b.weekly_hours}
                        </div>
                      </div>
                      <div className="text-sm">
                        <span className="font-semibold">Cumulative hours:</span>
                        <div className="border border-gray-300 p-1 w-16 text-center bg-white inline-block ml-2">
                          {logbook.section_totals.section_b.cumulative_hours}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* SECTION C: Supervision - after B */}
          <div className="mt-6">
            {/* Provisional Psychologist Details and Signature Block */}
            <div className="bg-gray-100 border border-gray-300 p-4 mb-4">
              <div className="grid grid-cols-2 gap-8">
                {/* Left Side - Provisional Psychologist Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Provisional psychologist name
                    </label>
                    <div className="bg-white border border-gray-300 p-2 h-8">
                      {logbook.trainee_name}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Date
                    </label>
                    <div className="bg-white border border-gray-300 p-2 h-8">
                      {/* Empty for signature */}
                    </div>
                  </div>
                </div>
                
                {/* Right Side - Signature Block */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Signature
                  </label>
                  <div className="bg-white border border-gray-300 p-2 h-16">
                    {/* Empty signature box */}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION C Header */}
            <div className="bg-blue-600 text-white p-4 font-bold text-lg text-center">
              SECTION C: Record of supervision
            </div>
            
            {/* Introduction Text */}
            <div className="bg-white p-4 text-sm">
              <p>
                The provisional psychologist should record an entry in this record of supervision following each supervision meeting, or in time to be tabled at the next supervision meeting. Each entry should be initialled by the supervisor who provided the supervision.
              </p>
            </div>
            
            {/* Supervision Requirements */}
            <div className="bg-white p-4 text-sm">
              <h4 className="font-bold mb-2">Supervision for the 5+1 internship must:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>total at least 80 hours over the course of the internship</li>
                <li>include at least 50 hours of direct, individual supervision provided by the principal supervisor</li>
                <li>be provided at a ratio of 1 hour of supervision for every 17 hours of internship</li>
                <li>be provided frequently for the full duration of the internship (usually weekly)</li>
                <li>be primarily direct (real time verbal) supervision using a visual medium - either in person or via video-conference etc; no more than 20 hours may be via telephone and no more than 10 hours may be asynchronous (i.e. written feedback)</li>
                <li>be primarily accrued in sessions of 1 hour or more; no more than 10 hours of shorter supervision sessions may be claimed</li>
              </ul>
            </div>
          </div>

          {/* Section C Content Card */}
          <Card className="border-2 border-purple-300 mt-6">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <Clock className="h-8 w-8 mx-auto mb-4 text-gray-400 animate-spin" />
                  <p className="text-gray-600">Loading Section C entries...</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-800 text-white">
                          <th className="border border-gray-400 p-2 text-left font-semibold">Date of supervision</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Name of supervisor</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Principal or secondary?</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Individual, group or other?</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Summary of supervision</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Duration</th>
                          <th className="border border-gray-400 p-2 text-left font-semibold">Supervisor initials</th>
                        </tr>
                        <tr className="bg-gray-100 text-gray-600 text-xs">
                          <td className="border border-gray-300 p-1"></td>
                          <td className="border border-gray-300 p-1"></td>
                          <td className="border border-gray-300 p-1 italic">Specify</td>
                          <td className="border border-gray-300 p-1 italic">Specify</td>
                          <td className="border border-gray-300 p-1 italic">E.g. brief summary of matters discussed, outcomes/plans for follow up activities and discussions</td>
                          <td className="border border-gray-300 p-1 italic">Hours/mins</td>
                          <td className="border border-gray-300 p-1"></td>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionCEntries.map((e, i) => (
                          <tr key={i} className="border-b border-gray-300 hover:bg-gray-50">
                            <td className="border border-gray-300 p-2">{e.date_of_supervision || e.date || ''}</td>
                            <td className="border border-gray-300 p-2">{e.supervisor_name || e.supervisor || '—'}</td>
                            <td className="border border-gray-300 p-2">{e.principal_or_secondary || ''}</td>
                            <td className="border border-gray-300 p-2">{e.individual_group_other || e.supervision_type || ''}</td>
                            <td className="border border-gray-300 p-2">{e.summary || ''}</td>
                            <td className="border border-gray-300 p-2">{formatDuration(Number(e.duration_minutes || e.duration || 0))}</td>
                            <td className="border border-gray-300 p-2">{e.supervisor_initials || ''}</td>
                          </tr>
                        ))}
                        {sectionCEntries.length === 0 && (
                          <tr>
                            <td colSpan={7} className="border border-gray-300 p-6 text-center text-gray-500">No Section C entries found for this week</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Section C Footer with Totals */}
                  <div className="flex justify-between items-center p-4 bg-gray-50 border-t">
                    <div className="text-sm text-gray-600">
                      Please insert additional rows as required
                    </div>
                    <div className="flex gap-4">
                      <div className="text-sm">
                        <span className="font-semibold">Total hours:</span>
                        <div className="border border-gray-300 p-1 w-16 text-center bg-white inline-block ml-2">
                          {logbook.section_totals.section_c.weekly_hours}
                        </div>
                      </div>
                      <div className="text-sm">
                        <span className="font-semibold">Cumulative hours:</span>
                        <div className="border border-gray-300 p-1 w-16 text-center bg-white inline-block ml-2">
                          {logbook.section_totals.section_c.cumulative_hours}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          </div>

          {/* AHPRA SIGNATURES BLOCK */}
          <div className="mt-6">
            {/* Signatures Header */}
            <div className="bg-blue-600 text-white p-4 font-bold text-lg text-center">
              Signatures
            </div>
            
            {/* Truth Statement */}
            <div className="bg-white p-4 text-sm">
              <p>The information contained in this record of practice is true and correct.</p>
            </div>
            
            {/* Provisional Psychologist Signature Block */}
            <div className="bg-gray-100 border border-gray-300 p-4">
              <div className="grid grid-cols-2 gap-8">
                {/* Left Side - Provisional Psychologist Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Provisional psychologist name
                    </label>
                    <div className="bg-white border border-gray-300 p-2 h-8 flex items-center">
                      {logbook.trainee_name}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Date
                    </label>
                    <div className="bg-white border border-gray-300 p-2 h-8">
                      {/* Empty for signature date */}
                    </div>
                  </div>
                </div>
                
                {/* Right Side - Signature */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Signature
                  </label>
                  <div className="bg-white border border-gray-300 p-2 h-16">
                    {/* Empty signature box */}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Principal Supervisor Signature Block */}
            <div className="bg-gray-100 border border-gray-300 p-4 mt-4">
              <div className="grid grid-cols-2 gap-8">
                {/* Left Side - Principal Supervisor Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Principal supervisor name
                    </label>
                    <div className="bg-white border border-gray-300 p-2 h-8 flex items-center">
                      {logbook.supervisor_name || 'Not assigned'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Date
                    </label>
                    <div className="bg-white border border-gray-300 p-2 h-8">
                      {/* Empty for signature date */}
                    </div>
                  </div>
                </div>
                
                {/* Right Side - Signature */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Signature
                  </label>
                  <div className="bg-white border border-gray-300 p-2 h-16">
                    {/* Empty signature box */}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AHPRA FOOTER */}
          <div className="bg-gray-50 border border-gray-300 p-4 rounded-lg text-xs leading-relaxed">
            <p className="font-semibold mb-2">
              Please note that all work roles must be approved by the Board prior to counting any time or training towards the supervised practice program. This form is also available in PDF format at www.psychologyboard.gov.au/Registration/Forms.
            </p>
            <div className="text-center text-gray-600">
              <strong>Effective from: 28 October 2020</strong>
            </div>
          </div>

          {/* Footer with action buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex items-center gap-2">
              {canRegenerate() && (
                <Button
                  variant="outline"
                  onClick={() => setShowRegenerateModal(true)}
                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {isEditable() && (
                <Button
                  variant="default"
                  onClick={() => {/* TODO: Submit for review functionality */}}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit for Review
                </Button>
              )}
              <Button variant="outline" onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Regenerate Confirmation Modal */}
      <Dialog open={showRegenerateModal} onOpenChange={setShowRegenerateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Regenerate Logbook</DialogTitle>
            <DialogDescription>
              A logbook already exists for this week. Do you want to regenerate it? This will replace existing data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRegenerateModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRegenerate}
              disabled={regenerating}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {regenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Yes (Regenerate)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
