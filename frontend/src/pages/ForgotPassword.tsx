import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { API_URL } from '@/lib/api'

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await fetch(`${API_URL}/api/auth/password-reset/request/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      setSent(true)
    } catch (err: any) {
      setError(err.message || 'Failed')
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-3">
              <div className="text-sm text-textDark">
                If that email exists, a reset link has been sent. Please check your inbox.
              </div>
              <div className="text-center">
                <Link to="/login" className="text-sm text-primaryBlue hover:underline">
                  ← Back to Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              {error && <div className="text-sm text-red-600">{error}</div>}
              <Button type="submit" className="bg-primaryBlue text-white">Send reset link</Button>
              <div className="text-center">
                <Link to="/login" className="text-sm text-primaryBlue hover:underline">
                  ← Back to Login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ForgotPassword






