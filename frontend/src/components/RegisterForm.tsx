import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { API_URL } from '@/lib/api'

const roles = [
  { value: 'PROVISIONAL', label: 'Intern' },
  { value: 'REGISTRAR', label: 'Registrar' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'ORG_ADMIN', label: 'Org Admin' },
]

export default function RegisterForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('PROVISIONAL')
  const [status, setStatus] = useState<string | null>(null)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    try {
      const res = await fetch(`${API_URL}/api/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || 'Register failed')
      setStatus('Registered')
    } catch (err: any) {
      setStatus(err.message)
    }
  }

  return (
    <form onSubmit={handleRegister} className="space-y-3 rounded-card border borderLight bg-backgroundCard p-4 shadow-psychpath">
      <div className="font-headings text-xl text-textDark">Register</div>
      <div className="space-y-1">
        <label className="font-labels text-sm text-textLight">Email</label>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" />
      </div>
      <div className="space-y-1">
        <label className="font-labels text-sm text-textLight">Password</label>
        <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password" />
      </div>
      <div className="space-y-1">
        <label className="font-labels text-sm text-textLight">Role</label>
        <select className="w-full rounded-md border px-3 py-2" value={role} onChange={(e) => setRole(e.target.value)}>
          {roles.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between">
        <Button type="submit" className="bg-secondaryAmber text-textDark hover:opacity-90">Register</Button>
        {status && <span className="text-sm text-textLight">{status}</span>}
      </div>
    </form>
  )
}
