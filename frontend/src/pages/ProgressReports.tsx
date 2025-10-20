import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  Edit,
  FileText
} from 'lucide-react'
import type { 
  ProgressReportList, 
  ProgressReportConfig, 
  ProgressReportDashboardStats 
} from '@/types/progress-reports'
import { 
  getProgressReports, 
  getAvailableReportTypes, 
  getProgressReportDashboardStats 
} from '@/lib/api'

const ProgressReports: React.FC = () => {
  const [reports, setReports] = useState<ProgressReportList[]>([])
  const [availableConfigs, setAvailableConfigs] = useState<ProgressReportConfig[]>([])
  const [dashboardStats, setDashboardStats] = useState<ProgressReportDashboardStats>({})
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    report_type: '',
    search: ''
  })

  useEffect(() => {
    loadData()
  }, [filters])

  const loadData = async () => {
    try {
      setLoading(true)
      const [reportsData, configsData, statsData] = await Promise.all([
        getProgressReports(filters),
        getAvailableReportTypes(),
        getProgressReportDashboardStats()
      ])
      setReports(reportsData)
      setAvailableConfigs(configsData)
      setDashboardStats(statsData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string, isOverdue: boolean) => {
    const statusConfig = {
      DRAFT: { variant: 'secondary' as const, icon: FileText, color: 'text-gray-600' },
      SUBMITTED: { variant: 'default' as const, icon: Clock, color: 'text-blue-600' },
      UNDER_REVIEW: { variant: 'default' as const, icon: Eye, color: 'text-yellow-600' },
      APPROVED: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      REQUIRES_REVISION: { variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-600' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className={`${config.color} ${isOverdue ? 'animate-pulse' : ''}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ')}
        {isOverdue && ' (Overdue)'}
      </Badge>
    )
  }

  const filteredReports = reports.filter(report => {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      return (
        report.trainee_name.toLowerCase().includes(searchTerm) ||
        report.report_config_label.toLowerCase().includes(searchTerm)
      )
    }
    return true
  })

  const getDashboardCards = () => {
    const cards = []
    
    if (dashboardStats.draft_reports !== undefined) {
      cards.push({
        title: 'Draft Reports',
        value: dashboardStats.draft_reports,
        icon: FileText,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50'
      })
    }
    
    if (dashboardStats.submitted_reports !== undefined) {
      cards.push({
        title: 'Submitted Reports',
        value: dashboardStats.submitted_reports,
        icon: Clock,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      })
    }
    
    if (dashboardStats.approved_reports !== undefined) {
      cards.push({
        title: 'Approved Reports',
        value: dashboardStats.approved_reports,
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      })
    }
    
    if (dashboardStats.overdue_reports !== undefined) {
      cards.push({
        title: 'Overdue Reports',
        value: dashboardStats.overdue_reports,
        icon: AlertTriangle,
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      })
    }
    
    if (dashboardStats.pending_reviews !== undefined) {
      cards.push({
        title: 'Pending Reviews',
        value: dashboardStats.pending_reviews,
        icon: Eye,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50'
      })
    }
    
    if (dashboardStats.overdue_reviews !== undefined) {
      cards.push({
        title: 'Overdue Reviews',
        value: dashboardStats.overdue_reviews,
        icon: AlertTriangle,
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      })
    }

    return cards
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading progress reports...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Progress Reports</h1>
          <p className="text-gray-600 mt-1">Manage your progress reports and competency assessments</p>
        </div>
        <div className="flex items-center gap-2">
          {availableConfigs.length > 0 && (
            <Link to="/progress-reports/new">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Report
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Dashboard Stats */}
      {getDashboardCards().length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {getDashboardCards().map((card, index) => {
            const Icon = card.icon
            return (
              <Card key={index} className={`${card.bgColor} border-l-4 border-l-current`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{card.title}</p>
                      <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                    </div>
                    <Icon className={`h-8 w-8 ${card.color}`} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search reports..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SUBMITTED">Submitted</SelectItem>
                  <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REQUIRES_REVISION">Requires Revision</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Report Type</label>
              <Select
                value={filters.report_type}
                onValueChange={(value) => setFilters(prev => ({ ...prev, report_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  {availableConfigs.map(config => (
                    <SelectItem key={config.id} value={config.report_type}>
                      {config.report_label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setFilters({ status: '', report_type: '', search: '' })}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No progress reports found</h3>
              <p className="text-gray-600 mb-4">
                {filters.search || filters.status || filters.report_type
                  ? 'Try adjusting your filters to see more results.'
                  : 'Get started by creating your first progress report.'
                }
              </p>
              {availableConfigs.length > 0 && (
                <Link to="/progress-reports/new">
                  <Button>Create Progress Report</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredReports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{report.report_config_label}</h3>
                      {getStatusBadge(report.status, report.is_overdue)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(report.reporting_period_start).toLocaleDateString()} - {new Date(report.reporting_period_end).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Due: {new Date(report.due_date).toLocaleDateString()}</span>
                      </div>
                      
                      {report.submission_date && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          <span>Submitted: {new Date(report.submission_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Link to={`/progress-reports/${report.id}`}>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </Link>
                    
                    {report.can_be_edited && (
                      <Link to={`/progress-reports/${report.id}/edit`}>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

export default ProgressReports
