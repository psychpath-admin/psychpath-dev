import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'
import { API_URL } from '@/lib/api'

export function ReflectionLog() {
  const [epaId, setEpaId] = useState<string>('')
  const [milestoneId, setMilestoneId] = useState<string>('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [epas, setEpas] = useState<any[]>([])
  const [milestones, setMilestones] = useState<any[]>([])

  useEffect(() => {
    fetch(`${API_URL}/api/epas/`).then((r) => r.json()).then(setEpas).catch(() => {})
  }, [])

  useEffect(() => {
    if (!epaId) { setMilestones([]); setMilestoneId(''); return }
    fetch(`${API_URL}/api/milestones/?epa=${epaId}`).then((r) => r.json()).then(setMilestones).catch(() => {})
  }, [epaId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const payload: any = { title, content }
      if (epaId) payload.epa_id = Number(epaId)
      if (milestoneId) payload.milestone_id = Number(milestoneId)
      const token = localStorage.getItem('accessToken')
      if (!token) throw new Error('Please login to post')
      const res = await apiFetch('/api/reflections/', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to save')
      setTitle('')
      setContent('')
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-card border borderLight bg-backgroundCard p-5 shadow-cape">
      <div className="font-headings text-xl text-textDark">Reflection Log</div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label className="font-labels text-sm text-textLight">EPA</label>
          <select className="w-full rounded-md border px-3 py-2" value={epaId} onChange={(e) => setEpaId(e.target.value)}>
            <option value="">Select EPA…</option>
            {epas.map((e) => <option key={e.id} value={e.id}>{e.code} — {e.title}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="font-labels text-sm text-textLight">Milestone</label>
          <select disabled={!epaId} className="w-full rounded-md border px-3 py-2 disabled:opacity-50" value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)}>
            <option value="">Select…</option>
            {milestones.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}
          </select>
        </div>
        <div className="md:col-span-1 space-y-1">
          <label className="font-labels text-sm text-textLight">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief reflection title" />
        </div>
      </div>
      <div className="space-y-1">
        <label className="font-labels text-sm text-textLight">Reflection</label>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="What did you learn? How does this relate to competency development?" rows={6} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" className="bg-primaryBlue text-white hover:opacity-90">Save Reflection</Button>
      </div>
    </form>
  )
}

export default ReflectionLog


