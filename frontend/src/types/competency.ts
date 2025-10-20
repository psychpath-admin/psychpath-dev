export interface CompetencyDefinition {
  id: number
  code: string  // C1-C8
  name: string
  description: string
  order: number
}

export interface CompetencyEvidence {
  id: number
  trainee: number
  competency: number
  competency_code: string
  competency_name: string
  trainee_name: string
  evidence_type: 'SECTION_A' | 'SECTION_B' | 'SECTION_C' | 'PRACTICE_LOG' | 'MANUAL'
  section_a_entry?: number
  section_b_entry?: number
  section_c_entry?: number
  date: string
  description: string
  milestone_level: 'M1' | 'M2' | 'M3' | 'M4'
  reflection: string
  supervisor_validated: boolean
  supervisor_comment?: string
  validated_by_name?: string
  suggested_by_epa?: string
  created_at: string
}

export interface CompetencyRating {
  id: number
  trainee: number
  competency: number
  competency_code: string
  competency_name: string
  trainee_name: string
  current_milestone: string
  evidence_count: number
  last_updated: string
}

export interface CompetencyProgress {
  competency_code: string
  competency_name: string
  current_milestone: string
  evidence_count: number
  last_updated: string
  m1_count: number
  m2_count: number
  m3_count: number
  m4_count: number
}
