export interface PDEntry {
  id: number
  activity_type: string
  date_of_activity: string
  duration_minutes: number
  is_active_activity: boolean
  activity_details: string
  topics_covered: string
  competencies_covered: string[]
  week_starting: string
  reflection?: string
  reviewed_in_supervision?: boolean
  supervisor_initials?: string
  duration_display: string
  duration_hours_minutes: string
  created_at: string
  updated_at: string
}

export interface PDCompetency {
  id: number
  name: string
  description: string
  is_active: boolean
}

export interface PDWeeklyGroup {
  week_starting: string
  week_total_display: string
  cumulative_total_display: string
  entries: PDEntry[]
}

export interface PDMetrics {
  total_pd_hours: string
  current_week_pd_hours: string
  total_pd_minutes: number
  current_week_pd_minutes: number
}
