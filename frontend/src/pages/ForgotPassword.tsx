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
  const [showTempReset, setShowTempReset] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [resetUid, setResetUid] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const response = await fetch(`${API_URL}/api/auth/password-reset/request/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await response.json()
      setSent(true)
      
      // If we get a reset link in development, show temporary reset option
      if (data.reset_link) {
        const url = new URL(data.reset_link, window.location.origin)
        const uid = url.searchParams.get('uid')
        const token = url.searchParams.get('token')
        if (uid && token) {
          setResetUid(uid)
          setResetToken(token)
          setShowTempReset(true)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed')
    }
  }

  async function handleTempReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }
    
    try {
      const response = await fetch(`${API_URL}/api/auth/password-reset/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          uid: resetUid, 
          token: resetToken, 
          new_password: newPassword 
        })
      })
      
      if (response.ok) {
        setResetSuccess(true)
      } else {
        const data = await response.json()
        setError(data.detail || 'Password reset failed')
      }
    } catch (err: any) {
      setError(err.message || 'Password reset failed')
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
        </CardHeader>
        <CardContent>
          {resetSuccess ? (
            <div className="space-y-3">
              <div className="text-sm text-green-600">
                ✅ Password reset successfully! You can now log in with your new password.
              </div>
              <div className="text-center">
                <Link to="/login" className="text-sm text-primaryBlue hover:underline">
                  ← Back to Login
                </Link>
              </div>
            </div>
          ) : showTempReset ? (
            <div className="space-y-3">
              <div className="text-sm text-textDark">
                <strong>Development Mode:</strong> You can reset your password directly here.
              </div>
              <form onSubmit={handleTempReset} className="space-y-3">
                <div>
                  <label className="text-sm">New Password</label>
                  <Input 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    required 
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="text-sm">Confirm Password</label>
                  <Input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    required 
                    minLength={8}
                  />
                </div>
                {error && <div className="text-sm text-red-600">{error}</div>}
                <Button type="submit" className="bg-primaryBlue text-white w-full">
                  Reset Password
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowTempReset(false)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </form>
            </div>
          ) : sent ? (
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






