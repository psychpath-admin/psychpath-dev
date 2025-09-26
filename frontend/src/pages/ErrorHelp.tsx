import React, { useState, useEffect } from 'react'
import { Search, AlertTriangle, MessageCircle, Mail, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface ErrorEntry {
  id: string
  summary: string
  explanation: string
  stepsToResolve: string[]
  category: 'Validation' | 'Network' | 'Server' | 'Client' | 'General'
  frequency: number
}

const ErrorHelp: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedError, setSelectedError] = useState<ErrorEntry | null>(null)
  const [showSupportForm, setShowSupportForm] = useState(false)
  const [supportForm, setSupportForm] = useState({
    subject: '',
    description: '',
    errorId: '',
    userEmail: ''
  })
  const [highlightedErrorId, setHighlightedErrorId] = useState<string | null>(null)

  // Read URL parameters and highlight matching error
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const errorId = urlParams.get('errorId')
    const summary = urlParams.get('summary')
    
    if (errorId) {
      // Try to find exact match by errorId
      const exactMatch = errorDatabase.find(error => error.id === errorId)
      if (exactMatch) {
        setSelectedError(exactMatch)
        setHighlightedErrorId(errorId)
        return
      }
    }
    
    if (summary) {
      // Try to find match by summary text
      const summaryMatch = errorDatabase.find(error => 
        error.summary.toLowerCase().includes(summary.toLowerCase()) ||
        summary.toLowerCase().includes(error.summary.toLowerCase())
      )
      if (summaryMatch) {
        setSelectedError(summaryMatch)
        setHighlightedErrorId(summaryMatch.id)
        // Pre-fill support form with error details
        setSupportForm(prev => ({
          ...prev,
          subject: `Error: ${summaryMatch.summary}`,
          errorId: summaryMatch.id,
          description: `I encountered this error: ${summaryMatch.summary}\n\n${summaryMatch.explanation}`
        }))
        return
      }
    }
    
    // If no exact match, try to find by keywords from the error
    if (summary) {
      const keywords = summary.toLowerCase().split(' ')
      const keywordMatch = errorDatabase.find(error => 
        keywords.some(keyword => 
          error.summary.toLowerCase().includes(keyword) ||
          error.explanation.toLowerCase().includes(keyword)
        )
      )
      if (keywordMatch) {
        setSelectedError(keywordMatch)
        setHighlightedErrorId(keywordMatch.id)
      }
    }
  }, [])

  // Common error database
  const errorDatabase: ErrorEntry[] = [
    {
      id: 'ERR-001',
      summary: 'Date Validation Error: Internship Start Date cannot be before Provisional Registration Date',
      explanation: 'Your Internship Start Date cannot be before your Provisional Registration Date. The error message will show you the exact dates involved and tell you what date to use instead. This is required to ensure your internship program follows the correct sequence according to AHPRA guidelines.',
      stepsToResolve: [
        'Look at the specific error message - it will show you the exact dates that are causing the problem',
        'The error will tell you what date to set your Internship Start Date to',
        'Set your Internship Start Date to the date specified in the error message',
        'If you believe the dates are correct, contact support as this may indicate a data entry issue',
        'Remember: Your internship must start on or after the day you become provisionally registered'
      ],
      category: 'Validation',
      frequency: 15
    },
    {
      id: 'ERR-004',
      summary: 'Email Address Already Registered',
      explanation: 'The email address you are trying to use is already registered in our system. This could mean you already have an account, or someone else is using this email address.',
      stepsToResolve: [
        'Check if you already have an account with this email address',
        'Try logging in with your existing credentials',
        'If you forgot your password, use the "Forgot Password" link',
        'If you believe this is an error, contact support with your email address',
        'Use a different email address if you need to create a new account'
      ],
      category: 'Registration',
      frequency: 8
    },
    {
      id: 'ERR-005',
      summary: 'AHPRA Registration Number Already Exists',
      explanation: 'The AHPRA registration number you entered is already registered in our system. Each AHPRA registration number can only be used once.',
      stepsToResolve: [
        'Double-check your AHPRA registration number for any typos',
        'Ensure you are entering the correct number from your AHPRA registration certificate',
        'Contact support if you believe this is an error',
        'If you already have an account, try logging in instead of registering'
      ],
      category: 'Registration',
      frequency: 5
    },
    {
      id: 'ERR-006',
      summary: 'Invalid Verification Code',
      explanation: 'The verification code you entered is incorrect or has expired. Verification codes are sent to your email and have a limited time to be used.',
      stepsToResolve: [
        'Check your email for the verification code (check spam/junk folder too)',
        'Make sure you are entering the code exactly as shown in the email',
        'Request a new verification code if the current one has expired',
        'Ensure you are using the code for the correct email address',
        'Contact support if you continue to have issues'
      ],
      category: 'Verification',
      frequency: 12
    },
    {
      id: 'ERR-007',
      summary: 'User Profile Not Found',
      explanation: 'Your user profile could not be found in our system. This usually happens when there is a temporary connection issue or your session has expired.',
      stepsToResolve: [
        'Try refreshing the page',
        'Log out and log back in to your account',
        'Clear your browser cache and cookies',
        'Check your internet connection',
        'Contact support if the problem persists'
      ],
      category: 'Authentication',
      frequency: 6
    },
    {
      id: 'ERR-008',
      summary: 'Simulated Client Contact Hours Exceeded',
      explanation: 'You have reached or exceeded the maximum number of simulated client contact hours allowed in your internship program. The 5+1 program allows a maximum of 60 hours of simulated client contact.',
      stepsToResolve: [
        'Review your existing logbook entries to see how many simulated hours you have logged',
        'Mark new client contact entries as non-simulated if they involve real clients',
        'Focus on logging real client contact hours instead',
        'Contact your supervisor if you need guidance on what counts as simulated vs real client contact',
        'Remember: Real client contact hours are more valuable for your internship requirements'
      ],
      category: 'Validation',
      frequency: 4
    },
    {
      id: 'ERR-009',
      summary: 'Minimum Weeks Requirement Not Met',
      explanation: 'Your internship requires a minimum number of weeks to complete. You have not yet reached this requirement and need to continue logging hours.',
      stepsToResolve: [
        'Continue logging your weekly hours in your logbook',
        'Ensure you meet the minimum weekly hours requirement each week',
        'Check your progress dashboard to see how many weeks you have completed',
        'Contact your supervisor if you have concerns about meeting the timeline',
        'Remember: Consistency is key - aim to log hours every week'
      ],
      category: 'Progress',
      frequency: 3
    },
    {
      id: 'ERR-010',
      summary: 'Invalid Email Format',
      explanation: 'The email address you entered is not in a valid format. Email addresses must contain an @ symbol and a valid domain name.',
      stepsToResolve: [
        'Check that your email address contains an @ symbol',
        'Ensure there is text before and after the @ symbol',
        'Make sure the domain part (after @) contains a dot and valid extension',
        'Common valid formats: user@example.com, name.surname@university.edu.au',
        'Avoid spaces and special characters except dots and underscores'
      ],
      category: 'Validation',
      frequency: 7
    },
    {
      id: 'PROFILE_SAVE_ERROR',
      summary: 'Profile Save Failed: Validation Error',
      explanation: 'There was an issue saving your profile changes due to validation errors. This typically occurs when form data doesn\'t meet the required validation rules.',
      stepsToResolve: [
        'Check the highlighted fields for validation errors',
        'Ensure all required fields are filled correctly',
        'Verify date fields are in the correct format and logical order',
        'Try saving again after correcting any errors',
        'If the problem persists, contact support'
      ],
      category: 'Validation',
      frequency: 25
    },
    {
      id: 'ERR-002',
      summary: 'Date Locked Error: Critical dates cannot be changed once saved',
      explanation: 'Your Provisional Registration Date, Internship Start Date, or Program Start Date cannot be changed once they have been saved. This is required for AHPRA compliance and audit purposes.',
      stepsToResolve: [
        'Review the current saved date to ensure it\'s correct',
        'If you need to change a locked date, contact support with the reason for the change',
        'Provide documentation supporting the date change if required',
        'Support will review your request and make the change if appropriate'
      ],
      category: 'Validation',
      frequency: 8
    },
    {
      id: 'ERR-003',
      summary: 'Mobile Number Format Error: Invalid Australian mobile number format',
      explanation: 'The mobile number you entered is not in the correct format for an Australian mobile number. Australian mobile numbers must start with 04 or +61 4.',
      stepsToResolve: [
        'Enter your mobile number starting with 04 (e.g., 0412 345 678)',
        'Or enter it with country code +61 4 (e.g., +61 412 345 678)',
        'Remove any spaces, hyphens, or special characters',
        'Ensure the number is exactly 10 digits (04xxxxxxxx) or 13 digits (+61 4xxxxxxxx)'
      ],
      category: 'Validation',
      frequency: 12
    },
    {
      id: 'ERR-004',
      summary: 'Network Error: Failed to fetch data from server',
      explanation: 'The application cannot connect to the server, which may be due to internet connectivity issues or server maintenance.',
      stepsToResolve: [
        'Check your internet connection',
        'Try refreshing the page',
        'Wait a few minutes and try again',
        'If the problem persists, the server may be under maintenance'
      ],
      category: 'Network',
      frequency: 8
    },
    {
      id: 'ERR-003',
      summary: 'Authentication Error: Session expired',
      explanation: 'Your login session has expired and you need to log in again to continue using the application.',
      stepsToResolve: [
        'Click the "Log In" button',
        'Enter your email and password',
        'If you forgot your password, use the "Forgot Password" link',
        'Contact support if you continue to have login issues'
      ],
      category: 'Client',
      frequency: 12
    },
    {
      id: 'ERR-005',
      summary: 'Server Error: Internal server error (500)',
      explanation: 'The server encountered an unexpected condition that prevented it from fulfilling the request.',
      stepsToResolve: [
        'Wait a moment and try again',
        'Refresh the page',
        'If the error persists, contact support with the error ID',
        'Try logging out and logging back in'
      ],
      category: 'Server',
      frequency: 3
    },
    {
      id: 'ERR-005',
      summary: 'Validation Error: Required field is missing',
      explanation: 'One or more required fields in a form are empty and must be filled before submission.',
      stepsToResolve: [
        'Look for red error messages on the form',
        'Fill in all required fields marked with an asterisk (*)',
        'Check that all date fields are properly selected',
        'Ensure email addresses are in valid format'
      ],
      category: 'Validation',
      frequency: 20
    },
    {
      id: 'ERR-006',
      summary: 'Client Error: Page not found (404)',
      explanation: 'The page you are trying to access does not exist or has been moved.',
      stepsToResolve: [
        'Check the URL for typos',
        'Use the navigation menu to find the correct page',
        'Go back to the previous page',
        'Contact support if you believe this is an error'
      ],
      category: 'Client',
      frequency: 5
    }
  ]

  const filteredErrors = errorDatabase.filter(error =>
    error.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    error.explanation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    error.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // In a real implementation, this would send to the backend
      console.log('Support ticket submitted:', supportForm)
      
      // For now, show success message
      alert('Support ticket submitted successfully! We\'ll get back to you within 24 hours.')
      setShowSupportForm(false)
      setSupportForm({ subject: '', description: '', errorId: '', userEmail: '' })
    } catch (error) {
      console.error('Failed to submit support ticket:', error)
      alert('Failed to submit support ticket. Please try again or contact us directly.')
    }
  }

  const handleStartLiveChat = () => {
    // Placeholder for future AI chat integration
    alert('Live chat feature coming soon! For now, please use the support form or email us directly.')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Error Help Center
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Find solutions to common issues and get help when you need it
          </p>
          {highlightedErrorId && (
            <div className="mt-6 max-w-2xl mx-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 text-blue-800">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">
                    We've highlighted the error you encountered below
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Search and Error List */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Search Error Database
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Search for error messages, categories, or keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-4"
                />
                
                <div className="space-y-3">
                  {filteredErrors.map((error) => (
                    <div
                      key={error.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        highlightedErrorId === error.id
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedError(error)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">
                              {error.summary}
                            </h3>
                            {highlightedErrorId === error.id && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                Your Error
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {error.explanation}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="px-2 py-1 bg-gray-100 rounded">
                              {error.category}
                            </span>
                            <span>ID: {error.id}</span>
                            <span>{error.frequency} reports</span>
                          </div>
                        </div>
                        <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 ml-2" />
                      </div>
                    </div>
                  ))}
                  
                  {filteredErrors.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No errors found matching your search.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Error Details and Support */}
          <div className="space-y-6">
            {/* Selected Error Details */}
            {selectedError && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Error Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Issue</h4>
                      <p className="text-sm text-gray-600">{selectedError.summary}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Explanation</h4>
                      <p className="text-sm text-gray-600">{selectedError.explanation}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Steps to Resolve</h4>
                      <ol className="text-sm text-gray-600 space-y-1">
                        {selectedError.stepsToResolve.map((step, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Support Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Get Help</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => setShowSupportForm(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Log Support Ticket
                </Button>
                
                <Button
                  onClick={handleStartLiveChat}
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Start Live Chat
                </Button>
                
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Or contact us directly:</p>
                  <a
                    href="mailto:support@psychpathway.com.au"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    support@psychpathway.com.au
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Support Form Modal */}
        {showSupportForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Submit Support Ticket</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSupportSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={supportForm.subject}
                      onChange={(e) => setSupportForm(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Brief description of the issue"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="errorId">Error ID (if available)</Label>
                    <Input
                      id="errorId"
                      value={supportForm.errorId}
                      onChange={(e) => setSupportForm(prev => ({ ...prev, errorId: e.target.value }))}
                      placeholder="e.g., ERR-001"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={supportForm.description}
                      onChange={(e) => setSupportForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Please describe the issue in detail..."
                      rows={4}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="userEmail">Your Email</Label>
                    <Input
                      id="userEmail"
                      type="email"
                      value={supportForm.userEmail}
                      onChange={(e) => setSupportForm(prev => ({ ...prev, userEmail: e.target.value }))}
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowSupportForm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Submit Ticket
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default ErrorHelp
