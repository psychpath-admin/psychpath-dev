// Registrar AoPE Program Types

export interface RegistrarProfile {
  id: number
  user: number
  aope_area: string
  program_track: 'TRACK_1' | 'TRACK_2' | 'TRACK_3'
  enrollment_date: string
  expected_completion_date: string
  fte_fraction: number
  principal_supervisor: number
  secondary_supervisor?: number
  status: 'ACTIVE' | 'COMPLETED' | 'SUSPENDED' | 'WITHDRAWN'
  direct_contact_requirement: number
  board_variation_enabled: boolean
  board_variation_doc?: string
  total_weeks_required: number
  supervision_hours_required: number
  cpd_hours_required: number
  created_at: string
  updated_at: string
}

export interface PracticeLog {
  id: number
  registrar: number
  date: string
  duration_hours: number
  practice_type: 'ASSESSMENT' | 'INTERVENTION' | 'CONSULTATION' | 'RESEARCH' | 'ADMINISTRATION' | 'OTHER'
  activity_description: string
  setting: string
  aope_alignment: string[]
  competencies: string[]
  reflection_text?: string
  supervisor_reviewed: boolean
  supervisor_feedback?: string
  reviewed_by?: number
  reviewed_at?: string
  created_at: string
  updated_at: string
}

export interface CPDActivity {
  id: number
  registrar: number
  title: string
  provider: string
  date: string
  duration_hours: number
  activity_type: 'WORKSHOP' | 'CONFERENCE' | 'COURSE' | 'SUPERVISION' | 'PEER_CONSULTATION' | 'RESEARCH' | 'OTHER'
  is_active: boolean
  supervisor_set_task: boolean
  aope_alignment: string[]
  is_peer_consultation: boolean
  learning_objectives: string[]
  competencies: string[]
  reflection?: string
  evidence_file?: string
  supervisor_approval: boolean
  approved_by?: number
  approved_at?: string
  supervisor_notes?: string
  created_at: string
  updated_at: string
}

export interface LeaveRecord {
  id: number
  registrar: number
  leave_type: 'ANNUAL' | 'SICK' | 'MATERNITY' | 'PATERNITY' | 'STUDY' | 'OTHER'
  start_date: string
  end_date: string
  duration_days: number
  approved_by_supervisor: boolean
  approved_by?: number
  approved_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface ProgressReport {
  id: number
  registrar: number
  report_type: 'MIDPOINT' | 'FINAL'
  competency_ratings: Record<string, 'M1' | 'M2' | 'M3' | 'M4'>
  supervisor_feedback: string
  action_plan: string
  registrar_signature?: string
  supervisor_signature?: string
  signed_at?: string
  is_signed: boolean
  created_at: string
  updated_at: string
}

export interface EndorsementApplication {
  id: number
  registrar: number
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'
  submission_date?: string
  completion_date?: string
  total_hours: number
  supervision_summary: string
  cpd_summary: string
  competency_attestation: Record<string, 'M1' | 'M2' | 'M3' | 'M4'>
  supervisor_declaration: string
  registrar_declaration: string
  exported_pdf_path?: string
  created_at: string
  updated_at: string
}

export interface ObservationRecord {
  id: number
  registrar: number
  supervision_session?: number
  observation_date: string
  method: 'IN_PERSON' | 'VIDEO' | 'AUDIO' | 'LIVE_STREAM'
  consent_confirmed: boolean
  privacy_confirmed: boolean
  feedback_text: string
  supervisor: number
  created_at: string
  updated_at: string
}

export interface ProgramConfig {
  track: string
  duration_years: number
  supervision_hours_required: number
  cpd_hours_required: number
  total_hours_required: number
  direct_contact_annual_hours: number
  short_session_rules: {
    max_hours: number
    threshold_minutes: number
  }
  supervision_rules: {
    principal_min_percentage: number
    individual_min_percentage: number
    direct_supervision_hours_per_fte: number
  }
  observation_rules: {
    frequency_days: number
    warning_days: number
  }
}

export interface DashboardStats {
  total_hours: number
  total_hours_required: number
  direct_contact_hours_this_year: number
  direct_contact_required: number
  supervision_hours: number
  supervision_required: number
  cpd_hours: number
  cpd_required: number
  weeks_elapsed: number
  weeks_required: number
  supervision_composition: {
    principal_percent: number
    secondary_percent: number
  }
  supervision_delivery: {
    individual_percent: number
    group_percent: number
  }
  short_session_stats: {
    hours: number
    max_hours: number
    percentage: number
    warning_threshold_reached: boolean
    limit_exceeded: boolean
  }
  last_observation_date: string | null
  days_since_observation: number
  next_observation_due: string
  reflection_completion_rate: number
  traffic_lights: {
    overall: 'red' | 'amber' | 'green'
    direct_contact: 'red' | 'amber' | 'green'
    supervision: 'red' | 'amber' | 'green'
    observation: 'red' | 'amber' | 'green'
    cpd: 'red' | 'amber' | 'green'
  }
}

export interface CompetencyEvidence {
  practice_log_count: number
  cpd_count: number
  supervision_count: number
}

export interface CompetencyRating {
  competency: string // C1-C8
  level: 'M1' | 'M2' | 'M3' | 'M4' | null
  evidence: CompetencyEvidence
  progress_report_rating?: 'M1' | 'M2' | 'M3' | 'M4'
}

export interface SupervisorProfile {
  id: number
  name: string
  email: string
  can_supervise_registrars: boolean
  aope_endorsements: string[]
  years_experience: number
}

export interface EnrollmentFormData {
  aope_area: string
  program_track: 'TRACK_1' | 'TRACK_2' | 'TRACK_3'
  fte_fraction: number
  principal_supervisor: number
  secondary_supervisor?: number
  enrollment_date: string
  expected_completion_date: string
  board_variation_enabled: boolean
  board_variation_doc?: File
}

export interface TrackRequirements {
  track: string
  duration_years: number
  fte_fraction: number
  weeks_required: number
  supervision_hours_required: number
  cpd_hours_required: number
  total_hours_required: number
  direct_contact_annual_hours: number
  short_session_rules: {
    max_hours: number
    threshold_minutes: number
  }
  supervision_rules: {
    principal_min_percentage: number
    individual_min_percentage: number
    direct_supervision_hours_per_fte: number
  }
  observation_rules: {
    frequency_days: number
    warning_days: number
  }
}

// AHPRA Area of Practice Endorsement choices
export const AOPE_CHOICES = [
  { value: 'CLINICAL', label: 'Clinical Psychology' },
  { value: 'COUNSELLING', label: 'Counselling Psychology' },
  { value: 'EDUCATIONAL_DEVELOPMENTAL', label: 'Educational and Developmental Psychology' },
  { value: 'FORENSIC', label: 'Forensic Psychology' },
  { value: 'HEALTH', label: 'Health Psychology' },
  { value: 'NEUROPSYCHOLOGY', label: 'Neuropsychology' },
  { value: 'ORGANISATIONAL', label: 'Organisational Psychology' },
  { value: 'SPORT_EXERCISE', label: 'Sport and Exercise Psychology' },
  { value: 'COMMUNITY', label: 'Community Psychology' },
]

// Program track choices
export const TRACK_CHOICES = [
  { value: 'TRACK_1', label: 'Track 1: 2 years FTE', description: 'For those with extensive prior experience' },
  { value: 'TRACK_2', label: 'Track 2: 3 years FTE', description: 'Standard track for most registrars' },
  { value: 'TRACK_3', label: 'Track 3: 4 years FTE', description: 'Extended track for those with limited experience' },
]

// Practice type choices
export const PRACTICE_TYPE_CHOICES = [
  { value: 'ASSESSMENT', label: 'Assessment' },
  { value: 'INTERVENTION', label: 'Intervention' },
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'RESEARCH', label: 'Research' },
  { value: 'ADMINISTRATION', label: 'Administration' },
  { value: 'OTHER', label: 'Other' },
]

// CPD activity type choices
export const CPD_ACTIVITY_TYPE_CHOICES = [
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'CONFERENCE', label: 'Conference' },
  { value: 'COURSE', label: 'Course' },
  { value: 'SUPERVISION', label: 'Supervision' },
  { value: 'PEER_CONSULTATION', label: 'Peer Consultation' },
  { value: 'RESEARCH', label: 'Research' },
  { value: 'OTHER', label: 'Other' },
]

// Leave type choices
export const LEAVE_TYPE_CHOICES = [
  { value: 'ANNUAL', label: 'Annual Leave' },
  { value: 'SICK', label: 'Sick Leave' },
  { value: 'MATERNITY', label: 'Maternity Leave' },
  { value: 'PATERNITY', label: 'Paternity Leave' },
  { value: 'STUDY', label: 'Study Leave' },
  { value: 'OTHER', label: 'Other' },
]

// Competency choices (C1-C8)
export const COMPETENCY_CHOICES = [
  { value: 'C1', label: 'C1: Applies and builds scientific knowledge of psychology' },
  { value: 'C2', label: 'C2: Practices ethically and professionally' },
  { value: 'C3', label: 'C3: Exercises professional reflexivity, purposeful and deliberate practice, and self-care' },
  { value: 'C4', label: 'C4: Conducts psychological assessment' },
  { value: 'C5', label: 'C5: Conducts psychological intervention' },
  { value: 'C6', label: 'C6: Communicates and relates to others effectively and appropriately' },
  { value: 'C7', label: 'C7: Demonstrates a health equity and human rights approach with people from diverse groups' },
  { value: 'C8', label: 'C8: Demonstrates a health equity and human rights approach with Aboriginal and Torres Strait Islander peoples, families, and communities' },
]

// Milestone level choices
export const MILESTONE_LEVEL_CHOICES = [
  { value: 'M1', label: 'M1: Beginning' },
  { value: 'M2', label: 'M2: Developing' },
  { value: 'M3', label: 'M3: Proficient' },
  { value: 'M4', label: 'M4: Advanced' },
]
