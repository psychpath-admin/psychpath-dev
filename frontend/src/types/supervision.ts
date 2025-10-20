export interface SupervisionEntry {
  id: number
  date_of_supervision: string
  supervisor_name: string
  supervisor_type: 'PRINCIPAL' | 'SECONDARY'
  supervision_type: 'INDIVIDUAL' | 'GROUP' | 'OTHER'
  supervision_medium: 'IN_PERSON' | 'VIDEO' | 'PHONE' | 'ASYNC'
  supervisor_initials?: string
  is_short_session: boolean
  supervision_mode: 'CLINICAL' | 'PROFESSIONAL' | 'ADMINISTRATIVE'
  is_cultural_supervision: boolean
  supervisor_is_board_approved: boolean
  duration_minutes: number
  summary: string
  locked: boolean
  supervisor_comment?: string
  trainee_response?: string
  week_starting: string
  duration_display: string
  duration_hours_minutes: string
  created_at: string
  updated_at: string
}

export interface SupervisionWeeklyGroup {
  id: number
  week_starting: string
  week_total_minutes: number
  cumulative_total_minutes: number
  week_total_display: string
  cumulative_total_display: string
  entries: SupervisionEntry[]
  created_at: string
  updated_at: string
}

export interface SupervisionMetrics {
  total_supervision_hours: string
  current_week_supervision_hours: string
  total_supervision_minutes: number
  current_week_supervision_minutes: number
}

export interface ShortSessionStats {
  short_session_hours: number
  short_session_minutes: number
  limit_hours: number
  remaining_hours: number
  percentage_used: number
  warning_threshold_reached: boolean
  limit_exceeded: boolean
}
