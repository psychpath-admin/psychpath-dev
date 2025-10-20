import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  BookOpen, 
  Plus, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Target,
  BarChart3,
  FileText,
  Users,
  Calendar,
  Star
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import type { CPDDashboardStats, CPDActivitySummary } from '@/types/cpd'

export default function CPDDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<CPDDashboardStats | null>(null)
  const [recentActivities, setRecentActivities] = useState<CPDActivitySummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Load dashboard stats
      const statsRes = await apiFetch('/api/cpd/dashboard/stats/')
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      // Load recent activities
      const activitiesRes = await apiFetch('/api/cpd/activities/summary/')
      if (activitiesRes.ok) {
        const activitiesData = await activitiesRes.json()
        setRecentActivities(activitiesData.slice(0, 5)) // Show only 5 most recent
      }
    } catch (error) {
      console.error('Error loading CPD dashboard data:', error)
      toast.error('Failed to load CPD dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'non_compliant':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getComplianceStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'non_compliant':
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Unable to load CPD dashboard</h3>
            <p className="text-gray-600">Please try refreshing the page or contact support if the issue persists.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-700 to-blue-900 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <BookOpen className="h-8 w-8" />
                CPD Portfolio
              </CardTitle>
              <p className="text-blue-100 mt-1">
                Manage your Continuing Professional Development activities
              </p>
            </div>
            <Button
              onClick={() => navigate('/cpd/activities/new')}
              className="bg-white text-blue-700 hover:bg-gray-100"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Activity
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Compliance Status */}
      <Card className={`border-2 ${getComplianceStatusColor(stats.compliance_status)}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getComplianceStatusIcon(stats.compliance_status)}
              <div>
                <h3 className="text-lg font-semibold">
                  {stats.compliance_status === 'compliant' ? 'Compliant' : 
                   stats.compliance_status === 'warning' ? 'At Risk' : 'Non-Compliant'}
                </h3>
                <p className="text-sm opacity-75">
                  {stats.compliance_status === 'compliant' ? 'You are meeting all CPD requirements' :
                   stats.compliance_status === 'warning' ? 'You are at risk of non-compliance' :
                   'You are not meeting CPD requirements'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {stats.total_hours_current_year.toFixed(1)}h
              </div>
              <div className="text-sm opacity-75">
                of {stats.total_hours_required}h required
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Hours */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold">{stats.total_hours_current_year.toFixed(1)}h</p>
                <p className="text-xs text-gray-500">
                  {stats.progress_percentage.toFixed(1)}% of required
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
            <Progress value={stats.progress_percentage} className="mt-2" />
          </CardContent>
        </Card>

        {/* Active CPD */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active CPD</p>
                <p className="text-2xl font-bold">{stats.active_cpd_hours_current_year.toFixed(1)}h</p>
                <p className="text-xs text-gray-500">
                  {stats.active_cpd_percentage.toFixed(1)}% of total
                </p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
            <Progress value={stats.active_cpd_percentage} className="mt-2" />
          </CardContent>
        </Card>

        {/* Peer Consultation */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Peer Consultation</p>
                <p className="text-2xl font-bold">{stats.peer_consultation_hours_current_year.toFixed(1)}h</p>
                <p className="text-xs text-gray-500">
                  {stats.peer_consultation_progress_percentage.toFixed(1)}% of required
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <Progress value={stats.peer_consultation_progress_percentage} className="mt-2" />
          </CardContent>
        </Card>

        {/* Activities Count */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Activities</p>
                <p className="text-2xl font-bold">{stats.recent_activities_count}</p>
                <p className="text-xs text-gray-500">
                  {stats.pending_activities_count} pending
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {stats.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Alerts & Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.alerts.map((alert, index) => (
                <Alert key={index} className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    {alert}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            CPD Plan Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {stats.has_approved_plan ? 'Plan Approved' : 'No Approved Plan'}
              </p>
              <p className="text-sm text-gray-600">
                Status: {stats.plan_status}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/cpd/plan')}
            >
              {stats.has_approved_plan ? 'View Plan' : 'Create Plan'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Recent Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{activity.title}</h4>
                      <Badge variant="outline">{activity.activity_type}</Badge>
                      {activity.is_active_cpd && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Active CPD
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{activity.activity_date}</span>
                      <span>{activity.duration_hours}h</span>
                      {activity.quality_rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{activity.quality_rating}/5</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/cpd/activities/${activity.id}`)}
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No activities yet. Start by adding your first CPD activity!</p>
            </div>
          )}
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={() => navigate('/cpd/activities')}
            >
              View All Activities
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
