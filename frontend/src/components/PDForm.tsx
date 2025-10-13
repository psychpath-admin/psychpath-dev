import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, BookOpen } from 'lucide-react'

interface PDCompetency {
  id: number
  name: string
  description: string
  is_active: boolean
}

interface PDFormProps {
  onSubmit: (data: any) => void
  onCancel: () => void
  saving: boolean
  formData: {
    activity_type: string
    date_of_activity: string
    duration_minutes: number
    is_active_activity: boolean
    activity_details: string
    topics_covered: string
    competencies_covered: string[]
    reflection: string
    reviewed_in_supervision: boolean
  }
  setFormData: (data: any) => void
  competencies: PDCompetency[]
  toggleCompetency: (competencyName: string) => void
  isEditing?: boolean
}

export default function PDForm({
  onSubmit,
  onCancel,
  saving,
  formData,
  setFormData,
  competencies,
  toggleCompetency,
  isEditing = false
}: PDFormProps) {
  const [showReflections, setShowReflections] = useState((formData.reflection || '').length > 0)
  
  const activityTypes = [
    'WORKSHOP', 'WEBINAR', 'LECTURE', 'PRESENTATION', 
    'READING', 'COURSE', 'CONFERENCE', 'TRAINING', 'OTHER'
  ]

  const durationQuickLinks = [15, 30, 60, 120, 180, 240, 480]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {isEditing ? 'Edit Professional Development Activity' : 'Professional Development Activity Details'}
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
                <label className="block text-sm font-medium mb-2">Activity Type</label>
                <Select
                  value={formData.activity_type}
                  onValueChange={(value) => setFormData({ ...formData, activity_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {activityTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Date of Activity</label>
                <Input
                  type="date"
                  value={formData.date_of_activity}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData({ ...formData, date_of_activity: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Duration in Minutes</label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                  min="1"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {durationQuickLinks.map(minutes => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => setFormData({ ...formData, duration_minutes: minutes })}
                      className="text-blue-600 underline text-sm hover:text-blue-800"
                    >
                      {minutes < 60 ? `${minutes} Minutes` : `${minutes / 60} Hour${minutes / 60 !== 1 ? 's' : ''}`}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Active Activity?</label>
                <Select
                  value={formData.is_active_activity ? 'YES' : 'NO'}
                  onValueChange={(value) => setFormData({ ...formData, is_active_activity: value === 'YES' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">YES</SelectItem>
                    <SelectItem value="NO">NO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Activity Details</label>
              <Textarea
                value={formData.activity_details}
                onChange={(e) => setFormData({ ...formData, activity_details: e.target.value })}
                className="h-20"
                placeholder="E.g. name of course, presenter, institution etc"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Topics Covered by Activity</label>
              <Textarea
                value={formData.topics_covered}
                onChange={(e) => setFormData({ ...formData, topics_covered: e.target.value })}
                className="h-20"
                placeholder="E.g. behavioural interventions for ADHD in adolescents"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Competencies Covered by Activity</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('/competencies-help', '_blank')}
                  className="text-xs"
                >
                  Help
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3 text-gray-700">Available Competencies</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 p-3 rounded-lg bg-gray-50">
                    {competencies.length === 0 ? (
                      <div className="text-gray-500 text-sm text-center py-4">
                        Loading competencies...
                      </div>
                    ) : (
                      competencies
                        .filter(comp => !formData.competencies_covered.includes(comp.name))
                        .map(comp => (
                          <div
                            key={comp.id}
                            onClick={() => toggleCompetency(comp.name)}
                            className="p-3 cursor-pointer rounded-md text-sm border border-transparent hover:border-blue-300 hover:bg-blue-50 transition-colors"
                          >
                            <div className="font-medium text-gray-800">{comp.name}</div>
                            <div className="text-xs text-gray-600 mt-1" style={{ 
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>
                              {comp.description}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Click on a competency to select it
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3 text-gray-700">Selected Competencies</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 p-3 rounded-lg bg-blue-50">
                    {formData.competencies_covered.length === 0 ? (
                      <div className="text-gray-500 text-sm text-center py-4">
                        No competencies selected yet
                      </div>
                    ) : (
                      formData.competencies_covered.map((comp, idx) => (
                        <div key={idx} className="p-3 bg-blue-100 text-blue-800 rounded-md text-sm border border-blue-200">
                          <div className="flex justify-between items-start">
                            <span className="font-medium flex-1">{comp}</span>
                            <button
                              type="button"
                              onClick={() => toggleCompetency(comp)}
                              className="ml-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full w-5 h-5 flex items-center justify-center text-xs"
                              title="Remove competency"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="addReflection"
                checked={showReflections}
                onChange={(e) => {
                  setShowReflections(e.target.checked)
                  if (!e.target.checked) {
                    setFormData({ ...formData, reflection: '' })
                  }
                }}
                className="rounded"
              />
              <label htmlFor="addReflection" className="text-sm font-medium">
                Add Reflection?
              </label>
            </div>

            {showReflections && (
              <div>
                <label className="block text-sm font-medium mb-2">Reflection</label>
                <Textarea
                  value={formData.reflection}
                  onChange={(e) => setFormData({ ...formData, reflection: e.target.value })}
                  className="h-24"
                  placeholder="Reflect on what you learned from this activity..."
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="reviewedInSupervision"
                checked={formData.reviewed_in_supervision}
                onChange={(e) => setFormData({ ...formData, reviewed_in_supervision: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="reviewedInSupervision" className="text-sm font-medium">
                Reviewed in Supervision?
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : (isEditing ? 'Update Activity' : 'Save Activity')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
