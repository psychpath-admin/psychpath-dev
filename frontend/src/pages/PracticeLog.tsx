import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { PracticeLogForm } from '@/components/registrar/PracticeLogForm'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import type { PracticeLog } from '@/types/registrar'

export default function PracticeLogPage() {
  const [practiceLogs, setPracticeLogs] = useState<PracticeLog[]>([])
  const [, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLog, setEditingLog] = useState<PracticeLog | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPracticeLogs()
  }, [])

  const loadPracticeLogs = async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/registrar-aope/practice-logs/')
      if (res.ok) {
        const data = await res.json()
        setPracticeLogs(data)
      }
    } catch (error) {
      console.error('Error loading practice logs:', error)
      toast.error('Failed to load practice logs')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (formData: Partial<PracticeLog>) => {
    setSaving(true)
    try {
      const url = editingLog
        ? `/api/registrar-aope/practice-logs/${editingLog.id}/`
        : '/api/registrar-aope/practice-logs/'
      const method = editingLog ? 'PUT' : 'POST'

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        toast.success(editingLog ? 'Practice log updated' : 'Practice log created')
        setShowForm(false)
        setEditingLog(null)
        loadPracticeLogs()
      } else {
        toast.error('Failed to save practice log')
      }
    } catch (error) {
      console.error('Error saving practice log:', error)
      toast.error('An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this practice log entry?')) return

    try {
      const res = await apiFetch(`/api/registrar-aope/practice-logs/${id}/`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success('Practice log deleted')
        loadPracticeLogs()
      } else {
        toast.error('Failed to delete practice log')
      }
    } catch (error) {
      console.error('Error deleting practice log:', error)
      toast.error('An error occurred')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-700 to-purple-900 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Practice Log</CardTitle>
            <Button
              onClick={() => { setEditingLog(null); setShowForm(true) }}
              className="bg-white text-purple-700 hover:bg-gray-100"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Practice Logs List */}
      <div className="space-y-4">
        {practiceLogs.map((log) => (
          <Card key={log.id} className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                            <Badge variant={log.practice_type === 'ASSESSMENT' ? 'default' : 'secondary'}>
                              {log.practice_type}
                            </Badge>
                    <span className="text-sm text-gray-600">{log.date}</span>
                    <span className="text-sm font-medium">{log.duration_hours}h</span>
                  </div>
                  <p className="text-sm text-gray-700">{log.activity_description}</p>
                  {log.reflection_text && (
                    <p className="text-xs text-gray-500 mt-2 italic">Reflection: {log.reflection_text.substring(0, 100)}...</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditingLog(log); setShowForm(true) }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(log.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLog ? 'Edit Practice Log' : 'New Practice Log'}</DialogTitle>
          </DialogHeader>
          <PracticeLogForm
            entry={editingLog}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            saving={saving}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
