import { motion } from 'framer-motion'
import { TrendingUp, Bot, ArrowUpRight, Sparkles } from 'lucide-react'

const BARS = [38, 52, 46, 64, 58, 74, 68, 86, 79, 94]

export default function HeroVisual() {
  return (
    <div
      className="relative w-full aspect-[16/9.5] flex items-center justify-center"
      style={{ perspective: '1400px' }}
    >
      {/* ambient glow blobs for depth */}
      <div className="absolute top-1/4 left-1/4 w-56 h-56 rounded-full bg-accent-500/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-mint-500/10 blur-3xl pointer-events-none" />

      {/* floating "segment" chip — sits behind/left, different depth & drift */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: [0, -10, 0] }}
        transition={{ opacity: { duration: 0.6, delay: 0.3 }, y: { duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 } }}
        style={{ transformStyle: 'preserve-3d', transform: 'translateZ(-40px) rotateY(10deg)' }}
        className="absolute left-[2%] top-[12%] sm:left-[6%] card px-4 py-3 flex items-center gap-2.5 shadow-glow z-0"
      >
        <div className="w-7 h-7 rounded-lg bg-mint-500/15 flex items-center justify-center shrink-0">
          <ArrowUpRight size={14} className="text-mint-400" />
        </div>
        <div>
          <p className="text-[10.5px] text-slate-500 leading-none">Top segment</p>
          <p className="text-[12px] font-semibold leading-tight mt-1">High-Value Customers</p>
        </div>
      </motion.div>

      {/* floating "AI insight" chip — foreground, top right */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: [0, -14, 0] }}
        transition={{ opacity: { duration: 0.6, delay: 0.5 }, y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 } }}
        style={{ transformStyle: 'preserve-3d', transform: 'translateZ(60px) rotateY(-8deg)' }}
        className="absolute right-[2%] top-[6%] sm:right-[4%] card px-4 py-3 flex items-center gap-2.5 shadow-glow z-20 max-w-[220px]"
      >
        <div className="w-7 h-7 rounded-lg bg-accent-500/15 flex items-center justify-center shrink-0">
          <Bot size={14} className="text-accent-400" />
        </div>
        <div>
          <p className="text-[10.5px] text-slate-500 leading-none">AI Insight</p>
          <p className="text-[12px] font-medium leading-tight mt-1">Revenue up 12.4% vs last month</p>
        </div>
      </motion.div>

      {/* main dashboard card — the centerpiece, gentle float + tilt */}
      <motion.div
        initial={{ opacity: 0, y: 24, rotateX: 10 }}
        animate={{ opacity: 1, y: [0, -8, 0], rotateX: 6, rotateY: -6 }}
        transition={{
          opacity: { duration: 0.7, delay: 0.15 },
          rotateX: { duration: 0.7, delay: 0.15 },
          rotateY: { duration: 0.7, delay: 0.15 },
          y: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
        }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative w-[92%] sm:w-[85%] card p-0 overflow-hidden z-10"
      >
        {/* window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-900/[0.06] dark:border-white/5">
          <span className="w-2.5 h-2.5 rounded-full bg-coral-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-mint-400/70" />
          <span className="ml-2 text-[11px] text-slate-500 font-medium">Business Dashboard</span>
          <span className="ml-auto flex items-center gap-1.5 text-[10.5px] text-mint-500 dark:text-mint-400 font-medium">
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-mint-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
            Live
          </span>
        </div>

        <div className="p-4 sm:p-5">
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Total Revenue', value: '$482,940', delta: '+12.4%' },
              { label: 'Active Customers', value: '8,431', delta: '+4.1%' },
              { label: 'Growth Rate', value: '18.2%', delta: '+2.6%' },
            ].map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.08 }}
                className="rounded-xl bg-black/[0.03] dark:bg-white/5 border border-slate-900/[0.06] dark:border-white/5 p-3"
              >
                <p className="text-[10px] text-slate-500 truncate">{kpi.label}</p>
                <p className="text-[15px] sm:text-[17px] font-display font-semibold tracking-tight mt-1">{kpi.value}</p>
                <p className="text-[10px] text-mint-500 dark:text-mint-400 font-medium mt-0.5 flex items-center gap-0.5">
                  <ArrowUpRight size={10} /> {kpi.delta}
                </p>
              </motion.div>
            ))}
          </div>

          {/* mini chart */}
          <div className="rounded-xl bg-black/[0.03] dark:bg-white/5 border border-slate-900/[0.06] dark:border-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <TrendingUp size={12} className="text-accent-400" /> Monthly Revenue Trend
              </p>
              <Sparkles size={12} className="text-accent-400" />
            </div>
            <div className="flex items-end gap-1.5 h-20 sm:h-24">
              {BARS.map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.6, delay: 0.7 + i * 0.05, ease: 'easeOut' }}
                  className="flex-1 rounded-t-md bg-gradient-to-t from-accent-600 to-accent-400"
                  style={{ opacity: 0.55 + (i / BARS.length) * 0.45 }}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
