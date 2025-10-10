import { useState } from 'react'
import { BaseModal } from '@/components/modals'
import { FormField } from '@/components/forms'
import { AlertBanner } from '@/components/ui/AlertBanner'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { Unlock } from 'lucide-react'

interface UnlockRequestModalProps {
  isOpen: boolean
  onClose: () => void
  logbookId: number
  logbookWeekDisplay: string
  onSuccess: () => void
}

export default function UnlockRequestModal({
  isOpen,
  onClose,
  logbookId,
  logbookWeekDisplay,
  onSuccess
}: UnlockRequestModalProps) {
  const [reason, setReason] = useState('')
  const [targetSection, setTargetSection] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for the unlock request')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const response = await apiFetch(`/api/logbook/${logbookId}/unlock-request/`, {
        method: 'POST',
        body: JSON.stringify({
          reason: reason.trim(),
          target_section: targetSection.trim()
        })
      })

      if (response.ok) {
        toast.success('Unlock request submitted successfully')
        setReason('')
        setTargetSection('')
        onSuccess()
        onClose()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to submit unlock request')
      }
    } catch (error) {
      console.error('Error submitting unlock request:', error)
      setError('Error submitting unlock request')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setReason('')
    setTargetSection('')
    setError('')
    onClose()
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onOpenChange={(open) => !open && handleCancel()}
      title="Request Logbook Unlock"
      description={`Request to unlock the approved logbook "${logbookWeekDisplay}" for editing.`}
      icon={<Unlock className="h-5 w-5" />}
      size="xl"
      showFooter
      submitLabel="Submit Request"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isSubmitting={loading}
      error={error}
    >
      <div className="space-y-4">
        <FormField
          label="Reason for Unlock"
          name="reason"
          type="textarea"
          value={reason}
          onChange={(value) => setReason(String(value))}
          placeholder="Please explain why you need to edit this approved logbook..."
          required
          rows={4}
          helperText="Provide a clear and detailed explanation for your request"
        />

        <FormField
          label="Target Section"
          name="targetSection"
          type="text"
          value={targetSection}
          onChange={(value) => setTargetSection(String(value))}
          placeholder="e.g., Section A, Entry #123, or specific field"
          helperText="Optional: Specify which section or entry needs to be edited"
        />

        <AlertBanner
          variant="info"
          message="Your unlock request will be reviewed by your organization admin (if you're part of an organization) or your supervisor (if you're independent). You'll be notified once a decision is made."
        />
      </div>
    </BaseModal>
  )
}

