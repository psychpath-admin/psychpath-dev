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

    // Generate user-friendly error information
    const errorInfo: ErrorInfo = {
      title: context.title || 'Something went wrong',
      summary: context.summary || error.message || 'An unexpected error occurred',
      explanation: context.explanation || getDefaultExplanation(error),
      userAction: context.userAction || getDefaultUserAction(error),
      errorId: context.errorId || generateErrorId()
    }

    setCurrentError(errorInfo)
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

// Helper functions for generating user-friendly error messages
const getDefaultExplanation = (error: Error): string => {
  if (error.message.includes('fetch')) {
    return 'The application cannot connect to the server. This is usually due to internet connectivity issues or server maintenance.'
  }
  
  if (error.message.includes('ValidationError') || error.message.includes('400')) {
    return 'The information you entered doesn\'t meet the required format or validation rules.'
  }
  
  if (error.message.includes('401') || error.message.includes('Unauthorized')) {
    return 'Your session has expired or you don\'t have permission to perform this action.'
  }
  
  if (error.message.includes('500')) {
    return 'The server encountered an unexpected error while processing your request.'
  }
  
  if (error.message.includes('NetworkError')) {
    return 'There was a problem with your internet connection or the server is temporarily unavailable.'
  }
  
  return 'An unexpected error occurred while processing your request.'
}

const getDefaultUserAction = (error: Error): string => {
  if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
    return 'Please check your internet connection and try again. If the problem persists, the server may be under maintenance.'
  }
  
  if (error.message.includes('ValidationError') || error.message.includes('400')) {
    return 'Please check the highlighted fields and correct any errors, then try again.'
  }
  
  if (error.message.includes('401') || error.message.includes('Unauthorized')) {
    return 'Please log in again or contact support if you believe this is an error.'
  }
  
  if (error.message.includes('500')) {
    return 'Please wait a moment and try again. If the error persists, contact support with the error ID.'
  }
  
  return 'Please try again, refresh the page, or contact support if the problem continues.'
}

const generateErrorId = (): string => {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 5)
  return `ERR-${timestamp}-${random}`.toUpperCase()
}

export default useErrorHandler
