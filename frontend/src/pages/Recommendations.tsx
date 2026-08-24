import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Lightbulb } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { EmptyState, Loader, Badge, SectionCard } from '../components/Shared'
import { useDatasets } from '../context/DatasetContext'
import { recommendationsApi } from '../lib/api'

const priorityTone: Record<string, any> = { high: 'critical', medium: 'warning', low: 'neutral' }

export default function Recommendations() {
  const { selectedId, datasets, loading: dsLoading } = useDatasets()
  const [recs, setRecs] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    recommendationsApi.get(selectedId).then(res => setRecs(res.data.recommendations)).finally(() => setLoading(false))
  }, [selectedId])

  if (!dsLoading && datasets.length === 0) {
    return (
      <AppLayout title="Recommendations" subtitle="Evidence-based, prioritized business actions">
        <EmptyState icon={Lightbulb} title="No datasets yet" description="Upload a dataset to generate recommendations."
          actionLabel="Upload a dataset" actionTo="/upload" />
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Recommendations" subtitle="Converted from verified insights and anomalies — never generic advice">
      {loading || !recs ? <Loader label="Synthesizing recommendations…" /> : (
        <div className="space-y-4">
          {recs.map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <SectionCard
                right={<div className="flex gap-2"><Badge tone={priorityTone[r.priority]}>{r.priority} priority</Badge><Badge tone="info">{r.confidence} confidence</Badge></div>}
              >
                <h3 className="text-[15px] font-semibold">{r.title}</h3>
                <p className="text-[13px] text-slate-500 mt-2">{r.evidence}</p>
                <div className="mt-4 p-3.5 rounded-xl bg-accent-500/5 border border-accent-500/10">
                  <p className="text-[12px] font-semibold text-accent-400 mb-1">Recommended action</p>
                  <p className="text-[13px] text-slate-600 dark:text-slate-300">{r.recommended_action}</p>
                </div>
                {r.assumptions?.length > 0 && (
                  <p className="text-[11.5px] text-slate-400 dark:text-slate-600 mt-3">Assumptions: {r.assumptions.join(' · ')}</p>
                )}
              </SectionCard>
            </motion.div>
          ))}
        </div>
      )}
    </AppLayout>
  )
}
