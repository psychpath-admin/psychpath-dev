import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Mail, UserPlus, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'

interface EnrolSuperviseesModalProps {
  trigger: React.ReactNode
  onEnrolmentComplete?: () => void
}

interface InviteResult {
  email: string
  status: string
  user_exists: boolean
  supervision_id: number
}

interface InviteResponse {
  results: InviteResult[]
  errors: string[]
  message: string
}

export const EnrolSuperviseesModal: React.FC<EnrolSuperviseesModalProps> = ({
  trigger,
  onEnrolmentComplete
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [emails, setEmails] = useState<string[]>([''])
  const [role, setRole] = useState<'PRIMARY' | 'SECONDARY'>('PRIMARY')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<InviteResponse | null>(null)

  const addEmailField = () => {
    if (emails.length < 10) {
      setEmails([...emails, ''])
    }
  }

  const removeEmailField = (index: number) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i) => i !== index))
    }
  }

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails]
    newEmails[index] = value
    setEmails(newEmails)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validEmails = emails.filter(email => email.trim() !== '')
    if (validEmails.length === 0) {
      toast.error('Please enter at least one email address')
      return
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = validEmails.filter(email => !emailRegex.test(email))
    if (invalidEmails.length > 0) {
      toast.error(`Invalid email addresses: ${invalidEmails.join(', ')}`)
      return
    }

    setLoading(true)
    setResults(null)

    try {
      const response = await apiFetch('/api/supervisions/invite/', {
        method: 'POST',
        body: JSON.stringify({
          emails: validEmails,
          role: role
        })
      })

      if (response.ok) {
        const data: InviteResponse = await response.json()
        setResults(data)
        
        if (data.errors.length === 0) {
          toast.success(`Successfully sent ${data.results.length} invitations`)
          setEmails([''])
          onEnrolmentComplete?.()
        } else {
          toast.warning(`Sent ${data.results.length} invitations with ${data.errors.length} errors`)
        }
      } else {
        const errorText = await response.text()
        try {
          const errorData = JSON.parse(errorText)
          toast.error(errorData.error || 'Failed to send invitations')
        } catch {
          toast.error(`Failed to send invitations: ${response.status} ${response.statusText}`)
        }
      }
    } catch (error) {
      console.error('Error sending invitations:', error)
      toast.error(`Error sending invitations: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmails([''])
    setRole('PRIMARY')
    setResults(null)
  }

  const getStatusIcon = (result: InviteResult) => {
    if (result.status === 'invited') {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    return <AlertCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusBadge = (result: InviteResult) => {
    if (result.status === 'invited') {
      return <Badge variant="default" className="bg-green-100 text-green-800">Invited</Badge>
    }
    return <Badge variant="destructive">Failed</Badge>
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      console.log('Dialog open state changed:', open)
      setIsOpen(open)
    }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-gray-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Enrol Supervisees
          </DialogTitle>
          <DialogDescription>
            Invite provisional psychologists or registrars to establish a supervision relationship.
            You can invite up to 10 supervisees at once.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">Supervision Role</Label>
            <Select value={role} onValueChange={(value: 'PRIMARY' | 'SECONDARY') => setRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select supervision role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIMARY">Primary Supervisor</SelectItem>
                <SelectItem value="SECONDARY">Secondary Supervisor</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-600">
              {role === 'PRIMARY' 
                ? 'Primary supervisors provide main oversight and guidance'
                : 'Secondary supervisors provide additional support and perspective'
              }
            </p>
          </div>

          {/* Email Inputs */}
          <div className="space-y-3">
            <Label>Supervisee Email Addresses</Label>
            {emails.map((email, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="supervisee@example.com"
                  value={email}
                  onChange={(e) => updateEmail(index, e.target.value)}
                  className="flex-1"
                />
                {emails.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeEmailField(index)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            
            {emails.length < 10 && (
              <Button
                type="button"
                variant="outline"
                onClick={addEmailField}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Email
              </Button>
            )}
          </div>

          {/* Results Display */}
          {results && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invitation Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {results.results.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result)}
                      <div>
                        <p className="font-medium">{result.email}</p>
                        <p className="text-sm text-gray-600">
                          {result.user_exists ? 'Registered user' : 'New user - will receive registration invite'}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(result)}
                  </div>
                ))}
                
                {results.errors.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {results.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || emails.every(email => email.trim() === '')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Sending...' : 'Send Invitations'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default EnrolSuperviseesModal
