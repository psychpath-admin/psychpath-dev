import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

export default function OrgDashboard() {
  const [data, setData] = useState<{ supervisees: any[]; approvals: any[] }>({ supervisees: [], approvals: [] })
  useEffect(() => {
    apiFetch('/api/org/summary/').then((r) => r.json()).then(setData).catch(console.error)
  }, [])

  return (
    <section className="space-y-4">
      <div className="font-headings text-2xl text-textDark">Organisation Dashboard</div>
      <div>
        <div className="mb-2 font-labels text-textDark">Supervisees</div>
        <ul className="grid gap-2">
          {data.supervisees.map((u) => (
            <li key={u.id} className="rounded-card border borderLight bg-backgroundCard p-3 shadow-psychpath">{u.email || u.username} — {u.role}</li>
          ))}
        </ul>
      </div>
      <div>
        <div className="mb-2 font-labels text-textDark">Recent Approvals</div>
        <ul className="grid gap-2">
          {data.approvals.map((r) => (
            <li key={r.id} className="rounded-card border borderLight bg-backgroundCard p-3 shadow-psychpath">{r.title}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}


