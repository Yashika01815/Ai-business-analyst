import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, TrendingUp, TrendingDown, GitCompareArrows, Award, Info, ArrowRight } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { EmptyState, Loader, Badge } from '../components/Shared'
import { useDatasets } from '../context/DatasetContext'
import { insightsApi, Insight } from '../lib/api'

const ICONS: Record<string, any> = {
  trend: TrendingUp, top_performer: Award, bottom_performer: TrendingDown,
  correlation: GitCompareArrows, info: Info,
}

export default function Insights() {
  const { selectedId, datasets, loading: dsLoading } = useDatasets()
  const [insights, setInsights] = useState<Insight[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    insightsApi.get(selectedId).then(res => setInsights(res.data.insights)).finally(() => setLoading(false))
  }, [selectedId])

  if (!dsLoading && datasets.length === 0) {
    return (
      <AppLayout title="Automated Insights" subtitle="Meaningful patterns, surfaced without asking">
        <EmptyState icon={Sparkles} title="No datasets yet" description="Upload a dataset to generate automated insights."
          actionLabel="Upload a dataset" actionTo="/upload" />
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Automated Insights" subtitle="Every dataset is automatically scanned for trends, performers, and correlations">
      {loading || !insights ? <Loader label="Scanning for meaningful patterns…" /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {insights.map((insight, i) => {
            const Icon = ICONS[insight.type] || Info
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }} className="card p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-accent-500/10 flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-accent-400" />
                  </div>
                  <Badge tone={insight.severity === 'positive' ? 'positive' : insight.severity === 'warning' ? 'warning' : 'info'}>
                    {insight.type.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <h3 className="text-[14.5px] font-semibold leading-snug">{insight.title}</h3>
                <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">{insight.explanation}</p>
                {insight.suggested_action && (
                  <div className="mt-3.5 pt-3.5 border-t border-slate-900/[0.06] dark:border-white/5 flex items-start gap-2">
                    <ArrowRight size={13} className="text-accent-400 mt-0.5 shrink-0" />
                    <p className="text-[12.5px] text-slate-500 dark:text-slate-400">{insight.suggested_action}</p>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </AppLayout>
  )
}
