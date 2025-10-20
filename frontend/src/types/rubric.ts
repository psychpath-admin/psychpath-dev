export interface Competency {
  id: number
  code: string
  title: string
  description: string
  descriptors: Record<string, string>
  order: number
  is_active: boolean
  epa_count: number
}

export interface EPA {
  id: number
  code: string
  title: string
  description: string
  competency: Competency
  descriptors: number[]
  order: number
  milestones: Milestone[]
}

export interface Milestone {
  id: number
  epa: EPA
  code: string
  level: number
  label: string
  description: string
}

export interface RubricCriterion {
  criterion_id: string
  criterion_label: string
  descriptor_L1: string
  descriptor_L2: string
  descriptor_L3: string
  descriptor_L4: string
}

export interface Rubric {
  id: string
  epa: EPA
  milestone: Milestone
  competency: Competency
  criteria: RubricCriterion[]
  weightings: Record<string, number>
  guidance_notes: string
  is_active: boolean
  total_weight: number
}

export interface RubricScore {
  id: string
  rubric: string
  criterion_id: string
  criterion_label: string
  selected_level: number
  notes: string
  supervisee_name: string
  supervisor_name: string
  created_at: string
  updated_at: string
}

export interface RubricSummary {
  id: string
  epa: EPA
  rubric: Rubric
  supervisee_name: string
  supervisor_name: string
  total_weighted_score: number
  milestone_equivalent: number
  summary_comment: string
  status: 'draft' | 'submitted' | 'approved'
  locked: boolean
  evidence_links: string[]
  scores: RubricScore[]
  created_at: string
  approved_at: string | null
}

// API Request/Response types
export interface RubricScoreCreateRequest {
  rubric: string
  supervisee: number
  criterion_id: string
  criterion_label: string
  selected_level: number
  notes?: string
}

export interface RubricSummaryCreateRequest {
  epa: number
  rubric: string
  supervisee: number
  summary_comment: string
  evidence_links?: string[]
}

export interface RubricScoreUpdateRequest {
  selected_level?: number
  notes?: string
}

// UI Component Props
export interface CompetencyCardProps {
  competency: Competency
  avgLevel?: number
  entrustedCount?: string
  color?: string
  onClick?: () => void
}

export interface RubricScoringTableProps {
  rubric: Rubric
  superviseeId: number
  existingScores?: RubricScore[]
  onScoreChange?: (criterionId: string, level: number, notes: string) => void
  readonly?: boolean
}

export interface RubricSummaryCardProps {
  summary: RubricSummary
  showDetails?: boolean
  onEdit?: () => void
}

export interface EPARubricModalProps {
  isOpen: boolean
  onClose: () => void
  epa: EPA
  superviseeId: number
  rubric?: Rubric
  existingSummary?: RubricSummary
}

// Progress tracking types
export interface CompetencyProgress {
  competency: Competency
  totalEPAs: number
  completedEPAs: number
  averageLevel: number
  entrustedCount: number
  lastEvaluation?: string
}

export interface EPAProgress {
  epa: EPA
  currentLevel: number
  status: 'not_started' | 'in_progress' | 'competent' | 'entrusted'
  lastEvaluation?: RubricSummary
  nextMilestone?: Milestone
}

// Dashboard data types
export interface SuperviseeRubricOverview {
  supervisee: {
    id: number
    name: string
    email: string
  }
  competencyProgress: CompetencyProgress[]
  totalEvaluations: number
  lastEvaluation?: string
}

export interface MyRubricProgress {
  summaries: RubricSummary[]
  competencyBreakdown: Record<string, {
    total: number
    completed: number
    averageLevel: number
  }>
  recentEvaluations: RubricSummary[]
}
