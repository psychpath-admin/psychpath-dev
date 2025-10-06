export interface ProgramSummary {
  role: string
  program_type: string
  requirements: ProgramRequirements
  progress: ProgramProgress
  pace_estimates: PaceEstimates
  alerts: ProgramAlert[]
  profile_data: ProfileData
}

export interface ProgramRequirements {
  total_hours?: number
  dcc_hours?: number
  max_simulated_dcc_hours?: number
  supervision_hours?: number
  pd_hours?: number
  min_weeks?: number
  weekly_commitment_guideline?: number
  // Registrar-specific fields
  duration_weeks?: number
  practice_hours?: number
}

export interface ProgramProgress {
  dcc_hours: number
  cra_hours: number
  pd_hours: number
  supervision_hours: number
  simulated_dcc_hours: number
  total_practice_hours: number
  total_hours: number
}

export interface PaceEstimates {
  estimated_completion: string | null
  weeks_remaining: number | null
  on_pace: boolean | null
  expected_hours: number
  actual_hours: number
  pace_ratio: number | null
}

export interface ProgramAlert {
  type: 'warning' | 'error' | 'info'
  message: string
  category: string
}

export interface ProfileData {
  aope: string | null
  qualification_level: string | null
  start_date: string | null
  target_weeks: number | null
  weekly_commitment: number | null
}

