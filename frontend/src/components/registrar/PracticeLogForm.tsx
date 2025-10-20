import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'
import type { PracticeLog } from '@/types/registrar'

interface PracticeLogFormProps {
  entry?: PracticeLog | null
  onSubmit: (data: Partial<PracticeLog>) => void
  onCancel: () => void
  saving: boolean
}

export function PracticeLogForm({ entry, onSubmit, onCancel, saving }: PracticeLogFormProps) {
  const [formData, setFormData] = useState({
    date: entry?.date || new Date().toISOString().split('T')[0],
    duration_hours: entry?.duration_hours || 1.0,
    practice_type: (entry?.practice_type || 'ASSESSMENT') as 'ASSESSMENT' | 'INTERVENTION' | 'CONSULTATION' | 'RESEARCH' | 'ADMINISTRATION' | 'OTHER',
    activity_description: entry?.activity_description || '',
    setting: entry?.setting || '',
    aope_alignment: entry?.aope_alignment || [],
    competencies: entry?.competencies || [],
    reflection_text: entry?.reflection_text || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Two-column grid on desktop, matching Section A */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date" className="text-sm font-medium text-gray-700 mb-1">Date *</Label>
          <Input
            type="date"
            id="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            className="w-full"
          />
        </div>

        <div>
          <Label htmlFor="duration_hours" className="text-sm font-medium text-gray-700 mb-1">Hours *</Label>
          <Input
            type="number"
            id="duration_hours"
            value={formData.duration_hours}
            onChange={(e) => setFormData({ ...formData, duration_hours: parseFloat(e.target.value) })}
            step="0.25"
            min="0.25"
            required
            className="w-full"
          />
        </div>

        <div>
          <Label htmlFor="practice_type" className="text-sm font-medium text-gray-700 mb-1">Practice Type *</Label>
          <Select
            value={formData.practice_type}
                    onValueChange={(value) => setFormData({ ...formData, practice_type: value as 'ASSESSMENT' | 'INTERVENTION' | 'CONSULTATION' | 'RESEARCH' | 'ADMINISTRATION' | 'OTHER' })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASSESSMENT">Assessment</SelectItem>
                      <SelectItem value="INTERVENTION">Intervention</SelectItem>
                      <SelectItem value="CONSULTATION">Consultation</SelectItem>
                      <SelectItem value="RESEARCH">Research</SelectItem>
                      <SelectItem value="ADMINISTRATION">Administration</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="setting" className="text-sm font-medium text-gray-700 mb-1">Setting</Label>
          <Input
            id="setting"
            value={formData.setting}
            onChange={(e) => setFormData({ ...formData, setting: e.target.value })}
            placeholder="e.g., Community clinic, Hospital"
            className="w-full"
          />
        </div>
      </div>

      {/* Full width textarea */}
      <div className="col-span-1 md:col-span-2">
        <Label htmlFor="activity_description" className="text-sm font-medium text-gray-700 mb-1">Activity Description *</Label>
        <Textarea
          id="activity_description"
          value={formData.activity_description}
          onChange={(e) => setFormData({ ...formData, activity_description: e.target.value })}
          rows={3}
          required
          placeholder="Describe the psychological practice activity..."
          className="w-full"
        />
      </div>

      {/* Reflection (full width) */}
      <div className="col-span-1 md:col-span-2">
        <Label htmlFor="reflection_text" className="text-sm font-medium text-gray-700 mb-1">Reflection *</Label>
        <Textarea
          id="reflection_text"
          value={formData.reflection_text}
          onChange={(e) => setFormData({ ...formData, reflection_text: e.target.value })}
          rows={4}
          required
          placeholder="Reflect on your learning, challenges, and how this activity aligns with your AoPE..."
          className="w-full"
        />
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
          {saving ? 'Saving...' : 'Save Practice Log'}
        </Button>
      </div>
    </form>
  )
}
