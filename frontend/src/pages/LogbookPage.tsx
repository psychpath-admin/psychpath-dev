import React, { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import LogbookDashboard from './LogbookDashboard'
import SupervisorLogbookReview from './SupervisorLogbookReview'

export default function LogbookPage() {
  const [me, setMe] = useState<{ email?: string; role?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    console.log('LogbookPage: Token from localStorage:', token ? 'exists' : 'missing')
    if (!token) {
      setLoading(false)
      return
    }
    
    apiFetch('/api/me/')
      .then((r) => {
        console.log('LogbookPage: API response status:', r.status)
        return r.json()
      })
      .then((data) => {
        console.log('LogbookPage: User data received:', data)
        console.log('LogbookPage: User role:', data.role)
        setMe(data)
      })
      .catch((error) => {
        console.error('LogbookPage: Error fetching user data:', error)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  console.log('LogbookPage: Rendering with me:', me)
  console.log('LogbookPage: Role check - me?.role === "SUPERVISOR":', me?.role === 'SUPERVISOR')

  return (
    <div className="container mx-auto p-6">
      {me?.role === 'SUPERVISOR' ? (
        <SupervisorLogbookReview />
      ) : (
        <LogbookDashboard />
      )}
    </div>
  )
}
