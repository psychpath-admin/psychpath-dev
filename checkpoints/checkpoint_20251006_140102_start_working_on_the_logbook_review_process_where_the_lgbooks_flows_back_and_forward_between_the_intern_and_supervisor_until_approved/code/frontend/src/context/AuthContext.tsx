import React, { createContext, useContext, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

interface User {
  id: number
  email: string
  role: string
  [key: string]: any
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setLoading(false)
      return
    }

    apiFetch('/api/me/').then(async (r) => {
      if (r.ok) {
        const userData = await r.json()
        setUser(userData)
      } else {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        setUser(null)
      }
    }).catch((error) => {
      console.error('Auth error:', error)
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      setUser(null)
    }).finally(() => {
      setLoading(false)
    })
  }, [])

  const login = (token: string) => {
    localStorage.setItem('accessToken', token)
    // Reload user data
    apiFetch('/api/me/').then(async (r) => {
      if (r.ok) {
        const userData = await r.json()
        setUser(userData)
      }
    })
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
