import { motion } from 'framer-motion'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { KPI } from '../lib/api'

function formatValue(v: number | null) {
  if (v === null || v === undefined) return '—'
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export default function KpiCard({ kpi, index = 0 }: { kpi: KPI; index?: number }) {
  const trendPositive = (kpi.trend_pct ?? 0) > 0
  const trendNeutral = kpi.trend_pct === null || kpi.trend_pct === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: 'easeOut' }}
      className="card p-5 relative overflow-hidden group"
    >
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-accent-500/10 blur-2xl group-hover:bg-accent-500/20 transition-colors" />
      <p className="text-[12.5px] font-medium text-slate-500 dark:text-slate-400 relative">{kpi.label}</p>
      <p className="mt-2 text-[26px] font-display font-semibold tracking-tight relative">{formatValue(kpi.total)}</p>
      <div className="mt-3 flex items-center gap-1.5 relative">
        {kpi.trend_pct !== null && kpi.trend_pct !== undefined ? (
          <>
            <span
              className={`flex items-center gap-0.5 text-[12px] font-semibold px-1.5 py-0.5 rounded-md ${
                trendNeutral
                  ? 'text-slate-500 dark:text-slate-400 bg-black/[0.03] dark:bg-white/5'
                  : trendPositive
                  ? 'text-mint-400 bg-mint-500/10'
                  : 'text-coral-400 bg-coral-500/10'
              }`}
            >
              {trendNeutral ? <Minus size={11} /> : trendPositive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
              {Math.abs(kpi.trend_pct).toFixed(1)}%
            </span>
            <span className="text-[11.5px] text-slate-500">vs prior period</span>
          </>
        ) : (
          <span className="text-[11.5px] text-slate-500">
            {kpi.average !== null ? `avg ${formatValue(kpi.average)}` : 'no trend data'}
          </span>
        )}
      </div>
    </motion.div>
  )
}

export function KpiCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="h-3 w-24 rounded skeleton" />
      <div className="h-7 w-20 rounded skeleton mt-3" />
      <div className="h-3 w-28 rounded skeleton mt-3" />
    </div>
  )
}
