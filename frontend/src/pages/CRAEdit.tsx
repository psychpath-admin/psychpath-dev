import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Save } from 'lucide-react'
import { getSectionAEntry, updateSectionAEntry } from '@/lib/api'

export default function CRAEdit() {
  const [params] = useSearchParams()
  const idParam = params.get('id')
  const entryId = idParam ? parseInt(idParam, 10) : NaN

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    session_date: '',
    week_starting: '',
    client_id: '',
    place_of_practice: '',
    client_age: '',
    presenting_issues: '',
    session_activity_types: [] as string[],
    duration_minutes: '15',
    reflections_on_experience: '',
    entry_type: 'cra' as const,
    parent_dcc_entry: undefined as number | undefined,
  })

  useEffect(() => {
    const load = async () => {
      try {
        if (!entryId) throw new Error('Missing CRA id')
        const entry = await getSectionAEntry(entryId)
        setForm({
          session_date: entry.session_date || '',
          week_starting: entry.week_starting || '',
          client_id: entry.client_id || '',
          place_of_practice: entry.place_of_practice || '',
          client_age: entry.client_age || '',
          presenting_issues: entry.presenting_issues || '',
          session_activity_types: entry.session_activity_types || [],
          duration_minutes: entry.duration_minutes || '15',
          reflections_on_experience: entry.reflections_on_experience || '',
          entry_type: 'cra',
          parent_dcc_entry: entry.parent_dcc_entry,
        })
      } catch (e: any) {
        setError(e?.message || 'Failed to load entry')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [entryId])

  const handleTypeToggle = (type: string) => {
    setForm((prev) => ({
      ...prev,
      session_activity_types: prev.session_activity_types.includes(type)
        ? prev.session_activity_types.filter((t) => t !== type)
        : [...prev.session_activity_types, type],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!entryId) return
    if (form.session_activity_types.length === 0) {
      alert('Please select at least one activity type')
      return
    }
    if (!form.reflections_on_experience.trim()) {
      alert('Reflections are required')
      return
    }
    try {
      setSaving(true)
      await updateSectionAEntry(entryId, { ...form, entry_type: 'cra' })
      if (window.opener) {
        window.opener.postMessage({ type: 'CRA_SAVED', entryId }, '*')
      }
      window.close()
    } catch (e: any) {
      setError(e?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Edit CRA</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Activity Date</label>
                <Input type="date" value={form.session_date} readOnly disabled />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Week Starting</label>
                <Input type="date" value={form.week_starting} readOnly disabled />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Client</label>
                <Input value={form.client_id} readOnly disabled />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Client Related Activity Type</label>
                <div className="flex flex-wrap gap-2">
                  {['report_writing','case_formulation','test_scoring','documentation','file_review','other'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTypeToggle(t)}
                      className={`px-3 py-1 text-sm rounded-full border ${
                        form.session_activity_types.includes(t)
                          ? 'bg-primaryBlue text-white border-primaryBlue'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {t.replace('_',' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                <Input
                  type="number"
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Reflections</label>
                <Textarea
                  value={form.reflections_on_experience}
                  onChange={(e) => setForm({ ...form, reflections_on_experience: e.target.value })}
                  rows={6}
                  required
                  className="placeholder:text-gray-600"
                />
              </div>

              <div className="flex justify-end gap-4 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => window.close()}
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
                      Save
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

