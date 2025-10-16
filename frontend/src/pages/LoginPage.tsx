import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import LoginForm from '@/components/LoginForm'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const LoginPage: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  
  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (isAuthenticated) {
      console.log('LoginPage: User already authenticated, redirecting to dashboard')
      navigate('/')
    }
  }, [isAuthenticated, navigate])
  
  return (
    <div className="min-h-screen bg-white">
      <Card className="h-full overflow-hidden border-0 shadow-none bg-transparent">
        <CardContent className="p-0 h-full">
          <div className="grid h-screen grid-cols-1 bg-white md:grid-cols-[55%_45%]">
            {/* Left: Illustration with subtle backdrop and overlay copy (hidden on small screens) */}
            <div className="relative hidden md:flex flex-col items-start justify-start bg-[#F7FAFC] md:pt-24">
              <div className="w-full flex justify-center">
                <img
                  src="/login-illustration.png"
                  alt="PsychPATH illustration"
                  className="max-w-[720px] max-h-[80vh] object-contain rounded-xl shadow-sm"
                />
              </div>
              {/* Remaining space under the image: center the copy within it */}
              <div className="flex-1 w-full flex items-center justify-center">
                <div className="text-center max-w-2xl text-slate-700 px-6">
                  <h2 className="font-headings mb-3 text-5xl md:text-6xl">PsychPATH</h2>
                  <p className="text-lg md:text-2xl opacity-90">Log, track and accelerate your psychology training journey.</p>
                </div>
              </div>
            </div>
            {/* Right: Form (top-aligned) */}
            <div className="flex items-start justify-center p-6 md:p-10 md:pt-24">
              <div className="w-full max-w-md space-y-6">
                <div>
                  <h1 className="font-headings text-3xl text-textDark">Welcome back</h1>
                  <p className="text-sm text-textLight">Log in to continue</p>
                </div>
                <div className="rounded-xl border borderLight bg-backgroundCard p-6 shadow-psychpath">
                  <LoginForm />
                </div>
                <div className="text-xs text-textLight">
                  Don’t have an account?{' '}
                  <Link to="/register" className="text-primaryBlue hover:underline">Register</Link>
                </div>
                {/* Descriptive text to balance whitespace */}
                <div className="pt-2 text-sm leading-relaxed text-slate-600">
                  <h3 className="font-headings mb-1 text-base text-textDark">About PsychPATH</h3>
                  <p>
                    PsychPATH helps provisional psychologists and registrars log clinical work, track
                    supervision and professional development, and stay aligned with program goals.
                  </p>
                  <p className="mt-2 opacity-80">
                    Secure, AHPRA-aligned record keeping with clear progress insights for trainees and supervisors.
                  </p>
                </div>
                {/* Message of the day / status card */}
                <div className="mx-auto w-full max-w-md rounded-xl border borderLight bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">All services are up and running</p>
                      <p className="text-xs text-slate-600">Having issues? <a href="/support" className="text-primaryBlue hover:underline">Click here</a> to contact support.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginPage






