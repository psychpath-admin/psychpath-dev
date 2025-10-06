import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

type Reflection = { id: number; title: string; content: string; is_approved: boolean; created_at: string }

export default function MyReflections() {
  const [items, setItems] = useState<Reflection[]>([])

  useEffect(() => {
    apiFetch('/api/reflections/?mine=1').then((r) => r.json()).then(setItems)
  }, [])

  return (
    <section className="space-y-3">
      <div className="font-headings text-2xl text-textDark">My Reflections</div>
      <ul className="grid gap-2">
        {items.map((r) => (
          <li key={r.id} className="rounded-card border borderLight bg-backgroundCard p-3 shadow-psychpath">
            <div className="font-labels text-sm text-textDark">{r.title}</div>
            <div className="text-sm text-textLight">{new Date(r.created_at).toLocaleString()} • {r.is_approved ? 'Approved' : 'Pending'}</div>
            <p className="mt-2 text-sm text-textDark">{r.content}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}


