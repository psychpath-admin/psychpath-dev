import { useEffect, useState } from 'react'
import { API_URL, apiFetch } from '@/lib/api'

type Reflection = {
  id: number
  title: string
  content: string
  is_approved: boolean
  created_at: string
  author?: number
}

export default function SupervisorQueue() {
  const [items, setItems] = useState<Reflection[]>([])
  const token = localStorage.getItem('accessToken')

  useEffect(() => {
    fetch(`${API_URL}/api/reflections/?pending=1`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
      .then((r) => r.json())
      .then((data) => setItems(data))
      .catch(console.error)
  }, [token])

  async function approve(id: number) {
    if (!token) return
    const res = await apiFetch(`/api/reflections/${id}/approve/`, { method: 'POST' })
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id))
    }
  }

  return (
    <section className="space-y-3">
      <div className="font-headings text-2xl text-textDark">Supervisor Approval Queue</div>
      <ul className="grid gap-3">
        {items.map((r) => (
          <li key={r.id} className="rounded-card border borderLight bg-backgroundCard p-4 shadow-psychpath">
            <div className="mb-2 font-labels text-textDark">{r.title}</div>
            <div className="mb-3 text-sm text-textLight">{r.content}</div>
            <button onClick={() => approve(r.id)} className="rounded-md bg-primaryBlue px-3 py-1 text-white">Approve</button>
          </li>
        ))}
      </ul>
    </section>
  )
}


