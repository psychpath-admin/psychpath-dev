import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { 
  ArrowLeft,
  Target,
  CheckCircle,
  AlertTriangle,
  Eye,
  FileText,
  Calendar,
  User,
  Save,
  X
} from 'lucide-react'
import { CompetencyGrid } from '@/components/registrar/CompetencyGrid'
import { apiFetch } from '@/lib/api'
import type { 
  CompetencyDefinition, 
  CompetencyProgress, 
  CompetencyEvidence 
} from '@/types/competency'

interface ValidationModalProps {
  evidence: CompetencyEvidence
  isOpen: boolean
  onClose: () => void
  onValidate: (comment: string) => void
}

function ValidationModal({ evidence, isOpen, onClose, onValidate }: ValidationModalProps) {
  const [comment, setComment] = useState('')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">Validate Evidence</h3>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Evidence Details:</p>
          <div className="bg-gray-50 p-3 rounded">
            <p className="font-medium">{evidence.competency_code}: {evidence.competency_name}</p>
            <p className="text-sm text-gray-600 mt-1">{evidence.description}</p>
            <p className="text-xs text-gray-500 mt-2">
              {evidence.evidence_type} • {evidence.milestone_level} • {new Date(evidence.date).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Supervisor Comment (Optional)
          </label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add your feedback or comments..."
            rows={3}
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={() => onValidate(comment)}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Validate
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function SupervisorTraineeCompetency() {
  const { traineeId } = useParams<{ traineeId: string }>()
  const [competencies, setCompetencies] = useState<CompetencyDefinition[]>([])
  const [competencyProgress, setCompetencyProgress] = useState<CompetencyProgress[]>([])
  const [evidence, setEvidence] = useState<CompetencyEvidence[]>([])
  const [traineeName, setTraineeName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [validationModal, setValidationModal] = useState<{
    isOpen: boolean
    evidence: CompetencyEvidence | null
  }>({ isOpen: false, evidence: null })

  useEffect(() => {
    if (traineeId) {
      loadTraineeData()
    }
  }, [traineeId])

  const loadTraineeData = async () => {
    setLoading(true)
    try {
      // Load competency definitions
      const competenciesRes = await apiFetch('/api/competencies/definitions/')
      if (competenciesRes.ok) {
        const competenciesData = await competenciesRes.json()
        setCompetencies(competenciesData)
      }

      // Load trainee's competency progress
      const progressRes = await apiFetch(`/api/competencies/ratings/progress_summary/?trainee_id=${traineeId}`)
      if (progressRes.ok) {
        const progressData = await progressRes.json()
        setCompetencyProgress(progressData)
        
        // Extract trainee name from first progress entry
        if (progressData.length > 0) {
          setTraineeName(progressData[0].trainee_name || 'Unknown Trainee')
        }
      }

      // Load evidence entries
      const evidenceRes = await apiFetch(`/api/competencies/evidence/?trainee_id=${traineeId}`)
      if (evidenceRes.ok) {
        const evidenceData = await evidenceRes.json()
        setEvidence(evidenceData)
      }
    } catch (error) {
      console.error('Error loading trainee data:', error)
      setError('Failed to load trainee data')
    } finally {
      setLoading(false)
    }
  }

  const handleValidateEvidence = async (comment: string) => {
    if (!validationModal.evidence) return

    try {
      const response = await apiFetch(`/api/competencies/evidence/${validationModal.evidence.id}/validate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment }),
      })

      if (response.ok) {
        // Refresh evidence data
        await loadTraineeData()
        setValidationModal({ isOpen: false, evidence: null })
      } else {
        console.error('Failed to validate evidence')
      }
    } catch (error) {
      console.error('Error validating evidence:', error)
    }
  }

  const getEvidenceTypeIcon = (type: string) => {
    switch (type) {
      case 'SECTION_A': return <FileText className="h-4 w-4 text-blue-600" />
      case 'SECTION_B': return <FileText className="h-4 w-4 text-green-600" />
      case 'SECTION_C': return <FileText className="h-4 w-4 text-purple-600" />
      case 'PRACTICE_LOG': return <FileText className="h-4 w-4 text-orange-600" />
      default: return <FileText className="h-4 w-4 text-gray-600" />
    }
  }

  const getEvidenceTypeLabel = (type: string) => {
    switch (type) {
      case 'SECTION_A': return 'Direct Client Contact'
      case 'SECTION_B': return 'Professional Development'
      case 'SECTION_C': return 'Supervision Session'
      case 'PRACTICE_LOG': return 'Practice Log'
      case 'MANUAL': return 'Manual Entry'
      default: return type
    }
  }

  const unvalidatedEvidence = evidence.filter(e => !e.supervisor_validated)

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-r from-purple-700 to-purple-900 text-white">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Trainee Competency Details</CardTitle>
          </CardHeader>
        </Card>

        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="animate-spin h-10 w-10 text-purple-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg text-gray-600">Loading trainee data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-r from-purple-700 to-purple-900 text-white">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Trainee Competency Details</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-red-400 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-red-800 mb-2">Error Loading Data</h3>
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-700 to-purple-900 text-white">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Link to="/supervisor/competency-overview">
              <Button variant="outline" className="text-white border-white hover:bg-white hover:text-purple-700">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Overview
              </Button>
            </Link>
            <div>
              <CardTitle className="text-2xl font-bold">{traineeName}</CardTitle>
              <p className="text-purple-200">Competency Progress & Evidence Validation</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Competency Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Competency Progress</CardTitle>
          <p className="text-sm text-gray-600">
            Current milestone levels and evidence counts for each AHPRA competency
          </p>
        </CardHeader>
        <CardContent>
          <CompetencyGrid
            competencies={competencies}
            competencyProgress={competencyProgress}
            onCellClick={(competency, level) => {
              console.log(`Clicked on ${competency} at level ${level}`)
            }}
          />
        </CardContent>
      </Card>

      {/* Evidence Validation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evidence Validation</CardTitle>
          <p className="text-sm text-gray-600">
            Review and validate evidence entries submitted by the trainee
          </p>
        </CardHeader>
        <CardContent>
          {unvalidatedEvidence.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All Evidence Validated</h3>
              <p className="text-gray-600">No pending evidence entries require validation.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {unvalidatedEvidence.length} evidence entries pending validation
                </p>
                <Badge variant="outline" className="bg-orange-50 text-orange-700">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Action Required
                </Badge>
              </div>
              
              <div className="space-y-3">
                {unvalidatedEvidence.map((evidenceItem) => (
                  <div key={evidenceItem.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getEvidenceTypeIcon(evidenceItem.evidence_type)}
                          <Badge variant="outline" className="text-xs">
                            {getEvidenceTypeLabel(evidenceItem.evidence_type)}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                            {evidenceItem.milestone_level}
                          </Badge>
                        </div>
                        
                        <h4 className="font-medium text-gray-900 mb-1">
                          {evidenceItem.competency_code}: {evidenceItem.competency_name}
                        </h4>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {evidenceItem.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(evidenceItem.date).toLocaleDateString()}
                          </span>
                          {evidenceItem.suggested_by_epa && (
                            <span>Suggested by: {evidenceItem.suggested_by_epa}</span>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => setValidationModal({ isOpen: true, evidence: evidenceItem })}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Validate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validated Evidence Summary */}
      {evidence.filter(e => e.supervisor_validated).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Validated Evidence</CardTitle>
            <p className="text-sm text-gray-600">
              Previously validated evidence entries
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {evidence
                .filter(e => e.supervisor_validated)
                .slice(0, 5) // Show only first 5
                .map((evidenceItem) => (
                  <div key={evidenceItem.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {evidenceItem.competency_code}: {evidenceItem.competency_name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {getEvidenceTypeLabel(evidenceItem.evidence_type)} • {evidenceItem.milestone_level} • 
                        Validated by {evidenceItem.validated_by_name}
                      </p>
                    </div>
                  </div>
                ))}
              {evidence.filter(e => e.supervisor_validated).length > 5 && (
                <p className="text-xs text-gray-500 text-center">
                  And {evidence.filter(e => e.supervisor_validated).length - 5} more validated entries...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Modal */}
      <ValidationModal
        evidence={validationModal.evidence!}
        isOpen={validationModal.isOpen}
        onClose={() => setValidationModal({ isOpen: false, evidence: null })}
        onValidate={handleValidateEvidence}
      />
    </div>
  )
}
