import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import { API_URL } from '@/lib/api'

export default function RegisterTerms() {
  const [agreed, setAgreed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleAgree = async () => {
    if (!agreed) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/auth/register/terms/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreed: true })
      })
      
      if (response.ok) {
        window.location.href = '/register/details'
      } else {
        const error = await response.json()
        console.error('Error agreeing to terms:', error)
      }
    } catch (error) {
      console.error('Error agreeing to terms:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Terms and Conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Placeholder T&Cs content - will be replaced with actual content later */}
          <div className="prose max-w-none">
            <h3>1. Acceptance of Terms</h3>
            <p>
              By accessing and using the CAPE (Clinical Assessment and Professional Evaluation) platform, 
              you accept and agree to be bound by the terms and provision of this agreement.
            </p>
            
            <h3>2. Use License</h3>
            <p>
              Permission is granted to temporarily download one copy of the materials on CAPE for personal, 
              non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
            </p>
            
            <h3>3. Professional Standards</h3>
            <p>
              Users must maintain professional standards and comply with all relevant professional 
              guidelines and regulations, including AHPRA requirements for provisional psychologists, 
              registrars, and supervisors.
            </p>
            
            <h3>4. Data Privacy and Security</h3>
            <p>
              CAPE is committed to protecting your personal information and professional data. 
              All data is stored securely and used only for the purposes outlined in our Privacy Policy.
            </p>
            
            <h3>5. Account Responsibilities</h3>
            <p>
              You are responsible for maintaining the confidentiality of your account and password. 
              You agree to accept responsibility for all activities that occur under your account.
            </p>
            
            <h3>6. Limitation of Liability</h3>
            <p>
              In no event shall CAPE or its suppliers be liable for any damages arising out of the use 
              or inability to use the materials on CAPE, even if CAPE or an authorized representative 
              has been notified orally or in writing of the possibility of such damage.
            </p>
            
            <h3>7. Modifications</h3>
            <p>
              CAPE may revise these terms of service at any time without notice. By using this platform, 
              you are agreeing to be bound by the then current version of these terms.
            </p>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox 
                id="agree-terms" 
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked as boolean)}
              />
              <label 
                htmlFor="agree-terms" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I have read and agree to the Terms and Conditions above
              </label>
            </div>
            
            <div className="flex justify-center">
              <Button 
                onClick={handleAgree}
                disabled={!agreed || isLoading}
                className="bg-primary text-white hover:bg-primary/90"
              >
                {isLoading ? 'Processing...' : 'I Agree - Continue Registration'}
              </Button>
            </div>
            
            <p className="text-xs text-gray-500 text-center mt-4">
              A copy of these Terms and Conditions will be emailed to you for your records.
            </p>
            
            <div className="text-center mt-4">
              <Link to="/login" className="text-sm text-primaryBlue hover:underline">
                ← Back to Login
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
