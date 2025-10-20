import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Save, Upload, X } from 'lucide-react'
import type { CPDActivity, CPDCategory, CPDActivityType, CPDDeliveryMode, CPDEvidenceType } from '@/types/cpd'

interface CPDActivityFormProps {
  activity?: CPDActivity | null
  categories: CPDCategory[]
  onSubmit: (data: Partial<CPDActivity>) => void
  onCancel: () => void
  saving: boolean
}

export function CPDActivityForm({ activity, categories, onSubmit, onCancel, saving }: CPDActivityFormProps) {
  const [formData, setFormData] = useState({
    title: activity?.title || '',
    activity_type: (activity?.activity_type || 'FORMAL_LEARNING') as CPDActivityType,
    category: activity?.category || null,
    description: activity?.description || '',
    activity_date: activity?.activity_date || new Date().toISOString().split('T')[0],
    duration_hours: activity?.duration_hours || 1.0,
    delivery_mode: (activity?.delivery_mode || 'FACE_TO_FACE') as CPDDeliveryMode,
    learning_outcomes: activity?.learning_outcomes || '',
    skills_developed: activity?.skills_developed || '',
    application_to_practice: activity?.application_to_practice || '',
    evidence_type: (activity?.evidence_type || 'REFLECTION') as CPDEvidenceType,
    evidence_description: activity?.evidence_description || '',
    is_active_cpd: activity?.is_active_cpd ?? true,
    is_peer_consultation: activity?.is_peer_consultation ?? false,
    is_supervision: activity?.is_supervision ?? false,
    professional_areas: activity?.professional_areas || [],
    competencies_addressed: activity?.competencies_addressed || [],
    quality_rating: activity?.quality_rating || null,
    reflection: activity?.reflection || '',
  })

  const [newProfessionalArea, setNewProfessionalArea] = useState('')
  const [newCompetency, setNewCompetency] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const addProfessionalArea = () => {
    if (newProfessionalArea.trim() && !formData.professional_areas.includes(newProfessionalArea.trim())) {
      setFormData({
        ...formData,
        professional_areas: [...formData.professional_areas, newProfessionalArea.trim()]
      })
      setNewProfessionalArea('')
    }
  }

  const removeProfessionalArea = (area: string) => {
    setFormData({
      ...formData,
      professional_areas: formData.professional_areas.filter(a => a !== area)
    })
  }

  const addCompetency = () => {
    if (newCompetency.trim() && !formData.competencies_addressed.includes(newCompetency.trim())) {
      setFormData({
        ...formData,
        competencies_addressed: [...formData.competencies_addressed, newCompetency.trim()]
      })
      setNewCompetency('')
    }
  }

  const removeCompetency = (competency: string) => {
    setFormData({
      ...formData,
      competencies_addressed: formData.competencies_addressed.filter(c => c !== competency)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="title" className="text-sm font-medium text-gray-700 mb-1">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., Cognitive Behavioral Therapy Workshop"
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="activity_type" className="text-sm font-medium text-gray-700 mb-1">Activity Type *</Label>
            <Select
              value={formData.activity_type}
              onValueChange={(value) => setFormData({ ...formData, activity_type: value as CPDActivityType })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FORMAL_LEARNING">Formal Learning</SelectItem>
                <SelectItem value="PEER_CONSULTATION">Peer Consultation</SelectItem>
                <SelectItem value="SUPERVISION">Supervision</SelectItem>
                <SelectItem value="RESEARCH">Research</SelectItem>
                <SelectItem value="TEACHING">Teaching/Training</SelectItem>
                <SelectItem value="PROFESSIONAL_DEVELOPMENT">Professional Development</SelectItem>
                <SelectItem value="CONFERENCE">Conference/Workshop</SelectItem>
                <SelectItem value="ONLINE_LEARNING">Online Learning</SelectItem>
                <SelectItem value="READING">Professional Reading</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="category" className="text-sm font-medium text-gray-700 mb-1">Category</Label>
            <Select
              value={formData.category?.toString() || ''}
              onValueChange={(value) => setFormData({ ...formData, category: value ? parseInt(value) : null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="activity_date" className="text-sm font-medium text-gray-700 mb-1">Date *</Label>
            <Input
              type="date"
              id="activity_date"
              value={formData.activity_date}
              onChange={(e) => setFormData({ ...formData, activity_date: e.target.value })}
              required
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="duration_hours" className="text-sm font-medium text-gray-700 mb-1">Duration (Hours) *</Label>
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
            <Label htmlFor="delivery_mode" className="text-sm font-medium text-gray-700 mb-1">Delivery Mode *</Label>
            <Select
              value={formData.delivery_mode}
              onValueChange={(value) => setFormData({ ...formData, delivery_mode: value as CPDDeliveryMode })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FACE_TO_FACE">Face-to-Face</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
                <SelectItem value="HYBRID">Hybrid</SelectItem>
                <SelectItem value="SELF_DIRECTED">Self-Directed</SelectItem>
                <SelectItem value="GROUP">Group</SelectItem>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="description" className="text-sm font-medium text-gray-700 mb-1">Description *</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            required
            placeholder="Describe the CPD activity in detail..."
            className="w-full"
          />
        </div>
      </div>

      {/* Learning Outcomes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Learning Outcomes</h3>
        
        <div>
          <Label htmlFor="learning_outcomes" className="text-sm font-medium text-gray-700 mb-1">What did you learn?</Label>
          <Textarea
            id="learning_outcomes"
            value={formData.learning_outcomes}
            onChange={(e) => setFormData({ ...formData, learning_outcomes: e.target.value })}
            rows={3}
            placeholder="Describe the key learning outcomes from this activity..."
            className="w-full"
          />
        </div>

        <div>
          <Label htmlFor="skills_developed" className="text-sm font-medium text-gray-700 mb-1">Skills Developed</Label>
          <Textarea
            id="skills_developed"
            value={formData.skills_developed}
            onChange={(e) => setFormData({ ...formData, skills_developed: e.target.value })}
            rows={3}
            placeholder="What skills did you develop or enhance?"
            className="w-full"
          />
        </div>

        <div>
          <Label htmlFor="application_to_practice" className="text-sm font-medium text-gray-700 mb-1">Application to Practice</Label>
          <Textarea
            id="application_to_practice"
            value={formData.application_to_practice}
            onChange={(e) => setFormData({ ...formData, application_to_practice: e.target.value })}
            rows={3}
            placeholder="How will you apply this learning to your practice?"
            className="w-full"
          />
        </div>
      </div>

      {/* Professional Development Areas */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Professional Development</h3>
        
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-1">Professional Areas</Label>
          <div className="flex gap-2 mb-2">
            <Input
              value={newProfessionalArea}
              onChange={(e) => setNewProfessionalArea(e.target.value)}
              placeholder="Add professional area..."
              className="flex-1"
            />
            <Button type="button" onClick={addProfessionalArea} size="sm">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.professional_areas.map((area) => (
              <div key={area} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                {area}
                <button
                  type="button"
                  onClick={() => removeProfessionalArea(area)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-1">Competencies Addressed</Label>
          <div className="flex gap-2 mb-2">
            <Input
              value={newCompetency}
              onChange={(e) => setNewCompetency(e.target.value)}
              placeholder="Add competency..."
              className="flex-1"
            />
            <Button type="button" onClick={addCompetency} size="sm">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.competencies_addressed.map((competency) => (
              <div key={competency} className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                {competency}
                <button
                  type="button"
                  onClick={() => removeCompetency(competency)}
                  className="text-green-600 hover:text-green-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Evidence and Quality */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Evidence & Quality</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="evidence_type" className="text-sm font-medium text-gray-700 mb-1">Evidence Type</Label>
            <Select
              value={formData.evidence_type}
              onValueChange={(value) => setFormData({ ...formData, evidence_type: value as CPDEvidenceType })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select evidence type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CERTIFICATE">Certificate</SelectItem>
                <SelectItem value="ATTENDANCE_RECORD">Attendance Record</SelectItem>
                <SelectItem value="REFLECTION">Reflection</SelectItem>
                <SelectItem value="ASSESSMENT">Assessment</SelectItem>
                <SelectItem value="PORTFOLIO">Portfolio</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="quality_rating" className="text-sm font-medium text-gray-700 mb-1">Quality Rating (1-5)</Label>
            <Select
              value={formData.quality_rating?.toString() || ''}
              onValueChange={(value) => setFormData({ ...formData, quality_rating: value ? parseInt(value) : null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Rate quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Star</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="evidence_description" className="text-sm font-medium text-gray-700 mb-1">Evidence Description</Label>
          <Textarea
            id="evidence_description"
            value={formData.evidence_description}
            onChange={(e) => setFormData({ ...formData, evidence_description: e.target.value })}
            rows={2}
            placeholder="Describe the evidence you have for this activity..."
            className="w-full"
          />
        </div>
      </div>

      {/* CPD Classification */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">CPD Classification</h3>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_active_cpd"
              checked={formData.is_active_cpd}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active_cpd: !!checked })}
            />
            <Label htmlFor="is_active_cpd" className="text-sm font-medium">
              This counts as "Active" CPD (involves interaction, assessment, or structured learning)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_peer_consultation"
              checked={formData.is_peer_consultation}
              onCheckedChange={(checked) => setFormData({ ...formData, is_peer_consultation: !!checked })}
            />
            <Label htmlFor="is_peer_consultation" className="text-sm font-medium">
              This is peer consultation activity
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_supervision"
              checked={formData.is_supervision}
              onCheckedChange={(checked) => setFormData({ ...formData, is_supervision: !!checked })}
            />
            <Label htmlFor="is_supervision" className="text-sm font-medium">
              This is supervision-related activity
            </Label>
          </div>
        </div>
      </div>

      {/* Reflection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Reflection</h3>
        
        <div>
          <Label htmlFor="reflection" className="text-sm font-medium text-gray-700 mb-1">Personal Reflection</Label>
          <Textarea
            id="reflection"
            value={formData.reflection}
            onChange={(e) => setFormData({ ...formData, reflection: e.target.value })}
            rows={4}
            placeholder="Reflect on your learning experience, challenges, and insights..."
            className="w-full"
          />
        </div>
      </div>

      {/* Buttons */}
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
          {saving ? 'Saving...' : (activity ? 'Update Activity' : 'Save Activity')}
        </Button>
      </div>
    </form>
  )
}
