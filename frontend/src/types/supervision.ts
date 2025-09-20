export interface SupervisionEntry {
  id: number
  date_of_supervision: string
  supervisor_name: string
  supervisor_type: 'PRINCIPAL' | 'SECONDARY'
  supervision_type: 'INDIVIDUAL' | 'GROUP' | 'OTHER'
  duration_minutes: number
  summary: string
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
