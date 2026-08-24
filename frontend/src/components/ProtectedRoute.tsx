import { Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { Loader } from './Shared'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-ink-950"><Loader label="Checking your session…" /></div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
