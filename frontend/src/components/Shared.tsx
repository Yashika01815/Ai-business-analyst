import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export function EmptyState({
  icon: Icon, title, description, actionLabel, actionTo,
}: { icon: LucideIcon; title: string; description: string; actionLabel?: string; actionTo?: string }) {
  const navigate = useNavigate()
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card flex flex-col items-center justify-center text-center py-20 px-6"
    >
      <div className="w-14 h-14 rounded-2xl bg-accent-500/10 flex items-center justify-center mb-4">
        <Icon size={24} className="text-accent-400" />
      </div>
      <h3 className="text-[16px] font-display font-semibold">{title}</h3>
      <p className="text-[13.5px] text-slate-500 mt-1.5 max-w-sm">{description}</p>
      {actionLabel && actionTo && (
        <button
          onClick={() => navigate(actionTo)}
          className="mt-5 px-4 py-2 rounded-xl bg-accent-600 text-white hover:bg-accent-500 transition-colors text-[13px] font-medium"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  )
}

export function Loader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-slate-900/10 dark:border-white/10 border-t-accent-400 animate-spin" />
      <p className="text-[13px] text-slate-500">{label}</p>
    </div>
  )
}

const badgeStyles: Record<string, string> = {
  positive: 'text-mint-400 bg-mint-500/10 border-mint-500/20',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  critical: 'text-coral-400 bg-coral-500/10 border-coral-500/20',
  info: 'text-accent-400 bg-accent-500/10 border-accent-500/20',
  neutral: 'text-slate-500 dark:text-slate-400 bg-black/[0.03] dark:bg-white/5 border-slate-900/10 dark:border-white/10',
}

export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof badgeStyles; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badgeStyles[tone]}`}>
      {children}
    </span>
  )
}

export function SectionCard({ title, subtitle, children, right }: {
  title?: string; subtitle?: string; children: ReactNode; right?: ReactNode
}) {
  return (
    <div className="card p-6">
      {(title || right) && (
        <div className="flex items-start justify-between mb-4 gap-4">
          <div>
            {title && <h3 className="text-[15px] font-display font-semibold">{title}</h3>}
            {subtitle && <p className="text-[13px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  )
}
