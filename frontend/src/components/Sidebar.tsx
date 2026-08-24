import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, UploadCloud, Table2, ShieldCheck, BarChart3, Sparkles,
  MessageSquareText, TrendingUp, Users, AlertTriangle, Sliders, Lightbulb,
  FileText, Zap, History, Settings, LogOut, BrainCircuit,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/upload', label: 'Upload Dataset', icon: UploadCloud },
      { to: '/explorer', label: 'Dataset Explorer', icon: Table2 },
      { to: '/data-quality', label: 'Data Quality', icon: ShieldCheck },
    ],
  },
  {
    label: 'Analyze',
    items: [
      { to: '/analytics', label: 'Visual Analytics', icon: BarChart3 },
      { to: '/insights', label: 'Automated Insights', icon: Sparkles },
      { to: '/ask', label: 'Ask Your Data', icon: MessageSquareText },
      { to: '/anomalies', label: 'Anomaly Detection', icon: AlertTriangle },
    ],
  },
  {
    label: 'Predict & Decide',
    items: [
      { to: '/forecasting', label: 'Forecasting Studio', icon: TrendingUp },
      { to: '/segmentation', label: 'Segmentation', icon: Users },
      { to: '/simulator', label: 'Decision Simulator', icon: Sliders },
      { to: '/recommendations', label: 'Recommendations', icon: Lightbulb },
    ],
  },
  {
    label: 'Operate',
    items: [
      { to: '/reports', label: 'Reports', icon: FileText },
      { to: '/automation', label: 'Automation Center', icon: Zap },
      { to: '/history', label: 'Analysis History', icon: History },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export default function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 border-r border-slate-900/[0.06] dark:border-white/5 bg-white/70 dark:bg-ink-900/60">
      <div className="px-5 py-6 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-glow">
          <BrainCircuit className="w-4.5 h-4.5 text-white" size={18} />
        </div>
        <span className="font-display font-semibold text-[15px] tracking-tight">AI Business Analyst</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-colors ${
                      isActive
                        ? 'text-accent-700 dark:text-white bg-accent-500/15'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-black/[0.03] dark:hover:bg-white/5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-accent-400"
                          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                        />
                      )}
                      <item.icon size={16} strokeWidth={2} className={isActive ? 'text-accent-400' : ''} />
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-900/[0.06] dark:border-white/5">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500/40 to-accent-700/40 flex items-center justify-center text-xs font-semibold">
            {user?.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium truncate">{user?.full_name || user?.email}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-md text-slate-500 hover:text-coral-400 hover:bg-black/[0.03] dark:hover:bg-white/5 transition-colors"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
