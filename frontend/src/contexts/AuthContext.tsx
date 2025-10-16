import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getStoredTokens, clearAuthData } from '@/lib/tokenUtils'
import { apiFetch } from '@/lib/api'

interface User {
  id: number
  email: string
  role: string
  first_name?: string
  last_name?: string
  profile_completed?: boolean
  first_login_completed?: boolean
  supervisor_welcome_seen?: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = user !== null

  const logout = useCallback(() => {
    console.log('AuthContext: Logging out')
    clearAuthData()
    setUser(null)
    // Don't automatically redirect - let RequireAuth component handle it
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      console.log('AuthContext: Fetching user data...')
      const response = await apiFetch('/api/me/')
      
      if (response.ok) {
        const userData = await response.json()
        console.log('AuthContext: User data received:', userData)
        setUser(userData)
      } else {
        console.log('AuthContext: Failed to fetch user data:', response.status)
        // Clear tokens silently, don't force logout
        clearAuthData()
        setUser(null)
      }
    } catch (error) {
      console.error('AuthContext: Error fetching user data:', error)
      // Clear tokens silently, don't force logout
      clearAuthData()
      setUser(null)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true)
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Login failed')
      }

      const data = await response.json()
      
      // Store tokens
      localStorage.setItem('accessToken', data.access)
      localStorage.setItem('refreshToken', data.refresh)
      localStorage.setItem('lastTokenRefresh', Date.now().toString())

      // Fetch user data
      await refreshUser()
    } catch (error) {
      console.error('AuthContext: Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [refreshUser])

  // Initialize authentication state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('AuthContext: Initializing authentication...')
      
      const { accessToken } = getStoredTokens()
      
      if (!accessToken) {
        console.log('AuthContext: No token found, ready for login')
        setIsLoading(false)
        return
      }

      // Token exists, try to fetch user data
      console.log('AuthContext: Token found, fetching user data...')
      try {
        const response = await apiFetch('/api/me/')
        
        if (response.ok) {
          const userData = await response.json()
          console.log('AuthContext: User authenticated:', userData.email)
          setUser(userData)
        } else {
          console.log('AuthContext: Token invalid, clearing silently')
          clearAuthData()
        }
      } catch (error) {
        console.error('AuthContext: Error during initialization:', error)
        clearAuthData()
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
    // Empty dependency array - only run once on mount
  }, [])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
