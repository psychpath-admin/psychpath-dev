import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  FileText,
  Calendar
} from 'lucide-react'
import { CompetencyGrid } from '@/components/registrar/CompetencyGrid'
import { apiFetch } from '@/lib/api'
import type { 
  CompetencyDefinition,
  CompetencyProgress
} from '@/types/competency'

// Competencies will be loaded from API

const MILESTONE_LEVELS = [
  { level: 'M1', name: 'Novice', description: 'Beginning to develop basic skills', color: 'bg-red-100 text-red-800' },
  { level: 'M2', name: 'Developing', description: 'Developing competence with guidance', color: 'bg-orange-100 text-orange-800' },
  { level: 'M3', name: 'Proficient', description: 'Competent with minimal supervision', color: 'bg-yellow-100 text-yellow-800' },
  { level: 'M4', name: 'Advanced', description: 'Highly competent and independent', color: 'bg-green-100 text-green-800' }
]

export default function CompetencyTrackerPage() {
  const [competencies, setCompetencies] = useState<CompetencyDefinition[]>([])
  const [competencyProgress, setCompetencyProgress] = useState<CompetencyProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load competency definitions
      const competenciesRes = await apiFetch('/api/competencies/definitions/')
      if (competenciesRes.ok) {
        const competenciesData = await competenciesRes.json()
        setCompetencies(competenciesData)
      }

      // Load competency progress summary
      const progressRes = await apiFetch('/api/competencies/ratings/progress_summary/')
      if (progressRes.ok) {
        const progressData = await progressRes.json()
        setCompetencyProgress(progressData)
      }
    } catch (error) {
      console.error('Error loading competency data:', error)
      setError('Failed to load competency data')
    } finally {
      setLoading(false)
    }
  }


  const getOverallProgress = () => {
    if (competencyProgress.length === 0) return 0
    
    const totalCompetencies = competencies.length
    const m3OrHigher = competencyProgress.filter(progress => 
      ['M3', 'M4'].includes(progress.current_milestone)
    ).length
    
    return Math.round((m3OrHigher / totalCompetencies) * 100)
  }

  const handleCompetencyClick = (competency: string, level: string) => {
    // TODO: Implement evidence modal or navigation to detailed view
    console.log(`Clicked on ${competency} at level ${level}`)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-r from-purple-700 to-purple-900 text-white">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Competency Tracker</CardTitle>
          </CardHeader>
        </Card>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading competency data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-r from-purple-700 to-purple-900 text-white">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Competency Tracker</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
            <p className="text-gray-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No need for registrar-specific checks - this works for all user types

  const overallProgress = getOverallProgress()

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-700 to-purple-900 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Competency Tracker</CardTitle>
              <p className="text-purple-100 mt-1">
                Track your progress across all AHPRA competencies
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{overallProgress}%</div>
              <div className="text-purple-100 text-sm">Overall Progress</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">M3+ Competencies</p>
                <p className="text-2xl font-bold text-green-600">
                  {competencyProgress.filter(p => ['M3', 'M4'].includes(p.current_milestone)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Evidence</p>
                <p className="text-2xl font-bold text-blue-600">
                  {competencyProgress.reduce((sum, p) => sum + (p.evidence_count || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Progress Reports</p>
                <p className="text-2xl font-bold text-purple-600">0</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="text-sm font-bold text-orange-600">
                  {competencyProgress.length > 0 
                    ? new Date(Math.max(...competencyProgress.map(p => new Date(p.last_updated || 0).getTime()))).toLocaleDateString()
                    : 'Never'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Competency Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Milestone Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {MILESTONE_LEVELS.map((milestone) => (
              <div key={milestone.level} className="flex items-center gap-2">
                <Badge className={milestone.color}>
                  {milestone.level}
                </Badge>
                <div>
                  <div className="font-medium text-sm">{milestone.name}</div>
                  <div className="text-xs text-gray-500">{milestone.description}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Competency Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Competency Progress</CardTitle>
          <p className="text-sm text-gray-600">
            Click on any competency to view evidence and add new entries
          </p>
        </CardHeader>
        <CardContent>
          <CompetencyGrid
            competencies={competencies}
            competencyProgress={competencyProgress}
            onCellClick={handleCompetencyClick}
          />
        </CardContent>
      </Card>


    </div>
  )
}
