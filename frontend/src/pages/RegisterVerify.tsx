import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, Mail, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { API_URL } from '@/lib/api'

export default function RegisterVerify() {
  const [email, setEmail] = useState('')
  const [psyNumber, setPsyNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30 * 60) // 30 minutes in seconds
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState('')

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [timeLeft])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleResendCode = async () => {
    setIsLoading(true)
    setError('')
    try {
      // TODO: Call backend to resend verification code
      console.log('Resending verification code to:', email)
      setTimeLeft(30 * 60) // Reset timer
    } catch (error) {
      setError('Failed to resend code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch(`${API_URL}/api/auth/register/verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, psy_number: psyNumber, verification_code: verificationCode })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setIsVerified(true)
        setTimeout(() => {
          window.location.href = '/register/subscribe'
        }, 2000)
      } else {
        setError(data.error || 'Verification failed. Please try again.')
      }
    } catch (error) {
      setError('Verification failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isVerified) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold text-green-600">Verification Successful!</h2>
              <p className="text-gray-600">Your email has been verified. Redirecting to subscription...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Email Verification</CardTitle>
          <p className="text-center text-gray-600">
            We've sent a verification code to your email address
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="psy_number">PSY Number</Label>
                <Input
                  id="psy_number"
                  value={psyNumber}
                  onChange={(e) => setPsyNumber(e.target.value.toUpperCase())}
                  placeholder="Enter your PSY number"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="verification_code">Verification Code</Label>
                <Input
                  id="verification_code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                  required
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Code expires in: {formatTime(timeLeft)}</span>
              </div>
              
              {timeLeft === 0 && (
                <div className="text-center">
                  <p className="text-sm text-red-600 mb-2">Verification code has expired</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResendCode}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? 'Sending...' : 'Resend Code'}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Button 
                type="submit" 
                disabled={isLoading || timeLeft === 0}
                className="w-full bg-primary text-white hover:bg-primary/90"
              >
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </Button>
              
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={handleResendCode}
                  disabled={isLoading || timeLeft > 0}
                  className="text-sm"
                >
                  Didn't receive the code? Resend
                </Button>
              </div>
            </div>

            <div className="text-center text-xs text-gray-500">
              <p>Check your email inbox and spam folder</p>
              <p>For demo purposes, use code: <strong>123456</strong></p>
            </div>
            
            <div className="text-center mt-4">
              <Link to="/login" className="text-sm text-primaryBlue hover:underline">
                ← Back to Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
