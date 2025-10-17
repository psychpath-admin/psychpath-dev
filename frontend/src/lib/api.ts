import { 
  getStoredTokens, 
  clearAuthData, 
  storeAuthData, 
  shouldRefreshToken
} from './tokenUtils'

// Use empty string in dev to use Vite proxy, or specified URL for production
const API_URL = import.meta.env.VITE_API_URL || ''

function getAccessToken() {
  return localStorage.getItem('accessToken')
}

function getRefreshToken() {
  return localStorage.getItem('refreshToken')
}

export function logout() {
  clearAuthData()
  
  // Redirect to login page if not already there
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

async function refreshToken(): Promise<boolean> {
  const refresh = getRefreshToken()
  if (!refresh) {
    console.log('No refresh token available')
    return false
  }
  
  try {
    console.log('Attempting token refresh...')
    const res = await fetch(`${API_URL}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    
    if (!res.ok) {
      console.log('Token refresh failed:', res.status)
      logout()
      return false
    }
    
    const data = await res.json()
    if (data?.access) {
      storeAuthData(data.access, data.refresh || refresh)
      console.log('Token refresh successful')
      return true
    }
    
    console.log('No access token in refresh response')
    logout()
    return false
  } catch (error) {
    console.error('Token refresh error:', error)
    logout()
    return false
  }
}

interface ApiFetchOptions extends RequestInit {
  _retryAttempted?: boolean
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const { accessToken, refreshToken: storedRefreshToken, isValid } = getStoredTokens()
  const isFormData = options?.body instanceof FormData
  const baseHeaders: Record<string, string> = { ...(options.headers as any) }
  
  // Only set Content-Type for non-FormData payloads; browser will set boundary for FormData
  if (!isFormData && !baseHeaders['Content-Type']) {
    baseHeaders['Content-Type'] = 'application/json'
  }
  
  // Check if we need to refresh token before making the request
  let currentToken = accessToken
  if (accessToken && storedRefreshToken && shouldRefreshToken(accessToken, storedRefreshToken)) {
    console.log('Token expiring soon, refreshing before request...')
    const refreshSuccess = await refreshToken()
    if (refreshSuccess) {
      currentToken = getAccessToken()
    } else {
      console.log('Pre-request token refresh failed')
      logout()
      return new Response(null, { status: 401, statusText: 'Unauthorized' })
    }
  }
  
  if (currentToken) {
    baseHeaders['Authorization'] = `Bearer ${currentToken}`
  }

  let res = await fetch(`${API_URL}${path}`, { ...options, headers: baseHeaders })
  console.log('Initial response:', res.status, res.ok, path)
  
  // Only attempt token refresh once per request to prevent infinite loops
  if (res.status === 401 && storedRefreshToken && !options._retryAttempted) {
    console.log('401 error, attempting token refresh for:', path)
    const ok = await refreshToken()
    console.log('Token refresh result:', ok)
    if (ok) {
      const newToken = getAccessToken()
      console.log('New token obtained:', !!newToken)
      const retryHeaders = { ...baseHeaders }
      if (newToken) retryHeaders['Authorization'] = `Bearer ${newToken}`
      // Mark this as a retry attempt to prevent further retries
      const retryOptions = { ...options, _retryAttempted: true }
      res = await fetch(`${API_URL}${path}`, { ...retryOptions, headers: retryHeaders })
      console.log('Retry response:', res.status, res.ok)
    } else {
      console.log('Token refresh failed, logging out')
      logout()
      // Return the original 401 response to prevent further processing
      return res
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
  
  // Use the new token management functions
  storeAuthData(data.access, data.refresh)
  
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

// Logbook functions
export async function getLogbooks() {
  const res = await apiFetch('/api/logbook/logbooks/')
  if (!res.ok) throw new Error('Failed to fetch logbooks')
  return res.json()
}

export async function getLogbook(id: number) {
  const res = await apiFetch(`/api/logbook/${id}/`)
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
  const res = await apiFetch(`/api/logbook/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update logbook')
  return res.json()
}

export async function submitLogbook(weekStart: string) {
  const res = await apiFetch(`/api/logbook/submit/`, {
    method: 'POST',
    body: JSON.stringify({ week_start: weekStart }),
  })
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || 'Failed to submit logbook')
  }
  return res.json()
}

export async function approveLogbook(id: number, action: 'approve' | 'reject', comments?: string) {
  const res = await apiFetch(`/api/logbook/${id}/approve/`, {
    method: 'POST',
    body: JSON.stringify({ action, comments }),
  })
  if (!res.ok) throw new Error('Failed to approve/reject logbook')
  return res.json()
}

export async function downloadLogbookPDF(_id: number) {
  // TODO: Implement PDF download endpoint in backend
  throw new Error('PDF download not yet implemented')
}

// Logbook entry functions
export async function getLogbookEntries(logbookId: number, type: 'dcc' | 'cra' | 'pd' | 'sup') {
  // Map frontend types to backend section names
  const sectionMap = { 'dcc': 'section-a', 'cra': 'section-a', 'pd': 'section-b', 'sup': 'section-c' }
  const section = sectionMap[type]
  const res = await apiFetch(`/api/logbook/${logbookId}/${section}-entries/`)
  if (!res.ok) throw new Error('Failed to fetch entries')
  return res.json()
}

export async function createLogbookEntry(logbookId: number, type: 'dcc' | 'cra' | 'pd' | 'sup', data: any) {
  // Map frontend types to backend section names
  const sectionMap = { 'dcc': 'section-a', 'cra': 'section-a', 'pd': 'section-b', 'sup': 'section-c' }
  const section = sectionMap[type]
  const res = await apiFetch(`/api/logbook/${logbookId}/${section}-entries/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create entry')
  return res.json()
}

export async function updateLogbookEntry(logbookId: number, type: 'dcc' | 'cra' | 'pd' | 'sup', entryId: number, data: any) {
  // Map frontend types to backend section names
  const sectionMap = { 'dcc': 'section-a', 'cra': 'section-a', 'pd': 'section-b', 'sup': 'section-c' }
  const section = sectionMap[type]
  const res = await apiFetch(`/api/logbook/${logbookId}/${section}-entries/${entryId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update entry')
  return res.json()
}

export async function deleteLogbookEntry(logbookId: number, type: 'dcc' | 'cra' | 'pd' | 'sup', entryId: number) {
  // Map frontend types to backend section names
  const sectionMap = { 'dcc': 'section-a', 'cra': 'section-a', 'pd': 'section-b', 'sup': 'section-c' }
  const section = sectionMap[type]
  const res = await apiFetch(`/api/logbook/${logbookId}/${section}-entries/${entryId}/`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete entry')
  return res.json()
}

// Section A API functions
export async function getSectionAEntries(params?: { week_starting?: string; include_locked?: boolean }) {
  const query: string[] = []
  if (params?.week_starting) query.push(`week_starting=${encodeURIComponent(params.week_starting)}`)
  if (typeof params?.include_locked === 'boolean') query.push(`include_locked=${params.include_locked ? 'true' : 'false'}`)
  const qs = query.length ? `?${query.join('&')}` : ''
  const res = await apiFetch(`/api/section-a/entries/${qs}`)
  if (!res.ok) throw new Error('Failed to fetch Section A entries')
  return res.json()
}

export async function getSectionAEntry(id: number) {
  console.log('Fetching Section A entry with ID:', id)
  const res = await apiFetch(`/api/section-a/entries/${id}/?include_locked=true`)
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
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to create Section A entry: ${res.status} ${errorText}`)
  }
  return res.json()
}

export async function updateSectionAEntry(id: number, data: any) {
  const res = await apiFetch(`/api/section-a/entries/${id}/?include_locked=true`, {
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
  const res = await apiFetch('/api/section-b/entries/?include_locked=true')
  if (!res.ok) throw new Error('Failed to fetch PD entries')
  return res.json()
}

export async function getPDEntriesGroupedByWeek(): Promise<PDWeeklyGroup[]> {
  const res = await apiFetch('/api/section-b/entries/grouped-by-week/?include_locked=true')
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
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    console.error('PD Entry creation failed:', errorData)
    throw new Error(`Failed to create PD entry: ${JSON.stringify(errorData)}`)
  }
  return res.json()
}

export async function updatePDEntry(id: number, entry: Partial<PDEntry>): Promise<PDEntry> {
  const res = await apiFetch(`/api/section-b/entries/${id}/?include_locked=true`, {
    method: 'PUT',
    body: JSON.stringify(entry)
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    console.error('PD Entry update failed:', errorData)
    throw new Error(`Failed to update PD entry: ${JSON.stringify(errorData)}`)
  }
  return res.json()
}

export async function deletePDEntry(id: number): Promise<void> {
  const res = await apiFetch(`/api/section-b/entries/${id}/`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to delete PD entry')
}

// Section C - Supervision API functions
export async function getSupervisionEntries(): Promise<SupervisionEntry[]> {
  const res = await apiFetch('/api/section-c/entries/?include_locked=true')
  if (!res.ok) throw new Error('Failed to fetch supervision entries')
  return res.json()
}

export async function getSupervisionEntriesGroupedByWeek(): Promise<SupervisionWeeklyGroup[]> {
  const res = await apiFetch('/api/section-c/entries/grouped-by-week/?include_locked=true')
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
  const res = await apiFetch(`/api/section-c/entries/${id}/?include_locked=true`, {
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

// Error logging functions
export interface ErrorLogData {
  error_id?: string
  error_title: string
  error_summary: string
  error_explanation?: string
  user_action?: string
  page_url?: string
  additional_context?: Record<string, any>
}

export async function logError(errorData: ErrorLogData): Promise<void> {
  try {
    const res = await apiFetch('/api/audit-log/errors/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...errorData,
        page_url: errorData.page_url || window.location.href,
        additional_context: {
          ...errorData.additional_context,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }
      })
    })
    
    if (!res.ok) {
      console.error('Failed to log error to support audit trail')
    }
  } catch (error) {
    console.error('Error logging error:', error)
  }
}

export async function getErrorLogs(params?: {
  resolved?: boolean
  user_id?: number
  error_id?: string
  limit?: number
}): Promise<any[]> {
  const queryParams = new URLSearchParams()
  if (params?.resolved !== undefined) queryParams.set('resolved', params.resolved.toString())
  if (params?.user_id) queryParams.set('user_id', params.user_id.toString())
  if (params?.error_id) queryParams.set('error_id', params.error_id)
  if (params?.limit) queryParams.set('limit', params.limit.toString())
  
  const url = `/api/audit-log/errors/list/${queryParams.toString() ? '?' + queryParams.toString() : ''}`
  const res = await apiFetch(url)
  if (!res.ok) throw new Error('Failed to fetch error logs')
  return res.json()
}


