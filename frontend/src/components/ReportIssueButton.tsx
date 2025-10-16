import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Bug } from 'lucide-react'
import CreateTicketModal from './CreateTicketModal'
import { apiFetch } from '@/lib/api'
import { useModalContext } from '@/contexts/ModalContext'

export default function ReportIssueButton() {
  const [showModal, setShowModal] = useState(false)
  const [capturedFormData, setCapturedFormData] = useState<any>(null)
  const { isModalOpen, setReportIssueHandler, setModalOpen } = useModalContext()

  // Function exposed to ModalProvider via context
  const handleOpenFromContext = React.useCallback((formData?: any) => {
    setCapturedFormData(formData)
    setShowModal(true)
  }, [])

  // Register the handler with the context
  useEffect(() => {
    setReportIssueHandler(handleOpenFromContext)
  }, [handleOpenFromContext, setReportIssueHandler])

  const handleSubmit = async (data: {
    subject: string
    description: string
    priority: string
    ticket_type: string
    tags: string[]
    current_url?: string
    browser_info?: string
    context_data?: any
  }): Promise<boolean> => {
    try {
      const response = await apiFetch('/support/api/tickets/create/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (response.ok) {
        // If we have captured form data, it means we're in a modal context
        // and the user requested both modals to close when ticket is submitted successfully
        if (capturedFormData) {
          setModalOpen(false)
        }
        // Optionally show success message
        return true
      } else {
        try {
          const error = await response.json()
          alert(error.error || error.detail || 'Failed to create ticket')
        } catch (parseError) {
          // If response is not JSON, get as text
          const errorText = await response.text()
          alert(`Failed to create ticket: ${response.status} ${response.statusText}\n\n${errorText}`)
        }
        return false
      }
    } catch (error) {
      console.error('Failed to create ticket:', error)
      alert(`Network error: ${error instanceof Error ? error.message : 'Failed to create ticket'}`)
      return false
    }
  }

  // Use portal to render both button and modal at document body level
  // This ensures they appear above any modal/overlay content
  return createPortal(
    <>
      {!showModal && !isModalOpen && (
        <Button
          onClick={() => handleOpenFromContext()}
          className="fixed bottom-6 right-6 z-[9999] rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-shadow bg-red-600 hover:bg-red-700"
          size="lg"
        >
          <Bug className="h-6 w-6" />
        </Button>
      )}

      {showModal && (
        <CreateTicketModal
          onClose={() => {
            setShowModal(false)
            setCapturedFormData(null)
          }}
          onSubmit={handleSubmit}
          prefilledData={{
            type: capturedFormData ? 'BUG' : 'BUG',
            subject: capturedFormData ? 
              `Issue in modal on ${window.location.pathname}` : 
              `Issue on ${window.location.pathname}`,
            description: capturedFormData ? 
              `**Error occurred in modal on:** ${window.location.href}
              
**Browser:** ${navigator.userAgent}

**Modal Form Data:** ${JSON.stringify(capturedFormData, null, 2)}

**Console errors:** [Check browser console for more details]

**Steps to reproduce:**
1. 
2. 
3. 

**Expected behavior:**
[What should happen]

**Actual behavior:**
[What actually happened]` :
              `**Error occurred on:** ${window.location.href}
              
**Browser:** ${navigator.userAgent}

**Console errors:** [Check browser console for more details]

**Steps to reproduce:**
1. 
2. 
3. 

**Expected behavior:**
[What should happen]

**Actual behavior:**
[What actually happened]`
          }}
        />
      )}
    </>,
    document.body
  )
}
