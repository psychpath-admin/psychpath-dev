import React from 'react'
import './App.css'
import Navbar from '@/components/Navbar'
import RegistrarNavigation from '@/components/registrar/RegistrarNavigation'
import PathwaySwitcher from '@/components/PathwaySwitcher'
import { AuthProvider } from '@/context/AuthContext'
import EPAList from '@/components/EPAList'
import ReflectionLog from '@/components/ReflectionLog'
import LoginPage from '@/pages/LoginPage'
import { Routes, Route, Navigate } from 'react-router-dom'
import EPADetail from '@/pages/EPADetail'
import SupervisorQueue from '@/pages/SupervisorQueue'
import OrgDashboard from '@/pages/OrgDashboard'
import SupervisorLinks from '@/pages/SupervisorLinks'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import MyReflections from '@/pages/MyReflections'
import LogbookDashboard from '@/pages/LogbookDashboard'
import WeeklyLogbookDashboard from '@/pages/WeeklyLogbookDashboard'
import WeeklyLogbookEditor from '@/pages/WeeklyLogbookEditor'
import LogbookPage from '@/pages/LogbookPage'
import LogbookEditor from '@/pages/LogbookEditor'
import EditRejectedLogbook from '@/pages/EditRejectedLogbook'
import SectionA from '@/pages/SectionA'
import SectionB from '@/pages/SectionB'
import SectionC from '@/pages/SectionC'
import Dashboard from '@/pages/Dashboard'
import CRAEdit from '@/pages/CRAEdit'
import UserProfile from '@/pages/UserProfile'
import ForgotPassword from '@/pages/ForgotPassword'
import RegisterTerms from '@/pages/RegisterTerms'
import RegisterDetails from '@/pages/RegisterDetails'
import RegisterVerify from '@/pages/RegisterVerify'
import RegisterSubscribe from '@/pages/RegisterSubscribe'
import SupervisorDashboard from '@/pages/SupervisorDashboard'
import SupervisorLogbookReview from '@/pages/SupervisorLogbookReview'
import LogbookReview from '@/pages/LogbookReview'
import NotificationCenter from '@/pages/NotificationCenter'
import CalendarPage from '@/pages/CalendarPage'
import ErrorHelp from '@/pages/ErrorHelp'
import ErrorBoundary from '@/components/ErrorBoundary'
import { setupGlobalErrorHandling } from '@/lib/errorLogger'
import { Toaster } from 'sonner'
// Registrar imports
import RegistrarDashboard from '@/components/registrar/RegistrarDashboard'
import RegistrarProgramSetup from '@/pages/registrar/RegistrarProgramSetup'
import RegistrarPracticeLog from '@/pages/registrar/RegistrarPracticeLog'
import RegistrarPracticeEntryForm from '@/pages/registrar/RegistrarPracticeEntryForm'
import RegistrarSupervisionLog from '@/pages/registrar/RegistrarSupervisionLog'
import RegistrarReports from '@/pages/registrar/RegistrarReports'
import CompetenciesHelp from '@/pages/CompetenciesHelp'

// Component to redirect users to appropriate dashboard based on role
const DashboardRedirect: React.FC<{ userRole?: string }> = ({ userRole }) => {
  if (userRole === 'REGISTRAR') {
    // For now, redirect to registrar dashboard - the dashboard will handle the case where no programs exist
    return <Navigate to="/registrar" replace />
  }
  
  return <Dashboard userRole={userRole} />
}

function App() {
  const [me, setMe] = useState<{ role?: string } | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Setup global error handling
  React.useEffect(() => {
    setupGlobalErrorHandling()
  }, [])

  useEffect(() => {
    console.log('App: Starting auth check')
    const token = localStorage.getItem('accessToken')
    if (!token) {
      console.log('App: No token, setting loaded to true')
      setLoaded(true)
      return
    }
    console.log('App: Token found, checking /api/me/')
    apiFetch('/api/me/').then(async (r) => {
      if (r.ok) {
        const userData = await r.json()
        console.log('App: User data received:', userData)
        console.log('App: User role:', userData.role)
        console.log('App: User role type:', typeof userData.role)
        setMe(userData)
      } else {
        console.log('App: Auth failed, status:', r.status)
        // Clear invalid tokens
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        setMe(null)
      }
    }).catch((error) => {
      console.log('App: Auth error:', error)
      // Clear invalid tokens on error
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      setMe(null)
    }).finally(() => {
      console.log('App: Setting loaded to true')
      setLoaded(true)
    })
  }, [])

  const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    if (!me) return <Navigate to="/login" replace />
    
    const isRegistrarPath = window.location.pathname.startsWith('/registrar')
    
    return (
      <>
        {isRegistrarPath ? <RegistrarNavigation /> : <Navbar />}
        <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
          {(me.role === 'REGISTRAR') && (
            <PathwaySwitcher 
              userRole={me.role}
              hasRegistrarProgram={true}
              hasProvisionalProgram={true}
            />
          )}
          {children}
        </main>
      </>
    )
  }

  const PublicRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    // For registration flow, don't show navbar
    return children
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="min-h-screen">
          {!loaded ? null : (
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/register" element={<PublicRoute><RegisterTerms /></PublicRoute>} />
          <Route path="/register/details" element={<PublicRoute><RegisterDetails /></PublicRoute>} />
          <Route path="/register/verify" element={<PublicRoute><RegisterVerify /></PublicRoute>} />
          <Route path="/register/subscribe" element={<PublicRoute><RegisterSubscribe /></PublicRoute>} />

          <Route path="/" element={<RequireAuth><DashboardRedirect userRole={me?.role} /></RequireAuth>} />
          <Route path="/epas" element={<RequireAuth><><EPAList /><section id="reflections"><ReflectionLog /></section></></RequireAuth>} />
          <Route path="/epa/:code" element={<RequireAuth><EPADetail /></RequireAuth>} />
          <Route path="/section-a" element={<RequireAuth><SectionA /></RequireAuth>} />
          <Route path="/section-a/create" element={<RequireAuth><SectionA /></RequireAuth>} />
          <Route path="/section-a/edit/:id" element={<RequireAuth><SectionA /></RequireAuth>} />
          <Route path="/section-b" element={<RequireAuth><SectionB /></RequireAuth>} />
          <Route path="/section-c" element={<RequireAuth><SectionC /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><UserProfile /></RequireAuth>} />
          <Route path="/me/reflections" element={<RequireAuth><MyReflections /></RequireAuth>} />
          <Route path="/logbook" element={<RequireAuth><LogbookPage /></RequireAuth>} />
          <Route path="/logbook/week/:weekStart" element={<RequireAuth><WeeklyLogbookEditor /></RequireAuth>} />
          <Route path="/logbook/old" element={<RequireAuth><LogbookPage /></RequireAuth>} />
          <Route path="/logbook/:id" element={<RequireAuth><LogbookEditor /></RequireAuth>} />
          <Route path="/logbook/:id/edit" element={<RequireAuth><EditRejectedLogbook /></RequireAuth>} />
          <Route path="/section-a/cra-edit" element={<RequireAuth><CRAEdit /></RequireAuth>} />
          <Route path="/notifications" element={<RequireAuth><NotificationCenter /></RequireAuth>} />
          <Route path="/calendar" element={<RequireAuth><CalendarPage /></RequireAuth>} />
          <Route path="/help/errors" element={<ErrorHelp />} />
          <Route path="/competencies-help" element={<CompetenciesHelp />} />
          {/* Registrar Routes */}
                    {me?.role === 'REGISTRAR' && <Route path="/registrar" element={<RequireAuth><RegistrarDashboard /></RequireAuth>} />}
                    {me?.role === 'REGISTRAR' && <Route path="/registrar/setup" element={<RequireAuth><RegistrarProgramSetup /></RequireAuth>} />}
                    {me?.role === 'REGISTRAR' && <Route path="/registrar/practice" element={<RequireAuth><RegistrarPracticeLog /></RequireAuth>} />}
                    {me?.role === 'REGISTRAR' && <Route path="/registrar/practice/new" element={<RequireAuth><RegistrarPracticeEntryForm /></RequireAuth>} />}
                    {me?.role === 'REGISTRAR' && <Route path="/registrar/practice/:id/edit" element={<RequireAuth><RegistrarPracticeEntryForm /></RequireAuth>} />}
                    {me?.role === 'REGISTRAR' && <Route path="/registrar/supervision" element={<RequireAuth><RegistrarSupervisionLog /></RequireAuth>} />}
                    {me?.role === 'REGISTRAR' && <Route path="/registrar/reports" element={<RequireAuth><RegistrarReports /></RequireAuth>} />}
      {me?.role === 'SUPERVISOR' && <Route path="/supervisor/queue" element={<RequireAuth><SupervisorQueue /></RequireAuth>} />}
      {me?.role === 'SUPERVISOR' && <Route path="/supervisor/links" element={<RequireAuth><SupervisorLinks /></RequireAuth>} />}
      {me?.role === 'SUPERVISOR' && <Route path="/supervisor/dashboard" element={<RequireAuth><SupervisorDashboard /></RequireAuth>} />}
      {me?.role === 'SUPERVISOR' && <Route path="/supervisor/logbook-review" element={<RequireAuth><SupervisorLogbookReview /></RequireAuth>} />}
          {me?.role === 'SUPERVISOR' && <Route path="/logbooks/:id/review" element={<RequireAuth><LogbookReview /></RequireAuth>} />}
          {me?.role === 'ORG_ADMIN' && <Route path="/org" element={<RequireAuth><OrgDashboard /></RequireAuth>} />}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        )}
        <Toaster position="top-right" richColors />
      </div>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App