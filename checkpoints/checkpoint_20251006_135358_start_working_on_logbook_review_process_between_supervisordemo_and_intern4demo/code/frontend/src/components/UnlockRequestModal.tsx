import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'

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

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for the unlock request')
      return
    }

    setLoading(true)
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
        toast.error(errorData.error || 'Failed to submit unlock request')
      }
    } catch (error) {
      console.error('Error submitting unlock request:', error)
      toast.error('Error submitting unlock request')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setReason('')
    setTargetSection('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white text-gray-900">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Request Logbook Unlock</DialogTitle>
          <DialogDescription className="text-gray-600">
            Request to unlock the approved logbook "{logbookWeekDisplay}" for editing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason for Unlock *
            </Label>
            <Textarea
              id="reason"
              placeholder="Please explain why you need to edit this approved logbook..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetSection" className="text-sm font-medium">
              Target Section (Optional)
            </Label>
            <Input
              id="targetSection"
              placeholder="e.g., Section A, Entry #123, or specific field"
              value={targetSection}
              onChange={(e) => setTargetSection(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Your unlock request will be reviewed by your organization admin 
              (if you're part of an organization) or your supervisor (if you're independent). 
              You'll be notified once a decision is made.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

