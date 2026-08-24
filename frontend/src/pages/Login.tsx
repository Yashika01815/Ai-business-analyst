import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BrainCircuit, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not sign in. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-ink-950 bg-grid-fade flex items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-glow">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-semibold text-[16px]">AI Business Analyst</span>
        </div>

        <div className="card p-7">
          <h1 className="text-[19px] font-display font-semibold text-center">Welcome back</h1>
          <p className="text-[13px] text-slate-500 text-center mt-1">Sign in to access your analytics workspace</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-[12.5px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/[0.03] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 text-[13.5px] transition-all"
                placeholder="you@company.com" />
            </div>
            <div>
              <label className="text-[12.5px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/[0.03] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 text-[13.5px] transition-all"
                placeholder="••••••••" />
            </div>

            {error && <p className="text-[12.5px] text-coral-400 bg-coral-500/10 border border-coral-500/20 rounded-lg px-3 py-2">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent-600 text-white hover:bg-accent-500 disabled:opacity-60 transition-colors font-medium text-[13.5px]">
              {loading && <Loader2 size={15} className="animate-spin" />}
              Sign in
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] text-slate-500 mt-5">
          Don't have an account? <Link to="/register" className="text-accent-400 hover:text-accent-300 font-medium">Create one</Link>
        </p>
      </motion.div>
    </div>
  )
}
