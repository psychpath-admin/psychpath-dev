import React, { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import ErrorOverlay from './ErrorOverlay'
import { errorLogger } from '@/lib/errorLogger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log the error
    errorLogger.logError(error, {
      affectedComponent: 'ErrorBoundary',
      additionalData: {
        componentStack: errorInfo.componentStack
      }
    })
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error overlay with psychology-friendly messaging
      const getErrorInfo = (error: Error | null) => {
        if (!error) {
          return {
            title: 'Something went wrong',
            summary: 'We encountered an issue while loading your session',
            explanation: 'This usually happens when there\'s a temporary connection problem or the page needs to be refreshed.',
            userAction: 'Please try refreshing the page. If you continue having issues, this may be a temporary system problem that our team is already working to resolve.'
          }
        }

        // Handle specific error types with user-friendly messages
        if (error.message.includes('useAuth must be used within an AuthProvider')) {
          return {
            title: 'Session setup issue',
            summary: 'We\'re having trouble connecting your login session',
            explanation: 'This happens when the system can\'t properly verify your login status. It\'s a temporary technical issue.',
            userAction: 'Please refresh the page to restart your session. Your data is safe and will be available once you\'re logged back in.'
          }
        }

        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          return {
            title: 'Login session expired',
            summary: 'Your session has timed out for security reasons',
            explanation: 'To protect your data, PsychPATH automatically logs you out after a period of inactivity.',
            userAction: 'Please log in again to continue. Your work has been saved and will be available once you\'re logged back in.'
          }
        }

        // Default for other errors
        return {
          title: 'Something went wrong',
          summary: 'We encountered an unexpected issue',
          explanation: 'This is usually a temporary problem that resolves itself with a page refresh.',
          userAction: 'Please try refreshing the page. If the problem continues, our support team can help you get back on track.'
        }
      }

      const errorInfo = getErrorInfo(this.state.error)

      return (
        <ErrorOverlay
          isOpen={true}
          onClose={this.handleRetry}
          onRetry={this.handleRetry}
          error={{
            title: errorInfo.title,
            summary: errorInfo.summary,
            explanation: errorInfo.explanation,
            userAction: errorInfo.userAction,
            errorId: this.state.error?.name || 'UNKNOWN'
          }}
        />
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
