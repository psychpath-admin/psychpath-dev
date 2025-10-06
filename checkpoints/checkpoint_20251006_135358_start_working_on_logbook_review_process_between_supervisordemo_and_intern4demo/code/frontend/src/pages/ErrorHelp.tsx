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

// Common error database
const errorDatabase: ErrorEntry[] = [
  {
    id: 'ERR-001',
    summary: 'Date Validation Error: Internship Start Date cannot be before Provisional Registration Date',
    explanation: 'Your Internship Start Date cannot be before your Provisional Registration Date. The error message will show you the exact dates involved and tell you what date to use instead. This is required to ensure your internship program follows the correct sequence according to AHPRA guidelines.',
    stepsToResolve: [
      'Look at the specific error message - it will show you the exact dates that are causing the problem',
      'The error will tell you what date to set your Internship Start Date to',
      'Go to your Profile page and update your Internship Start Date to the correct date',
      'Make sure your Provisional Registration Date is set correctly first',
      'Save your profile changes and try again',
      'If you believe the dates are correct, contact support for assistance'
    ],
    category: 'Validation',
    frequency: 15
  },
  {
    id: 'ERR-003',
    summary: 'Network Connection Error: Unable to connect to server',
    explanation: 'The application cannot connect to the server. This could be due to internet connectivity issues, server maintenance, or network configuration problems.',
    stepsToResolve: [
      'Check your internet connection',
      'Try refreshing the page',
      'Clear your browser cache and cookies',
      'Check if other websites are working',
      'Try using a different browser or device',
      'If the problem persists, contact support'
    ],
    category: 'Network',
    frequency: 8
  },
  {
    id: 'ERR-004',
    summary: 'Server Error: Internal server error occurred',
    explanation: 'The server encountered an unexpected error while processing your request. This is a temporary issue that should resolve itself.',
    stepsToResolve: [
      'Wait a few minutes and try again',
      'Refresh the page',
      'Clear your browser cache',
      'If the error persists, contact support with the error details',
      'Try using a different browser or device'
    ],
    category: 'Server',
    frequency: 3
  },
  {
    id: 'ERR-005',
    summary: 'Authentication Error: Session expired or invalid credentials',
    explanation: 'Your login session has expired or your credentials are invalid. You need to log in again to continue using the application.',
    stepsToResolve: [
      'Log out of the application completely',
      'Clear your browser cache and cookies',
      'Log back in with your username and password',
      'If you forgot your password, use the "Forgot Password" link',
      'Make sure you are using the correct login credentials',
      'If the problem persists, contact support'
    ],
    category: 'Client',
    frequency: 12
  },
  {
    id: 'ERR-006',
    summary: 'Validation Error: Required fields are missing or invalid',
    explanation: 'Some required fields in your form are empty or contain invalid data. The application cannot process your request without this information.',
    stepsToResolve: [
      'Check the form for highlighted error messages',
      'Fill in all required fields marked with a red asterisk (*)',
      'Make sure dates are in the correct format',
      'Check that email addresses are valid',
      'Ensure numeric fields contain only numbers',
      'Try submitting the form again'
    ],
    category: 'Validation',
    frequency: 20
  },
  {
    id: 'ERR-007',
    summary: 'File Upload Error: Unable to upload file',
    explanation: 'The file you are trying to upload could not be processed. This could be due to file size limits, unsupported file types, or network issues.',
    stepsToResolve: [
      'Check that your file is under the size limit (usually 10MB)',
      'Make sure you are uploading a supported file type (PDF, DOC, DOCX, JPG, PNG)',
      'Try compressing the file if it is too large',
      'Check your internet connection',
      'Try uploading a different file to test',
      'If the problem persists, contact support'
    ],
    category: 'Client',
    frequency: 6
  },
  {
    id: 'ERR-008',
    summary: 'Permission Error: You do not have access to this resource',
    explanation: 'Your account does not have the necessary permissions to access this feature or resource. This is typically related to your user role or account status.',
    stepsToResolve: [
      'Check that you are logged in with the correct account',
      'Verify your user role and permissions with your supervisor',
      'Make sure your account is active and not suspended',
      'Contact your supervisor or administrator for access',
      'If you believe this is an error, contact support'
    ],
    category: 'Client',
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
    category: 'Validation',
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
    explanation: 'Some dates in your profile cannot be modified after they have been initially set. This is to maintain data integrity and comply with regulatory requirements.',
    stepsToResolve: [
      'Review which dates are locked and why',
      'Contact your supervisor if you need to change locked dates',
      'Ensure all other dates are correct before saving',
      'If you believe a date should not be locked, contact support',
      'Remember: Double-check dates before saving to avoid this issue'
    ],
    category: 'Validation',
    frequency: 10
  },
  {
    id: 'ERR-011',
    summary: 'Hours Validation Error: Invalid hours entered',
    explanation: 'The hours you entered are not valid. This could be due to negative values, decimal places, or exceeding maximum limits.',
    stepsToResolve: [
      'Check that hours are positive numbers (no negative values)',
      'Use whole numbers or up to 2 decimal places (e.g., 1.5, 2.25)',
      'Ensure hours don\'t exceed 24 hours per day',
      'Check that total hours don\'t exceed reasonable limits',
      'If using decimal places, use a dot (.) not a comma (,)',
      'Contact support if you believe your hours are correct'
    ],
    category: 'Validation',
    frequency: 18
  },
  {
    id: 'ERR-012',
    summary: 'Supervision Hours Mismatch',
    explanation: 'The supervision hours you entered don\'t match your logbook entries. This could indicate a data entry error or calculation issue.',
    stepsToResolve: [
      'Review your logbook entries for the relevant period',
      'Check that supervision hours are correctly recorded',
      'Verify that individual and group supervision hours are separate',
      'Ensure hours match what was actually supervised',
      'Contact your supervisor to verify the correct hours',
      'Update your entries to match the verified hours'
    ],
    category: 'Validation',
    frequency: 9
  },
  {
    id: 'ERR-013',
    summary: 'Client Contact Hours Insufficient',
    explanation: 'Your logged client contact hours are below the minimum requirement for your internship program. You need to increase your direct client work.',
    stepsToResolve: [
      'Review your current client contact hours',
      'Identify opportunities to increase direct client work',
      'Discuss with your supervisor about additional client assignments',
      'Consider if any logged hours might be miscategorized',
      'Develop a plan to meet the minimum requirements',
      'Remember: Real client contact hours are more valuable for your internship requirements'
    ],
    category: 'Validation',
    frequency: 4
  },
  {
    id: 'ENDORSEMENT-001',
    summary: 'Endorsement Mismatch - Cannot Supervise This Registrar',
    explanation: 'You cannot supervise this registrar because your professional endorsements do not match their Area of Practice Endorsement (AOPE). Supervisors must have the same endorsement type as the registrar they wish to supervise to ensure proper professional oversight. This is a requirement set by AHPRA to ensure supervisors have the appropriate qualifications for their supervisees.',
    stepsToResolve: [
      'Check what endorsement type the registrar has in their profile',
      'Go to your Profile page and click "Manage Endorsements"',
      'Add the matching endorsement type (e.g., Clinical Psychology, Forensic Psychology, etc.)',
      'Enter the endorsement date and issuing body (usually AHPRA)',
      'Save the endorsement and return to the supervision invitation',
      'Try inviting the registrar again',
      'Alternatively, only invite registrars who have endorsements matching your existing ones',
      'If you believe you already have the required endorsement, contact support to verify your profile'
    ],
    category: 'Validation',
    frequency: 12
  },
  {
    id: 'SUPERVISOR-PROFILE-001',
    summary: 'Supervisor Profile Incomplete',
    explanation: 'You cannot invite supervisees because your supervisor profile is not complete. All required fields must be filled out before you can start supervising others.',
    stepsToResolve: [
      'Go to your Profile page',
      'Complete all required fields in the Supervisor Profile section',
      'Make sure your AHPRA registration details are accurate',
      'Add your supervision experience and qualifications',
      'Save your profile and try inviting supervisees again',
      'If you need help completing your profile, contact support'
    ],
    category: 'Validation',
    frequency: 8
  },
  {
    id: 'SUPERVISOR-PROFILE-002',
    summary: 'Board Approval Required',
    explanation: 'You must confirm that you are a Board-approved supervisor before inviting supervisees. This is a requirement to ensure all supervisors have the necessary qualifications and approval from the Psychology Board.',
    stepsToResolve: [
      'Go to your Profile page',
      'Find the "Are you a Board-approved supervisor?" question',
      'Select "Yes" if you are Board-approved',
      'If you are not Board-approved, contact the Psychology Board to obtain approval',
      'Save your profile changes',
      'Once approved, you can invite supervisees'
    ],
    category: 'Validation',
    frequency: 5
  },
  {
    id: 'SUPERVISOR-PROFILE-003',
    summary: 'Supervisor Registration Date Required',
    explanation: 'You must provide your supervisor registration date before inviting supervisees. This date is required for compliance and audit purposes.',
    stepsToResolve: [
      'Go to your Profile page',
      'Find the Supervisor Registration Date field',
      'Enter the date when you became a registered supervisor',
      'Make sure the date is accurate and in the correct format',
      'Save your profile changes',
      'Try inviting supervisees again'
    ],
    category: 'Validation',
    frequency: 6
  },
  {
    id: 'SUPERVISOR-PROFILE-004',
    summary: 'Supervision Scope Not Selected',
    explanation: 'You must select at least one supervision scope (provisionals or registrars) before inviting supervisees. This indicates what types of supervisees you are qualified to supervise.',
    stepsToResolve: [
      'Go to your Profile page',
      'Find the Supervision Scope section',
      'Select "Can supervise provisionals" if you can supervise provisional psychologists',
      'Select "Can supervise registrars" if you can supervise psychology registrars',
      'You can select both if you are qualified for both',
      'Save your profile changes and try again'
    ],
    category: 'Validation',
    frequency: 4
  },
  {
    id: 'DATABASE-001',
    summary: 'System Configuration Error',
    explanation: 'The system encountered a database configuration error while processing your request. This is a technical issue that requires system administrator attention and cannot be resolved by users.',
    stepsToResolve: [
      'This error has been automatically reported to our technical team',
      'Please try again in a few minutes as the issue may be temporary',
      'If the problem persists, contact support with the error details',
      'Do not attempt to resolve this error yourself as it requires system-level fixes',
      'The technical team will investigate and resolve the underlying database issue'
    ],
    category: 'System',
    frequency: 1
  },
  {
    id: 'EXISTING-SUPERVISION-001',
    summary: 'Supervision Relationship Conflict',
    explanation: 'There is a conflict with the registrar\'s current supervision arrangements. Registrars can have both a primary and secondary supervisor, but the system enforces specific rules: only one primary supervisor is allowed, only one secondary supervisor is allowed, and a primary supervisor must exist before a secondary can be added. This ensures clear supervisory responsibilities and follows AHPRA requirements.',
    stepsToResolve: [
      'Check the registrar\'s current supervision status in their dashboard',
      'If trying to add a Primary Supervisor: ensure no other primary supervisor exists',
      'If trying to add a Secondary Supervisor: ensure a primary supervisor already exists and no secondary supervisor is assigned',
      'For changing supervisors: coordinate with the current supervisor and registrar',
      'Ensure proper endorsement matching for both primary and secondary supervisors',
      'Discuss the change with all parties to ensure smooth transition',
      'Understand that both primary and secondary supervisors must have matching endorsements to the registrar\'s training area',
      'If changing from one primary to another, the current supervision relationship must be ended first'
    ],
    category: 'Validation',
    frequency: 3
  }
]

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

  // Helper function to scroll to error and show details section
  const scrollToErrorWithDetails = (errorId: string) => {
    setTimeout(() => {
      const element = document.getElementById(`error-${errorId}`)
      if (element) {
        // Custom scroll to show both error card and details section
        const errorRect = element.getBoundingClientRect()
        const currentScrollY = window.scrollY
        
        // Position the error card higher up to ensure the Error Details section is fully visible
        // Account for the fact that Error Details is on the right side and needs more space
        const targetScrollY = currentScrollY + errorRect.top - 150 // Increased from 100px to 150px
        
        window.scrollTo({
          top: targetScrollY,
          behavior: 'smooth'
        })
        
        // Additional scroll adjustment after a short delay to ensure details are visible
        setTimeout(() => {
          const detailsElement = document.querySelector('[class*="ring-blue-500"]')
          if (detailsElement) {
            const detailsRect = detailsElement.getBoundingClientRect()
            // If details section is cut off at the bottom, adjust scroll position
            if (detailsRect.bottom > window.innerHeight) {
              const additionalScroll = detailsRect.bottom - window.innerHeight + 20 // 20px padding
              window.scrollBy({
                top: additionalScroll,
                behavior: 'smooth'
              })
            }
          }
        }, 300)
      }
    }, 100)
  }

  // Read URL parameters and highlight matching error
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const errorId = urlParams.get('errorId')
    const summary = urlParams.get('summary')
    const explanation = urlParams.get('explanation')
    const userAction = urlParams.get('userAction')
    
    if (errorId) {
      // Try to find exact match by errorId
      const exactMatch = errorDatabase.find(error => error.id === errorId)
      if (exactMatch) {
        setSelectedError(exactMatch)
        setHighlightedErrorId(errorId)
        // Scroll to the error and ensure details section is visible
        scrollToErrorWithDetails(errorId)
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
        // Scroll to the error and ensure details section is visible
        scrollToErrorWithDetails(summaryMatch.id)
        return
      }
    }
    
    // If we have explanation and userAction from URL, create a custom error entry
    if (explanation && userAction) {
      const customError: ErrorEntry = {
        id: errorId || 'CUSTOM-ERROR',
        summary: summary || 'Custom Error',
        explanation: explanation,
        stepsToResolve: userAction.split('\n').filter(step => step.trim()),
        category: 'General',
        frequency: 1
      }
      setSelectedError(customError)
      setHighlightedErrorId(customError.id)
      return
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
        // Scroll to the error and ensure details section is visible
        scrollToErrorWithDetails(keywordMatch.id)
      }
    }
  }, [])

  const filteredErrors = errorDatabase.filter(error =>
    error.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    error.explanation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    error.category.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    // If there's a highlighted error, put it first
    if (highlightedErrorId) {
      if (a.id === highlightedErrorId) return -1
      if (b.id === highlightedErrorId) return 1
    }
    // Otherwise sort by frequency (most common first)
    return b.frequency - a.frequency
  })

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // In a real implementation, this would send to the backend
      console.log('Support ticket submitted:', supportForm)
      
      // Reset form
      setSupportForm({
        subject: '',
        errorId: '',
        description: '',
        userEmail: ''
      })
      setShowSupportForm(false)
      
      // Show success message
      alert('Support ticket submitted successfully! We\'ll get back to you soon.')
    } catch (error) {
      console.error('Error submitting support ticket:', error)
      alert('Failed to submit support ticket. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Error Help Center</h1>
          <p className="text-gray-600">Find solutions to common errors and get help when you need it.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Error List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Common Errors</CardTitle>
                <div className="mt-4">
                  <input
                    type="text"
                    placeholder="Search errors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredErrors.map((error) => (
                    <div
                      key={error.id}
                      id={`error-${error.id}`}
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                        highlightedErrorId === error.id
                          ? 'border-yellow-300 bg-yellow-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        setSelectedError(error)
                        setHighlightedErrorId(error.id)
                        scrollToErrorWithDetails(error.id)
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">
                              {error.summary}
                            </h3>
                            {highlightedErrorId === error.id && (
                              <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs font-medium rounded-full animate-pulse">
                                Your Error
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {error.explanation}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                              {error.category}
                            </span>
                            <span>ID: {error.id}</span>
                            <span>{error.frequency} reports</span>
                          </div>
                        </div>
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
              <Card className={`transition-all duration-300 ${
                highlightedErrorId ? 'ring-2 ring-blue-500 shadow-lg' : ''
              }`}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-blue-600" />
                    Error Details
                    {highlightedErrorId && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full animate-pulse">
                        Active
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Issue</h4>
                      <p className="text-sm text-gray-600">{selectedError?.summary || 'No summary available'}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Explanation</h4>
                      <p className="text-sm text-gray-600">{selectedError?.explanation || 'No explanation available'}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Steps to Resolve</h4>
                      <ol className="text-sm text-gray-600 space-y-1">
                        {(selectedError?.stepsToResolve || []).map((step, index) => (
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
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Can't find what you're looking for? Our support team is here to help.
                  </p>
                  
                  {!showSupportForm ? (
                    <Button
                      onClick={() => setShowSupportForm(true)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Contact Support
                    </Button>
                  ) : (
                    <form onSubmit={handleSupportSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={supportForm.subject}
                          onChange={(e) => setSupportForm(prev => ({ ...prev, subject: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Brief description of your issue"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Error ID (if applicable)
                        </label>
                        <input
                          type="text"
                          value={supportForm.errorId}
                          onChange={(e) => setSupportForm(prev => ({ ...prev, errorId: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., ERR-001"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={supportForm.description}
                          onChange={(e) => setSupportForm(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={4}
                          placeholder="Please describe your issue in detail..."
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Your Email
                        </label>
                        <input
                          type="email"
                          value={supportForm.userEmail}
                          onChange={(e) => setSupportForm(prev => ({ ...prev, userEmail: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ErrorHelp
