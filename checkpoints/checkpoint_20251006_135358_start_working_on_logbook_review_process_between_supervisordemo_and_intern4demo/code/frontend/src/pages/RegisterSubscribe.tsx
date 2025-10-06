import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { CheckCircle, Star, UserCheck, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { API_URL } from '@/lib/api'

const subscriptionPlans = [
  {
    id: 'basic',
    name: 'Basic Plan',
    price: '$29',
    period: 'per month',
    description: 'Essential features for individual practitioners',
    features: [
      'Unlimited logbook entries',
      'Basic reporting',
      'Email support',
      'Standard templates'
    ],
    popular: false
  },
  {
    id: 'professional',
    name: 'Professional Plan',
    price: '$49',
    period: 'per month',
    description: 'Advanced features for growing practices',
    features: [
      'Everything in Basic',
      'Advanced analytics',
      'Priority support',
      'Custom templates',
      'Supervisor dashboard',
      'Bulk import/export'
    ],
    popular: true
  },
  {
    id: 'organization',
    name: 'Organization Plan',
    price: '$99',
    period: 'per month',
    description: 'Complete solution for organizations',
    features: [
      'Everything in Professional',
      'Multi-user management',
      'Advanced reporting',
      'API access',
      'Dedicated support',
      'Custom integrations'
    ],
    popular: false
  }
]

export default function RegisterSubscribe() {
  const [selectedPlan, setSelectedPlan] = useState('professional')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  const handleSubscribe = async () => {
    setIsLoading(true)
    try {
      // Get registration data from localStorage
      const registrationData = localStorage.getItem('registrationData')
      if (!registrationData) {
        console.error('No registration data found')
        window.location.href = '/register'
        return
      }
      
      const formData = JSON.parse(registrationData)
      
      // Complete registration
      const response = await fetch(`${API_URL}/api/auth/register/complete/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          subscription_plan: selectedPlan
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // Store user email for success message
        setUserEmail(formData.email)
        
        // Clear registration data
        localStorage.removeItem('registrationData')
        
        // Show success message first
        setShowSuccess(true)
        
        // Wait 3 seconds then auto-login the user
        setTimeout(async () => {
          const loginResponse = await fetch(`${API_URL}/api/auth/token/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: formData.email,
              password: formData.password
            })
          })
          
          if (loginResponse.ok) {
            const loginData = await loginResponse.json()
            localStorage.setItem('accessToken', loginData.access)
            window.location.href = '/profile'
          } else {
            window.location.href = '/login'
          }
        }, 3000)
      } else {
        console.error('Registration completion failed:', data.error)
        alert('Registration failed. Please try again.')
      }
    } catch (error) {
      console.error('Subscription error:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Show success message
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <UserCheck className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-600 mb-2">
                Account Created Successfully!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 text-lg">
                Welcome to PsychPATH! Your account has been created for <strong>{userEmail}</strong>.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
                <div className="space-y-2 text-blue-800">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    <span>You will be automatically logged in</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    <span>You'll be directed to your profile page</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    <span>Complete your personal information to start using PsychPATH</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Redirecting you now...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
          <p className="text-lg text-gray-600">
            Select the subscription plan that best fits your needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {subscriptionPlans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative ${plan.popular ? 'ring-2 ring-primary shadow-lg' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                    <Star className="h-4 w-4 mr-1" />
                    Most Popular
                  </div>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-600 ml-1">{plan.period}</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">{plan.description}</p>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Select Your Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={selectedPlan} 
              onValueChange={setSelectedPlan}
              className="space-y-4"
            >
              {subscriptionPlans.map((plan) => (
                <div key={plan.id} className="flex items-start space-x-3">
                  <RadioGroupItem value={plan.id} id={plan.id} className="mt-1" />
                  <Label 
                    htmlFor={plan.id} 
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{plan.name}</div>
                        <div className="text-sm text-gray-600">{plan.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{plan.price}</div>
                        <div className="text-sm text-gray-600">{plan.period}</div>
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="mt-8 text-center">
              <Button 
                onClick={handleSubscribe}
                disabled={isLoading}
                className="bg-primary text-white hover:bg-primary/90 px-8 py-3 text-lg"
              >
                {isLoading ? 'Processing...' : 'Continue to Profile Setup'}
              </Button>
              
              <p className="text-xs text-gray-500 mt-4">
                This is a demo subscription flow. No actual payment will be processed.
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
    </div>
  )
}
