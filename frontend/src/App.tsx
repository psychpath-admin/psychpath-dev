import './App.css'
import Navbar from '@/components/Navbar'
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
import LogbookPage from '@/pages/LogbookPage'
import LogbookEditor from '@/pages/LogbookEditor'
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

function App() {
  const [me, setMe] = useState<{ role?: string } | null>(null)
  const [loaded, setLoaded] = useState(false)

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
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
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
    <div className="min-h-screen">
      {!loaded ? null : (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/register" element={<PublicRoute><RegisterTerms /></PublicRoute>} />
          <Route path="/register/details" element={<PublicRoute><RegisterDetails /></PublicRoute>} />
          <Route path="/register/verify" element={<PublicRoute><RegisterVerify /></PublicRoute>} />
          <Route path="/register/subscribe" element={<PublicRoute><RegisterSubscribe /></PublicRoute>} />

          <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/epas" element={<RequireAuth><><EPAList /><section id="reflections"><ReflectionLog /></section></></RequireAuth>} />
          <Route path="/epa/:code" element={<RequireAuth><EPADetail /></RequireAuth>} />
          <Route path="/section-a" element={<RequireAuth><SectionA /></RequireAuth>} />
          <Route path="/section-b" element={<RequireAuth><SectionB /></RequireAuth>} />
          <Route path="/section-c" element={<RequireAuth><SectionC /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><UserProfile /></RequireAuth>} />
          <Route path="/me/reflections" element={<RequireAuth><MyReflections /></RequireAuth>} />
          <Route path="/logbook" element={<RequireAuth><LogbookPage /></RequireAuth>} />
          <Route path="/logbook/:id" element={<RequireAuth><LogbookEditor /></RequireAuth>} />
          <Route path="/logbook/:id/edit" element={<RequireAuth><LogbookEditor /></RequireAuth>} />
          <Route path="/section-a/cra-edit" element={<RequireAuth><CRAEdit /></RequireAuth>} />
          {me?.role === 'SUPERVISOR' && <Route path="/supervisor/queue" element={<RequireAuth><SupervisorQueue /></RequireAuth>} />}
          {me?.role === 'SUPERVISOR' && <Route path="/supervisor/links" element={<RequireAuth><SupervisorLinks /></RequireAuth>} />}
          {me?.role === 'ORG_ADMIN' && <Route path="/org" element={<RequireAuth><OrgDashboard /></RequireAuth>} />}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </div>
  )
}

export default App