import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'

interface DisconnectionRequestModalProps {
  isOpen: boolean
  onClose: () => void
  supervisorName: string
  supervisorEmail: string
  role: 'PRIMARY' | 'SECONDARY'
  onSuccess: () => void
}

export default function DisconnectionRequestModal({
  isOpen,
  onClose,
  supervisorName,
  supervisorEmail,
  role,
  onSuccess
}: DisconnectionRequestModalProps) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!supervisorEmail) {
      toast.error('Supervisor email is required')
      return
    }

    setLoading(true)
    try {
      // First, we need to find the supervisor user by email
      const supervisorResponse = await apiFetch('/api/available-supervisors/')
      if (!supervisorResponse.ok) {
        throw new Error('Failed to fetch supervisors')
      }
      
      const supervisors = await supervisorResponse.json()
      const supervisor = supervisors.find((s: any) => s.email === supervisorEmail)
      
      if (!supervisor) {
        toast.error('Supervisor not found in the system')
        return
      }

      // Create the disconnection request
      const response = await apiFetch('/api/disconnection-requests/', {
        method: 'POST',
        body: JSON.stringify({
          supervisor: supervisor.id,
          role: role,
          message: message.trim() || undefined
        })
      })

      if (response.ok) {
        toast.success('Disconnection request sent successfully')
        onSuccess()
        onClose()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to send disconnection request')
      }
    } catch (error) {
      console.error('Error sending disconnection request:', error)
      toast.error('Error sending disconnection request')
    } finally {
      setLoading(false)
    }
  }

  const roleText = role === 'PRIMARY' ? 'Primary' : 'Secondary'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Supervisor Disconnection</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> This will initiate a formal disconnection request from your current {roleText.toLowerCase()} supervisor. 
              They will need to confirm this action. You will lose access to supervision features with them once it is approved.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supervisor-info">Supervisor Details</Label>
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="font-medium">{supervisorName}</p>
              <p className="text-sm text-gray-600">{supervisorEmail}</p>
              <p className="text-xs text-gray-500">{roleText} Supervisor</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message to Supervisor (Optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add any additional context or reason for the disconnection request..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? 'Sending...' : 'Send Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
