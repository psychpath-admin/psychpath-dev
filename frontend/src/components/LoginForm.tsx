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
      if (!res.ok) {
        // Provide more specific error messages
        if (res.status === 401) {
          if (data?.detail?.includes('No active account found') || data?.detail?.includes('Invalid credentials')) {
            throw new Error('Invalid email or password. Please check your credentials and try again.')
          } else if (data?.detail?.includes('Unable to log in')) {
            throw new Error('Account not found. Please check your email address or contact support.')
          } else {
            throw new Error('Invalid email or password. Please check your credentials and try again.')
          }
        } else if (res.status === 400) {
          throw new Error('Please enter both email and password.')
        } else if (res.status >= 500) {
          throw new Error('Server error. Please try again later or contact support.')
        } else {
          throw new Error(data?.detail || 'Login failed. Please try again.')
        }
      }
      localStorage.setItem('accessToken', data.access)
      localStorage.setItem('refreshToken', data.refresh)
      setStatus(null)
      
      // Check if this is the user's first login to determine redirect
      try {
        const meRes = await fetch(`${API_URL}/api/me/`, {
          headers: { 'Authorization': `Bearer ${data.access}` }
        })
        if (meRes.ok) {
          const userData = await meRes.json()
          if (!userData.first_login_completed || !userData.profile_completed) {
            // First-time login or profile not completed - redirect to profile page
            navigate('/profile')
            return
          }
          // For supervisors, also redirect to profile if they haven't seen the welcome overlay
          if (userData.role === 'SUPERVISOR' && !userData.supervisor_welcome_seen) {
            navigate('/profile')
            return
          }
        }
      } catch (error) {
        console.error('Error checking profile status:', error)
      }
      
      // Profile is completed or check failed - redirect to dashboard
      navigate('/')
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


