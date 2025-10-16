import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    try {
      setSubmitting(true)
      await login(email, password)
      
      // Login successful, redirect to home
      console.log('Login successful, redirecting to dashboard')
      navigate('/')
      
    } catch (err: any) {
      console.error('Login error:', err)
      setStatus(err.message || 'Login failed. Please try again.')
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
      {status && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <span className="text-sm text-red-700 font-medium">{status}</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <Button type="submit" className="bg-primaryBlue text-white hover:opacity-90" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Login'}
        </Button>
      </div>
      <div className="text-right text-sm">
        <Link to="/forgot-password" className="text-primaryBlue hover:underline">Forgot password?</Link>
      </div>
    </form>
  )
}


