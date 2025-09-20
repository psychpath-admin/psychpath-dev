import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Download, Eye, Edit, Check, X } from 'lucide-react'
import { getLogbooks, createLogbook, submitLogbook, approveLogbook, downloadLogbookPDF } from '@/lib/api'

interface Logbook {
  id: number
  week_start_date: string
  week_end_date: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'locked'
  total_weekly_hours: number
  cumulative_total_hours: number
  trainee_name: string
  trainee_email: string
  supervisor_name?: string
  submitted_at?: string
  reviewed_at?: string
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

export default function LogbookPage() {
  const navigate = useNavigate()
  const [logbooks, setLogbooks] = useState<Logbook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newLogbook, setNewLogbook] = useState({
    week_start_date: '',
    week_end_date: '',
  })

  useEffect(() => {
    loadLogbooks()
  }, [])

  const loadLogbooks = async () => {
    try {
      setLoading(true)
      const data = await getLogbooks()
      setLogbooks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logbooks')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLogbook = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createLogbook(newLogbook)
      setNewLogbook({ week_start_date: '', week_end_date: '' })
      setShowCreateForm(false)
      loadLogbooks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create logbook')
    }
  }

  const handleSubmitLogbook = async (id: number) => {
    try {
      await submitLogbook(id)
      loadLogbooks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit logbook')
    }
  }

  const handleApproveLogbook = async (id: number, action: 'approve' | 'reject') => {
    try {
      await approveLogbook(id, action)
      loadLogbooks()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} logbook`)
    }
  }

  const handleDownloadPDF = async (id: number) => {
    try {
      const blob = await downloadLogbookPDF(id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `logbook_${id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download PDF')
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
          <div className="text-lg">Loading logbooks...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primaryBlue">Weekly Logbooks</h1>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-primaryBlue hover:bg-primaryBlue/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Logbook
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Logbook</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateLogbook} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Week Start Date</label>
                  <input
                    type="date"
                    value={newLogbook.week_start_date}
                    onChange={(e) => setNewLogbook({ ...newLogbook, week_start_date: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Week End Date</label>
                  <input
                    type="date"
                    value={newLogbook.week_end_date}
                    onChange={(e) => setNewLogbook({ ...newLogbook, week_end_date: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="bg-primaryBlue hover:bg-primaryBlue/90">
                  Create Logbook
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {logbooks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No logbooks found. Create your first logbook to get started.</p>
            </CardContent>
          </Card>
        ) : (
          logbooks.map((logbook) => (
            <Card key={logbook.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">
                        Week of {formatDate(logbook.week_start_date)}
                      </h3>
                      <Badge className={statusColors[logbook.status]}>
                        {statusLabels[logbook.status]}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      <p>Trainee: {logbook.trainee_name} ({logbook.trainee_email})</p>
                      {logbook.supervisor_name && (
                        <p>Supervisor: {logbook.supervisor_name}</p>
                      )}
                      <p>
                        Hours: {logbook.total_weekly_hours} this week, {logbook.cumulative_total_hours} total
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/logbook/${logbook.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    {logbook.status === 'draft' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/logbook/${logbook.id}/edit`)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    )}
                    {logbook.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => handleSubmitLogbook(logbook.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Submit
                      </Button>
                    )}
                    {logbook.status === 'submitted' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApproveLogbook(logbook.id, 'approve')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveLogbook(logbook.id, 'reject')}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(logbook.id)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
