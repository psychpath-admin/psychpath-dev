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
  RefreshCw
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
            {/* LOGBOOK HEADER */}
            <Card className="border-2 border-gray-300 bg-gray-50">
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
            <Card className="border-2 border-blue-300">
              <CardHeader className="bg-blue-50 border-b border-blue-200">
                <CardTitle className="text-lg font-bold text-blue-900">
                  SECTION A: Weekly record of professional practice
                </CardTitle>
              </CardHeader>
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
          <Card className="border-2 border-amber-300 mt-6">
            <CardHeader className="bg-amber-50 border-b border-amber-200">
              <CardTitle className="text-lg font-bold text-amber-900">SECTION B: Professional development</CardTitle>
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
                            <td colSpan={4} className="border p-6 text-center text-gray-500">No Section B entries found for this week</td>
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

          {/* SECTION C: Supervision - after B */}
          <Card className="border-2 border-purple-300 mt-6">
            <CardHeader className="bg-purple-50 border-b border-purple-200">
              <CardTitle className="text-lg font-bold text-purple-900">SECTION C: Supervision</CardTitle>
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
                            <td colSpan={5} className="border p-6 text-center text-gray-500">No Section C entries found for this week</td>
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
            
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
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
