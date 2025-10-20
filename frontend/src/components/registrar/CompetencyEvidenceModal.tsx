import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Plus, 
  Save, 
  X, 
  FileText, 
  Calendar, 
  User,
  CheckCircle,
  AlertTriangle,
  Target
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'

interface CompetencyEvidence {
  id?: number
  competency: string
  evidence_type: 'PRACTICE_LOG' | 'SUPERVISION' | 'CPD' | 'PROGRESS_REPORT' | 'OTHER'
  description: string
  date: string
  milestone_level: 'M1' | 'M2' | 'M3' | 'M4'
  supporting_documents?: string[]
  reflection?: string
  supervisor_comment?: string
  created_at?: string
}

interface CompetencyEvidenceModalProps {
  competency: string
  competencyName: string
  isOpen: boolean
  onClose: () => void
  onEvidenceAdded: () => void
}

const EVIDENCE_TYPES = [
  { value: 'PRACTICE_LOG', label: 'Practice Log Entry', description: 'Evidence from practice activities' },
  { value: 'SUPERVISION', label: 'Supervision Session', description: 'Evidence from supervision discussions' },
  { value: 'CPD', label: 'CPD Activity', description: 'Evidence from professional development' },
  { value: 'PROGRESS_REPORT', label: 'Progress Report', description: 'Evidence from formal assessments' },
  { value: 'OTHER', label: 'Other', description: 'Other forms of evidence' }
]

const MILESTONE_LEVELS = [
  { value: 'M1', label: 'M1 - Novice', description: 'Beginning to develop basic skills' },
  { value: 'M2', label: 'M2 - Developing', description: 'Developing competence with guidance' },
  { value: 'M3', label: 'M3 - Proficient', description: 'Competent with minimal supervision' },
  { value: 'M4', label: 'M4 - Advanced', description: 'Highly competent and independent' }
]

export function CompetencyEvidenceModal({ 
  competency, 
  competencyName, 
  isOpen, 
  onClose, 
  onEvidenceAdded 
}: CompetencyEvidenceModalProps) {
  const [evidence, setEvidence] = useState<CompetencyEvidence[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newEvidence, setNewEvidence] = useState<Partial<CompetencyEvidence>>({
    competency,
    evidence_type: 'PRACTICE_LOG',
    description: '',
    date: new Date().toISOString().split('T')[0],
    milestone_level: 'M2',
    reflection: ''
  })

  useEffect(() => {
    if (isOpen) {
      loadEvidence()
    }
  }, [isOpen, competency])

  const loadEvidence = async () => {
    setLoading(true)
    try {
      // This would be a real API call in production
      // For now, we'll simulate loading evidence
      const mockEvidence: CompetencyEvidence[] = [
        {
          id: 1,
          competency,
          evidence_type: 'PRACTICE_LOG',
          description: 'Conducted comprehensive psychological assessment with client',
          date: '2024-01-15',
          milestone_level: 'M3',
          reflection: 'Demonstrated strong assessment skills and clinical reasoning',
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 2,
          competency,
          evidence_type: 'SUPERVISION',
          description: 'Discussed complex case formulation with supervisor',
          date: '2024-01-20',
          milestone_level: 'M2',
          reflection: 'Gained valuable insights into case conceptualization',
          created_at: '2024-01-20T14:00:00Z'
        }
      ]
      setEvidence(mockEvidence)
    } catch (error) {
      console.error('Error loading evidence:', error)
      toast.error('Failed to load evidence')
    } finally {
      setLoading(false)
    }
  }

  const handleAddEvidence = async () => {
    if (!newEvidence.description || !newEvidence.date) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      // This would be a real API call in production
      const evidenceEntry: CompetencyEvidence = {
        ...newEvidence as CompetencyEvidence,
        id: Date.now(), // Temporary ID
        created_at: new Date().toISOString()
      }
      
      setEvidence(prev => [evidenceEntry, ...prev])
      setNewEvidence({
        competency,
        evidence_type: 'PRACTICE_LOG',
        description: '',
        date: new Date().toISOString().split('T')[0],
        milestone_level: 'M2',
        reflection: ''
      })
      setShowAddForm(false)
      toast.success('Evidence added successfully')
      onEvidenceAdded()
    } catch (error) {
      console.error('Error adding evidence:', error)
      toast.error('Failed to add evidence')
    } finally {
      setSaving(false)
    }
  }

  const getEvidenceTypeColor = (type: string) => {
    switch (type) {
      case 'PRACTICE_LOG':
        return 'bg-blue-100 text-blue-800'
      case 'SUPERVISION':
        return 'bg-green-100 text-green-800'
      case 'CPD':
        return 'bg-purple-100 text-purple-800'
      case 'PROGRESS_REPORT':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getMilestoneColor = (level: string) => {
    switch (level) {
      case 'M1':
        return 'bg-red-100 text-red-800'
      case 'M2':
        return 'bg-orange-100 text-orange-800'
      case 'M3':
        return 'bg-yellow-100 text-yellow-800'
      case 'M4':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {competencyName} - Evidence Portfolio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Evidence</p>
                    <p className="text-2xl font-bold text-blue-600">{evidence.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">M3+ Evidence</p>
                    <p className="text-2xl font-bold text-green-600">
                      {evidence.filter(e => ['M3', 'M4'].includes(e.milestone_level)).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Latest Evidence</p>
                    <p className="text-sm font-bold text-purple-600">
                      {evidence.length > 0 
                        ? new Date(evidence[0].date).toLocaleDateString()
                        : 'None'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Add Evidence Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Evidence Entries</h3>
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Evidence
            </Button>
          </div>

          {/* Add Evidence Form */}
          {showAddForm && (
            <Card className="border-purple-200">
              <CardHeader>
                <CardTitle className="text-lg">Add New Evidence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="evidence_type">Evidence Type *</Label>
                    <Select
                      value={newEvidence.evidence_type}
                      onValueChange={(value) => setNewEvidence(prev => ({ ...prev, evidence_type: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EVIDENCE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="milestone_level">Milestone Level *</Label>
                    <Select
                      value={newEvidence.milestone_level}
                      onValueChange={(value) => setNewEvidence(prev => ({ ...prev, milestone_level: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MILESTONE_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      type="date"
                      value={newEvidence.date}
                      onChange={(e) => setNewEvidence(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    value={newEvidence.description}
                    onChange={(e) => setNewEvidence(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    placeholder="Describe the evidence and how it demonstrates this competency..."
                  />
                </div>

                <div>
                  <Label htmlFor="reflection">Reflection</Label>
                  <Textarea
                    value={newEvidence.reflection}
                    onChange={(e) => setNewEvidence(prev => ({ ...prev, reflection: e.target.value }))}
                    rows={2}
                    placeholder="Reflect on your learning and development in this area..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddEvidence}
                    disabled={saving}
                    className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Adding...' : 'Add Evidence'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Evidence List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading evidence...</div>
            </div>
          ) : evidence.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Evidence Yet</h3>
                <p className="text-gray-500 mb-4">Start building your evidence portfolio for this competency.</p>
                <Button
                  onClick={() => setShowAddForm(true)}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Evidence
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {evidence.map((entry) => (
                <Card key={entry.id} className="border-l-4 border-l-purple-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getEvidenceTypeColor(entry.evidence_type)}>
                            {EVIDENCE_TYPES.find(t => t.value === entry.evidence_type)?.label}
                          </Badge>
                          <Badge className={getMilestoneColor(entry.milestone_level)}>
                            {entry.milestone_level}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(entry.date).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <p className="text-gray-900 mb-2">{entry.description}</p>
                        
                        {entry.reflection && (
                          <p className="text-sm text-gray-600 italic mb-2">
                            Reflection: {entry.reflection}
                          </p>
                        )}

                        <div className="text-xs text-gray-500">
                          Added: {new Date(entry.created_at || '').toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
