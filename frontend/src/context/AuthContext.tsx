import React, { createContext, useContext, useEffect, useState } from 'react'
import { authApi, User } from '../lib/api'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('aba_token')
    const cachedUser = localStorage.getItem('aba_user')
    if (token && cachedUser) {
      setUser(JSON.parse(cachedUser))
      authApi.me().then(res => {
        setUser(res.data)
        localStorage.setItem('aba_user', JSON.stringify(res.data))
      }).catch(() => {
        localStorage.removeItem('aba_token')
        localStorage.removeItem('aba_user')
        setUser(null)
      }).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const persist = (token: string, u: User) => {
    localStorage.setItem('aba_token', token)
    localStorage.setItem('aba_user', JSON.stringify(u))
    setUser(u)
  }

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    persist(res.data.access_token, res.data.user)
  }

  const register = async (email: string, password: string, fullName?: string) => {
    const res = await authApi.register(email, password, fullName)
    persist(res.data.access_token, res.data.user)
  }

  const logout = () => {
    localStorage.removeItem('aba_token')
    localStorage.removeItem('aba_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
