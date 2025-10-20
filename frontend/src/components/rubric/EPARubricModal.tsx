import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EPARubricModalProps, Rubric, RubricSummary, RubricScore } from '@/types/rubric'
import RubricScoringTable from './RubricScoringTable'
import RubricSummaryCard from './RubricSummaryCard'
import { Loader2, Save, Send, History } from 'lucide-react'
import { toast } from 'sonner'

const EPARubricModal: React.FC<EPARubricModalProps> = ({
  isOpen,
  onClose,
  epa,
  superviseeId,
  rubric,
  existingSummary
}) => {
  const [activeTab, setActiveTab] = useState('score')
  const [currentRubric, setCurrentRubric] = useState<Rubric | null>(rubric || null)
  const [scores, setScores] = useState<RubricScore[]>([])
  const [summaryComment, setSummaryComment] = useState('')
  const [evidenceLinks, setEvidenceLinks] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load rubric if not provided
  useEffect(() => {
    if (isOpen && !currentRubric) {
      loadRubric()
    }
  }, [isOpen, currentRubric])

  // Load existing scores
  useEffect(() => {
    if (currentRubric && existingSummary) {
      setScores(existingSummary.scores)
      setSummaryComment(existingSummary.summary_comment)
      setEvidenceLinks(existingSummary.evidence_links)
    }
  }, [currentRubric, existingSummary])

  const loadRubric = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/rubrics/epa/${epa.code}/`)
      if (response.ok) {
        const rubrics = await response.json()
        if (rubrics.length > 0) {
          setCurrentRubric(rubrics[0]) // Use first rubric for now
        }
      }
    } catch (error) {
      toast.error('Failed to load rubric')
    } finally {
      setIsLoading(false)
    }
  }

  const loadExistingScores = async () => {
    if (!currentRubric) return
    
    try {
      const response = await fetch(`/api/rubrics/${currentRubric.id}/scores/${superviseeId}/`)
      if (response.ok) {
        const existingScores = await response.json()
        setScores(existingScores)
      }
    } catch (error) {
      console.error('Failed to load existing scores:', error)
    }
  }

  const handleScoreChange = async (criterionId: string, level: number, notes: string) => {
    if (!currentRubric) return

    const scoreData = {
      rubric: currentRubric.id,
      supervisee: superviseeId,
      criterion_id: criterionId,
      criterion_label: currentRubric.criteria.find(c => c.criterion_id === criterionId)?.criterion_label || '',
      selected_level: level,
      notes
    }

    try {
      const response = await fetch('/api/rubrics/score/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(scoreData)
      })

      if (response.ok) {
        const newScore = await response.json()
        setScores(prev => {
          const filtered = prev.filter(s => s.criterion_id !== criterionId)
          return [...filtered, newScore]
        })
        toast.success('Score saved')
      }
    } catch (error) {
      toast.error('Failed to save score')
    }
  }

  const handleSubmitSummary = async () => {
    if (!currentRubric || !summaryComment.trim()) {
      toast.error('Please provide a summary comment')
      return
    }

    setIsSubmitting(true)
    try {
      const summaryData = {
        epa: epa.id,
        rubric: currentRubric.id,
        supervisee: superviseeId,
        summary_comment: summaryComment,
        evidence_links: evidenceLinks
      }

      const response = await fetch('/api/rubrics/summary/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(summaryData)
      })

      if (response.ok) {
        toast.success('Rubric evaluation submitted successfully')
        onClose()
      } else {
        toast.error('Failed to submit evaluation')
      }
    } catch (error) {
      toast.error('Failed to submit evaluation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setActiveTab('score')
    setSummaryComment('')
    setEvidenceLinks([])
    onClose()
  }

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading rubric...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!currentRubric) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rubric Not Found</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              No rubric found for EPA {epa.code}. Please contact your administrator.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            EPA Evaluation: {epa.title}
            <Badge variant="outline">{epa.competency.code}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="score" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Score
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="score" className="mt-4">
            <RubricScoringTable
              rubric={currentRubric}
              superviseeId={superviseeId}
              existingScores={scores}
              onScoreChange={handleScoreChange}
              readonly={existingSummary?.locked || false}
            />
          </TabsContent>

          <TabsContent value="summary" className="mt-4 space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="summary-comment">Summary Comment</Label>
                <Textarea
                  id="summary-comment"
                  placeholder="Provide an overall assessment and recommendations..."
                  value={summaryComment}
                  onChange={(e) => setSummaryComment(e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="evidence-links">Evidence Links (Optional)</Label>
                <Textarea
                  id="evidence-links"
                  placeholder="Enter evidence links separated by commas..."
                  value={evidenceLinks.join(', ')}
                  onChange={(e) => setEvidenceLinks(e.target.value.split(',').map(link => link.trim()).filter(link => link))}
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitSummary}
                  disabled={isSubmitting || !summaryComment.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Evaluation
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Previous Evaluations</h3>
              {existingSummary ? (
                <RubricSummaryCard
                  summary={existingSummary}
                  showDetails={true}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No previous evaluations found for this EPA.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default EPARubricModal
