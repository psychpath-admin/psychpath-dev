// ERROR HANDLING TEMPLATE
// Copy this template when creating new components with error handling

import React from 'react'
import { useErrorHandler, ErrorOverlay } from '@/lib/errors'

interface MyComponentProps {
  // Define your props here
}

export default function MyComponent({ }: MyComponentProps) {
  // ✅ REQUIRED: Import and use the error handler
  const { errorOverlay, showError, handleApiError } = useErrorHandler()

  // Example: Handle API calls
  const handleApiCall = async () => {
    try {
      const response = await fetch('/api/endpoint')
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }
      const data = await response.json()
      // Handle success
    } catch (error) {
      // ✅ REQUIRED: Use handleApiError for API errors
      await handleApiError(error, {
        title: 'Failed to Load Data',
        customExplanation: 'Unable to retrieve data from the server.',
        customUserAction: 'Please check your connection and try again.'
      })
    }
  }

  // Example: Handle validation errors
  const handleValidation = async (data: any) => {
    try {
      await validateData(data)
      // Handle success
    } catch (error) {
      // ✅ REQUIRED: Use showError for general errors
      await showError(error, {
        title: 'Validation Error',
        category: 'Validation',
        customExplanation: 'The data you entered is not valid.',
        customUserAction: 'Please check your input and try again.'
      })
    }
  }

  // Example: Handle custom errors
  const handleCustomError = async () => {
    // ✅ REQUIRED: Use showCustomError for specific error scenarios
    await showCustomError({
      errorId: 'CUSTOM_ERROR_001',
      title: 'Custom Error',
      summary: 'Something specific went wrong',
      explanation: 'This is a detailed explanation of what happened.',
      userAction: 'Here are the steps to resolve this issue.',
      category: 'General',
      context: { additionalInfo: 'for debugging' }
    })
  }

  return (
    <div>
      {/* Your component content */}
      
      {/* ✅ REQUIRED: Always include the ErrorOverlay */}
      <ErrorOverlay {...errorOverlay} />
    </div>
  )
}

// REMINDER CHECKLIST:
// ✅ Imported useErrorHandler and ErrorOverlay
// ✅ Used showError for general errors
// ✅ Used handleApiError for API errors  
// ✅ Used showCustomError for specific scenarios
// ✅ Included ErrorOverlay in JSX
// ✅ Provided meaningful error messages
// ✅ Used appropriate error categories
