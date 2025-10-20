import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'
import { 
  Clock, 
  Users, 
  BookOpen, 
  Target, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  TrendingUp,
  FileText,
  Download,
  Briefcase,
  UserCheck,
  Calendar
} from 'lucide-react'

interface RegistrarProgram {
  id: number
  aope: string
  qualification_tier: string
  fte_fraction: number
  start_date: string
  expected_end_date: string
  status: string
  targets_practice_hrs: number
  targets_supervision_hrs: number
  targets_cpd_hrs: number
  practice_hours_completed: number
  supervision_hours_completed: number
  cpd_hours_completed: number
  dcc_hours_completed: number
  active_cpd_hours_completed: number
  principal_supervision_percentage: number
  individual_supervision_percentage: number
  group_supervision_percentage: number
  shorter_sessions_percentage: number
  supervision_compliance_status: string
  dcc_per_fte_year: number
  weekly_commitment: number
  estimated_completion: string
  weeks_remaining: number
  is_behind_pace: boolean
  annual_pd_hours: number
  annual_dcc_hours: number
  total_hours: number
}

const RegistrarDashboard: React.FC = () => {
  const [program, setProgram] = useState<RegistrarProgram | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProgram = async () => {
      try {
        // First, check if user has any registrar programs
        const programsResponse = await apiFetch('/api/registrar/programs/')
        if (programsResponse.ok) {
          const programs = await programsResponse.json()
          if (programs.length === 0) {
            setError('no_programs')
            setLoading(false)
            return
          }
          
          // Use the first program for the dashboard
          const programId = programs[0].id
          const response = await apiFetch(`/api/registrar/programs/${programId}/dashboard/`)
          if (response.ok) {
            const data = await response.json()
            setProgram(data)
          } else {
            setError('Failed to fetch program data')
          }
        } else {
          setError('Failed to fetch programs')
        }
      } catch (err) {
        setError('Error loading dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchProgram()
  }, [])

  const getComplianceBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Compliant</Badge>
      case 'non_compliant':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Non-Compliant</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>
    }
  }

  const CircularProgress = ({ percentage, size = 120, strokeWidth = 8, color = "#3b82f6" }: { 
    percentage: number, 
    size?: number, 
    strokeWidth?: number, 
    color?: string 
  }) => {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const strokeDasharray = circumference
    const strokeDashoffset = circumference - (percentage / 100) * circumference

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300 ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error === 'no_programs') {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Welcome to Your Registrar Program</h2>
            <p className="text-gray-600 mb-6">
              You don't have any registrar programs set up yet. Let's get started by creating your first program.
            </p>
          </div>
          <Button 
            onClick={() => window.location.href = '/registrar/setup'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
          >
            Create Registrar Program
          </Button>
        </div>
      </div>
    )
  }

  if (error || !program) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
        <p className="text-gray-600">{error || 'Program data not found'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Program Overview Card */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Registrar Progress</CardTitle>
              <Badge variant="outline" className="mt-2">
                {program.aope} {program.qualification_tier}
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Duration</div>
              <div className="text-lg font-semibold">{program.weeks_remaining} weeks</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Progress Overview */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Overall Progress</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Practice Hours</span>
                    <span>{program.practice_hours_completed} / {program.targets_practice_hrs}</span>
                  </div>
                  <Progress value={(program.practice_hours_completed / program.targets_practice_hrs) * 100} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Professional Development</span>
                    <span>{program.cpd_hours_completed} / {program.targets_cpd_hrs}</span>
                  </div>
                  <Progress value={(program.cpd_hours_completed / program.targets_cpd_hrs) * 100} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Supervision</span>
                    <span>{program.supervision_hours_completed} / {program.targets_supervision_hrs}</span>
                  </div>
                  <Progress value={(program.supervision_hours_completed / program.targets_supervision_hrs) * 100} />
                </div>
              </div>
            </div>

            {/* Timeline & Alerts */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="text-sm font-medium">Estimated Completion</div>
                    <div className="text-sm text-gray-600">{program.estimated_completion}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="text-sm font-medium">Weekly Commitment</div>
                    <div className="text-sm text-gray-600">{program.weekly_commitment} hrs/week</div>
                  </div>
                </div>
                {program.is_behind_pace && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-800">Behind pace</span>
                  </div>
                )}
              </div>
            </div>

            {/* Key Metrics */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Key Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{program.total_hours}</div>
                  <div className="text-sm text-gray-600">Total Hours</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{program.dcc_per_fte_year?.toFixed(0) || '0'}</div>
                  <div className="text-sm text-gray-600">DCC/Year</div>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="mt-6 space-y-2">
            {program.annual_pd_hours < (program.targets_cpd_hrs || 80) && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  Annual PD hours ({program.annual_pd_hours}) are below the required {program.targets_cpd_hrs || 80}h for your registrar program.
                </span>
              </div>
            )}
            {program.annual_dcc_hours < 176 && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800">
                  Direct client contact this year is {program.annual_dcc_hours}h; AHPRA expects ≥176h/year of direct client contact.
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Groups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Client Activities Group */}
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5 text-blue-600" />
              Client Activities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Practice Hours */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CircularProgress 
                  percentage={(program.practice_hours_completed / program.targets_practice_hrs) * 100} 
                  size={80} 
                  strokeWidth={6}
                  color="#3b82f6"
                />
                <div>
                  <div className="font-medium">Practice Hours</div>
                  <div className="text-sm text-gray-600">{program.practice_hours_completed} / {program.targets_practice_hrs}h</div>
                </div>
              </div>
            </div>

            {/* DCC Hours */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CircularProgress 
                  percentage={Math.min((program.dcc_hours_completed / 500) * 100, 100)} 
                  size={80} 
                  strokeWidth={6}
                  color="#10b981"
                />
                <div>
                  <div className="font-medium">Direct Client Contact</div>
                  <div className="text-sm text-gray-600">{program.dcc_hours_completed} / 500h</div>
                </div>
              </div>
            </div>

            {/* CRA Hours */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CircularProgress 
                  percentage={Math.min(((program.practice_hours_completed - program.dcc_hours_completed) / (program.targets_practice_hrs - 500)) * 100, 100)} 
                  size={80} 
                  strokeWidth={6}
                  color="#8b5cf6"
                />
                <div>
                  <div className="font-medium">Client-Related Activities</div>
                  <div className="text-sm text-gray-600">{program.practice_hours_completed - program.dcc_hours_completed}h</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Development Activities Group */}
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-green-600" />
              PD Activities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* CPD Hours */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CircularProgress 
                  percentage={(program.cpd_hours_completed / program.targets_cpd_hrs) * 100} 
                  size={80} 
                  strokeWidth={6}
                  color="#10b981"
                />
                <div>
                  <div className="font-medium">CPD Hours</div>
                  <div className="text-sm text-gray-600">{program.cpd_hours_completed} / {program.targets_cpd_hrs}h</div>
                </div>
              </div>
            </div>

            {/* Active CPD */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CircularProgress 
                  percentage={(program.active_cpd_hours_completed / program.targets_cpd_hrs) * 100} 
                  size={80} 
                  strokeWidth={6}
                  color="#059669"
                />
                <div>
                  <div className="font-medium">Active CPD</div>
                  <div className="text-sm text-gray-600">{program.active_cpd_hours_completed} / {program.targets_cpd_hrs}h</div>
                </div>
              </div>
            </div>

            {/* Annual PD Progress */}
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-800">Annual PD Progress</span>
                <span className="text-sm text-green-600">{program.annual_pd_hours} / {program.targets_cpd_hrs || 80}h</span>
              </div>
              <Progress value={(program.annual_pd_hours / (program.targets_cpd_hrs || 80)) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Supervision Activities Group */}
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-purple-600" />
              Supervision Activities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Supervision Hours */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CircularProgress 
                  percentage={(program.supervision_hours_completed / program.targets_supervision_hrs) * 100} 
                  size={80} 
                  strokeWidth={6}
                  color="#8b5cf6"
                />
                <div>
                  <div className="font-medium">Supervision Hours</div>
                  <div className="text-sm text-gray-600">{program.supervision_hours_completed} / {program.targets_supervision_hrs}h</div>
                </div>
              </div>
            </div>

            {/* Supervision Mix */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Principal Supervisor</span>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${program.principal_supervision_percentage >= 50 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm font-medium">{program.principal_supervision_percentage?.toFixed(1) || '0.0'}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Individual Sessions</span>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${program.individual_supervision_percentage >= 66 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm font-medium">{program.individual_supervision_percentage?.toFixed(1) || '0.0'}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Group Sessions</span>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${program.group_supervision_percentage <= 33 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm font-medium">{program.group_supervision_percentage?.toFixed(1) || '0.0'}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Short Sessions (&lt;60min)</span>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${program.shorter_sessions_percentage <= 25 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm font-medium">{program.shorter_sessions_percentage?.toFixed(1) || '0.0'}%</span>
                </div>
              </div>
            </div>

            {/* Compliance Status */}
            <div className="pt-2">
              {getComplianceBadge(program.supervision_compliance_status)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <Briefcase className="h-6 w-6" />
              <span className="text-sm">Add Practice Entry</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <Users className="h-6 w-6" />
              <span className="text-sm">Log Supervision</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <BookOpen className="h-6 w-6" />
              <span className="text-sm">Add CPD Entry</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <FileText className="h-6 w-6" />
              <span className="text-sm">View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default RegistrarDashboard