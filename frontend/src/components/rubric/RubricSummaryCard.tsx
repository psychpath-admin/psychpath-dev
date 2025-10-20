import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

interface RubricSummaryCardProps {
  summary: RubricSummary
  showDetails?: boolean
  onEdit?: () => void
}
import { Calendar, User, Edit, Lock, CheckCircle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const RubricSummaryCard: React.FC<RubricSummaryCardProps> = ({
  summary,
  showDetails = false,
  onEdit
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'submitted': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'approved': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-red-100 text-red-800'
      case 2: return 'bg-yellow-100 text-yellow-800'
      case 3: return 'bg-blue-100 text-blue-800'
      case 4: return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getProgressPercentage = (score: number) => {
    return Math.min((score / 4) * 100, 100)
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {summary.epa.title}
              {summary.locked && <Lock className="h-4 w-4 text-muted-foreground" />}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {summary.epa.competency.code}
              </Badge>
              <Badge className={getLevelColor(summary.milestone_equivalent)}>
                L{summary.milestone_equivalent}
              </Badge>
              <Badge className={getStatusColor(summary.status)}>
                {summary.status.charAt(0).toUpperCase() + summary.status.slice(1)}
              </Badge>
            </div>
          </div>
          {onEdit && !summary.locked && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-xl font-bold text-primary">
              {summary.total_weighted_score.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">Weighted Score</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-xl font-bold text-primary">
              L{summary.milestone_equivalent}
            </div>
            <div className="text-xs text-muted-foreground">Milestone Level</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-xl font-bold text-primary">
              {summary.scores.length}
            </div>
            <div className="text-xs text-muted-foreground">Criteria Scored</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{summary.milestone_equivalent}/4</span>
          </div>
          <Progress 
            value={getProgressPercentage(summary.total_weighted_score)} 
            className="h-2"
          />
        </div>

        {/* Supervisor Comment */}
        {summary.summary_comment && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Supervisor Comment</h4>
            <div className="p-3 bg-muted rounded-lg text-sm">
              {summary.summary_comment}
            </div>
          </div>
        )}

        {/* Detailed Scores */}
        {showDetails && summary.scores.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Detailed Scores</h4>
            <div className="space-y-2">
              {summary.scores.map((score) => (
                <div key={score.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{score.criterion_label}</div>
                    {score.notes && (
                      <div className="text-xs text-muted-foreground mt-1">{score.notes}</div>
                    )}
                  </div>
                  <Badge className={getLevelColor(score.selected_level)}>
                    L{score.selected_level}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {summary.supervisor_name}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(summary.created_at), { addSuffix: true })}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {summary.status === 'approved' ? (
              <CheckCircle className="h-3 w-3 text-green-600" />
            ) : (
              <Clock className="h-3 w-3" />
            )}
            {summary.status}
          </div>
        </div>

        {/* Evidence Links */}
        {summary.evidence_links.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Evidence Links</h4>
            <div className="flex flex-wrap gap-2">
              {summary.evidence_links.map((link, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  Evidence {index + 1}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default RubricSummaryCard
