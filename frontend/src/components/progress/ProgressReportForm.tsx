import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Save, 
  Send, 
  AlertTriangle, 
  Target,
  Eye,
  Calendar,
  User
} from 'lucide-react'
import type { 
  ProgressReport, 
  ProgressReportConfig, 
  CompetencyMilestone,
  CompetencyProgress 
} from '@/types/progress-reports'
import { 
  createProgressReport, 
  updateProgressReport, 
  saveProgressReportDraft,
  submitProgressReport 
} from '@/lib/api'

interface ProgressReportFormProps {
  report?: ProgressReport
  reportConfig: ProgressReportConfig
  competencies: CompetencyMilestone[]
  competencyProgress: CompetencyProgress[]
  onSave?: (report: ProgressReport) => void
  onCancel?: () => void
}

const ProgressReportForm: React.FC<ProgressReportFormProps> = ({
  report,
  reportConfig,
  competencies,
  competencyProgress,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    reporting_period_start: report?.reporting_period_start || '',
    reporting_period_end: report?.reporting_period_end || '',
    due_date: report?.due_date || '',
    competency_ratings: report?.competency_ratings || {},
    achievements: report?.achievements || '',
    challenges: report?.challenges || '',
    learning_goals: report?.learning_goals || '',
    support_needed: report?.support_needed || '',
    additional_comments: report?.additional_comments || ''
  })

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Auto-save every 2 minutes
  useEffect(() => {
    if (report?.status === 'DRAFT' && reportConfig.allows_draft) {
      const timer = setInterval(() => {
        handleAutoSave()
      }, 120000) // 2 minutes
      return () => clearInterval(timer)
    }
  }, [report?.status])

  const handleAutoSave = async () => {
    if (!report || report.status !== 'DRAFT') return
    
    try {
      setSaving(true)
      await saveProgressReportDraft(report.id, formData)
    } catch (error) {
      console.error('Auto-save failed:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleCompetencyChange = (competencyCode: string, field: 'milestone' | 'reflection', value: string) => {
    setFormData(prev => ({
      ...prev,
      competency_ratings: {
        ...prev.competency_ratings,
        [competencyCode]: {
          ...prev.competency_ratings[competencyCode],
          [field]: value
        }
      }
    }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Validate required fields
    if (!formData.reporting_period_start) {
      newErrors.reporting_period_start = 'Reporting period start is required'
    }
    if (!formData.reporting_period_end) {
      newErrors.reporting_period_end = 'Reporting period end is required'
    }

    // Validate competency ratings if required
    if (reportConfig.requires_all_competencies) {
      const missingCompetencies = competencies.filter(comp => 
        !formData.competency_ratings[comp.code]?.milestone
      )
      if (missingCompetencies.length > 0) {
        newErrors.competency_ratings = `Missing ratings for: ${missingCompetencies.map(c => c.code).join(', ')}`
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSaveDraft = async () => {
    if (!report) return

    try {
      setSaving(true)
      await saveProgressReportDraft(report.id, formData)
      // Note: onSave callback not called for auto-save
    } catch (error) {
      console.error('Failed to save draft:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      setSaving(true)
      if (report) {
        // Update existing report
        const updatedReport = await updateProgressReport(report.id, formData)
        const submittedReport = await submitProgressReport(report.id)
        onSave?.(submittedReport)
      } else {
        // Create new report
        const newReport = await createProgressReport({
          ...formData,
          report_config: reportConfig.id
        })
        const submittedReport = await submitProgressReport(newReport.id)
        onSave?.(submittedReport)
      }
    } catch (error) {
      console.error('Failed to submit report:', error)
    } finally {
      setSaving(false)
    }
  }

  const getCompletionPercentage = () => {
    const totalFields = 4 + (reportConfig.requires_all_competencies ? competencies.length : 0)
    let completedFields = 0

    // Check competency ratings
    if (reportConfig.requires_all_competencies) {
      completedFields += Object.keys(formData.competency_ratings).length
    }

    // Check reflection fields
    if (formData.achievements) completedFields++
    if (formData.challenges) completedFields++
    if (formData.learning_goals) completedFields++
    if (formData.support_needed) completedFields++

    return Math.round((completedFields / totalFields) * 100)
  }

  const getCompetencyProgress = (competencyCode: string) => {
    return competencyProgress.find(cp => cp.competency === competencyCode)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{reportConfig.report_label}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{reportConfig.instructions}</p>
            </div>
            <div className="flex items-center gap-2">
              {saving && <Badge variant="outline">Saving...</Badge>}
              <Badge variant={report?.status === 'DRAFT' ? 'secondary' : 'default'}>
                {report?.status || 'DRAFT'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Completion Progress</span>
              <span>{getCompletionPercentage()}%</span>
            </div>
            <Progress value={getCompletionPercentage()} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Report Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="reporting_period_start">Reporting Period Start</Label>
            <Input
              id="reporting_period_start"
              type="date"
              value={formData.reporting_period_start}
              onChange={(e) => handleInputChange('reporting_period_start', e.target.value)}
              className={errors.reporting_period_start ? 'border-red-500' : ''}
            />
            {errors.reporting_period_start && (
              <p className="text-sm text-red-500 mt-1">{errors.reporting_period_start}</p>
            )}
          </div>
          <div>
            <Label htmlFor="reporting_period_end">Reporting Period End</Label>
            <Input
              id="reporting_period_end"
              type="date"
              value={formData.reporting_period_end}
              onChange={(e) => handleInputChange('reporting_period_end', e.target.value)}
              className={errors.reporting_period_end ? 'border-red-500' : ''}
            />
            {errors.reporting_period_end && (
              <p className="text-sm text-red-500 mt-1">{errors.reporting_period_end}</p>
            )}
          </div>
          <div>
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => handleInputChange('due_date', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Competency Self-Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Competency Self-Assessment
          </CardTitle>
          <p className="text-sm text-gray-600">
            Rate your current milestone level for each competency and provide reflective commentary.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {competencies.map((competency) => {
            const progress = getCompetencyProgress(competency.code)
            const rating = formData.competency_ratings[competency.code] || { milestone: '', reflection: '' }
            
            return (
              <div key={competency.code} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{competency.code}: {competency.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{competency.description}</p>
                  </div>
                  {progress && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Eye className="h-4 w-4" />
                      <span>{progress.evidence_count} evidence items</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`${competency.code}-milestone`}>Current Milestone Level</Label>
                    <Select
                      value={rating.milestone}
                      onValueChange={(value) => handleCompetencyChange(competency.code, 'milestone', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select milestone level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M1">M1 - {competency.milestones.M1}</SelectItem>
                        <SelectItem value="M2">M2 - {competency.milestones.M2}</SelectItem>
                        <SelectItem value="M3">M3 - {competency.milestones.M3}</SelectItem>
                        <SelectItem value="M4">M4 - {competency.milestones.M4}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`${competency.code}-reflection`}>Reflection</Label>
                    <Textarea
                      id={`${competency.code}-reflection`}
                      placeholder="Reflect on your development in this competency area..."
                      value={rating.reflection}
                      onChange={(e) => handleCompetencyChange(competency.code, 'reflection', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )
          })}
          
          {errors.competency_ratings && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errors.competency_ratings}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Overall Reflections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Overall Reflections
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="achievements">Key Achievements</Label>
            <Textarea
              id="achievements"
              placeholder="Describe your key achievements during this reporting period..."
              value={formData.achievements}
              onChange={(e) => handleInputChange('achievements', e.target.value)}
              rows={4}
            />
          </div>
          
          <div>
            <Label htmlFor="challenges">Challenges Faced</Label>
            <Textarea
              id="challenges"
              placeholder="Describe any challenges you faced and how you addressed them..."
              value={formData.challenges}
              onChange={(e) => handleInputChange('challenges', e.target.value)}
              rows={4}
            />
          </div>
          
          <div>
            <Label htmlFor="learning_goals">Learning Goals</Label>
            <Textarea
              id="learning_goals"
              placeholder="What are your learning goals for the next period?"
              value={formData.learning_goals}
              onChange={(e) => handleInputChange('learning_goals', e.target.value)}
              rows={4}
            />
          </div>
          
          <div>
            <Label htmlFor="support_needed">Support Needed</Label>
            <Textarea
              id="support_needed"
              placeholder="What support or resources do you need to achieve your goals?"
              value={formData.support_needed}
              onChange={(e) => handleInputChange('support_needed', e.target.value)}
              rows={4}
            />
          </div>
          
          <div>
            <Label htmlFor="additional_comments">Additional Comments</Label>
            <Textarea
              id="additional_comments"
              placeholder="Any additional comments or reflections..."
              value={formData.additional_comments}
              onChange={(e) => handleInputChange('additional_comments', e.target.value)}
              rows={3}
              className="placeholder:text-gray-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {reportConfig.allows_draft && report?.status === 'DRAFT' && (
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={saving || !validateForm()}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {report ? 'Update & Submit' : 'Create & Submit'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ProgressReportForm
