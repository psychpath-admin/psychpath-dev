import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSectionAEntries, getPDMetrics, getSupervisionMetrics, getProgramSummary } from '@/lib/api'
import { formatDurationWithUnit } from '../utils/durationUtils'
import type { PDMetrics } from '@/types/pd'
import type { SupervisionMetrics } from '@/types/supervision'
import type { ProgramSummary } from '@/types/program'
import { InternshipValidationCard } from '@/components/InternshipValidationCard'
import RegistrarSummaryCard from '@/components/RegistrarSummaryCard'
import PendingSupervisionRequests from '@/components/PendingSupervisionRequests'
import SupervisorDashboard from '@/pages/SupervisorDashboard'
import UserNameDisplay from '@/components/UserNameDisplay'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/status'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  BookOpen, 
  Target, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  FileText,
  Briefcase,
  UserCheck,
  Calendar,
  Clock
} from 'lucide-react'
// import {
//   DndContext,
//   closestCenter,
//   KeyboardSensor,
//   PointerSensor,
//   useSensor,
//   useSensors,
// } from '@dnd-kit/core'
// import type { DragEndEvent } from '@dnd-kit/core'
// import {
//   arrayMove,
//   SortableContext,
//   sortableKeyboardCoordinates,
//   verticalListSortingStrategy,
//   useSortable,
// } from '@dnd-kit/sortable'
// import { CSS } from '@dnd-kit/utilities'

type Entry = {
  id: number
  entry_type: 'client_contact' | 'cra' | 'icra' | string
  simulated?: boolean
  duration_minutes?: number | string
  created_at?: string
  reflection?: string
  notes?: string
  reflections_on_experience?: string
  // Add other possible fields that might exist
  date_of_activity?: string
  activity_date?: string
  duration?: number | string
}

type DashboardCard = {
  id: string
  type: 'donut' | 'bar' | 'traffic-light' | 'custom'
  title: string
  component: React.ReactNode
}

function minutesToHours(minutes: number): number {
  if (!minutes) return 0
  const num = typeof minutes === 'string' ? parseInt(minutes, 10) : Number(minutes)
  if (!Number.isFinite(num)) return 0
  return Math.round((num / 60) * 10) / 10
}

interface DashboardProps {
  userRole?: string
}

interface SupervisionInvitation {
  id: number
  supervisor: number
  supervisor_name: string
  supervisee_email: string
  role: string
  status: string
  created_at: string
  expires_at: string
  is_expired: boolean
  can_be_accepted: boolean
}

interface LogbookStatus {
  overall_status: 'red' | 'amber' | 'green'
  status_message: string
  status_counts: {
    total: number
    ready: number
    submitted: number
    approved: number
    rejected: number
    overdue: number
    new: number
    draft: number
  }
  total_weeks: number
  submitted?: number // For supervisor compatibility
}

export default function Dashboard({ userRole }: DashboardProps) {
  console.log('Dashboard: Component rendering, userRole:', userRole)
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<Entry[]>([])
  const [pdMetrics, setPdMetrics] = useState<PDMetrics | null>(null)
  const [supervisionMetrics, setSupervisionMetrics] = useState<SupervisionMetrics | null>(null)
  const [programSummary, setProgramSummary] = useState<ProgramSummary | null>(null)
  const [cardOrder, setCardOrder] = useState<string[]>([])
  // const [refreshKey, setRefreshKey] = useState(0) // For triggering refreshes
  const [pendingInvitations, setPendingInvitations] = useState<SupervisionInvitation[]>([])
  const [respondingToInvitation, setRespondingToInvitation] = useState<number | null>(null)
  const [logbookStatus, setLogbookStatus] = useState<LogbookStatus | null>(null)

  // Centralized data fetcher so children can trigger a refresh safely
  const fetchData = () => {
    setLoading(true)

    // Load Section A entries
    getSectionAEntries()
      .then((data) => {
        setEntries(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        // Show empty data when not authenticated - no demo data
        setEntries([])
      })

    // Load PD metrics
    getPDMetrics()
      .then((data) => {
        setPdMetrics(data)
      })
      .catch(() => {
        setPdMetrics(null)
      })
      .finally(() => setLoading(false))

    // Load Supervision metrics
    getSupervisionMetrics()
      .then((data) => {
        setSupervisionMetrics(data)
      })
      .catch(() => {
        setSupervisionMetrics(null)
      })

    // Load Program Summary
    getProgramSummary()
      .then((data) => {
        setProgramSummary(data)
      })
      .catch(() => {
        setProgramSummary(null)
      })

    // Load Logbook Status Summary (for PROVISIONAL/REGISTRAR and SUPERVISOR)
    if (userRole === 'PROVISIONAL' || userRole === 'REGISTRAR' || userRole === 'SUPERVISOR') {
      fetchLogbookStatus()
    }
  }

  // Function to trigger dashboard refresh (called by child components)
  const handleSupervisionUpdate = () => {
    // Refresh data
    fetchData()
  }

  // Fetch logbook status summary
  const fetchLogbookStatus = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/logbook/status-summary/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setLogbookStatus(data)
      } else {
        setLogbookStatus(null)
      }
    } catch (error) {
      console.error('Error fetching logbook status:', error)
      setLogbookStatus(null)
    }
  }

  // Fetch pending supervision invitations
  const fetchPendingInvitations = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/supervisions/pending/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setPendingInvitations(data)
      }
    } catch (error) {
      console.error('Error fetching pending invitations:', error)
    }
  }

  // Handle accept/reject invitation
  const handleInvitationResponse = async (invitationId: number, action: 'accept' | 'reject') => {
    setRespondingToInvitation(invitationId)
    
    try {
      // First get the supervision details to get the token
      const supervisionResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/supervisions/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!supervisionResponse.ok) {
        throw new Error('Failed to fetch supervision details')
      }
      
      const supervisions = await supervisionResponse.json()
      const supervision = supervisions.find((s: any) => s.id === invitationId)
      
      if (!supervision) {
        throw new Error('Supervision request not found')
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/supervisions/respond/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: supervision.verification_token,
          action: action
        })
      })

      if (response.ok) {
        // Refresh invitations and all data
        await fetchPendingInvitations()
        fetchData()
      } else {
        const errorData = await response.json()
        alert(errorData.error || `Failed to ${action} request`)
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error)
      alert(`Error ${action}ing request`)
    } finally {
      setRespondingToInvitation(null)
    }
  }

  // Load saved card order from localStorage
  useEffect(() => {
    console.log('Dashboard: Loading card order from localStorage')
    const savedOrder = localStorage.getItem('dashboard-card-order')
    
    // Default card orders based on user role
    const defaultCardOrders = {
      'PROVISIONAL': ['supervision_requests', 'overall', 'practice', 'supervision', 'supervision_hours', 'dcc', 'cra', 'sdcc', 'pd', 'internship_validation'],
      'REGISTRAR': ['supervision_requests', 'registrar_summary', 'overall', 'practice', 'supervision', 'supervision_hours', 'dcc', 'cra', 'pd'],
      'SUPERVISOR': ['supervision_requests'],
      'ORG_ADMIN': ['supervision_requests']
    }
    
    let cardOrderToSet = defaultCardOrders['PROVISIONAL'] // fallback
    
    if (savedOrder) {
      const parsed = JSON.parse(savedOrder)
      // Ensure essential cards are always included based on role
      const currentUserRole = programSummary?.role || userRole || 'PROVISIONAL'
      const essentialCards = {
        'PROVISIONAL': ['pd', 'supervision_hours', 'internship_validation'],
        'REGISTRAR': ['pd', 'supervision_hours', 'registrar_summary'],
        'SUPERVISOR': [],
        'ORG_ADMIN': []
      }
      
      const requiredCards = essentialCards[currentUserRole as keyof typeof essentialCards] || []
      requiredCards.forEach((cardId: string) => {
        if (!parsed.includes(cardId)) {
          parsed.push(cardId)
        }
      })
      
      cardOrderToSet = parsed
    } else {
      // Use role-specific default order
      const currentUserRole = programSummary?.role || userRole || 'PROVISIONAL'
      cardOrderToSet = defaultCardOrders[currentUserRole as keyof typeof defaultCardOrders] || defaultCardOrders['PROVISIONAL']
    }
    
    console.log('Dashboard: Setting card order:', cardOrderToSet)
    setCardOrder(cardOrderToSet)
  }, [programSummary?.role, userRole])

  useEffect(() => {
    let mounted = true
    
    // Load Section A entries
    getSectionAEntries()
      .then((data) => {
        if (!mounted) return
        setEntries(Array.isArray(data) ? data : [])
      })
      .catch((error) => {
        console.log('Dashboard: No auth, showing empty data', error)
        // Show empty data when not authenticated - no demo data
        setEntries([])
      })
    
    // Load PD metrics
    getPDMetrics()
      .then((data) => {
        if (!mounted) return
        console.log('Dashboard: PD metrics loaded from API:', data)
        setPdMetrics(data)
      })
      .catch((error) => {
        console.log('Dashboard: No auth, showing empty PD data', error)
        // Show empty data when not authenticated - no demo data
        setPdMetrics(null)
      })
      .finally(() => setLoading(false))
    
    // Load Supervision metrics
    getSupervisionMetrics()
      .then((data) => {
        if (!mounted) return
        console.log('Dashboard: Supervision metrics loaded from API:', data)
        setSupervisionMetrics(data)
      })
      .catch((error) => {
        console.log('Dashboard: No auth, showing empty supervision data', error)
        // Show empty data when not authenticated - no demo data
        setSupervisionMetrics(null)
      })
    
    // Load Program Summary
    getProgramSummary()
      .then((data) => {
        if (!mounted) return
        console.log('Dashboard: Program summary loaded from API:', data)
        setProgramSummary(data)
      })
      .catch((error) => {
        console.log('Dashboard: No auth, showing empty program summary', error)
        // Show empty data when not authenticated - no demo data
        setProgramSummary(null)
      })
    
    // Load pending invitations
    fetchPendingInvitations()
    
    return () => { mounted = false }
  }, [])

  const metrics = useMemo(() => {
    // Prefer authoritative backend summary when available
    if (programSummary?.progress) {
      const p: any = programSummary.progress
      const dcc = Number(p.dcc_hours) || 0
      const cra = Number(p.cra_hours) || 0
      const sdcc = Number(p.simulated_dcc_hours) || 0
      const prac = Number(p.total_practice_hours) || (dcc + cra)
      const pd = Number(p.pd_hours) || 0
      const supervision = Number(p.supervision_hours) || 0
      const intTotal = Number(p.total_hours) || (prac + pd + supervision)
      return { dcc, cra, sdcc, prac, intTotal, pd, supervision }
    }

    // Fallback: compute from entries
    const safeMinutes = (v: any) => {
      const n = typeof v === 'string' ? parseInt(v, 10) : Number(v)
      return Number.isFinite(n) ? n : 0
    }
    let dccMin = 0
    let craMin = 0
    let sdccMin = 0
    for (const e of entries) {
      const m = safeMinutes(e.duration_minutes)
      if (e.entry_type === 'client_contact') {
        dccMin += m
        if (e.simulated) sdccMin += m
      } else if (e.entry_type === 'cra' || e.entry_type === 'icra') {
        craMin += m
      }
    }
    const dcc = minutesToHours(dccMin)
    const cra = minutesToHours(craMin)
    const sdcc = minutesToHours(sdccMin)
    const prac = dcc + cra
    const intTotal = prac
    return { dcc, cra, sdcc, prac, intTotal, pd: 0, supervision: 0 }
  }, [entries, programSummary])

  const targets = useMemo(() => {
    const req = programSummary?.requirements
    const intTarget = (req?.total_hours ?? ((req?.practice_hours || 0) + (req?.pd_hours || 0) + (req?.supervision_hours || 0))) || 1500
    return {
      int: intTarget,
      prac: req?.practice_hours || 1360,
      dccMin: req?.dcc_hours || 500,
      craMin: 0,
      sdccCap: req?.max_simulated_dcc_hours || 60,
      pd: req?.pd_hours || 60,
      supervisionTotal: req?.supervision_hours || 80,
      supervisionRatio: 17,
    }
  }, [programSummary])

  // const percent = (value: number, target: number) => Math.max(0, Math.min(100, Math.round((value / target) * 100)))
  
  // Calculate supervision ratio status
  const supervisionStatus = useMemo((): { status: 'red' | 'amber' | 'green'; message: string } => {
    const requiredSupervision = Math.ceil(metrics.prac / targets.supervisionRatio)
    const actualSupervision = supervisionMetrics ? minutesToHours(supervisionMetrics.total_supervision_minutes) : 0
    const ratio = actualSupervision > 0 ? metrics.prac / actualSupervision : 0
    
    console.log('Supervision ratio calculation:', {
      practiceHours: metrics.prac,
      actualSupervision,
      ratio,
      requiredSupervision,
      supervisionRatio: targets.supervisionRatio
    })
    
    if (ratio === 0) return { status: 'red', message: 'No supervision recorded' }
    if (ratio <= targets.supervisionRatio) return { status: 'green', message: 'On track (1:17 ratio)' }
    if (ratio <= targets.supervisionRatio * 1.2) return { status: 'amber', message: 'Approaching limit' }
    return { status: 'red', message: 'Below required ratio' }
  }, [metrics.prac, targets.supervisionRatio, supervisionMetrics])

  // Circular Progress Component (similar to registrar dashboard)
  const CircularProgress = ({ percentage, size = 120, strokeWidth = 8, color = "#3b82f6" }: { 
    percentage: number, 
    size?: number, 
    strokeWidth?: number, 
    color?: string 
  }) => {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const strokeDasharray = circumference
    const strokeDashoffset = circumference - (percentage / 100) * circumference

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300 ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
    )
  }

  // Drag and drop functionality removed for now

  // Create dashboard cards
  const dashboardCards: Record<string, DashboardCard> = useMemo(() => ({
    overall: {
      id: 'overall',
      type: 'donut',
      title: 'Overall (INT)',
      component: (
        <DonutCard 
          title="Overall (INT)" 
          value={metrics.intTotal} 
          target={targets.int}
          description={programSummary?.role === 'REGISTRAR' ?
            'Total registrar program hours including practice, PD, and supervision. Targets vary by qualification level.' :
            'Total internship hours including practice, professional development, and supervision. Must reach 1500 hours to complete internship requirements.'}
        />
      )
    },
    practice: {
      id: 'practice',
      type: 'donut',
      title: 'Practice (PRAC)',
      component: (
        <DonutCard 
          title="Practice (PRAC)" 
          value={metrics.prac} 
          target={targets.prac}
          description="Combined Direct Client Contact (DCC) and Client-Related Activities (CRA). Forms the core of your practical experience."
        />
      )
    },
    supervision: {
      id: 'supervision',
      type: 'traffic-light',
      title: 'Supervision Ratio',
      component: (
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-4">
            <TrafficLight status={supervisionStatus.status} />
            <div>
              <div className="mb-1 text-sm text-textLight">Supervision Ratio (1:17)</div>
              <div className="text-lg font-semibold text-textDark">{supervisionStatus.message}</div>
              <div className="text-xs text-textLight">
                Required: {Math.ceil(metrics.prac / targets.supervisionRatio)}h supervision for {metrics.prac}h practice
              </div>
            </div>
          </div>
        </div>
      )
    },
    dcc: {
      id: 'dcc',
      type: 'bar',
      title: 'Direct Client Contact',
      component: (
        <Bar
          title="Direct Client Contact (DCC)"
          value={metrics.dcc}
          target={targets.dccMin}
          subtitle={programSummary?.role === 'REGISTRAR' ? undefined : `Min 500h and ≥40% of PRAC (now: ${metrics.prac ? Math.round((metrics.dcc/metrics.prac)*100) : 0}%)`}
          state={programSummary?.role === 'REGISTRAR' ? (metrics.dcc > 0 ? 'ok' : 'warn') : (metrics.dcc >= targets.dccMin ? 'ok' : 'warn')}
          description={programSummary?.role === 'REGISTRAR' ?
            'Direct client contact accumulated toward registrar practice hours. Annual minimum expectation is handled in Alerts.' :
            'Face-to-face or telehealth sessions with clients including assessments, interventions, and interviews. Must be at least 40% of your practice hours.'}
        />
      )
    },
    cra: {
      id: 'cra',
      type: 'bar',
      title: 'Client-Related Activities',
      component: (
        <Bar
          title="Client-Related Activities (CRA)"
          value={metrics.cra}
          target={targets.craMin}
          state={metrics.cra >= 860 ? 'ok' : 'warn'}
          description="Activities related to client care but not direct contact, such as report writing, case formulation, test scoring, and treatment planning."
        />
      )
    },
    sdcc: {
      id: 'sdcc',
      type: 'bar',
      title: 'Simulated DCC',
      component: (
        <Bar
          title="Simulated DCC (SDCC)"
          value={metrics.sdcc}
          target={targets.sdccCap}
          subtitle="Max 60h"
          state={metrics.sdcc > targets.sdccCap ? 'error' : 'ok'}
          description="Simulated client sessions for training purposes. Limited to maximum 60 hours total across your entire internship."
        />
      )
    },
    pd: {
      id: 'pd',
      type: 'bar',
      title: 'Professional Development',
      component: (() => {
        console.log('Dashboard: Creating PD card with pdMetrics:', pdMetrics)
        const pdHours = pdMetrics ? minutesToHours(pdMetrics.total_pd_minutes) : 0
        console.log('Dashboard: PD hours calculated:', pdHours, 'from', pdMetrics?.total_pd_minutes, 'minutes')
        console.log('Dashboard: minutesToHours(895) =', minutesToHours(895))
        
        // Create a custom display for PD that shows hours:minutes format
        return (
          <div className="rounded-lg border bg-white p-4">
            <div className="mb-1 text-sm text-textLight">Professional Development (PD)</div>
            <div className="mb-2 text-xs text-textLight">Current week: {pdMetrics?.current_week_pd_hours || '0:00'}</div>
            <div className="mb-2 text-xl font-semibold text-textDark">
              {pdMetrics?.total_pd_hours || '0:00'} <span className="text-sm text-textLight">/ {targets.pd}:00</span>
            </div>
            <div className="h-2 w-full rounded bg-gray-100 mb-3">
              <div 
                className={`h-2 rounded ${pdMetrics && pdMetrics.total_pd_minutes >= targets.pd * 60 ? 'bg-primaryBlue' : 'bg-amber-500'}`} 
                style={{ width: `${Math.max(0, Math.min(100, Math.round((pdHours / targets.pd) * 100)))}%` }} 
              />
            </div>
            <div className="text-xs text-textLight leading-relaxed">
              Ongoing learning activities including workshops, webinars, reading, and training. Essential for maintaining professional competence and meeting continuing education requirements.
            </div>
          </div>
        )
      })()
    },
    supervision_hours: {
      id: 'supervision_hours',
      type: 'bar',
      title: 'Supervision Hours',
      component: (() => {
        console.log('Dashboard: Creating supervision card with supervisionMetrics:', supervisionMetrics)
        const supervisionHours = supervisionMetrics ? minutesToHours(supervisionMetrics.total_supervision_minutes) : 0
        console.log('Dashboard: Supervision hours calculated:', supervisionHours, 'from', supervisionMetrics?.total_supervision_minutes, 'minutes')
        
        // Create a custom display for Supervision that shows hours:minutes format
        return (
          <div className="rounded-lg border bg-white p-4">
            <div className="mb-1 text-sm text-textLight">Supervision</div>
            <div className="mb-2 text-xs text-textLight">Current week: {supervisionMetrics?.current_week_supervision_hours || '0:00'}</div>
            <div className="mb-2 text-xl font-semibold text-textDark">
              {supervisionMetrics?.total_supervision_hours || '0:00'} <span className="text-sm text-textLight">/ {targets.supervisionTotal}:00</span>
            </div>
            <div className="h-2 w-full rounded bg-gray-100 mb-3">
              <div 
                className={`h-2 rounded ${supervisionMetrics && supervisionMetrics.total_supervision_minutes >= (targets.supervisionTotal) * 60 ? 'bg-primaryBlue' : 'bg-amber-500'}`} 
                style={{ width: `${Math.max(0, Math.min(100, Math.round((supervisionHours / (targets.supervisionTotal || 1)) * 100)))}%` }} 
              />
            </div>
            <div className="text-xs text-textLight leading-relaxed">
              Regular supervision sessions with principal and secondary supervisors. Essential for professional development, case review, and meeting AHPRA supervision requirements.
            </div>
          </div>
        )
      })()
    },
    supervision_requests: {
      id: 'supervision_requests',
      type: 'custom',
      title: 'Supervision Requests',
      component: <PendingSupervisionRequests onUpdate={handleSupervisionUpdate} />
    },
    internship_validation: {
      id: 'internship_validation',
      type: 'custom',
      title: '5+1 Internship Progress',
      component: <InternshipValidationCard />
    },
    registrar_summary: {
      id: 'registrar_summary',
      type: 'custom',
      title: 'Registrar Progress',
      component: <RegistrarSummaryCard />
    }
  }), [metrics, targets, supervisionStatus, pdMetrics, supervisionMetrics, programSummary])

  console.log('Dashboard render:', { loading, entries: entries.length, cardOrder, pdMetrics })
  console.log('Dashboard: Available cards:', Object.keys(dashboardCards))
  console.log('Dashboard: PD card exists:', !!dashboardCards.pd)

  // Simple test to see if component renders
  if (cardOrder.length === 0) {
    console.log('Dashboard: cardOrder is empty, showing loading')
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  console.log('Dashboard: cardOrder =', cardOrder)
  console.log('Dashboard: loading =', loading)
  console.log('Dashboard: entries =', entries)

  // Show supervisor dashboard for supervisors
  console.log('Dashboard: Checking userRole:', userRole)
  console.log('Dashboard: userRole type:', typeof userRole)
  console.log('Dashboard: userRole === "SUPERVISOR":', userRole === 'SUPERVISOR')
  if (userRole === 'SUPERVISOR') {
    console.log('Dashboard: Showing supervisor dashboard')
    return <SupervisorDashboard />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <div className="mb-2">
              <div className="flex items-baseline gap-2">
                <UserNameDisplay 
                  className="" 
                  variant="large" 
                  showRole={false}
                />
                <span className="text-2xl font-bold text-white">'s Dashboard</span>
              </div>
            </div>
            <p className="text-blue-100">
              Track your progress through the 5+1 provisional psychology internship program
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/section-a" className="px-4 py-2 rounded-md bg-white/20 text-white text-sm hover:bg-white/30 transition-colors whitespace-nowrap">
              Open Section A
            </Link>
            <Link to="/section-b" className="px-4 py-2 rounded-md bg-white/20 text-white text-sm hover:bg-white/30 transition-colors whitespace-nowrap">
              Open Section B
            </Link>
            <Link to="/section-c" className="px-4 py-2 rounded-md bg-white/20 text-white text-sm hover:bg-white/30 transition-colors whitespace-nowrap">
              Open Section C
            </Link>
            <Link to="/logbook" className="px-4 py-2 rounded-md bg-white/20 text-white text-sm hover:bg-white/30 transition-colors whitespace-nowrap">
              Weekly Logbook
            </Link>
          </div>
        </div>
      </div>

      {/* Main Program Overview Card */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">5+1 Internship Progress</CardTitle>
              <Badge variant="outline" className="mt-2">
                Provisional Psychologist
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Total Hours</div>
              <div className="text-lg font-semibold">{Math.round(metrics.intTotal * 10) / 10}h / {targets.int}h</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Progress Overview */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Overall Progress</h3>
              <div className="bg-white p-4 rounded-lg border">
                <HorizontalBarChart
                  data={[
                    { 
                      label: 'Practice Hours', 
                      value: metrics.prac, 
                      target: targets.prac,
                      color: '#3b82f6',
                      unit: 'h'
                    },
                    { 
                      label: 'Professional Development', 
                      value: pdMetrics ? minutesToHours(pdMetrics.total_pd_minutes) : 0, 
                      target: targets.pd,
                      color: '#10b981',
                      unit: 'h'
                    },
                    { 
                      label: 'Supervision', 
                      value: supervisionMetrics ? minutesToHours(supervisionMetrics.total_supervision_minutes) : 0, 
                      target: targets.supervisionTotal,
                      color: '#8b5cf6',
                      unit: 'h'
                    }
                  ]}
                  title=""
                  showValues={true}
                  showTargets={true}
                />
              </div>
            </div>

            {/* Key Metrics */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Key Metrics</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Activity Hours Horizontal Bar Chart */}
                <div className="bg-white p-4 rounded-lg border">
                  <HorizontalBarChart
                    data={[
                      { label: 'DCC', value: metrics.dcc, color: '#3b82f6', unit: 'h' },
                      { label: 'CRA', value: metrics.cra, color: '#10b981', unit: 'h' },
                      { label: 'SDCC', value: metrics.sdcc, color: '#8b5cf6', unit: 'h' }
                    ]}
                    title="Activity Hours Breakdown"
                    showValues={true}
                    showValuesOutside={false}
                  />
                </div>
                
                {/* Hours Distribution Donut Chart */}
                <div className="bg-white p-4 rounded-lg border">
                  <DonutChart
                    data={[
                      { label: 'DCC', value: metrics.dcc, color: '#3b82f6' },
                      { label: 'CRA', value: metrics.cra, color: '#10b981' },
                      { label: 'SDCC', value: metrics.sdcc, color: '#8b5cf6' }
                    ]}
                    title="Hours Distribution"
                    size={140}
                  />
                </div>
              </div>
            </div>

            {/* Status & Alerts */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Status & Alerts</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${supervisionStatus.status === 'green' ? 'bg-green-500' : supervisionStatus.status === 'amber' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                  <div>
                    <div className="text-sm font-medium">Supervision Ratio</div>
                    <div className="text-sm text-gray-600">{supervisionStatus.message}</div>
                  </div>
                </div>
                {metrics.sdcc > targets.sdccCap && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-800">SDCC limit exceeded</span>
                  </div>
                )}
                {metrics.dcc < targets.dccMin && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">DCC below minimum</span>
                  </div>
                )}
                {/* Logbook Alerts */}
                {logbookStatus?.status_counts?.overdue && logbookStatus.status_counts.overdue > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <div>
                      <div className="text-sm font-medium text-red-800">
                        {logbookStatus.status_counts.overdue} overdue logbook{logbookStatus.status_counts.overdue > 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-red-600">Submit overdue logbooks to stay on track</div>
                    </div>
                  </div>
                )}
                {logbookStatus?.status_counts?.draft && logbookStatus.status_counts.draft > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-sm font-medium text-blue-800">
                        {logbookStatus.status_counts.draft} draft logbook{logbookStatus.status_counts.draft > 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-blue-600">Complete and submit draft logbooks</div>
                    </div>
                  </div>
                )}
                {logbookStatus?.status_counts?.rejected && logbookStatus.status_counts.rejected > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <div>
                      <div className="text-sm font-medium text-orange-800">
                        {logbookStatus.status_counts.rejected} rejected logbook{logbookStatus.status_counts.rejected > 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-orange-600">Review feedback and resubmit</div>
                    </div>
                  </div>
                )}
                {/* Additional Actionable Warnings */}
                {supervisionMetrics && minutesToHours(supervisionMetrics.total_supervision_minutes) < (targets.supervisionTotal * 0.5) && (
                  <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-md">
                    <Users className="h-4 w-4 text-purple-600" />
                    <div>
                      <div className="text-sm font-medium text-purple-800">Low supervision hours</div>
                      <div className="text-xs text-purple-600">Schedule more supervision sessions</div>
                    </div>
                  </div>
                )}
                {pdMetrics && minutesToHours(pdMetrics.total_pd_minutes) < (targets.pd * 0.3) && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
                    <BookOpen className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-sm font-medium text-green-800">Low PD hours</div>
                      <div className="text-xs text-green-600">Consider additional professional development activities</div>
                    </div>
                  </div>
                )}
                {metrics.prac < (targets.prac * 0.2) && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-sm font-medium text-blue-800">Low practice hours</div>
                      <div className="text-xs text-blue-600">Increase clinical practice activities</div>
                    </div>
                  </div>
                )}
                {/* Weekly Practice Hours Alert */}
                {(() => {
                  // Calculate this week's practice hours (DCC + CRA + PD)
                  const now = new Date()
                  const startOfWeek = new Date(now)
                  startOfWeek.setDate(now.getDate() - now.getDay())
                  startOfWeek.setHours(0, 0, 0, 0)
                  
                  const thisWeekEntries = entries.filter(entry => {
                    const dateField = entry.created_at || entry.date_of_activity
                    if (!dateField) return false
                    const entryDate = new Date(dateField)
                    return entryDate >= startOfWeek
                  })
                  
                  // Calculate DCC + CRA hours this week
                  const thisWeekPracticeHours = thisWeekEntries.reduce((sum, entry) => {
                    const duration = entry.duration_minutes || entry.duration || 0
                    return sum + (typeof duration === 'string' ? parseInt(duration) : duration) / 60
                  }, 0)
                  
                  // Add PD hours this week (as per AHPRA definition for 5+1 program)
                  const thisWeekPD = pdMetrics?.current_week_pd_minutes ? minutesToHours(pdMetrics.current_week_pd_minutes) : 0
                  const totalThisWeek = thisWeekPracticeHours + thisWeekPD
                  
                  // Calculate required practice hours per week
                  // Practice hours target = 1360h, divided by internship weeks (typically 52)
                  const internshipWeeks = 52 // Using standard 52 weeks
                  const requiredPracticePerWeek = targets.prac / internshipWeeks // 1360 / 52 = ~26.2 hours per week
                  const hoursNeeded = Math.max(0, requiredPracticePerWeek - totalThisWeek)
                  
                  const status = totalThisWeek >= requiredPracticePerWeek ? 'green' : 
                                 totalThisWeek >= requiredPracticePerWeek * 0.7 ? 'amber' : 'red'
                  
                  return (
                    <div className={`flex items-center gap-2 p-2 rounded-md ${
                      status === 'green' ? 'bg-green-50' : 
                      status === 'amber' ? 'bg-yellow-50' : 'bg-red-50'
                    }`}>
                      <Calendar className={`h-4 w-4 ${
                        status === 'green' ? 'text-green-600' : 
                        status === 'amber' ? 'text-yellow-600' : 'text-red-600'
                      }`} />
                      <div>
                        <div className={`text-sm font-medium ${
                          status === 'green' ? 'text-green-800' : 
                          status === 'amber' ? 'text-yellow-800' : 'text-red-800'
                        }`}>
                          This week: {totalThisWeek.toFixed(1)}h logged
                        </div>
                        <div className={`text-xs ${
                          status === 'green' ? 'text-green-600' : 
                          status === 'amber' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {hoursNeeded > 0 
                            ? `Need ${hoursNeeded.toFixed(1)}h more to stay on track` 
                            : '✓ On track for this week'}
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Pending Supervision Invitations */}
          {pendingInvitations.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">Supervision Invitations</h3>
              <div className="space-y-2">
                {pendingInvitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-sm">{invitation.supervisor_name}</span>
                        <Badge variant={invitation.role === 'PRIMARY' ? 'default' : 'secondary'} className="text-xs">
                          {invitation.role === 'PRIMARY' ? 'Primary' : 'Secondary'} Supervisor
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleInvitationResponse(invitation.id, 'accept')}
                        disabled={respondingToInvitation === invitation.id}
                        className="bg-green-600 hover:bg-green-700 text-xs h-8 px-3"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {respondingToInvitation === invitation.id ? 'Accepting...' : 'Accept'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInvitationResponse(invitation.id, 'reject')}
                        disabled={respondingToInvitation === invitation.id}
                        className="text-xs h-8 px-3"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        {respondingToInvitation === invitation.id ? 'Rejecting...' : 'Reject'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Groups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Client Activities Group */}
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5 text-blue-600" />
              Client Activities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Practice Hours */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CircularProgress 
                  percentage={(metrics.prac / targets.prac) * 100} 
                  size={80} 
                  strokeWidth={6}
                  color="#3b82f6"
                />
                <div>
                  <div className="font-medium">Practice Hours</div>
                  <div className="text-sm text-gray-600">{metrics.prac} / {targets.prac}h</div>
                </div>
              </div>
            </div>

            {/* DCC Hours */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CircularProgress 
                  percentage={(metrics.dcc / targets.dccMin) * 100} 
                  size={80} 
                  strokeWidth={6}
                  color="#10b981"
                />
                <div>
                  <div className="font-medium">Direct Client Contact</div>
                  <div className="text-sm text-gray-600">{metrics.dcc} / {targets.dccMin}h</div>
                </div>
              </div>
            </div>

            {/* CRA Hours */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CircularProgress 
                  percentage={(metrics.cra / 860) * 100} 
                  size={80} 
                  strokeWidth={6}
                  color="#8b5cf6"
                />
                <div>
                  <div className="font-medium">Client-Related Activities</div>
                  <div className="text-sm text-gray-600">{metrics.cra}h</div>
                </div>
              </div>
            </div>

            {/* SDCC Hours */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CircularProgress 
                  percentage={(metrics.sdcc / targets.sdccCap) * 100} 
                  size={80} 
                  strokeWidth={6}
                  color={metrics.sdcc > targets.sdccCap ? "#ef4444" : "#f59e0b"}
                />
                <div>
                  <div className="font-medium">Simulated DCC</div>
                  <div className="text-sm text-gray-600">{metrics.sdcc} / {targets.sdccCap}h</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Development Activities Group */}
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-green-600" />
              PD Activities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* PD Hours */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CircularProgress 
                  percentage={pdMetrics ? (minutesToHours(pdMetrics.total_pd_minutes) / targets.pd) * 100 : 0} 
                  size={80} 
                  strokeWidth={6}
                  color="#10b981"
                />
                <div>
                  <div className="font-medium">Professional Development</div>
                  <div className="text-sm text-gray-600">
                    {pdMetrics ? formatDurationWithUnit(pdMetrics.total_pd_minutes) : '0:00h'} / {targets.pd}h
                  </div>
                </div>
              </div>
            </div>

            {/* Current Week PD */}
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-800">Current Week PD</span>
                <span className="text-sm text-green-600">{pdMetrics?.current_week_pd_hours || '0:00'}</span>
              </div>
              <Progress value={pdMetrics ? (minutesToHours(pdMetrics.current_week_pd_minutes) / 2) * 100 : 0} className="h-2" />
            </div>

            {/* Annual PD Progress */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">Annual PD Progress</span>
                <span className="text-sm text-blue-600">{pdMetrics ? formatDurationWithUnit(pdMetrics.total_pd_minutes) : '0:00h'} / {targets.pd}h</span>
              </div>
              <Progress value={pdMetrics ? (minutesToHours(pdMetrics.total_pd_minutes) / targets.pd) * 100 : 0} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Supervision Activities Group */}
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-purple-600" />
              Supervision Activities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Supervision Hours */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CircularProgress 
                  percentage={supervisionMetrics ? (minutesToHours(supervisionMetrics.total_supervision_minutes) / targets.supervisionTotal) * 100 : 0} 
                  size={80} 
                  strokeWidth={6}
                  color="#8b5cf6"
                />
                <div>
                  <div className="font-medium">Supervision Hours</div>
                  <div className="text-sm text-gray-600">
                    {supervisionMetrics ? formatDurationWithUnit(supervisionMetrics.total_supervision_minutes) : '0:00h'} / {targets.supervisionTotal}h
                  </div>
                </div>
              </div>
            </div>

            {/* Supervision Ratio */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Current Ratio</span>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${supervisionStatus.status === 'green' ? 'bg-green-500' : supervisionStatus.status === 'amber' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm font-medium">
                    {supervisionMetrics && metrics.prac > 0 ? `1:${Math.round(metrics.prac / minutesToHours(supervisionMetrics.total_supervision_minutes))}` : '1:∞'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Required Ratio</span>
                <span className="text-sm font-medium">1:17</span>
              </div>
            </div>

            {/* Current Week Supervision */}
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-800">Current Week</span>
                <span className="text-sm text-purple-600">{supervisionMetrics?.current_week_supervision_hours || '0:00'}</span>
              </div>
              <Progress value={supervisionMetrics ? (minutesToHours(supervisionMetrics.current_week_supervision_minutes) / 2) * 100 : 0} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Logbook Review Notifications for Supervisors */}
        {userRole === 'SUPERVISOR' && (
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-orange-600" />
                Logbook Reviews
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-gray-600">Pending Reviews</span>
                </div>
                <Link to="/logbook">
                  <Button variant="outline" size="sm" className="text-xs">
                    View All
                  </Button>
                </Link>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {logbookStatus?.status_counts?.submitted || 0}
              </div>
              <div className="text-xs text-gray-500">
                Logbooks awaiting your review
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weekly Logbook Status Group */}
        {(userRole === 'PROVISIONAL' || userRole === 'REGISTRAR') && logbookStatus && (
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-orange-600" />
                Weekly Logbooks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overall Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${
                    logbookStatus.overall_status === 'red' ? 'bg-red-500' : 
                    logbookStatus.overall_status === 'amber' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <div>
                    <div className="font-medium">Logbook Status</div>
                    <div className="text-sm text-gray-600">{logbookStatus.status_message}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-800">{logbookStatus.total_weeks}</div>
                  <div className="text-xs text-gray-500">Total Weeks</div>
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {logbookStatus.status_counts.new > 0 && (
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <span className="text-blue-700">New</span>
                    <StatusBadge status="pending" label={`${logbookStatus.status_counts.new}`} size="sm" />
                  </div>
                )}
                {logbookStatus.status_counts.draft > 0 && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">Draft</span>
                    <StatusBadge status="draft" label={`${logbookStatus.status_counts.draft}`} size="sm" />
                  </div>
                )}
                {logbookStatus.status_counts.submitted > 0 && (
                  <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                    <span className="text-yellow-700">Submitted</span>
                    <StatusBadge status="submitted" label={`${logbookStatus.status_counts.submitted}`} size="sm" />
                  </div>
                )}
                {logbookStatus.status_counts.approved > 0 && (
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <span className="text-green-700">Approved</span>
                    <StatusBadge status="approved" label={`${logbookStatus.status_counts.approved}`} size="sm" />
                  </div>
                )}
                {logbookStatus.status_counts.rejected > 0 && (
                  <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                    <span className="text-red-700">Rejected</span>
                    <StatusBadge status="rejected" label={`${logbookStatus.status_counts.rejected}`} size="sm" />
                  </div>
                )}
                {logbookStatus.status_counts.overdue > 0 && (
                  <div className="flex items-center justify-between p-2 bg-red-100 rounded">
                    <span className="text-red-800 font-medium">Overdue</span>
                    <StatusBadge status="error" label={`${logbookStatus.status_counts.overdue}`} size="sm" />
                  </div>
                )}
              </div>

              {/* Quick Action */}
              <div className="pt-2">
                <Link to="/logbook">
                  <Button variant="outline" size="sm" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    View Logbooks
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/section-a">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2 w-full">
                <Briefcase className="h-6 w-6" />
                <span className="text-sm">Add Practice Entry</span>
              </Button>
            </Link>
            <Link to="/section-c">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2 w-full">
                <Users className="h-6 w-6" />
                <span className="text-sm">Log Supervision</span>
              </Button>
            </Link>
            <Link to="/section-b">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2 w-full">
                <BookOpen className="h-6 w-6" />
                <span className="text-sm">Add PD Entry</span>
              </Button>
            </Link>
            <Link to="/logbook">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2 w-full">
                <FileText className="h-6 w-6" />
                <span className="text-sm">View Reports</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Additional Information</h2>
        <p className="text-gray-600">
          All your progress information is now displayed in the organized sections above. 
          The new dashboard provides a comprehensive view of your internship progress with 
          clear visual indicators and easy-to-understand metrics.
        </p>
      </div>
    </div>
  )
}

function DonutCard({ title, value, target, description }: { title: string; value: number; target: number; description: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / target) * 100)))
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center gap-4 mb-3">
        <Donut percent={pct} />
        <div>
          <div className="mb-1 text-sm text-textLight">{title}</div>
          <div className="text-2xl font-semibold text-textDark">{Math.round(value * 10) / 10}h <span className="text-sm text-textLight">/ {target}h</span></div>
        </div>
      </div>
      <div className="text-xs text-textLight leading-relaxed">{description}</div>
    </div>
  )
}

function Bar({ title, value, target, subtitle, state, description }: { title: string; value: number; target: number; subtitle?: string; state?: 'ok' | 'warn' | 'error'; description?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / target) * 100)))
  const color = state === 'error' ? 'bg-red-500' : state === 'warn' ? 'bg-amber-500' : 'bg-primaryBlue'
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-1 text-sm text-textLight">{title}</div>
      {subtitle && <div className="mb-2 text-xs text-textLight">{subtitle}</div>}
      <div className="mb-2 text-xl font-semibold text-textDark">{Math.round(value * 10) / 10}h <span className="text-sm text-textLight">/ {target}h</span></div>
      <div className="h-2 w-full rounded bg-gray-100 mb-3">
        <div className={`h-2 rounded ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {description && <div className="text-xs text-textLight leading-relaxed">{description}</div>}
    </div>
  )
}

// function ProgressBar({ percent }: { percent: number }) {
//   return (
//     <div className="h-2 w-full rounded bg-gray-100">
//       <div className="h-2 rounded bg-primaryBlue" style={{ width: `${percent}%` }} />
//     </div>
//   )
// }

function Donut({ percent }: { percent: number }) {
  const size = 72
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dash = (percent / 100) * circumference
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#eef2f7"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#3F72AF"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-current text-sm" fill="#222831">
        {percent}%
      </text>
    </svg>
  )
}

function TrafficLight({ status }: { status: 'red' | 'amber' | 'green' }) {
  const colors = {
    red: 'bg-red-500',
    amber: 'bg-amber-500', 
    green: 'bg-green-500'
  }
  
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-6 h-6 rounded-full ${colors[status]} shadow-lg`} />
      <div className="text-xs text-textLight capitalize">{status}</div>
    </div>
  )
}


// Horizontal Bar Chart Component
function HorizontalBarChart({ 
  data, 
  title, 
  showValues = true,
  showTargets = false,
  showValuesOutside = true
}: { 
  data: Array<{ label: string; value: number; target?: number; color?: string; unit?: string }>
  title: string
  showValues?: boolean
  showTargets?: boolean
  showValuesOutside?: boolean
}) {
  const maxValue = Math.max(...data.map(d => Math.max(d.value, d.target || 0)))
  const colors = {
    blue: '#3b82f6',
    green: '#10b981',
    red: '#ef4444',
    amber: '#f59e0b',
    purple: '#8b5cf6'
  }
  
  return (
    <div className="w-full">
      <h4 className="text-sm font-medium text-gray-700 mb-4">{title}</h4>
      <div className="space-y-4">
        {data.map((item, index) => {
          const barWidth = (item.value / maxValue) * 100
          const targetWidth = showTargets && item.target ? (item.target / maxValue) * 100 : 0
          const barColor = item.color || colors.blue
          const unit = item.unit || 'h'
          
          return (
            <div key={index} className="space-y-2">
              {/* Label */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                {showValues && showValuesOutside && (
                  <div className="text-sm font-semibold text-gray-800">
                    {Math.round(item.value * 10) / 10}{unit}
                  </div>
                )}
              </div>
              
              {/* Bar Container with Baseline */}
              <div className="relative">
                {/* Background Track */}
                <div className="w-full h-6 bg-gray-100 rounded-full border border-gray-200 shadow-inner">
                  {/* Target Indicator (if applicable) */}
                  {showTargets && item.target && (
                    <div 
                      className="absolute top-0 h-6 bg-gray-300 rounded-full opacity-50"
                      style={{ width: `${targetWidth}%` }}
                    />
                  )}
                  
                  {/* Progress Bar */}
                  <div 
                    className="h-6 rounded-full transition-all duration-500 ease-out hover:opacity-90 shadow-sm"
                    style={{ 
                      width: `${Math.max(barWidth, 2)}%`,
                      backgroundColor: barColor,
                      minWidth: item.value > 0 ? '8px' : '0px'
                    }}
                  />
                  
                  {/* Value Label on Bar */}
                  {showValues && item.value > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium text-white drop-shadow-sm">
                        {Math.round(item.value * 10) / 10}{unit}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Donut Chart Component
function DonutChart({ 
  data, 
  title, 
  size = 120,
  showValues = true
}: { 
  data: Array<{ label: string; value: number; color: string }>
  title: string
  size?: number
  showValues?: boolean
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const radius = size / 2 - 10
  const circumference = 2 * Math.PI * radius
  
  let cumulativePercentage = 0
  
  return (
    <div className="w-full">
      <h4 className="text-sm font-medium text-gray-700 mb-3">{title}</h4>
      <div className="flex items-center justify-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100
              const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`
              const strokeDashoffset = -cumulativePercentage * circumference / 100
              
              cumulativePercentage += percentage
              
              return (
                <circle
                  key={index}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="8"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500 ease-out"
                />
              )
            })}
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800">{Math.round(total * 10) / 10}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-4 space-y-1">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <div className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-600">{item.label}</span>
            </div>
            {showValues && (
              <span className="text-gray-800 font-medium">{Math.round(item.value * 10) / 10}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}


// function SortableCard({ id, children }: { id: string; children: React.ReactNode }) {
//   const {
//     attributes,
//     listeners,
//     setNodeRef,
//     transform,
//     transition,
//     isDragging,
//   } = useSortable({ id })

//   const style = {
//     transform: CSS.Transform.toString(transform),
//     transition,
//     opacity: isDragging ? 0.5 : 1,
//   }

//   return (
//     <div
//       ref={setNodeRef}
//       style={style}
//       {...attributes}
//       {...listeners}
//       className={`cursor-grab active:cursor-grabbing select-none hover:shadow-lg transition-shadow duration-200 ${isDragging ? 'z-50 shadow-2xl' : ''}`}
//     >
//       {children}
//     </div>
//   )
// }


