// CPD Portfolio Types for All Psychologists

export interface CPDCategory {
  id: number
  name: string
  description: string
  is_active: boolean
  created_at: string
}

export interface CPDActivity {
  id: number
  user: number
  user_name: string
  user_email: string
  user_profile: number
  title: string
  activity_type: CPDActivityType
  category: number | null
  category_name?: string
  description: string
  activity_date: string
  duration_hours: number
  delivery_mode: CPDDeliveryMode
  learning_outcomes: string
  skills_developed: string
  application_to_practice: string
  evidence_type: CPDEvidenceType
  evidence_description: string
  evidence_file: string | null
  evidence_file_url?: string | null
  is_active_cpd: boolean
  is_peer_consultation: boolean
  is_supervision: boolean
  professional_areas: string[]
  competencies_addressed: string[]
  quality_rating: number | null
  reflection: string
  status: CPDStatus
  reviewer: number | null
  reviewer_comments: string
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface CPDPlan {
  id: number
  user: number
  user_name: string
  user_profile: number
  year: number
  title: string
  description: string
  learning_goals: string
  professional_areas: string[]
  competencies_to_develop: string[]
  total_hours_planned: number
  active_cpd_hours_planned: number
  peer_consultation_hours_planned: number
  status: CPDPlanStatus
  submitted_at: string | null
  approved_at: string | null
  approved_by: number | null
  approved_by_name?: string
  total_hours_completed: number
  active_cpd_hours_completed: number
  peer_consultation_hours_completed: number
  progress_percentage: number
  active_cpd_percentage: number
  created_at: string
  updated_at: string
}

export interface CPDRequirement {
  id: number
  role: string
  year: number
  total_hours_required: number
  active_cpd_percentage: number
  peer_consultation_hours: number
  requires_plan_approval: boolean
  requires_evidence: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CPDComplianceReport {
  id: number
  user: number
  user_name: string
  user_profile: number
  year: number
  report_period_start: string
  report_period_end: string
  total_hours_completed: number
  active_cpd_hours: number
  peer_consultation_hours: number
  total_hours_required: number
  active_cpd_percentage_required: number
  peer_consultation_hours_required: number
  is_compliant: boolean
  compliance_notes: string
  status: CPDReportStatus
  submitted_at: string | null
  approved_at: string | null
  approved_by: number | null
  approved_by_name?: string
  created_at: string
  updated_at: string
}

export interface CPDDashboardStats {
  current_year: number
  total_hours_current_year: number
  active_cpd_hours_current_year: number
  peer_consultation_hours_current_year: number
  total_hours_required: number
  active_cpd_percentage_required: number
  peer_consultation_hours_required: number
  progress_percentage: number
  active_cpd_percentage: number
  peer_consultation_progress_percentage: number
  is_compliant: boolean
  compliance_status: 'compliant' | 'warning' | 'non_compliant'
  recent_activities_count: number
  pending_activities_count: number
  alerts: string[]
  has_approved_plan: boolean
  plan_status: string
}

export interface CPDActivitySummary {
  id: number
  title: string
  activity_type: CPDActivityType
  activity_date: string
  duration_hours: number
  is_active_cpd: boolean
  is_peer_consultation: boolean
  status: CPDStatus
  quality_rating: number | null
  created_at: string
}

// Enums
export type CPDActivityType = 
  | 'FORMAL_LEARNING'
  | 'PEER_CONSULTATION'
  | 'SUPERVISION'
  | 'RESEARCH'
  | 'TEACHING'
  | 'PROFESSIONAL_DEVELOPMENT'
  | 'CONFERENCE'
  | 'ONLINE_LEARNING'
  | 'READING'
  | 'OTHER'

export type CPDDeliveryMode = 
  | 'FACE_TO_FACE'
  | 'ONLINE'
  | 'HYBRID'
  | 'SELF_DIRECTED'
  | 'GROUP'
  | 'INDIVIDUAL'

export type CPDEvidenceType = 
  | 'CERTIFICATE'
  | 'ATTENDANCE_RECORD'
  | 'REFLECTION'
  | 'ASSESSMENT'
  | 'PORTFOLIO'
  | 'OTHER'

export type CPDStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'REQUIRES_REVISION'

export type CPDPlanStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'

export type CPDReportStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'NON_COMPLIANT'

// Helper functions
export const getActivityTypeLabel = (type: CPDActivityType): string => {
  const labels: Record<CPDActivityType, string> = {
    'FORMAL_LEARNING': 'Formal Learning',
    'PEER_CONSULTATION': 'Peer Consultation',
    'SUPERVISION': 'Supervision',
    'RESEARCH': 'Research',
    'TEACHING': 'Teaching/Training',
    'PROFESSIONAL_DEVELOPMENT': 'Professional Development',
    'CONFERENCE': 'Conference/Workshop',
    'ONLINE_LEARNING': 'Online Learning',
    'READING': 'Professional Reading',
    'OTHER': 'Other',
  }
  return labels[type] || type
}

export const getDeliveryModeLabel = (mode: CPDDeliveryMode): string => {
  const labels: Record<CPDDeliveryMode, string> = {
    'FACE_TO_FACE': 'Face-to-Face',
    'ONLINE': 'Online',
    'HYBRID': 'Hybrid',
    'SELF_DIRECTED': 'Self-Directed',
    'GROUP': 'Group',
    'INDIVIDUAL': 'Individual',
  }
  return labels[mode] || mode
}

export const getEvidenceTypeLabel = (type: CPDEvidenceType): string => {
  const labels: Record<CPDEvidenceType, string> = {
    'CERTIFICATE': 'Certificate',
    'ATTENDANCE_RECORD': 'Attendance Record',
    'REFLECTION': 'Reflection',
    'ASSESSMENT': 'Assessment',
    'PORTFOLIO': 'Portfolio',
    'OTHER': 'Other',
  }
  return labels[type] || type
}

export const getStatusLabel = (status: CPDStatus): string => {
  const labels: Record<CPDStatus, string> = {
    'DRAFT': 'Draft',
    'SUBMITTED': 'Submitted',
    'APPROVED': 'Approved',
    'REJECTED': 'Rejected',
    'REQUIRES_REVISION': 'Requires Revision',
  }
  return labels[status] || status
}

export const getComplianceStatusColor = (status: 'compliant' | 'warning' | 'non_compliant'): string => {
  const colors = {
    'compliant': 'text-green-600 bg-green-50 border-green-200',
    'warning': 'text-yellow-600 bg-yellow-50 border-yellow-200',
    'non_compliant': 'text-red-600 bg-red-50 border-red-200',
  }
  return colors[status] || colors.non_compliant
}
