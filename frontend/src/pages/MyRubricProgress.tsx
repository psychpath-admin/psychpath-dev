import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
// Inline interfaces to resolve import issues
interface RubricSummary {
  id: string
  epa: any
  rubric: any
  supervisee_name: string
  supervisor_name: string
  total_weighted_score: number
  milestone_equivalent: number
  summary_comment: string
  status: 'draft' | 'submitted' | 'approved'
  locked: boolean
  evidence_links: string[]
  scores: any[]
  created_at: string
  approved_at: string | null
}

interface Competency {
  id: number
  code: string
  title: string
  description: string
  descriptors: Record<string, string>
  order: number
  is_active: boolean
  epa_count: number
}
import RubricSummaryCard from '@/components/rubric/RubricSummaryCard'
import { Loader2, TrendingUp, Award, Calendar, Filter } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const MyRubricProgress: React.FC = () => {
  const [summaries, setSummaries] = useState<RubricSummary[]>([])
  const [competencies, setCompetencies] = useState<Competency[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCompetency, setSelectedCompetency] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [summariesResponse, competenciesResponse] = await Promise.all([
        fetch('/api/rubrics/my-progress/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }),
        fetch('/api/competencies/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        })
      ])

      if (summariesResponse.ok) {
        const summariesData = await summariesResponse.json()
        setSummaries(summariesData)
      }

      if (competenciesResponse.ok) {
        const competenciesData = await competenciesResponse.json()
        setCompetencies(competenciesData)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredSummaries = summaries.filter(summary => {
    const competencyMatch = selectedCompetency === 'all' || 
      summary.epa.competency.code === selectedCompetency
    const statusMatch = selectedStatus === 'all' || 
      summary.status === selectedStatus
    return competencyMatch && statusMatch
  })

  const competencyBreakdown = competencies.map(competency => {
    const competencySummaries = summaries.filter(s => s.epa.competency.code === competency.code)
    const completed = competencySummaries.filter(s => s.status === 'approved').length
    const averageLevel = competencySummaries.length > 0 
      ? competencySummaries.reduce((sum, s) => sum + s.milestone_equivalent, 0) / competencySummaries.length
      : 0

    return {
      competency,
      total: competencySummaries.length,
      completed,
      averageLevel
    }
  })

  const recentEvaluations = summaries
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const overallStats = {
    totalEvaluations: summaries.length,
    approvedEvaluations: summaries.filter(s => s.status === 'approved').length,
    averageLevel: summaries.length > 0 
      ? summaries.reduce((sum, s) => sum + s.milestone_equivalent, 0) / summaries.length
      : 0,
    lastEvaluation: summaries.length > 0 
      ? summaries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
      : null
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading your rubric progress...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Rubric Progress</h1>
          <p className="text-muted-foreground mt-1">
            Track your EPA evaluations and competency development
          </p>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">{overallStats.totalEvaluations}</div>
                <div className="text-sm text-muted-foreground">Total Evaluations</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{overallStats.approvedEvaluations}</div>
                <div className="text-sm text-muted-foreground">Approved</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">L</span>
              </div>
              <div>
                <div className="text-2xl font-bold">{overallStats.averageLevel.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">Avg Level</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-sm font-medium">
                  {overallStats.lastEvaluation 
                    ? formatDistanceToNow(new Date(overallStats.lastEvaluation), { addSuffix: true })
                    : 'Never'
                  }
                </div>
                <div className="text-sm text-muted-foreground">Last Evaluation</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
          <TabsTrigger value="competencies">Competencies</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Competency Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Competency Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {competencyBreakdown.map(({ competency, total, completed, averageLevel }) => (
                  <div key={competency.code} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{competency.code} - {competency.title}</h4>
                        <div className="text-sm text-muted-foreground">
                          {completed}/{total} EPAs completed
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">L{averageLevel.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">Avg Level</div>
                      </div>
                    </div>
                    <Progress 
                      value={total > 0 ? (completed / total) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Evaluations */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Evaluations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentEvaluations.length > 0 ? (
                  recentEvaluations.map(summary => (
                    <RubricSummaryCard
                      key={summary.id}
                      summary={summary}
                      showDetails={false}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No evaluations yet. Your supervisor will evaluate your EPAs as you progress.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evaluations" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                <Select value={selectedCompetency} onValueChange={setSelectedCompetency}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Competencies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Competencies</SelectItem>
                    {competencies.map(competency => (
                      <SelectItem key={competency.code} value={competency.code}>
                        {competency.code} - {competency.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Evaluations List */}
          <div className="space-y-4">
            {filteredSummaries.length > 0 ? (
              filteredSummaries.map(summary => (
                <RubricSummaryCard
                  key={summary.id}
                  summary={summary}
                  showDetails={true}
                />
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No evaluations found matching your filters.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="competencies" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {competencyBreakdown.map(({ competency, total, completed, averageLevel }) => (
              <Card key={competency.code}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {competency.code} - {competency.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">L{averageLevel.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">Average Level</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{completed}/{total}</span>
                    </div>
                    <Progress value={total > 0 ? (completed / total) * 100 : 0} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {competency.description}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default MyRubricProgress
