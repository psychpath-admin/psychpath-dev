export interface ProgressReportConfig {
  id: number
  program_type: string
  report_type: string
  report_label: string
  trigger_condition: {
    type: 'percentage' | 'months' | 'date'
    value: number
  }
  due_offset_days: number
  is_required: boolean
  allows_draft: boolean
  requires_all_competencies: boolean
  supervisor_approval_required: boolean
  can_request_revision: boolean
  instructions: string
}

export interface ProgressReport {
  id: number
  trainee: number
  trainee_name: string
  supervisor: number | null
  supervisor_name: string
  report_config: ProgressReportConfig
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REQUIRES_REVISION'
  reporting_period_start: string
  reporting_period_end: string
  submission_date: string | null
  due_date: string
  is_overdue: boolean
  can_be_edited: boolean
  can_be_submitted: boolean
  
  // Competency ratings (C1-C8)
  competency_ratings: {
    [key: string]: {
      milestone: 'M1' | 'M2' | 'M3' | 'M4'
      reflection: string
    }
  }
  
  // Overall reflections
  achievements: string
  challenges: string
  learning_goals: string
  support_needed: string
  additional_comments: string
  
  // Supervisor review (read-only for trainees)
  supervisor_comments: string
  supervisor_recommendations: string
  competency_feedback: { [key: string]: string }
  reviewed_at: string | null
  
  created_at: string
  updated_at: string
}

export interface ProgressReportList {
  id: number
  trainee: number
  trainee_name: string
  supervisor: number | null
  supervisor_name: string
  report_config: number
  report_config_label: string
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REQUIRES_REVISION'
  reporting_period_start: string
  reporting_period_end: string
  submission_date: string | null
  due_date: string
  is_overdue: boolean
  can_be_edited: boolean
  created_at: string
  updated_at: string
}

export interface ProgressReportDashboardStats {
  // For trainees
  draft_reports?: number
  submitted_reports?: number
  approved_reports?: number
  overdue_reports?: number
  
  // For supervisors
  pending_reviews?: number
  overdue_reviews?: number
}

export interface CompetencyMilestone {
  code: string
  name: string
  description: string
  milestones: {
    M1: string
    M2: string
    M3: string
    M4: string
  }
}

export interface CompetencyProgress {
  competency: string
  current_milestone: 'M1' | 'M2' | 'M3' | 'M4' | null
  evidence_count: number
  progress_percentage: number
}
