import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import LoginForm from '@/components/LoginForm'
import { Link } from 'react-router-dom'
// Logo is served from public folder

const LoginPage: React.FC = () => {
  return (
    <div className="mx-auto max-w-4xl">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left: Logo / visual */}
            <div className="flex items-center justify-center bg-backgroundSection p-8">
              <img
                src="/cape-logo.png"
                alt="CAPE - Competency & Accreditation Psychology Pathway"
                className="w-64 h-auto object-contain"
              />
            </div>
            {/* Right: Form */}
            <div className="p-6 md:p-8">
              <div className="mb-4">
                <h1 className="font-headings text-2xl text-textDark">Welcome back</h1>
                <p className="text-sm text-textLight">Log in to continue</p>
              </div>
              <LoginForm />
              <div className="mt-3 text-xs text-textLight">
                Don’t have an account?{' '}
                <Link to="/register" className="text-primaryBlue hover:underline">Register</Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginPage






