import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, Users } from 'lucide-react'

interface SupervisionFormProps {
  onSubmit: (data: any) => void
  onCancel: () => void
  saving: boolean
  formData: {
    date_of_supervision: string
    supervisor_name: string
    supervisor_type: string
    supervision_type: string
    duration_minutes: number
    summary: string
  }
  setFormData: (data: any) => void
  isEditing?: boolean
}

export default function SupervisionForm({
  onSubmit,
  onCancel,
  saving,
  formData,
  setFormData,
  isEditing = false
}: SupervisionFormProps) {
  const durationQuickLinks = [30, 60, 90, 120, 180, 240]

  const supervisorTypes = [
    { value: 'PRINCIPAL', label: 'Principal' },
    { value: 'SECONDARY', label: 'Secondary' },
    { value: 'OTHER', label: 'Other' }
  ]

  const supervisionTypes = [
    { value: 'INDIVIDUAL', label: 'Individual' },
    { value: 'GROUP', label: 'Group' },
    { value: 'OTHER', label: 'Other' }
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            {isEditing ? 'Edit Supervision Entry' : 'Supervision Entry Details'}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date of Supervision</label>
                <Input
                  type="date"
                  value={formData.date_of_supervision}
                  onChange={(e) => setFormData({ ...formData, date_of_supervision: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Supervisor Name</label>
                <Input
                  type="text"
                  value={formData.supervisor_name}
                  onChange={(e) => setFormData({ ...formData, supervisor_name: e.target.value })}
                  placeholder="Enter supervisor name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Supervisor Type</label>
                <Select
                  value={formData.supervisor_type}
                  onValueChange={(value) => setFormData({ ...formData, supervisor_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supervisor type" />
                  </SelectTrigger>
                  <SelectContent>
                    {supervisorTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Supervision Type</label>
                <Select
                  value={formData.supervision_type}
                  onValueChange={(value) => setFormData({ ...formData, supervision_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supervision type" />
                  </SelectTrigger>
                  <SelectContent>
                    {supervisionTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Duration in Minutes</label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                min="1"
                required
              />
              <div className="flex gap-1 mt-1">
                {durationQuickLinks.map(minutes => (
                  <Button
                    key={minutes}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ ...formData, duration_minutes: minutes })}
                    className="text-xs"
                  >
                    {minutes === 30 ? '30 Minutes' : 
                     minutes === 60 ? '1 Hour' :
                     minutes === 90 ? '1h 30m' :
                     minutes === 120 ? '2 Hours' :
                     minutes === 180 ? '3 Hours' :
                     `${minutes / 60} Hours`}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Summary</label>
              <Textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                className="h-24"
                placeholder="Brief summary of matters discussed, outcomes/plans for follow up activities and discussions"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : (isEditing ? 'Update Entry' : 'Save Entry')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
