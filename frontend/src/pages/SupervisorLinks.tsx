import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

type User = { id: number; username: string; email: string }
type Link = { id: number; supervisor: number; supervisee: number; active: boolean }

export default function SupervisorLinks() {
  const [users, setUsers] = useState<User[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const [superviseeId, setSuperviseeId] = useState<string>('')

  useEffect(() => {
    apiFetch('/api/org/users/').then((r) => r.json()).then(setUsers).catch(console.error)
    apiFetch('/api/supervisions/').then((r) => r.json()).then(setLinks).catch(console.error)
  }, [])

  async function createLink() {
    if (!superviseeId) return
    const res = await apiFetch('/api/supervisions/', {
      method: 'POST',
      body: JSON.stringify({ supervisee: Number(superviseeId) })
    })
    if (res.ok) {
      const created = await res.json()
      setLinks((prev) => [created, ...prev])
      setSuperviseeId('')
    }
  }

  return (
    <section className="space-y-3">
      <div className="font-headings text-2xl text-textDark">Supervision Links</div>
      <div className="flex gap-2">
        <select className="w-full rounded-md border px-3 py-2" value={superviseeId} onChange={(e) => setSuperviseeId(e.target.value)}>
          <option value="">Select supervisee…</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.email || u.username}</option>
          ))}
        </select>
        <button onClick={createLink} className="rounded-md bg-primaryBlue px-3 py-2 text-white">Link</button>
      </div>
      <ul className="grid gap-2">
        {links.map((l) => (
          <li key={l.id} className="rounded-card border borderLight bg-backgroundCard p-3 shadow-cape">#{l.id} supervisee: {l.supervisee}</li>
        ))}
      </ul>
    </section>
  )
}


