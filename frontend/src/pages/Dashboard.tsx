import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSectionAEntries, getPDMetrics, getSupervisionMetrics, getProgramSummary } from '@/lib/api'
import type { PDMetrics } from '@/types/pd'
import type { SupervisionMetrics } from '@/types/supervision'
import type { ProgramSummary } from '@/types/program'
import { InternshipValidationCard } from '@/components/InternshipValidationCard'
import RegistrarSummaryCard from '@/components/RegistrarSummaryCard'
import PendingSupervisionRequests from '@/components/PendingSupervisionRequests'
import SupervisorDashboard from '@/pages/SupervisorDashboard'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type Entry = {
  id: number
  entry_type: 'client_contact' | 'cra' | 'icra' | string
  simulated?: boolean
  duration_minutes?: number | string
}

type DashboardCard = {
  id: string
  type: 'donut' | 'bar' | 'traffic-light'
  title: string
  component: React.ReactNode
}

function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10
}

interface DashboardProps {
  userRole?: string
}

export default function Dashboard({ userRole }: DashboardProps) {
  console.log('Dashboard: Component rendering, userRole:', userRole)
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<Entry[]>([])
  const [pdMetrics, setPdMetrics] = useState<PDMetrics | null>(null)
  const [supervisionMetrics, setSupervisionMetrics] = useState<SupervisionMetrics | null>(null)
  const [programSummary, setProgramSummary] = useState<ProgramSummary | null>(null)
  const [cardOrder, setCardOrder] = useState<string[]>([])
  const [refreshKey, setRefreshKey] = useState(0) // For triggering refreshes

  // Function to trigger dashboard refresh (called by child components)
  const handleSupervisionUpdate = () => {
    setRefreshKey(prev => prev + 1)
    // Also refresh data
    fetchData()
  }

  // Load saved card order from localStorage
  useEffect(() => {
    console.log('Dashboard: Loading card order from localStorage')
    const savedOrder = localStorage.getItem('dashboard-card-order')
    let cardOrderToSet = ['supervision_requests', 'overall', 'practice', 'supervision', 'supervision_hours', 'dcc', 'cra', 'sdcc', 'pd', 'internship_validation']
    
    if (savedOrder) {
      const parsed = JSON.parse(savedOrder)
      // Ensure PD, supervision_hours and internship_validation are always included in the order
      if (!parsed.includes('pd')) {
        parsed.push('pd')
      }
      if (!parsed.includes('supervision_hours')) {
        parsed.push('supervision_hours')
      }
      if (!parsed.includes('internship_validation')) {
        parsed.push('internship_validation')
      }
      if (!parsed.includes('registrar_summary')) {
        parsed.push('registrar_summary')
      }
      cardOrderToSet = parsed
    }
    
    console.log('Dashboard: Setting card order:', cardOrderToSet)
    setCardOrder(cardOrderToSet)
  }, [])

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
    
    return () => { mounted = false }
  }, [])

  const metrics = useMemo(() => {
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
    const intTotal = prac // placeholder until PD and SUPER wired
    return { dcc, cra, sdcc, prac, intTotal }
  }, [entries])

  const targets = {
    int: 1500,
    prac: 1360,
    dccMin: 500,
    craMin: 860,
    sdccCap: 60,
    pd: 60, // 60 hours of professional development
    supervisionRatio: 17, // 1 hour supervision per 17 hours practice
  }

  const percent = (value: number, target: number) => Math.max(0, Math.min(100, Math.round((value / target) * 100)))
  
  // Calculate supervision ratio status
  const supervisionStatus = useMemo(() => {
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

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    // Re-enable text selection after drag
    document.body.style.userSelect = ''

    if (active.id !== over?.id) {
      setCardOrder((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over?.id as string)
        const newOrder = arrayMove(items, oldIndex, newIndex)

        // Save to localStorage
        localStorage.setItem('dashboard-card-order', JSON.stringify(newOrder))
        return newOrder
      })
    }
  }

  // Handle drag start
  const handleDragStart = () => {
    // Prevent text selection during drag
    document.body.style.userSelect = 'none'
  }

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
          description="Total internship hours including practice, professional development, and supervision. Must reach 1500 hours to complete internship requirements."
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
          subtitle={`Min 500h and ≥40% of PRAC (now: ${metrics.prac ? Math.round((metrics.dcc/metrics.prac)*100) : 0}%)`}
          state={metrics.dcc >= 500 ? 'ok' : 'warn'}
          description="Face-to-face or telehealth sessions with clients including assessments, interventions, and interviews. Must be at least 40% of your practice hours."
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
              {pdMetrics?.total_pd_hours || '0:00'} <span className="text-sm text-textLight">/ 60:00</span>
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
              {supervisionMetrics?.total_supervision_hours || '0:00'} <span className="text-sm text-textLight">/ 80:00</span>
            </div>
            <div className="h-2 w-full rounded bg-gray-100 mb-3">
              <div 
                className={`h-2 rounded ${supervisionMetrics && supervisionMetrics.total_supervision_minutes >= 80 * 60 ? 'bg-primaryBlue' : 'bg-amber-500'}`} 
                style={{ width: `${Math.max(0, Math.min(100, Math.round((supervisionHours / 80) * 100)))}%` }} 
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
    return <div>Loading dashboard...</div>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headings text-3xl text-textDark">Provisional Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const defaultOrder = ['overall', 'practice', 'supervision', 'supervision_hours', 'dcc', 'cra', 'sdcc', 'pd', 'supervision_requests', 'internship_validation', 'registrar_summary']
              setCardOrder(defaultOrder)
              localStorage.setItem('dashboard-card-order', JSON.stringify(defaultOrder))
              console.log('Dashboard: Reset layout to default order')
            }}
            className="px-3 py-2 rounded-md border text-sm text-textLight hover:text-textDark"
          >
            Reset Layout
          </button>
          <Link to="/section-a" className="px-3 py-2 rounded-md bg-primaryBlue text-white text-sm">Open Section A</Link>
          <Link to="/section-b" className="px-3 py-2 rounded-md bg-green-600 text-white text-sm">Open Section B</Link>
          <Link to="/section-c" className="px-3 py-2 rounded-md bg-purple-600 text-white text-sm">Open Section C</Link>
          <Link to="/logbook" className="px-3 py-2 rounded-md border text-sm">Open Logbook</Link>
        </div>
      </div>

      {/* Professional Practice Definition */}
      <div className="rounded-lg border bg-blue-50 p-4">
        <h3 className="font-semibold text-textDark mb-2">Professional Practice Definition</h3>
        <p className="text-sm text-textLight leading-relaxed">
          Professional practice includes all activities that contribute to your development as a psychologist, 
          including Direct Client Contact (DCC), Client-Related Activities (CRA), Professional Development (PD), 
          and Supervision (SUP). The 1:17 supervision ratio means you need 1 hour of supervision for every 
          17 hours of professional practice.
        </p>
      </div>

      {/* Drag and Drop Instructions */}
      <div className="rounded-lg border bg-gray-50 p-3">
        <p className="text-xs text-textLight">
          💡 <strong>Tip:</strong> Drag and drop the cards below to rearrange your dashboard. Your layout will be saved automatically.
        </p>
      </div>

      {/* Fallback if drag and drop fails */}
      {cardOrder.length === 0 && (
        <div className="text-center py-8">
          <p className="text-textLight">Loading dashboard cards...</p>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-textLight">Loading metrics…</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={cardOrder} strategy={verticalListSortingStrategy}>
            <div className="grid gap-4 md:grid-cols-2">
              {cardOrder.map((cardId) => {
                const card = dashboardCards[cardId]
                if (!card) {
                  console.log('Dashboard: Missing card for', cardId)
                  return null
                }
                
                // Role-based card filtering
                const userRole = programSummary?.role
                if (cardId === 'internship_validation' && userRole !== 'PROVISIONAL') {
                  return null // Hide internship validation for non-provisionals
                }
                if (cardId === 'registrar_summary' && userRole !== 'REGISTRAR') {
                  return null // Hide registrar summary for non-registrars
                }
                
                console.log('Dashboard: Rendering card', cardId, card.title)
                
                return (
                  <SortableCard key={cardId} id={cardId}>
                    {card.component}
                  </SortableCard>
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="text-xs text-textLight">PD and Supervision metrics will be added next.</div>
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
          <div className="text-2xl font-semibold text-textDark">{value}h <span className="text-sm text-textLight">/ {target}h</span></div>
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
      <div className="mb-2 text-xl font-semibold text-textDark">{value}h <span className="text-sm text-textLight">/ {target}h</span></div>
      <div className="h-2 w-full rounded bg-gray-100 mb-3">
        <div className={`h-2 rounded ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {description && <div className="text-xs text-textLight leading-relaxed">{description}</div>}
    </div>
  )
}

function Progress({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full rounded bg-gray-100">
      <div className="h-2 rounded bg-primaryBlue" style={{ width: `${percent}%` }} />
    </div>
  )
}

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

function SortableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing select-none hover:shadow-lg transition-shadow duration-200 ${isDragging ? 'z-50 shadow-2xl' : ''}`}
    >
      {children}
    </div>
  )
}


