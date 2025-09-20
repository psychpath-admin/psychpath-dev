import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { API_URL, apiFetch } from '@/lib/api'

type Milestone = { id: number; code: string; description: string }
type EPA = { id: number; code: string; title: string; description: string; milestones?: Milestone[] }
type Progress = { id: number; user: number; milestone: number; is_completed: boolean }

export default function EPADetail() {
  const { code } = useParams()
  const [epa, setEpa] = useState<EPA | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [progressByMilestone, setProgressByMilestone] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (!code) return
    fetch(`${API_URL}/api/epas/`)
      .then((r) => r.json())
      .then((list: EPA[]) => list.find((e) => e.code === code))
      .then((found) => {
        if (found) {
          setEpa(found)
          fetch(`${API_URL}/api/milestones/?epa=${encodeURIComponent(String(found.id))}`)
            .then((r) => r.json())
            .then((ms) => setMilestones(ms))
        }
      })
      .catch((e) => console.error(e))
  }, [code])

  useEffect(() => {
    if (!selectedUserId || milestones.length === 0) return
    // Load existing progress
    Promise.all(
      milestones.map((m) =>
        apiFetch(`/api/milestone-progress/?supervisee=${selectedUserId}&milestone=${m.id}`).then((r) => r.json())
      )
    ).then((results) => {
      const merged: Record<number, boolean> = {}
      results.forEach((arr: Progress[]) => {
        if (arr[0]) merged[arr[0].milestone] = !!arr[0].is_completed
      })
      setProgressByMilestone(merged)
    })
  }, [selectedUserId, milestones])

  async function toggleProgress(milestoneId: number) {
    if (!selectedUserId) return
    const current = !!progressByMilestone[milestoneId]
    const next = !current
    const existing = await apiFetch(`/api/milestone-progress/?supervisee=${selectedUserId}&milestone=${milestoneId}`).then((r) => r.json())
    if (existing[0]) {
      await apiFetch(`/api/milestone-progress/${existing[0].id}/`, { method: 'PATCH', body: JSON.stringify({ is_completed: next }) })
    } else {
      await apiFetch(`/api/milestone-progress/`, { method: 'POST', body: JSON.stringify({ user: Number(selectedUserId), milestone: milestoneId, is_completed: next }) })
    }
    setProgressByMilestone((prev) => ({ ...prev, [milestoneId]: next }))
  }

  if (!epa) return <div className="text-textLight">Loading...</div>

  return (
    <section className="space-y-4">
      <div className="font-headings text-3xl text-textDark">{epa.code}: {epa.title}</div>
      <p className="font-body text-textDark">{epa.description}</p>
      <div className="flex items-center gap-2">
        <span className="font-labels text-sm text-textLight">Supervisee</span>
        <select className="rounded-md border px-3 py-2" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
          <option value="">Select…</option>
        </select>
      </div>
      <div className="font-labels text-textLight">Milestones</div>
      <ul className="grid gap-2">
        {milestones.map((m) => (
          <li key={m.id} className="rounded-card border borderLight bg-backgroundCard p-3 shadow-cape">
            <div className="font-labels text-sm text-textDark">{m.code}</div>
            <div className="font-body text-sm text-textLight">{m.description || '—'}</div>
            {selectedUserId && (
              <button onClick={() => toggleProgress(m.id)} className={`mt-2 rounded-md px-3 py-1 text-sm ${progressByMilestone[m.id] ? 'bg-primaryBlue text-white' : 'bg-secondaryAmber text-textDark'}`}>
                {progressByMilestone[m.id] ? 'Completed' : 'Mark complete'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}


