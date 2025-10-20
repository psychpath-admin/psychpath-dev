import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Target, 
  Users, 
  BookOpen, 
  AlertTriangle,
  CheckCircle,
  FileText,
  Plus,
  Calendar
} from 'lucide-react'
import { ProgressCard } from '@/components/registrar/ProgressCard'
import { ComplianceCard } from '@/components/registrar/ComplianceCard'
import { CompetencyGrid } from '@/components/registrar/CompetencyGrid'
import type { 
  RegistrarProfile, 
  DashboardStats, 
  ProgramConfig, 
  CompetencyRating 
} from '@/types/registrar'
import { apiFetch } from '@/lib/api'

export default function RegistrarDashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<RegistrarProfile | null>(null)
  const [programConfig, setProgramConfig] = useState<ProgramConfig | null>(null)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [competencyData, setCompetencyData] = useState<CompetencyRating[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load registrar profile
      const profileResponse = await apiFetch('/api/registrar-aope/profiles/')
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        setProfile(profileData.results?.[0] || profileData)
      }

      // Load program configuration
      if (profile?.program_track) {
        const configResponse = await apiFetch(`/api/registrar-aope/profiles/program_config/?track=${profile.program_track}`)
        if (configResponse.ok) {
          const configData = await configResponse.json()
          setProgramConfig(configData)
        }
      }

      // Load dashboard stats
      const statsResponse = await apiFetch('/api/registrar-aope/profiles/dashboard-stats/')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setDashboardStats(statsData)
      }

      // Load competency data
      const competencyResponse = await apiFetch('/api/registrar-aope/progress-reports/competency-summary/')
      if (competencyResponse.ok) {
        const competencyData = await competencyResponse.json()
        setCompetencyData(competencyData)
      }

    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleCompetencyCellClick = (competency: string, level: string) => {
    // TODO: Open evidence modal
    console.log(`Clicked ${competency} at ${level}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Registrar Profile Found</h2>
          <p className="text-gray-600 mb-6">You need to complete your registrar enrollment first.</p>
          <Button 
            onClick={() => window.location.href = '/registrar-enrollment'}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
          >
            Start Enrollment
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-8 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Target className="h-8 w-8" />
                  <h1 className="text-3xl font-bold">Registrar Dashboard</h1>
                </div>
                <p className="text-white/90 text-lg">
                  {profile.aope_area} • {profile.program_track} • {Math.round(profile.fte_fraction * 100)}% FTE
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/90 text-sm">Program Progress</p>
                <p className="text-2xl font-bold">
                  {dashboardStats ? `${dashboardStats.weeks_elapsed}/${dashboardStats.weeks_required} weeks` : 'Loading...'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/registrar/practice-log')}
              className="h-20 flex flex-col items-center justify-center space-y-2 border-blue-300 text-blue-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100"
            >
              <Plus className="h-6 w-6" />
              <span className="text-sm font-medium">Log Practice</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2 border-green-300 text-green-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-green-100"
            >
              <BookOpen className="h-6 w-6" />
              <span className="text-sm font-medium">Add CPD</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/registrar/competency-tracker')}
              className="h-20 flex flex-col items-center justify-center space-y-2 border-purple-300 text-purple-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100"
            >
              <Target className="h-6 w-6" />
              <span className="text-sm font-medium">Competencies</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/registrar/leave-management')}
              className="h-20 flex flex-col items-center justify-center space-y-2 border-orange-300 text-orange-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100"
            >
              <Calendar className="h-6 w-6" />
              <span className="text-sm font-medium">Leave Management</span>
            </Button>
          </div>
        </div>

        {/* Progress Overview */}
        {dashboardStats && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Progress Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ProgressCard
                current={dashboardStats.total_hours}
                required={dashboardStats.total_hours_required}
                label="Total Hours"
                color="purple"
                trafficLight={dashboardStats.traffic_lights.overall}
                compact
              />
              <ProgressCard
                current={dashboardStats.direct_contact_hours_this_year}
                required={dashboardStats.direct_contact_required}
                label="Direct Contact (this year)"
                color="green"
                trafficLight={dashboardStats.traffic_lights.direct_contact}
                compact
              />
              <ProgressCard
                current={dashboardStats.supervision_hours}
                required={dashboardStats.supervision_required}
                label="Supervision"
                color="blue"
                trafficLight={dashboardStats.traffic_lights.supervision}
                compact
              />
              <ProgressCard
                current={dashboardStats.cpd_hours}
                required={dashboardStats.cpd_required}
                label="CPD"
                color="orange"
                trafficLight={dashboardStats.traffic_lights.cpd}
                compact
              />
            </div>
          </div>
        )}

        {/* Compliance Status */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Compliance Status</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ComplianceCard 
              title="Supervision Composition" 
              status={dashboardStats?.traffic_lights.supervision || 'green'}
              compact
            >
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Principal Supervisor</span>
                  <span className="font-medium">{dashboardStats?.supervision_composition.principal_percent.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Secondary Supervisor</span>
                  <span className="font-medium">{dashboardStats?.supervision_composition.secondary_percent.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                    style={{ width: `${dashboardStats?.supervision_composition.principal_percent || 0}%` }}
                  />
                </div>
              </div>
            </ComplianceCard>

            <ComplianceCard 
              title="Short Sessions" 
              status={dashboardStats?.short_session_stats.limit_exceeded ? 'red' : dashboardStats?.short_session_stats.warning_threshold_reached ? 'amber' : 'green'}
              compact
            >
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Hours Used</span>
                  <span className="font-medium">{dashboardStats?.short_session_stats.hours.toFixed(1)} / {dashboardStats?.short_session_stats.max_hours}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      dashboardStats?.short_session_stats.limit_exceeded 
                        ? 'bg-red-500' 
                        : dashboardStats?.short_session_stats.warning_threshold_reached 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${dashboardStats?.short_session_stats.percentage || 0}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600">
                  Sessions under 60 minutes count toward the 10-hour limit
                </p>
              </div>
            </ComplianceCard>

            <ComplianceCard 
              title="Observation Requirements" 
              status={dashboardStats?.traffic_lights.observation || 'green'}
              compact
            >
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Last Observation</span>
                  <span className="font-medium">
                    {dashboardStats?.last_observation_date 
                      ? new Date(dashboardStats.last_observation_date).toLocaleDateString()
                      : 'Never'
                    }
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Days Since</span>
                  <span className="font-medium">{dashboardStats?.days_since_observation || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Next Due</span>
                  <span className="font-medium">
                    {dashboardStats?.next_observation_due 
                      ? new Date(dashboardStats.next_observation_due).toLocaleDateString()
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>
            </ComplianceCard>

            <ComplianceCard 
              title="Reflection Completion" 
              status={dashboardStats?.reflection_completion_rate && dashboardStats.reflection_completion_rate >= 80 ? 'green' : dashboardStats?.reflection_completion_rate && dashboardStats.reflection_completion_rate >= 60 ? 'amber' : 'red'}
              compact
            >
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Completion Rate</span>
                  <span className="font-medium">{dashboardStats?.reflection_completion_rate?.toFixed(1) || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      dashboardStats?.reflection_completion_rate && dashboardStats.reflection_completion_rate >= 80 
                        ? 'bg-green-500' 
                        : dashboardStats?.reflection_completion_rate && dashboardStats.reflection_completion_rate >= 60 
                          ? 'bg-yellow-500' 
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${dashboardStats?.reflection_completion_rate || 0}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600">
                  Required for all practice and supervision activities
                </p>
              </div>
            </ComplianceCard>
          </div>
        </div>

        {/* Competency Progress */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Competency Progress</h2>
          <CompetencyGrid 
            competencyData={competencyData}
            onCellClick={handleCompetencyCellClick}
            compact
          />
        </div>

        {/* Progress Reports */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Progress Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-indigo-500">
              <Link to="/progress-reports">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 rounded-lg">
                      <FileText className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Progress Reports</h3>
                      <p className="text-sm text-gray-600">Submit midpoint and final progress reports</p>
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activity Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Practice log entry added</p>
                    <p className="text-xs text-gray-600">2 hours of assessment work logged</p>
                  </div>
                  <span className="text-xs text-gray-500 ml-auto">2 hours ago</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Supervision session completed</p>
                    <p className="text-xs text-gray-600">Individual supervision with Dr. Smith</p>
                  </div>
                  <span className="text-xs text-gray-500 ml-auto">1 day ago</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
                  <BookOpen className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">CPD activity approved</p>
                    <p className="text-xs text-gray-600">Workshop: Advanced Assessment Techniques</p>
                  </div>
                  <span className="text-xs text-gray-500 ml-auto">3 days ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Program Information */}
        {programConfig && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Program Information</h2>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Program Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Program Track:</span>
                    <p className="text-gray-900">{profile.program_track}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Duration:</span>
                    <p className="text-gray-900">{programConfig.duration_years} years</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Total Hours Required:</span>
                    <p className="text-gray-900">{programConfig.total_hours_required}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Supervision Hours:</span>
                    <p className="text-gray-900">{programConfig.supervision_hours_required}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">CPD Hours:</span>
                    <p className="text-gray-900">{programConfig.cpd_hours_required}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Direct Contact (annual):</span>
                    <p className="text-gray-900">{programConfig.direct_contact_annual_hours} hours</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Enrollment Date:</span>
                    <p className="text-gray-900">{new Date(profile.enrollment_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Expected Completion:</span>
                    <p className="text-gray-900">{new Date(profile.expected_completion_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
