import React from 'react'
import './App.css'
import Navbar from '@/components/Navbar'
import RegistrarNavigation from '@/components/registrar/RegistrarNavigation'
import PathwaySwitcher from '@/components/PathwaySwitcher'
import LoginPage from '@/pages/LoginPage'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import EPADetail from '@/pages/EPADetail'
import SupervisorQueue from '@/pages/SupervisorQueue'
import OrgDashboard from '@/pages/OrgDashboard'
import SupervisorLinks from '@/pages/SupervisorLinks'
import { useState } from 'react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import MyReflections from '@/pages/MyReflections'
import WeeklyLogbookEditor from '@/pages/WeeklyLogbookEditor'
import LogbookPage from '@/pages/LogbookPage'
import LogbookEditor from '@/pages/LogbookEditor'
import EditRejectedLogbook from '@/pages/EditRejectedLogbook'
import SectionA from '@/pages/SectionA'
import SectionB from '@/pages/SectionB'
import SectionC from '@/pages/SectionC'
import CRAForm from '@/components/CRAForm'
import SupervisionInvitations from '@/pages/SupervisionInvitations'
import SupportTickets from '@/pages/SupportTickets'
import Roadmap from '@/pages/Roadmap'

// Wrapper component for CRA form to handle routing
function CRAFormWrapper() {
  const navigate = useNavigate()
  const location = useLocation()
  const [saving, setSaving] = useState(false)
  const [entryForm, setEntryForm] = useState({
    session_date: new Date().toISOString().split('T')[0],
    client_id: '',
    place_of_practice: '',
    client_age: '',
    presenting_issues: '',
    session_activity_types: [] as string[],
    duration_minutes: '15',
    reflections_on_experience: '',
    entry_type: 'cra',
    parent_dcc_entry: null
  })
  const [customActivityTypes, setCustomActivityTypes] = useState<string[]>([])
  const [newCustomActivityType, setNewCustomActivityType] = useState('')
  const [clientSuggestions] = useState<string[]>([])
  const entryId = (location.state as any)?.entryId
  const isEditing = !!entryId
  
  const handleCancel = () => {
    const returnTo = (location.state as any)?.returnTo
    if (returnTo) {
      navigate(returnTo)
    } else {
      // Default fallback to Section A dashboard
      navigate('/section-a')
    }
  }
  
  const handleSubmit = async (data: any) => {
    setSaving(true)
    try {
      if (isEditing) {
        // Handle edit logic here
        console.log('Editing CRA entry:', data)
      } else {
        // Handle create logic here
        console.log('Creating CRA entry:', data)
      }
      handleCancel()
    } catch (error) {
      console.error('Error saving CRA entry:', error)
    } finally {
      setSaving(false)
    }
  }
  
  
  const handleAddCustomActivityType = () => {
    if (newCustomActivityType.trim()) {
      setCustomActivityTypes(prev => [...prev, newCustomActivityType.trim()])
      setNewCustomActivityType('')
    }
  }
  
  const handleDeleteCustomActivityType = (index: number) => {
    setCustomActivityTypes(prev => prev.filter((_, i) => i !== index))
  }
  
  const calculateWeekStarting = (date: string) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff)).toISOString().split('T')[0]
  }
  
  const handleClientIdChange = () => {
    // Handle client ID changes if needed
  }
  
  return (
    <CRAForm
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      saving={saving}
      entryForm={entryForm}
      setEntryForm={setEntryForm}
      handleAddCustomActivityType={handleAddCustomActivityType}
      newCustomActivityType={newCustomActivityType}
      setNewCustomActivityType={setNewCustomActivityType}
      customActivityTypes={customActivityTypes}
      handleDeleteCustomActivityType={handleDeleteCustomActivityType}
      calculateWeekStarting={calculateWeekStarting}
      title={isEditing ? 'Edit Client Related Activity (CRA)' : 'Add Client Related Activity (CRA)'}
      showClientIdInput={true}
      onClientIdChange={handleClientIdChange}
      clientSuggestions={clientSuggestions}
      isEditing={isEditing}
    />
  )
}
import Dashboard from '@/pages/Dashboard'
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
import CoreCompetencyReference from '@/pages/CoreCompetencyReference'
import CoreCompetencyViewer from '@/pages/CoreCompetencyViewer'
import EPABrowser from '@/pages/EPABrowser'
import EPACoverageAudit from '@/pages/EPACoverageAudit'
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
import ConfigurationManagement from '@/pages/ConfigurationManagement'
import ConfigurationExample from '@/components/ConfigurationExample'
import CompetenciesHelp from '@/pages/CompetenciesHelp'
import ReportIssueButton from '@/components/ReportIssueButton'
import { ModalProvider } from '@/contexts/ModalContext'

// Component to redirect users to appropriate dashboard based on role
const DashboardRedirect: React.FC<{ userRole?: string }> = ({ userRole }) => {
  if (userRole === 'REGISTRAR') {
    // For now, redirect to registrar dashboard - the dashboard will handle the case where no programs exist
    return <Navigate to="/registrar" replace />
  }
  
  return <Dashboard userRole={userRole} />
}

function AppContent() {
  const { user, isLoading } = useAuth()

  // Setup global error handling
  React.useEffect(() => {
    setupGlobalErrorHandling()
  }, [])

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    if (!user) return <Navigate to="/login" replace />
    
    const isRegistrarPath = window.location.pathname.startsWith('/registrar')
    
    return (
      <>
        {isRegistrarPath ? <RegistrarNavigation /> : <Navbar />}
        <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
          {(user.role === 'REGISTRAR') && (
            <PathwaySwitcher 
              userRole={user.role}
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
    <ModalProvider>
      <div className="min-h-screen">
        {user && <ReportIssueButton />}
      <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/register" element={<PublicRoute><RegisterTerms /></PublicRoute>} />
          <Route path="/register/details" element={<PublicRoute><RegisterDetails /></PublicRoute>} />
          <Route path="/register/verify" element={<PublicRoute><RegisterVerify /></PublicRoute>} />
          <Route path="/register/subscribe" element={<PublicRoute><RegisterSubscribe /></PublicRoute>} />

          <Route path="/" element={<RequireAuth><DashboardRedirect userRole={user?.role} /></RequireAuth>} />
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
          <Route path="/section-a/cra" element={<RequireAuth><CRAFormWrapper /></RequireAuth>} />
          <Route path="/section-a/cra-edit" element={<RequireAuth><CRAFormWrapper /></RequireAuth>} />
          <Route path="/notifications" element={<RequireAuth><NotificationCenter /></RequireAuth>} />
          <Route path="/supervision-invitations" element={
            <RequireAuth>
              {user?.role === 'SUPERVISOR' ? (
                <Navigate to="/supervisor/dashboard" replace />
              ) : (
                <SupervisionInvitations />
              )}
            </RequireAuth>
          } />
          <Route path="/calendar" element={<RequireAuth><CalendarPage /></RequireAuth>} />
          <Route path="/competencies" element={<RequireAuth><CoreCompetencyReference /></RequireAuth>} />
          <Route path="/competency-viewer" element={<RequireAuth><CoreCompetencyViewer /></RequireAuth>} />
          <Route path="/epas" element={<RequireAuth><EPABrowser /></RequireAuth>} />
          {user?.role === 'ORG_ADMIN' && <Route path="/admin/epa-coverage" element={<RequireAuth><EPACoverageAudit /></RequireAuth>} />}
          <Route path="/help/errors" element={<ErrorHelp />} />
          <Route path="/competencies-help" element={<CompetenciesHelp />} />
          {/* Configuration Management Routes - Admin Only */}
          {user?.role === 'ORG_ADMIN' && <Route path="/admin/configuration" element={<RequireAuth><ConfigurationManagement /></RequireAuth>} />}
          <Route path="/config-demo" element={<RequireAuth><ConfigurationExample /></RequireAuth>} />
          {/* Registrar Routes */}
                    {user?.role === 'REGISTRAR' && <Route path="/registrar" element={<RequireAuth><RegistrarDashboard /></RequireAuth>} />}
                    {user?.role === 'REGISTRAR' && <Route path="/registrar/setup" element={<RequireAuth><RegistrarProgramSetup /></RequireAuth>} />}
                    {user?.role === 'REGISTRAR' && <Route path="/registrar/practice" element={<RequireAuth><RegistrarPracticeLog /></RequireAuth>} />}
                    {user?.role === 'REGISTRAR' && <Route path="/registrar/practice/new" element={<RequireAuth><RegistrarPracticeEntryForm /></RequireAuth>} />}
                    {user?.role === 'REGISTRAR' && <Route path="/registrar/practice/:id/edit" element={<RequireAuth><RegistrarPracticeEntryForm /></RequireAuth>} />}
                    {user?.role === 'REGISTRAR' && <Route path="/registrar/supervision" element={<RequireAuth><RegistrarSupervisionLog /></RequireAuth>} />}
                    {user?.role === 'REGISTRAR' && <Route path="/registrar/reports" element={<RequireAuth><RegistrarReports /></RequireAuth>} />}
      {user?.role === 'SUPERVISOR' && <Route path="/supervisor/queue" element={<RequireAuth><SupervisorQueue /></RequireAuth>} />}
      {user?.role === 'SUPERVISOR' && <Route path="/supervisor/links" element={<RequireAuth><SupervisorLinks /></RequireAuth>} />}
      {user?.role === 'SUPERVISOR' && <Route path="/supervisor/dashboard" element={<RequireAuth><SupervisorDashboard /></RequireAuth>} />}
      {user?.role === 'SUPERVISOR' && <Route path="/supervisor/logbook-review" element={<RequireAuth><SupervisorLogbookReview /></RequireAuth>} />}
          {user?.role === 'SUPERVISOR' && <Route path="/logbooks/:id/review" element={<RequireAuth><LogbookReview /></RequireAuth>} />}
          {user?.role === 'ORG_ADMIN' && <Route path="/org" element={<RequireAuth><OrgDashboard /></RequireAuth>} />}
          <Route path="/support-tickets" element={<RequireAuth><SupportTickets /></RequireAuth>} />
          <Route path="/roadmap" element={<RequireAuth><Roadmap /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </div>
    </ModalProvider>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App