import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Edit, Trash2, Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import { LeaveRecordForm } from '@/components/registrar/LeaveRecordForm'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import type { LeaveRecord } from '@/types/registrar'

export default function LeaveManagementPage() {
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<LeaveRecord | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadLeaveRecords()
  }, [])

  const loadLeaveRecords = async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/registrar-aope/leave-records/')
      if (res.ok) {
        const data = await res.json()
        setLeaveRecords(data)
      }
    } catch (error) {
      console.error('Error loading leave records:', error)
      toast.error('Failed to load leave records')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (formData: Partial<LeaveRecord>) => {
    setSaving(true)
    try {
      const url = editingRecord
        ? `/api/registrar-aope/leave-records/${editingRecord.id}/`
        : '/api/registrar-aope/leave-records/'
      const method = editingRecord ? 'PUT' : 'POST'

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        toast.success(editingRecord ? 'Leave record updated' : 'Leave record created')
        setShowForm(false)
        setEditingRecord(null)
        loadLeaveRecords()
      } else {
        toast.error('Failed to save leave record')
      }
    } catch (error) {
      console.error('Error saving leave record:', error)
      toast.error('An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this leave record?')) return

    try {
      const res = await apiFetch(`/api/registrar-aope/leave-records/${id}/`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success('Leave record deleted')
        loadLeaveRecords()
      } else {
        toast.error('Failed to delete leave record')
      }
    } catch (error) {
      console.error('Error deleting leave record:', error)
      toast.error('An error occurred')
    }
  }

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'ANNUAL':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'SICK':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'MATERNITY':
        return 'bg-pink-100 text-pink-800 border-pink-200'
      case 'PATERNITY':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'CARERS':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'STUDY':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'UNPAID':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  const totalLeaveDays = leaveRecords
    .filter(record => record.status === 'APPROVED')
    .reduce((total, record) => total + calculateDuration(record.start_date, record.end_date), 0)

  const currentYear = new Date().getFullYear()
  const currentYearLeave = leaveRecords
    .filter(record => 
      record.status === 'APPROVED' && 
      new Date(record.start_date).getFullYear() === currentYear
    )
    .reduce((total, record) => total + calculateDuration(record.start_date, record.end_date), 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-r from-purple-700 to-purple-900 text-white">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Leave Management</CardTitle>
          </CardHeader>
        </Card>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading leave records...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-700 to-purple-900 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Leave Management</CardTitle>
            <Button
              onClick={() => { setEditingRecord(null); setShowForm(true) }}
              className="bg-white text-purple-700 hover:bg-gray-100"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Leave Request
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Leave Days</p>
                <p className="text-2xl font-bold text-blue-600">{totalLeaveDays}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">{currentYear} Leave Days</p>
                <p className="text-2xl font-bold text-green-600">{currentYearLeave}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {leaveRecords.filter(r => r.status === 'PENDING').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Records List */}
      <div className="space-y-4">
        {leaveRecords.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Leave Records</h3>
              <p className="text-gray-500 mb-4">You haven't submitted any leave requests yet.</p>
              <Button
                onClick={() => { setEditingRecord(null); setShowForm(true) }}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Submit First Leave Request
              </Button>
            </CardContent>
          </Card>
        ) : (
          leaveRecords.map((record) => (
            <Card key={record.id} className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getLeaveTypeColor(record.leave_type)}>
                        {record.leave_type.replace('_', ' ')}
                      </Badge>
                      <Badge className={getStatusColor(record.status)}>
                        {record.status}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {formatDate(record.start_date)} - {formatDate(record.end_date)}
                      </span>
                      <span className="text-sm font-medium">
                        {calculateDuration(record.start_date, record.end_date)} days
                      </span>
                    </div>
                    
                    <h3 className="font-medium text-gray-900 mb-1">{record.reason}</h3>
                    
                    {record.notes && (
                      <p className="text-sm text-gray-600 mb-2">{record.notes}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Submitted: {formatDate(record.created_at)}</span>
                      {record.approved_by && (
                        <span>Approved by: {record.approved_by}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setEditingRecord(record); setShowForm(true) }}
                      disabled={record.status === 'APPROVED'}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(record.id)}
                      disabled={record.status === 'APPROVED'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? 'Edit Leave Request' : 'New Leave Request'}
            </DialogTitle>
          </DialogHeader>
          <LeaveRecordForm
            record={editingRecord}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            saving={saving}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
