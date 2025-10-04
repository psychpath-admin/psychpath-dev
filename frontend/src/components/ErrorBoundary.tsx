import React, { Component, ErrorInfo, ReactNode } from 'react'
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

      // Default error overlay
      return (
        <ErrorOverlay
          isOpen={true}
          onClose={this.handleRetry}
          onRetry={this.handleRetry}
          error={{
            title: 'Application Error',
            summary: this.state.error?.message || 'An unexpected error occurred',
            explanation: 'The application encountered an error and needs to be restarted.',
            userAction: 'Please refresh the page or try again. If the problem persists, contact support.',
            errorId: this.state.error?.name || 'UNKNOWN'
          }}
        />
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
