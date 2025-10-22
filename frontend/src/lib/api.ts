const API_URL = import.meta.env.VITE_API_URL || ''

function getAccessToken() {
  return localStorage.getItem('accessToken')
}

function getRefreshToken() {
  return localStorage.getItem('refreshToken')
}

export function logout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

async function refreshToken() {
  const refresh = getRefreshToken()
  if (!refresh) return false
  const res = await fetch(`${API_URL}/api/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
  if (!res.ok) {
    logout()
    return false
  }
  const data = await res.json()
  if (data?.access) {
    localStorage.setItem('accessToken', data.access)
    return true
  }
  return false
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getAccessToken()
  const isFormData = options?.body instanceof FormData
  const baseHeaders: Record<string, string> = { ...(options.headers as any) }
  // Only set Content-Type for non-FormData payloads; browser will set boundary for FormData
  if (!isFormData && !baseHeaders['Content-Type']) {
    baseHeaders['Content-Type'] = 'application/json'
  }
  if (token) baseHeaders['Authorization'] = `Bearer ${token}`

  let res = await fetch(`${API_URL}${path}`, { ...options, headers: baseHeaders })
  console.log('Initial response:', res.status, res.ok, path)
  if (res.status === 401 && getRefreshToken()) {
    console.log('401 error, attempting token refresh for:', path)
    const ok = await refreshToken()
    console.log('Token refresh result:', ok)
    if (ok) {
      const newToken = getAccessToken()
      console.log('New token obtained:', !!newToken)
      const retryHeaders = { ...baseHeaders }
      if (newToken) retryHeaders['Authorization'] = `Bearer ${newToken}`
      res = await fetch(`${API_URL}${path}`, { ...options, headers: retryHeaders })
      console.log('Retry response:', res.status, res.ok)
    } else {
      console.log('Token refresh failed, logging out')
      logout()
    }
  } else if (res.status === 401) {
    console.log('401 error but no refresh token available, logging out')
    logout()
  }
  return res
}

// Registrar Logbook APIs
export type RegistrarWeek = {
  id: number
  week_starting: string
  status: 'draft' | 'submitted' | 'returned'
  dcc_minutes: number
  cra_minutes: number
  pd_minutes: number
}

export type RegistrarEntry = {
  id: number
  week: number
  date: string
  duration_minutes: number
  category: 'direct_client_contact' | 'client_related_activity' | 'professional_development'
  short_description: string
  reflection: string
  aope?: string
}

export async function getRegistrarWeeks(): Promise<RegistrarWeek[]> {
  const res = await apiFetch('/api/registrar/weeks/')
  if (!res.ok) throw new Error('Failed to fetch registrar weeks')
  return res.json()
}

export async function createRegistrarWeek(payload: { week_starting: string }): Promise<RegistrarWeek> {
  const res = await apiFetch('/api/registrar/weeks/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to create week')
  return res.json()
}

export async function submitRegistrarWeek(weekId: number) {
  const res = await apiFetch(`/api/registrar/weeks/${weekId}/submit/`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to submit week')
  return res.json()
}

export async function getRegistrarStats(): Promise<{ pd_this_year_hours: number; pd_required_hours: number; meets_pd_requirement: boolean }> {
  const res = await apiFetch('/api/registrar/weeks/stats/')
  if (!res.ok) throw new Error('Failed to fetch registrar stats')
  return res.json()
}

export async function getRegistrarEntries(): Promise<RegistrarEntry[]> {
  const res = await apiFetch('/api/registrar/entries/')
  if (!res.ok) throw new Error('Failed to fetch registrar entries')
  return res.json()
}

export async function createRegistrarEntry(payload: Partial<RegistrarEntry> & { duration_hours?: number }) {
  const res = await apiFetch('/api/registrar/entries/', { method: 'POST', body: JSON.stringify(payload) })
  if (!res.ok) throw new Error('Failed to create entry')
  return res.json()
}

export { API_URL }

// Auth functions
export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: email, password }),
  })
  if (!res.ok) throw new Error('Login failed')
  const data = await res.json()
  localStorage.setItem('accessToken', data.access)
  localStorage.setItem('refreshToken', data.refresh)
  return data
}

export async function register(email: string, password: string, role: string, organization?: string) {
  const res = await fetch(`${API_URL}/api/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role, organization }),
  })
  if (!res.ok) throw new Error('Registration failed')
  return res.json()
}

export async function getMe() {
  const res = await apiFetch('/api/me/')
  if (!res.ok) throw new Error('Failed to get user info')
  return res.json()
}

export async function updateSignature(signature?: string, initials?: string) {
  const body: any = {}
  if (signature) body.signature = signature
  if (initials) body.initials = initials
  
  const res = await apiFetch('/api/user-profile/update-signature/', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  
  if (!res.ok) throw new Error('Failed to update signature')
  return res.json()
}

// Logbook functions
export async function getLogbooks() {
  const res = await apiFetch('/api/logbook/logbooks/')
  if (!res.ok) throw new Error('Failed to fetch logbooks')
  return res.json()
}

export async function getLogbook(id: number) {
  const res = await apiFetch(`/api/logbook/logbooks/${id}/`)
  if (!res.ok) throw new Error('Failed to fetch logbook')
  return res.json()
}

export async function createLogbook(data: any) {
  const res = await apiFetch('/api/logbook/logbooks/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create logbook')
  return res.json()
}

export async function updateLogbook(id: number, data: any) {
  const res = await apiFetch(`/api/logbook/logbooks/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update logbook')
  return res.json()
}

export async function submitLogbook(id: number, comments?: string) {
  const res = await apiFetch(`/api/logbook/logbooks/${id}/submit/`, {
    method: 'POST',
    body: JSON.stringify({ comments }),
  })
  if (!res.ok) throw new Error('Failed to submit logbook')
  return res.json()
}

export async function approveLogbook(id: number, action: 'approve' | 'reject', comments?: string) {
  const res = await apiFetch(`/api/logbook/logbooks/${id}/approve/`, {
    method: 'POST',
    body: JSON.stringify({ action, comments }),
  })
  if (!res.ok) throw new Error('Failed to approve/reject logbook')
  return res.json()
}

export async function downloadLogbookPDF(id: number) {
  const res = await apiFetch(`/api/logbook/logbooks/${id}/download_pdf/`)
  if (!res.ok) throw new Error('Failed to download PDF')
  return res.blob()
}

// Logbook entry functions
export async function getLogbookEntries(logbookId: number, type: 'dcc' | 'cra' | 'pd' | 'sup') {
  const res = await apiFetch(`/api/logbook/logbooks/${logbookId}/${type}-entries/`)
  if (!res.ok) throw new Error('Failed to fetch entries')
  return res.json()
}

export async function createLogbookEntry(logbookId: number, type: 'dcc' | 'cra' | 'pd' | 'sup', data: any) {
  const res = await apiFetch(`/api/logbook/logbooks/${logbookId}/${type}-entries/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create entry')
  return res.json()
}

export async function updateLogbookEntry(logbookId: number, type: 'dcc' | 'cra' | 'pd' | 'sup', entryId: number, data: any) {
  const res = await apiFetch(`/api/logbook/logbooks/${logbookId}/${type}-entries/${entryId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update entry')
  return res.json()
}

export async function deleteLogbookEntry(logbookId: number, type: 'dcc' | 'cra' | 'pd' | 'sup', entryId: number) {
  const res = await apiFetch(`/api/logbook/logbooks/${logbookId}/${type}-entries/${entryId}/`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete entry')
  return res.json()
}

// Section A API functions
export async function getSectionAEntries() {
  const res = await apiFetch('/api/section-a/entries/')
  if (!res.ok) throw new Error('Failed to fetch Section A entries')
  return res.json()
}

export async function getSectionAEntry(id: number) {
  console.log('Fetching Section A entry with ID:', id)
  const res = await apiFetch(`/api/section-a/entries/${id}/`)
  console.log('Response status:', res.status, res.ok)
  if (!res.ok) {
    const errorText = await res.text()
    console.error('API Error:', errorText)
    throw new Error(`Failed to fetch Section A entry: ${res.status} ${errorText}`)
  }
  return res.json()
}

export async function createSectionAEntry(data: any) {
  const res = await apiFetch('/api/section-a/entries/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create Section A entry')
  return res.json()
}

export async function updateSectionAEntry(id: number, data: any) {
  const res = await apiFetch(`/api/section-a/entries/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update Section A entry')
  return res.json()
}

export async function deleteSectionAEntry(id: number) {
  const res = await apiFetch(`/api/section-a/entries/${id}/`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete Section A entry')
  // DELETE operations typically return 204 (No Content) with no body
  // Only parse JSON if there's actually content
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return { success: true }
  }
  return res.json()
}

export async function checkEntryQuality(text: string, fieldType: 'presenting_issues' | 'reflection') {
  const res = await apiFetch('/api/section-a/entries/check_quality/', {
    method: 'POST',
    body: JSON.stringify({ text, field_type: fieldType })
  })
  if (!res.ok) throw new Error('Failed to check entry quality')
  return res.json()
}

// Client autocomplete
export async function getClientAutocomplete(query: string) {
  const res = await apiFetch(`/api/section-a/entries/client_autocomplete/?q=${encodeURIComponent(query)}`)
  if (!res.ok) throw new Error('Failed to fetch client autocomplete')
  return res.json()
}

// Last session data
export async function getLastSessionData(clientId: string) {
  const res = await apiFetch(`/api/section-a/entries/last_session_data/?client_id=${encodeURIComponent(clientId)}`)
  if (res.status === 404) {
    return null
  }
  if (!res.ok) throw new Error('Failed to fetch last session data')
  return res.json()
}

// Place of practice autocomplete
export async function getPlaceAutocomplete(query: string) {
  const res = await apiFetch(`/api/section-a/entries/place_autocomplete/?q=${encodeURIComponent(query)}`)
  if (!res.ok) throw new Error('Failed to fetch place autocomplete')
  return res.json()
}

// Presenting issues autocomplete (client-specific)
export async function getPresentingIssuesAutocomplete(query: string, clientId: string) {
  const res = await apiFetch(
    `/api/section-a/entries/presenting_issues_autocomplete/?q=${encodeURIComponent(query)}&client_id=${encodeURIComponent(clientId)}`
  )
  if (!res.ok) throw new Error('Failed to fetch presenting issues autocomplete')
  return res.json()
}

// Check duplicate pseudonym
export async function checkDuplicatePseudonym(pseudonym: string, date: string) {
  const res = await apiFetch(
    `/api/section-a/entries/check_duplicate_pseudonym/?pseudonym=${encodeURIComponent(pseudonym)}&date=${encodeURIComponent(date)}`
  )
  if (!res.ok) throw new Error('Failed to check duplicate pseudonym')
  return res.json()
}

// Client session count
export async function getClientSessionCount(clientId: string): Promise<number> {
  try {
    const res = await apiFetch(`/api/section-a/entries/client_session_count/?client_id=${encodeURIComponent(clientId)}`)
    if (!res.ok) throw new Error('Failed to fetch session count')
    const data = await res.json()
    return data.count || 0
  } catch (error) {
    console.error('Error fetching session count:', error)
    return 0
  }
}

// Custom activity types
export async function getCustomActivityTypes() {
  const res = await apiFetch('/api/section-a/custom-activity-types/')
  if (!res.ok) throw new Error('Failed to fetch custom activity types')
  return res.json()
}

export async function createCustomActivityType(name: string) {
  const res = await apiFetch('/api/section-a/custom-activity-types/', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error('Failed to create custom activity type')
  return res.json()
}

export async function deleteCustomActivityType(id: number) {
  const res = await apiFetch(`/api/section-a/custom-activity-types/${id}/`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete custom activity type')
  return res.json()
}

// Section B - Professional Development API functions
import type { PDEntry, PDCompetency, PDWeeklyGroup, PDMetrics } from '@/types/pd'

// Section C - Supervision API functions
import type { SupervisionEntry, SupervisionWeeklyGroup, SupervisionMetrics } from '@/types/supervision'
import type { ProgramSummary } from '@/types/program'

export async function getPDEntries(): Promise<PDEntry[]> {
  const res = await apiFetch('/api/section-b/entries/')
  if (!res.ok) throw new Error('Failed to fetch PD entries')
  return res.json()
}

export async function getPDEntriesGroupedByWeek(): Promise<PDWeeklyGroup[]> {
  const res = await apiFetch('/api/section-b/entries/grouped-by-week/')
  if (!res.ok) throw new Error('Failed to fetch PD entries grouped by week')
  return res.json()
}

export async function getPDCompetencies(): Promise<PDCompetency[]> {
  const res = await apiFetch('/api/section-b/competencies/')
  if (!res.ok) throw new Error('Failed to fetch PD competencies')
  return res.json()
}

export async function getPDMetrics(): Promise<PDMetrics> {
  const res = await apiFetch('/api/section-b/summary-metrics/')
  if (!res.ok) throw new Error('Failed to fetch PD metrics')
  return res.json()
}

export async function createPDEntry(entry: Partial<PDEntry>): Promise<PDEntry> {
  const res = await apiFetch('/api/section-b/entries/', {
    method: 'POST',
    body: JSON.stringify(entry)
  })
  if (!res.ok) throw new Error('Failed to create PD entry')
  return res.json()
}

export async function updatePDEntry(id: number, entry: Partial<PDEntry>): Promise<PDEntry> {
  const res = await apiFetch(`/api/section-b/entries/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(entry)
  })
  if (!res.ok) throw new Error('Failed to update PD entry')
  return res.json()
}

export async function deletePDEntry(id: number): Promise<void> {
  const res = await apiFetch(`/api/section-b/entries/${id}/`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to delete PD entry')
}

export async function suggestPDCompetencies(data: {
  activity_details: string
  topics_covered: string
}): Promise<{ 
  suggested_competencies: Array<{
    id: number
    name: string
    description: string
    score: number
  }>
  count: number
}> {
  const res = await apiFetch('/api/section-b/suggest-competencies/', {
    method: 'POST',
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to get competency suggestions')
  return res.json()
}

export async function checkPDQuality(text: string, fieldType: 'activity_details' | 'reflection') {
  const res = await apiFetch('/api/section-b/check-quality/', {
    method: 'POST',
    body: JSON.stringify({ text, field_type: fieldType })
  })
  if (!res.ok) throw new Error('Failed to check PD quality')
  return res.json()
}

// Section C - Supervision API functions
export async function getSupervisionEntries(): Promise<SupervisionEntry[]> {
  const res = await apiFetch('/api/section-c/entries/')
  if (!res.ok) throw new Error('Failed to fetch supervision entries')
  return res.json()
}

export async function getSupervisionEntriesGroupedByWeek(): Promise<SupervisionWeeklyGroup[]> {
  const res = await apiFetch('/api/section-c/entries/grouped-by-week/')
  if (!res.ok) throw new Error('Failed to fetch supervision entries grouped by week')
  return res.json()
}

export async function getSupervisionMetrics(): Promise<SupervisionMetrics> {
  const res = await apiFetch('/api/section-c/entries/summary_metrics/')
  if (!res.ok) throw new Error('Failed to fetch supervision metrics')
  return res.json()
}

export async function createSupervisionEntry(entry: Partial<SupervisionEntry>): Promise<SupervisionEntry> {
  const res = await apiFetch('/api/section-c/entries/', {
    method: 'POST',
    body: JSON.stringify(entry)
  })
  if (!res.ok) throw new Error('Failed to create supervision entry')
  return res.json()
}

export async function updateSupervisionEntry(id: number, entry: Partial<SupervisionEntry>): Promise<SupervisionEntry> {
  const res = await apiFetch(`/api/section-c/entries/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(entry)
  })
  if (!res.ok) throw new Error('Failed to update supervision entry')
  return res.json()
}

export async function deleteSupervisionEntry(id: number): Promise<void> {
  const res = await apiFetch(`/api/section-c/entries/${id}/`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to delete supervision entry')
}

// Program Summary API
export async function getProgramSummary(): Promise<ProgramSummary> {
  const res = await apiFetch('/api/program-summary/')
  if (!res.ok) throw new Error('Failed to fetch program summary')
  return res.json()
}

// Progress Reports API
export async function getAvailableReportTypes() {
  const res = await apiFetch('/api/progress-reports/configs/available_reports/')
  if (!res.ok) throw new Error('Failed to fetch available report types')
  return res.json()
}

export async function getProgressReports(filters?: any) {
  const params = new URLSearchParams()
  if (filters?.status) params.append('status', filters.status)
  if (filters?.report_type) params.append('report_config__report_type', filters.report_type)
  if (filters?.date_from) params.append('reporting_period_start__gte', filters.date_from)
  if (filters?.date_to) params.append('reporting_period_start__lte', filters.date_to)
  
  const queryString = params.toString()
  const url = `/api/progress-reports/reports/${queryString ? `?${queryString}` : ''}`
  const res = await apiFetch(url)
  if (!res.ok) throw new Error('Failed to fetch progress reports')
  return res.json()
}

export async function getProgressReport(id: number) {
  const res = await apiFetch(`/api/progress-reports/reports/${id}/`)
  if (!res.ok) throw new Error('Failed to fetch progress report')
  return res.json()
}

export async function createProgressReport(data: any) {
  const res = await apiFetch('/api/progress-reports/reports/', {
    method: 'POST',
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to create progress report')
  return res.json()
}

export async function updateProgressReport(id: number, data: any) {
  const res = await apiFetch(`/api/progress-reports/reports/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update progress report')
  return res.json()
}

export async function submitProgressReport(id: number) {
  const res = await apiFetch(`/api/progress-reports/reports/${id}/submit/`, {
    method: 'POST'
  })
  if (!res.ok) throw new Error('Failed to submit progress report')
  return res.json()
}

export async function saveProgressReportDraft(id: number, data: any) {
  const res = await apiFetch(`/api/progress-reports/reports/${id}/save_draft/`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to save progress report draft')
  return res.json()
}

export async function approveProgressReport(id: number, feedback: any) {
  const res = await apiFetch(`/api/progress-reports/reports/${id}/approve/`, {
    method: 'POST',
    body: JSON.stringify(feedback)
  })
  if (!res.ok) throw new Error('Failed to approve progress report')
  return res.json()
}

export async function requestRevision(id: number, feedback: any) {
  const res = await apiFetch(`/api/progress-reports/reports/${id}/request_revision/`, {
    method: 'POST',
    body: JSON.stringify(feedback)
  })
  if (!res.ok) throw new Error('Failed to request revision')
  return res.json()
}

export async function getProgressReportDashboardStats() {
  const res = await apiFetch('/api/progress-reports/reports/dashboard_stats/')
  if (!res.ok) throw new Error('Failed to fetch progress report dashboard stats')
  return res.json()
}


