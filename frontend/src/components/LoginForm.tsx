import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { API_URL } from '@/lib/api'
import { Link } from 'react-router-dom'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    try {
      setSubmitting(true)
      const res = await fetch(`${API_URL}/api/auth/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || 'Login failed')
      localStorage.setItem('accessToken', data.access)
      localStorage.setItem('refreshToken', data.refresh)
      setStatus(null)
      // Single navigation; App will fetch /api/me and render dashboard
      window.location.assign('/')
    } catch (err: any) {
      setStatus(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-3 rounded-card border borderLight bg-backgroundCard p-4 shadow-psychpath" autoComplete="on">
      <div className="font-headings text-xl text-textDark">Login</div>
      <div className="space-y-1">
        <label className="font-labels text-sm text-textLight">Email</label>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" autoComplete="username" />
      </div>
      <div className="space-y-1">
        <label className="font-labels text-sm text-textLight">Password</label>
        <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password" autoComplete="current-password" />
      </div>
      <div className="flex items-center justify-between">
        <Button type="submit" className="bg-primaryBlue text-white hover:opacity-90" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Login'}
        </Button>
        {status && <span className="text-sm text-textLight">{status}</span>}
      </div>
      <div className="text-right text-sm">
        <Link to="/forgot-password" className="text-primaryBlue hover:underline">Forgot password?</Link>
      </div>
    </form>
  )
}


