import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'
import type { LeaveRecord } from '@/types/registrar'

interface LeaveRecordFormProps {
  record?: LeaveRecord | null
  onSubmit: (data: Partial<LeaveRecord>) => void
  onCancel: () => void
  saving: boolean
}

export function LeaveRecordForm({ record, onSubmit, onCancel, saving }: LeaveRecordFormProps) {
  const [formData, setFormData] = useState({
    leave_type: (record?.leave_type || 'ANNUAL') as 'ANNUAL' | 'SICK' | 'MATERNITY' | 'PATERNITY' | 'CARERS' | 'STUDY' | 'UNPAID',
    start_date: record?.start_date || new Date().toISOString().split('T')[0],
    end_date: record?.end_date || new Date().toISOString().split('T')[0],
    reason: record?.reason || '',
    notes: record?.notes || '',
    supporting_documents: record?.supporting_documents || []
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleStartDateChange = (date: string) => {
    setFormData({ ...formData, start_date: date })
    // Auto-set end date to start date if it's before start date
    if (formData.end_date < date) {
      setFormData(prev => ({ ...prev, start_date: date, end_date: date }))
    }
  }

  const calculateDuration = () => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date)
      const end = new Date(formData.end_date)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      return diffDays
    }
    return 0
  }

  const duration = calculateDuration()

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Two-column grid on desktop, matching Section A */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="leave_type" className="text-sm font-medium text-gray-700 mb-1">Leave Type *</Label>
          <Select
            value={formData.leave_type}
            onValueChange={(value) => setFormData({ ...formData, leave_type: value as any })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select leave type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ANNUAL">Annual Leave</SelectItem>
              <SelectItem value="SICK">Sick Leave</SelectItem>
              <SelectItem value="MATERNITY">Maternity Leave</SelectItem>
              <SelectItem value="PATERNITY">Paternity Leave</SelectItem>
              <SelectItem value="CARERS">Carer's Leave</SelectItem>
              <SelectItem value="STUDY">Study Leave</SelectItem>
              <SelectItem value="UNPAID">Unpaid Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="duration" className="text-sm font-medium text-gray-700 mb-1">Duration</Label>
          <div className="flex items-center h-10 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-600">
            {duration} day{duration !== 1 ? 's' : ''}
          </div>
        </div>

        <div>
          <Label htmlFor="start_date" className="text-sm font-medium text-gray-700 mb-1">Start Date *</Label>
          <Input
            type="date"
            id="start_date"
            value={formData.start_date}
            onChange={(e) => handleStartDateChange(e.target.value)}
            required
            className="w-full"
          />
        </div>

        <div>
          <Label htmlFor="end_date" className="text-sm font-medium text-gray-700 mb-1">End Date *</Label>
          <Input
            type="date"
            id="end_date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            min={formData.start_date}
            required
            className="w-full"
          />
        </div>
      </div>

      {/* Full width textarea for reason */}
      <div className="col-span-1 md:col-span-2">
        <Label htmlFor="reason" className="text-sm font-medium text-gray-700 mb-1">Reason for Leave *</Label>
        <Textarea
          id="reason"
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          rows={3}
          required
          placeholder="Please provide a brief reason for your leave request..."
          className="w-full"
        />
      </div>

      {/* Notes (optional) */}
      <div className="col-span-1 md:col-span-2">
        <Label htmlFor="notes" className="text-sm font-medium text-gray-700 mb-1">Additional Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          placeholder="Any additional information or special arrangements..."
          className="w-full"
        />
      </div>

      {/* Supporting Documents Info */}
      <div className="col-span-1 md:col-span-2">
        <Label className="text-sm font-medium text-gray-700 mb-1">Supporting Documents</Label>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            For certain leave types (e.g., sick leave, maternity/paternity leave), you may need to provide supporting documentation. 
            Please upload these documents separately or provide them to your supervisor.
          </p>
        </div>
      </div>

      {/* Buttons - Match Section B modal styling */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
          className="border-blue-300 text-blue-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Submit Leave Request'}
        </Button>
      </div>
    </form>
  )
}
