import { useState, useCallback } from 'react'
import { errorLogger } from '@/lib/errorLogger'

export interface ErrorInfo {
  title?: string
  summary?: string
  explanation?: string
  userAction?: string
  errorId?: string
}

export interface ErrorHandlerReturn {
  showError: (error: Error, context?: Partial<ErrorInfo>) => void
  showErrorOverlay: boolean
  currentError: ErrorInfo | null
  dismissError: () => void
  retryAction: (() => void) | null
  setRetryAction: (action: (() => void) | null) => void
}

export const useErrorHandler = (): ErrorHandlerReturn => {
  const [showErrorOverlay, setShowErrorOverlay] = useState(false)
  const [currentError, setCurrentError] = useState<ErrorInfo | null>(null)
  const [retryAction, setRetryAction] = useState<(() => void) | null>(null)

  const showError = useCallback(async (error: Error, context: Partial<ErrorInfo> = {}) => {
    // Log the error
    await errorLogger.logError(error, {
      affectedComponent: context.errorId || 'Unknown Component'
    })

    // Get error information from database
    const errorInfo = getErrorInfo(error, context.errorId)

    // Generate user-friendly error information
    const finalErrorInfo: ErrorInfo = {
      title: context.title || 'Something went wrong',
      summary: context.summary || errorInfo.summary || error.message || 'An unexpected error occurred',
      explanation: context.explanation || errorInfo.explanation,
      userAction: context.userAction || errorInfo.userAction,
      errorId: context.errorId || generateErrorId()
    }

    setCurrentError(finalErrorInfo)
    setShowErrorOverlay(true)
  }, [])

  const dismissError = useCallback(() => {
    setShowErrorOverlay(false)
    setCurrentError(null)
    setRetryAction(null)
  }, [])

  return {
    showError,
    showErrorOverlay,
    currentError,
    dismissError,
    retryAction,
    setRetryAction
  }
}

// Comprehensive error database with specific explanations
const errorDatabase: Record<string, { summary: string; explanation: string; userAction: string }> = {
  // Date Validation Errors
  'ERR-001': {
    summary: 'Date Validation Error',
    explanation: 'Your Internship Start Date cannot be before your Provisional Registration Date. This is required to ensure your internship program follows the correct sequence according to AHPRA guidelines.',
    userAction: 'Set your Internship Start Date to the same day or after your Provisional Registration Date as shown in the error message.'
  },
  'ERR-002': {
    summary: 'Date Locked Error',
    explanation: 'Your Provisional Registration Date, Internship Start Date, or Program Start Date cannot be changed once they have been saved. This is required for AHPRA compliance and audit purposes.',
    userAction: 'If you need to change a locked date, contact support with documentation supporting the change.'
  },
  
  // Mobile Number Errors
  'ERR-003': {
    summary: 'Mobile Number Format Error',
    explanation: 'The mobile number you entered is not in the correct format for an Australian mobile number. Australian mobile numbers must start with 04 or +61 4.',
    userAction: 'Enter your mobile number starting with 04 (e.g., 0412 345 678) or with country code +61 4 (e.g., +61 412 345 678).'
  },
  
  // Registration Errors
  'ERR-004': {
    summary: 'Email Address Already Registered',
    explanation: 'The email address you are trying to use is already registered in our system. This could mean you already have an account, or someone else is using this email address.',
    userAction: 'Try logging in with your existing credentials, or use a different email address if you need to create a new account.'
  },
  'ERR-005': {
    summary: 'AHPRA Registration Number Already Exists',
    explanation: 'The AHPRA registration number you entered is already registered in our system. Each AHPRA registration number can only be used once.',
    userAction: 'Double-check your AHPRA registration number for any typos, or contact support if you believe this is an error.'
  },
  'ERR-006': {
    summary: 'Invalid Verification Code',
    explanation: 'The verification code you entered is incorrect or has expired. Verification codes are sent to your email and have a limited time to be used.',
    userAction: 'Check your email for the verification code (including spam folder), or request a new verification code if the current one has expired.'
  },
  'ERR-007': {
    summary: 'User Profile Not Found',
    explanation: 'Your user profile could not be found in our system. This usually happens when there is a temporary connection issue or your session has expired.',
    userAction: 'Try refreshing the page, or log out and log back in to your account.'
  },
  'ERR-010': {
    summary: 'Invalid Email Format',
    explanation: 'The email address you entered is not in a valid format. Email addresses must contain an @ symbol and a valid domain name.',
    userAction: 'Check that your email address contains an @ symbol and has text before and after it, with a valid domain extension.'
  },
  
  // Supervision Errors
  'ENDORSEMENT-001': {
    summary: 'Endorsement Required for Supervision',
    explanation: 'You cannot supervise this registrar because you do not have the required professional endorsement. Supervisors must have the same Area of Practice Endorsement (AOPE) as the registrar they wish to supervise.',
    userAction: 'Go to your Profile page, click "Manage Endorsements", and add the required endorsement type for the registrar you wish to supervise.'
  },
  'SUPERVISOR-PROFILE-001': {
    summary: 'Supervisor Profile Incomplete',
    explanation: 'You cannot invite supervisees because your supervisor profile is not complete. All required fields must be filled out before you can start supervising others.',
    userAction: 'Go to your Profile page and complete all required fields in the Supervisor Profile section.'
  },
  'SUPERVISOR-PROFILE-002': {
    summary: 'Board Approval Required',
    explanation: 'You must confirm that you are a Board-approved supervisor before inviting supervisees. This is a requirement to ensure all supervisors have the necessary qualifications and approval from the Psychology Board.',
    userAction: 'Go to your Profile page and select "Yes" for "Are you a Board-approved supervisor?" If you are not Board-approved, contact the Psychology Board to obtain approval.'
  },
  'SUPERVISOR-PROFILE-003': {
    summary: 'Supervisor Registration Date Required',
    explanation: 'You must provide your supervisor registration date before inviting supervisees. This is the date when you were officially approved as a supervisor by the Psychology Board.',
    userAction: 'Go to your Profile page and enter the date when you were approved as a supervisor by the Psychology Board. This date should be on your supervisor approval certificate from AHPRA.'
  },
  'SUPERVISOR-PROFILE-004': {
    summary: 'Supervision Scope Required',
    explanation: 'You must select at least one supervision scope before inviting supervisees. This indicates what type of psychologists you are qualified to supervise.',
    userAction: 'Go to your Profile page and select at least one of the following: "Can supervise provisionals" or "Can supervise registrars" based on your qualifications.'
  },
  
  // File Upload Errors
  'FILE_TOO_LARGE': {
    summary: 'File Too Large',
    explanation: 'The file you are trying to upload is too large. The maximum file size allowed is 2MB to ensure fast loading and storage efficiency.',
    userAction: 'Compress your file or use a smaller version that is under 2MB, then try uploading again.'
  },
  
  // Network and Server Errors
  'NETWORK_ERROR': {
    summary: 'Network Connection Error',
    explanation: 'The application cannot connect to the server. This is usually due to internet connectivity issues or server maintenance.',
    userAction: 'Check your internet connection, try refreshing the page, or wait a few minutes if the server is under maintenance.'
  },
  'SESSION_EXPIRED': {
    summary: 'Session Expired',
    explanation: 'Your login session has expired and you need to log in again to continue using the application.',
    userAction: 'Click the "Log In" button and enter your email and password. If you forgot your password, use the "Forgot Password" link.'
  },
  'SERVER_ERROR': {
    summary: 'Server Error',
    explanation: 'The server encountered an unexpected condition that prevented it from fulfilling the request.',
    userAction: 'Wait a moment and try again, or refresh the page. If the error persists, contact support with the error ID.'
  },
  
  // Form Validation Errors
  'REQUIRED_FIELD': {
    summary: 'Required Field Missing',
    explanation: 'One or more required fields in the form are empty and must be filled before submission.',
    userAction: 'Look for red error messages on the form and fill in all required fields marked with an asterisk (*).'
  },
  'INVALID_FORMAT': {
    summary: 'Invalid Format',
    explanation: 'The information you entered doesn\'t meet the required format or validation rules.',
    userAction: 'Check the highlighted fields and correct any format errors, such as date formats, email addresses, or phone numbers.'
  }
}

// Helper functions for generating user-friendly error messages
const getErrorInfo = (error: Error, errorId?: string): { summary: string; explanation: string; userAction: string } => {
  // If we have a specific error ID, use it
  if (errorId && errorDatabase[errorId]) {
    return errorDatabase[errorId]
  }
  
  // Try to match by error message content
  const message = error.message.toLowerCase()
  
  if (message.includes('internship start date') && message.includes('provisional registration date')) {
    return errorDatabase['ERR-001']
  }
  if (message.includes('cannot be changed once set') || message.includes('locked')) {
    return errorDatabase['ERR-002']
  }
  if (message.includes('mobile number') || message.includes('mobile')) {
    return errorDatabase['ERR-003']
  }
  if (message.includes('already registered') && message.includes('email')) {
    return errorDatabase['ERR-004']
  }
  if (message.includes('ahpra registration number') && message.includes('already exists')) {
    return errorDatabase['ERR-005']
  }
  if (message.includes('verification code') && (message.includes('incorrect') || message.includes('expired'))) {
    return errorDatabase['ERR-006']
  }
  if (message.includes('user profile') && message.includes('not found')) {
    return errorDatabase['ERR-007']
  }
  if (message.includes('email') && message.includes('not valid')) {
    return errorDatabase['ERR-010']
  }
  if (message.includes('endorsement') && message.includes('supervision')) {
    return errorDatabase['ENDORSEMENT-001']
  }
  if (message.includes('supervisor profile') && message.includes('incomplete')) {
    return errorDatabase['SUPERVISOR-PROFILE-001']
  }
  if (message.includes('board approval') || message.includes('board-approved')) {
    return errorDatabase['SUPERVISOR-PROFILE-002']
  }
  if (message.includes('supervisor registration date')) {
    return errorDatabase['SUPERVISOR-PROFILE-003']
  }
  if (message.includes('supervision scope')) {
    return errorDatabase['SUPERVISOR-PROFILE-004']
  }
  if (message.includes('file too large') || message.includes('2mb')) {
    return errorDatabase['FILE_TOO_LARGE']
  }
  if (message.includes('fetch') || message.includes('network')) {
    return errorDatabase['NETWORK_ERROR']
  }
  if (message.includes('401') || message.includes('unauthorized') || message.includes('session')) {
    return errorDatabase['SESSION_EXPIRED']
  }
  if (message.includes('500') || message.includes('server error')) {
    return errorDatabase['SERVER_ERROR']
  }
  if (message.includes('required') && message.includes('field')) {
    return errorDatabase['REQUIRED_FIELD']
  }
  if (message.includes('validation') || message.includes('invalid')) {
    return errorDatabase['INVALID_FORMAT']
  }
  
  // Default fallback
  return {
    summary: 'Unexpected Error',
    explanation: 'Something unexpected happened while trying to complete your request. This may be due to a temporary issue.',
    userAction: 'Please try again, refresh the page, or contact support if the problem continues.'
  }
}

const getDefaultExplanation = (error: Error): string => {
  return getErrorInfo(error).explanation
}

const getDefaultUserAction = (error: Error): string => {
  return getErrorInfo(error).userAction
}

const generateErrorId = (): string => {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 5)
  return `ERR-${timestamp}-${random}`.toUpperCase()
}

export default useErrorHandler
