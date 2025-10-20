import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { RubricScoringTableProps, RubricCriterion } from '@/types/rubric'
import { Info, CheckCircle } from 'lucide-react'

const RubricScoringTable: React.FC<RubricScoringTableProps> = ({
  rubric,
  superviseeId,
  existingScores = [],
  onScoreChange,
  readonly = false
}) => {
  const [scores, setScores] = useState<Record<string, { level: number; notes: string }>>({})
  const [weightedTotal, setWeightedTotal] = useState(0)

  // Initialize scores from existing data
  useEffect(() => {
    const initialScores: Record<string, { level: number; notes: string }> = {}
    existingScores.forEach(score => {
      initialScores[score.criterion_id] = {
        level: score.selected_level,
        notes: score.notes
      }
    })
    setScores(initialScores)
  }, [existingScores])

  // Calculate weighted total when scores change
  useEffect(() => {
    let total = 0
    rubric.criteria.forEach(criterion => {
      const score = scores[criterion.criterion_id]
      if (score && score.level > 0) {
        const weight = rubric.weightings[criterion.criterion_id] || 0
        total += score.level * weight
      }
    })
    setWeightedTotal(total)
  }, [scores, rubric])

  const handleScoreChange = (criterionId: string, level: number) => {
    const newScores = {
      ...scores,
      [criterionId]: {
        ...scores[criterionId],
        level
      }
    }
    setScores(newScores)
    onScoreChange?.(criterionId, level, scores[criterionId]?.notes || '')
  }

  const handleNotesChange = (criterionId: string, notes: string) => {
    const newScores = {
      ...scores,
      [criterionId]: {
        ...scores[criterionId],
        notes
      }
    }
    setScores(newScores)
    onScoreChange?.(criterionId, scores[criterionId]?.level || 0, notes)
  }

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-red-100 text-red-800 border-red-200'
      case 2: return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 3: return 'bg-blue-100 text-blue-800 border-blue-200'
      case 4: return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getMilestoneLevel = (weightedScore: number) => {
    if (weightedScore < 1.75) return 1
    if (weightedScore < 2.5) return 2
    if (weightedScore < 3.25) return 3
    return 4
  }

  const milestoneLevel = getMilestoneLevel(weightedTotal)

  return (
    <div className="space-y-6">
      {/* Rubric Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Rubric: {rubric.epa.title}
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            <p><strong>Competency:</strong> {rubric.competency.title}</p>
            <p><strong>Milestone:</strong> {rubric.milestone.label} (Level {rubric.milestone.level})</p>
            {rubric.guidance_notes && (
              <p><strong>Guidance:</strong> {rubric.guidance_notes}</p>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Scoring Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Criteria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {rubric.criteria.map((criterion, index) => (
              <div key={criterion.criterion_id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-2">
                      {index + 1}. {criterion.criterion_label}
                    </h4>
                    <div className="text-xs text-muted-foreground mb-3">
                      Weight: {(rubric.weightings[criterion.criterion_id] * 100).toFixed(0)}%
                    </div>
                  </div>
                  {scores[criterion.criterion_id]?.level > 0 && (
                    <Badge className={getLevelColor(scores[criterion.criterion_id].level)}>
                      L{scores[criterion.criterion_id].level}
                    </Badge>
                  )}
                </div>

                {/* Level Selection */}
                <RadioGroup
                  value={scores[criterion.criterion_id]?.level?.toString() || ''}
                  onValueChange={(value) => handleScoreChange(criterion.criterion_id, parseInt(value))}
                  disabled={readonly}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  {[1, 2, 3, 4].map(level => (
                    <div key={level} className="space-y-2">
                      <Label 
                        htmlFor={`${criterion.criterion_id}-${level}`}
                        className={`flex items-start space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          scores[criterion.criterion_id]?.level === level 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <RadioGroupItem 
                          value={level.toString()} 
                          id={`${criterion.criterion_id}-${level}`}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">Level {level}</span>
                            {scores[criterion.criterion_id]?.level === level && (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-xs text-muted-foreground line-clamp-3">
                                  {criterion[`descriptor_L${level}` as keyof RubricCriterion]}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">
                                  {criterion[`descriptor_L${level}` as keyof RubricCriterion]}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {/* Notes Field */}
                <div className="mt-4">
                  <Label htmlFor={`notes-${criterion.criterion_id}`} className="text-sm font-medium">
                    Additional Notes
                  </Label>
                  <Textarea
                    id={`notes-${criterion.criterion_id}`}
                    placeholder="Add any specific observations or comments..."
                    value={scores[criterion.criterion_id]?.notes || ''}
                    onChange={(e) => handleNotesChange(criterion.criterion_id, e.target.value)}
                    disabled={readonly}
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{weightedTotal.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Weighted Score</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">L{milestoneLevel}</div>
              <div className="text-sm text-muted-foreground">Milestone Level</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {rubric.criteria.filter(c => scores[c.criterion_id]?.level > 0).length}/{rubric.criteria.length}
              </div>
              <div className="text-sm text-muted-foreground">Criteria Scored</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default RubricScoringTable
