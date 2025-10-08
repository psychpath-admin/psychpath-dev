import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, AlertTriangle, RefreshCw, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface ErrorOverlayProps {
  isOpen: boolean
  onClose: () => void
  onRetry?: () => void
  onGetHelp?: () => void
  error: {
    title?: string
    summary?: string
    explanation?: string
    userAction?: string
    errorId?: string
  }
}

const ErrorOverlay: React.FC<ErrorOverlayProps> = ({
  isOpen,
  onClose,
  onRetry,
  onGetHelp,
  error
}) => {
  const navigate = useNavigate()
  const overlayRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Trap focus within the overlay
  useEffect(() => {
    if (isOpen && overlayRef.current) {
      const focusableElements = overlayRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement?.focus()
              e.preventDefault()
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement?.focus()
              e.preventDefault()
            }
          }
        }
      }

      const handleEscapeKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }

      document.addEventListener('keydown', handleTabKey)
      document.addEventListener('keydown', handleEscapeKey)
      firstElement?.focus()

      return () => {
        document.removeEventListener('keydown', handleTabKey)
        document.removeEventListener('keydown', handleEscapeKey)
      }
    }
  }, [isOpen, onClose])

  // Prevent body scroll when overlay is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  console.log('ErrorOverlay is rendering with isOpen=true')

  const handleRetry = () => {
    onRetry?.()
    onClose()
  }

  const handleDismiss = () => {
    console.log('handleDismiss called')
    onClose()
  }

  const handleGetHelp = () => {
    console.log('handleGetHelp called')
    
    // If custom onGetHelp handler provided, use it
    if (onGetHelp) {
      onGetHelp()
      return
    }
    
    // Close the overlay first
    onClose()
    
    // Pass error details as URL parameters for highlighting
    const params = new URLSearchParams()
    if (error.errorId) {
      params.set('errorId', error.errorId)
    }
    if (error.summary) {
      params.set('summary', error.summary)
    }
    if (error.explanation) {
      params.set('explanation', error.explanation)
    }
    if (error.userAction) {
      params.set('userAction', error.userAction)
    }
    
    const helpUrl = params.toString() ? `/help/errors?${params.toString()}` : '/help/errors'
    // Open in new tab since there's no navigation back to the app
    window.open(helpUrl, '_blank')
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{ pointerEvents: 'auto' }}>
      <div
        ref={overlayRef}
        className="w-full max-w-md mx-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="error-title"
        aria-describedby="error-description"
      >
        <Card className="border-red-200 bg-white shadow-xl" style={{ pointerEvents: 'auto' }}>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <CardTitle id="error-title" className="text-lg font-semibold text-gray-900">
                    {error.title || 'Oops, something went wrong'}
                  </CardTitle>
                  {error.errorId && (
                    <p className="text-sm text-gray-500 mt-1">
                      Error ID: {error.errorId}
                    </p>
                  )}
                </div>
              </div>
              <Button
                ref={closeButtonRef}
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                aria-label="Close error dialog"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div id="error-description" className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 text-sm font-semibold">❗</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-red-900 mb-1">Issue</h4>
                    <p className="text-red-700 text-sm">
                      {error.summary || 'An unexpected issue occurred'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-semibold">💡</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">What this means</h4>
                    <p className="text-blue-700 text-sm">
                      {error.explanation || 'Something didn\'t work as expected on this page'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm font-semibold">✅</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-green-900 mb-1">What you can do</h4>
                    <p className="text-green-700 text-sm">
                      {error.userAction || 'Please try again, check your internet connection, or refresh the page.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {onRetry ? (
                <Button
                  onClick={handleRetry}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              ) : (
                <Button
                  onClick={handleDismiss}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  I Understand
                </Button>
              )}
              <Button
                onPointerDown={(e) => {
                  console.log('I Need More Help button pointerdown!', e)
                  e.preventDefault()
                  e.stopPropagation()
                  handleGetHelp()
                }}
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                style={{ pointerEvents: 'auto' }}
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                I Need More Help
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ErrorOverlay
