import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { History as HistoryIcon } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { EmptyState, Loader, Badge } from '../components/Shared'
import { historyApi, AnalysisRecord } from '../lib/api'
import { useDatasets } from '../context/DatasetContext'

const kindTone: Record<string, any> = {
  ask: 'info', forecast: 'positive', segmentation: 'warning',
  anomaly: 'critical', whatif: 'info', report: 'neutral', insight: 'positive', recommendation: 'warning',
}

export default function AnalysisHistory() {
  const { selectedId, datasets, loading: dsLoading } = useDatasets()
  const [records, setRecords] = useState<AnalysisRecord[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [kindFilter, setKindFilter] = useState('')

  useEffect(() => {
    setLoading(true)
    historyApi.list({ dataset_id: selectedId || undefined, kind: kindFilter || undefined })
      .then(res => setRecords(res.data))
      .finally(() => setLoading(false))
  }, [selectedId, kindFilter])

  if (!dsLoading && datasets.length === 0) {
    return (
      <AppLayout title="Analysis History" subtitle="Revisit past questions, forecasts, and reports">
        <EmptyState icon={HistoryIcon} title="No history yet" description="Once you start analyzing a dataset, your activity will appear here."
          actionLabel="Upload a dataset" actionTo="/upload" />
      </AppLayout>
    )
  }

  const kinds = ['ask', 'insight', 'forecast', 'segmentation', 'anomaly', 'whatif', 'recommendation', 'report']

  return (
    <AppLayout title="Analysis History" subtitle="Every question, forecast, and report you've run">
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <button onClick={() => setKindFilter('')}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${!kindFilter ? 'bg-accent-500/20 text-accent-300' : 'text-slate-500 hover:bg-black/[0.03] dark:hover:bg-white/5'}`}>
          All
        </button>
        {kinds.map(k => (
          <button key={k} onClick={() => setKindFilter(k)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium capitalize transition-colors ${kindFilter === k ? 'bg-accent-500/20 text-accent-300' : 'text-slate-500 hover:bg-black/[0.03] dark:hover:bg-white/5'}`}>
            {k}
          </button>
        ))}
      </div>

      {loading || !records ? <Loader label="Loading history…" /> : records.length === 0 ? (
        <EmptyState icon={HistoryIcon} title="No records found" description="No analysis activity matches this filter yet." />
      ) : (
        <div className="space-y-2.5">
          {records.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              className="card p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge tone={kindTone[r.kind] || 'neutral'}>{r.kind}</Badge>
                  <p className="text-[11px] text-slate-400 dark:text-slate-600">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <p className="text-[13.5px] font-medium truncate">{r.title}</p>
                {r.explanation && <p className="text-[12.5px] text-slate-500 mt-1 line-clamp-2">{r.explanation}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AppLayout>
  )
}
