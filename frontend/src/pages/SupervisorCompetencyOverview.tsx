import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Target,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Eye,
  Calendar
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { apiFetch } from '@/lib/api'
import type { CompetencyRating } from '@/types/competency'

interface TraineeSummary {
  trainee_id: number
  trainee_name: string
  overall_progress: number
  evidence_count: number
  last_activity: string | null
  competencies_at_m3_plus: number
  total_competencies: number
  needs_attention: boolean
}

export default function SupervisorCompetencyOverview() {
  const [trainees, setTrainees] = useState<TraineeSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTraineeData()
  }, [])

  const loadTraineeData = async () => {
    setLoading(true)
    try {
      // Get all competency ratings for trainees supervised by current user
      const response = await apiFetch('/api/competencies/ratings/')
      if (response.ok) {
        const ratings: CompetencyRating[] = await response.json()
        
        // Group by trainee and calculate summary data
        const traineeMap = new Map<number, TraineeSummary>()
        
        ratings.forEach(rating => {
          const traineeId = rating.trainee
          const traineeName = rating.trainee_name
          
          if (!traineeMap.has(traineeId)) {
            traineeMap.set(traineeId, {
              trainee_id: traineeId,
              trainee_name: traineeName,
              overall_progress: 0,
              evidence_count: 0,
              last_activity: null,
              competencies_at_m3_plus: 0,
              total_competencies: 0,
              needs_attention: false
            })
          }
          
          const trainee = traineeMap.get(traineeId)!
          trainee.total_competencies += 1
          trainee.evidence_count += rating.evidence_count
          
          // Count competencies at M3 or higher
          if (['M3', 'M4'].includes(rating.current_milestone)) {
            trainee.competencies_at_m3_plus += 1
          }
          
          // Check if needs attention (still at M1 or M2)
          if (['M1', 'M2'].includes(rating.current_milestone)) {
            trainee.needs_attention = true
          }
        })
        
        // Calculate overall progress percentages
        const traineeList = Array.from(traineeMap.values()).map(trainee => ({
          ...trainee,
          overall_progress: trainee.total_competencies > 0 
            ? Math.round((trainee.competencies_at_m3_plus / trainee.total_competencies) * 100)
            : 0
        }))
        
        setTrainees(traineeList)
      } else {
        setError('Failed to load trainee data')
      }
    } catch (error) {
      console.error('Error loading trainee data:', error)
      setError('Failed to load trainee data')
    } finally {
      setLoading(false)
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-600'
    if (progress >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getProgressBarColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500'
    if (progress >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-r from-purple-700 to-purple-900 text-white">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Trainee Competency Overview</CardTitle>
            <p className="text-purple-200">Monitor and validate your trainees' competency progress</p>
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
            <CardTitle className="text-2xl font-bold">Trainee Competency Overview</CardTitle>
            <p className="text-purple-200">Monitor and validate your trainees' competency progress</p>
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
          <CardTitle className="text-2xl font-bold">Trainee Competency Overview</CardTitle>
          <p className="text-purple-200">Monitor and validate your trainees' competency progress</p>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Trainees</p>
                <p className="text-2xl font-bold">{trainees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Progress</p>
                <p className="text-2xl font-bold">
                  {trainees.length > 0 
                    ? Math.round(trainees.reduce((sum, t) => sum + t.overall_progress, 0) / trainees.length)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Need Attention</p>
                <p className="text-2xl font-bold">
                  {trainees.filter(t => t.needs_attention).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trainees Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trainee Progress</CardTitle>
          <p className="text-sm text-gray-600">
            Click "View Details" to see detailed competency breakdown and validate evidence
          </p>
        </CardHeader>
        <CardContent>
          {trainees.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Trainees Found</h3>
              <p className="text-gray-600">You don't have any trainees assigned yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Trainee</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Progress</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Evidence</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Status</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {trainees.map((trainee) => (
                    <tr key={trainee.trainee_id} className="hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{trainee.trainee_name}</p>
                          <p className="text-sm text-gray-500">
                            {trainee.competencies_at_m3_plus}/{trainee.total_competencies} competencies at M3+
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`font-semibold ${getProgressColor(trainee.overall_progress)}`}>
                            {trainee.overall_progress}%
                          </span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${getProgressBarColor(trainee.overall_progress)}`}
                              style={{ width: `${trainee.overall_progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {trainee.evidence_count} entries
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {trainee.needs_attention ? (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Needs Attention
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            On Track
                          </Badge>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Link to={`/supervisor/trainees/${trainee.trainee_id}/competencies`}>
                          <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
