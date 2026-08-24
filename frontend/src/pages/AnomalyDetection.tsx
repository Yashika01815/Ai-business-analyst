import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Loader2, Activity, Grid3x3 } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { EmptyState, SectionCard, Badge, Loader } from '../components/Shared'
import { useDatasets } from '../context/DatasetContext'
import { anomalyApi } from '../lib/api'

export default function AnomalyDetection() {
  const { selectedId, datasets, loading: dsLoading } = useDatasets()
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    anomalyApi.get(selectedId).then(res => setResult(res.data)).finally(() => setLoading(false))
  }, [selectedId])

  if (!dsLoading && datasets.length === 0) {
    return (
      <AppLayout title="Anomaly Detection" subtitle="Unusual patterns, flagged automatically">
        <EmptyState icon={AlertTriangle} title="No datasets yet" description="Upload a dataset to scan for anomalies."
          actionLabel="Upload a dataset" actionTo="/upload" />
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Anomaly Detection" subtitle="Statistical z-score and IsolationForest-based detection">
      {loading || !result ? <Loader label="Scanning for anomalies…" /> : (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Badge tone={result.total_found > 0 ? 'warning' : 'positive'}>
              {result.total_found} anomal{result.total_found === 1 ? 'y' : 'ies'} found
            </Badge>
            <p className="text-[12px] text-slate-500">{result.method}</p>
          </div>

          <SectionCard title="Time-Series Anomalies" subtitle="Unusual period-over-period movements"
            right={<Activity size={16} className="text-accent-400" />}>
            {result.time_series_anomalies.length === 0 ? (
              <p className="text-[13px] text-slate-500">No significant time-based anomalies detected.</p>
            ) : (
              <div className="space-y-3">
                {result.time_series_anomalies.map((a: any, i: number) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-slate-900/[0.06] dark:border-white/5">
                    <Badge tone={a.severity === 'critical' ? 'critical' : 'warning'}>{a.severity}</Badge>
                    <div className="flex-1">
                      <p className="text-[13px] text-slate-800 dark:text-slate-200">{a.explanation}</p>
                      <p className="text-[11.5px] text-slate-500 mt-1">z-score: {a.z_score} · expected range: {a.expected_range[0].toFixed(0)}–{a.expected_range[1].toFixed(0)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Multivariate Anomalies" subtitle="Unusual combinations of values across records (IsolationForest)"
            right={<Grid3x3 size={16} className="text-accent-400" />}>
            {result.multivariate_anomalies.length === 0 ? (
              <p className="text-[13px] text-slate-500">No significant multivariate anomalies detected.</p>
            ) : (
              <div className="space-y-3">
                {result.multivariate_anomalies.slice(0, 10).map((a: any, i: number) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-slate-900/[0.06] dark:border-white/5">
                    <Badge tone={a.severity === 'critical' ? 'critical' : 'warning'}>score {a.anomaly_score}</Badge>
                    <div className="flex-1">
                      <p className="text-[13px] text-slate-800 dark:text-slate-200">{a.explanation}</p>
                      {Object.keys(a.associated_dimensions).length > 0 && (
                        <p className="text-[11.5px] text-slate-500 mt-1">
                          {Object.entries(a.associated_dimensions).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </AppLayout>
  )
}
