import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  BookOpen, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  FileText,
  Unlock,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import LogbookCreationModal from '@/components/LogbookCreationModal'
import LogbookPreview from '@/components/LogbookPreview'
import UnlockRequestModal from '@/components/UnlockRequestModal'
import DashboardCountdown from '@/components/DashboardCountdown'

interface Logbook {
  id: number
  trainee_name: string
  week_start_date: string
  week_end_date: string
  week_display: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  supervisor_name?: string
  reviewed_by_name?: string
  submitted_at: string
  reviewed_at?: string
  supervisor_comments?: string
  section_totals: {
    section_a: { weekly_hours: number; cumulative_hours: number }
    section_b: { weekly_hours: number; cumulative_hours: number }
    section_c: { weekly_hours: number; cumulative_hours: number }
    total: { weekly_hours: number; cumulative_hours: number }
  }
  active_unlock?: {
    unlock_expires_at: string
    duration_minutes: number
  }
}

export default function LogbookDashboard() {
  const [logbooks, setLogbooks] = useState<Logbook[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreationModal, setShowCreationModal] = useState(false)
  const [previewLogbook, setPreviewLogbook] = useState<Logbook | null>(null)
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [selectedLogbook, setSelectedLogbook] = useState<Logbook | null>(null)

  useEffect(() => {
    fetchLogbooks()
  }, [])

  const fetchLogbooks = async () => {
    try {
      const response = await apiFetch('/api/logbook/')
      if (response.ok) {
        const data = await response.json()
        setLogbooks(data)
      } else {
        toast.error('Failed to fetch logbooks')
      }
    } catch (error) {
      console.error('Error fetching logbooks:', error)
      toast.error('Error fetching logbooks')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Waiting for Review</Badge>
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleLogbookCreated = () => {
    fetchLogbooks()
    setShowCreationModal(false)
  }

  const handlePreviewLogbook = (logbook: Logbook) => {
    setPreviewLogbook(logbook)
  }

  const handleRequestUnlock = (logbook: Logbook) => {
    setSelectedLogbook(logbook)
    setShowUnlockModal(true)
  }

  const handleUnlockSuccess = () => {
    fetchLogbooks() // Refresh the logbook list
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Weekly Logbooks</h1>
            <p className="text-muted-foreground">Manage your weekly logbook submissions</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">Loading logbooks...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Weekly Logbooks
          </h1>
          <p className="text-muted-foreground">Manage your weekly logbook submissions for supervisor review</p>
        </div>
        <Button onClick={() => setShowCreationModal(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create New Logbook
        </Button>
      </div>

      {/* Logbooks List */}
      {logbooks.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No Logbooks Yet</h3>
              <p className="text-gray-600 mb-4">
                You haven't submitted any weekly logbooks yet. Create your first logbook to get started.
              </p>
              <Button onClick={() => setShowCreationModal(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Logbook
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {logbooks.map((logbook) => (
            <Card key={logbook.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {getStatusIcon(logbook.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{logbook.week_display}</h3>
                        {getStatusBadge(logbook.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                        <div>
                          <span className="text-gray-600">Section A:</span>
                          <span className="ml-1 font-medium">{logbook.section_totals.section_a.weekly_hours}h</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Section B:</span>
                          <span className="ml-1 font-medium">{logbook.section_totals.section_b.weekly_hours}h</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Section C:</span>
                          <span className="ml-1 font-medium">{logbook.section_totals.section_c.weekly_hours}h</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Total:</span>
                          <span className="ml-1 font-medium">{logbook.section_totals.total.weekly_hours}h</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Submitted: {formatDate(logbook.submitted_at)}</span>
                        {logbook.reviewed_at && (
                          <span>Reviewed: {formatDate(logbook.reviewed_at)}</span>
                        )}
                      </div>

                      {logbook.active_unlock && (
                        <div className="mt-4">
                          <DashboardCountdown
                            unlockExpiresAt={logbook.active_unlock.unlock_expires_at}
                            durationMinutes={logbook.active_unlock.duration_minutes}
                            logbookWeekDisplay={logbook.week_display}
                          />
                        </div>
                      )}

                      {logbook.supervisor_comments && (
                        <Alert className="mt-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Supervisor Comments:</strong> {logbook.supervisor_comments}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreviewLogbook(logbook)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/logbook/${logbook.id}/html-report/`, '_blank')}
                      title="View AHPRA-formatted report"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Report
                    </Button>
                    
                    {logbook.status === 'approved' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRequestUnlock(logbook)}
                        className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                      >
                        <Unlock className="h-4 w-4 mr-2" />
                        Request Unlock
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreationModal && (
        <LogbookCreationModal
          onClose={() => setShowCreationModal(false)}
          onLogbookCreated={handleLogbookCreated}
        />
      )}

      {previewLogbook && (
        <LogbookPreview
          logbook={previewLogbook}
          onClose={() => setPreviewLogbook(null)}
        />
      )}

      {showUnlockModal && selectedLogbook && (
        <UnlockRequestModal
          isOpen={showUnlockModal}
          onClose={() => {
            setShowUnlockModal(false)
            setSelectedLogbook(null)
          }}
          logbookId={selectedLogbook.id}
          logbookWeekDisplay={selectedLogbook.week_display}
          onSuccess={handleUnlockSuccess}
        />
      )}
    </div>
  )
}
