import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  X, 
  Calendar, 
  Clock, 
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import StructuredLogbookDisplay from './StructuredLogbookDisplay'

interface Logbook {
  id: number
  trainee_name: string
  week_start_date: string
  week_end_date: string
  week_display: string
  status: 'draft' | 'ready' | 'submitted' | 'returned_for_edits' | 'approved' | 'rejected' | 'locked' | 'unlocked_for_edits'
  supervisor_name?: string
  reviewed_by_name?: string
  submitted_at: string
  reviewed_at?: string
  supervisor_comments?: string
  section_totals: {
    section_a: { 
      weekly_hours: string
      cumulative_hours: string
      dcc?: { weekly_hours: string; cumulative_hours: string }
      cra?: { weekly_hours: string; cumulative_hours: string }
    }
    section_b: { weekly_hours: string; cumulative_hours: string }
    section_c: { weekly_hours: string; cumulative_hours: string }
    total: { weekly_hours: string; cumulative_hours: string }
  }
}

interface LogbookPreviewProps {
  logbook: Logbook
  onClose: () => void
}

export default function LogbookPreview({ logbook, onClose }: LogbookPreviewProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [showStructuredView, setShowStructuredView] = useState(false)

  // If structured view is requested, show the structured display
  if (showStructuredView) {
    return (
      <StructuredLogbookDisplay 
        logbook={logbook as any} 
        onClose={() => setShowStructuredView(false)}
        onRegenerate={() => {
          setShowStructuredView(false)
          onClose() // Close the preview to refresh the dashboard
        }}
      />
    )
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, 'submitted' | 'approved' | 'rejected' | 'draft' | 'pending'> = {
      'submitted': 'submitted',
      'approved': 'approved',
      'rejected': 'rejected',
      'returned_for_edits': 'pending',
      'draft': 'draft'
    }
    const statusLabels: Record<string, string> = {
      'submitted': 'Waiting for Review',
      'returned_for_edits': 'Returned for Edits',
    }
    const mappedStatus = statusMap[status] || 'draft'
    const label = statusLabels[status]
    return <StatusBadge status={mappedStatus} label={label} size="sm" />
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                {getStatusIcon(logbook.status)}
                Logbook: {logbook.week_display}
              </DialogTitle>
              <DialogDescription>
                Submitted by {logbook.trainee_name}
              </DialogDescription>
            </div>
            {getStatusBadge(logbook.status)}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="section-a">Section A</TabsTrigger>
            <TabsTrigger value="section-b">Section B</TabsTrigger>
            <TabsTrigger value="section-c">Section C</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Week Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Week Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Week Period</label>
                    <p className="text-lg font-semibold">{logbook.week_display}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(logbook.status)}
                      {getStatusBadge(logbook.status)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Submitted</label>
                    <p className="text-sm">{formatDate(logbook.submitted_at)}</p>
                  </div>
                  {logbook.reviewed_at && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Reviewed</label>
                      <p className="text-sm">{formatDate(logbook.reviewed_at)}</p>
                    </div>
                  )}
                </div>

                {logbook.supervisor_name && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Supervisor</label>
                    <p className="text-sm">{logbook.supervisor_name}</p>
                  </div>
                )}

                {logbook.reviewed_by_name && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Reviewed By</label>
                    <p className="text-sm">{logbook.reviewed_by_name}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hours Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Hours Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">{logbook.section_totals.section_a.weekly_hours}</div>
                    <div className="text-sm text-blue-600">Section A (Weekly)</div>
                    <div className="text-xs text-blue-500">{logbook.section_totals.section_a.cumulative_hours} total</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">{logbook.section_totals.section_b.weekly_hours}</div>
                    <div className="text-sm text-green-600">Section B (Weekly)</div>
                    <div className="text-xs text-green-500">{logbook.section_totals.section_b.cumulative_hours} total</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-700">{logbook.section_totals.section_c.weekly_hours}</div>
                    <div className="text-sm text-purple-600">Section C (Weekly)</div>
                    <div className="text-xs text-purple-500">{logbook.section_totals.section_c.cumulative_hours} total</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-700">{logbook.section_totals.total.weekly_hours}</div>
                    <div className="text-sm text-gray-600">Total (Weekly)</div>
                    <div className="text-xs text-gray-500">{logbook.section_totals.total.cumulative_hours} total</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Supervisor Comments */}
            {logbook.supervisor_comments && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Supervisor Comments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{logbook.supervisor_comments}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* View Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  View Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => setShowStructuredView(true)}
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View AHPRA-Style Logbook Format
                </Button>
                <p className="text-xs text-gray-600 mt-2 text-center">
                  View the logbook in the traditional AHPRA format with structured tables and cumulative totals
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="section-a">
            <Card>
              <CardHeader>
                <CardTitle>Section A: Direct Client Contact & Client Related Activities</CardTitle>
                <p className="text-sm text-gray-600">
                  Weekly: {logbook.section_totals.section_a.weekly_hours} | 
                  Cumulative: {logbook.section_totals.section_a.cumulative_hours}
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4" />
                  <p>Section A entries will be displayed here in a future update.</p>
                  <p className="text-sm">This logbook contains {logbook.section_totals.section_a.weekly_hours} hours for this week.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="section-b">
            <Card>
              <CardHeader>
                <CardTitle>Section B: Professional Development</CardTitle>
                <p className="text-sm text-gray-600">
                  Weekly: {logbook.section_totals.section_b.weekly_hours} | 
                  Cumulative: {logbook.section_totals.section_b.cumulative_hours}
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4" />
                  <p>Section B entries will be displayed here in a future update.</p>
                  <p className="text-sm">This logbook contains {logbook.section_totals.section_b.weekly_hours} hours for this week.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="section-c">
            <Card>
              <CardHeader>
                <CardTitle>Section C: Supervision</CardTitle>
                <p className="text-sm text-gray-600">
                  Weekly: {logbook.section_totals.section_c.weekly_hours} | 
                  Cumulative: {logbook.section_totals.section_c.cumulative_hours}
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4" />
                  <p>Section C entries will be displayed here in a future update.</p>
                  <p className="text-sm">This logbook contains {logbook.section_totals.section_c.weekly_hours} hours for this week.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

