import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Loader2 } from 'lucide-react'
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import AppLayout from '../components/AppLayout'
import { EmptyState, SectionCard, Badge } from '../components/Shared'
import { useDatasets } from '../context/DatasetContext'
import { segmentationApi } from '../lib/api'
import { useChartTheme } from '../hooks/useChartTheme'

const PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#f43f5e', '#38bdf8', '#a78bfa']

export default function Segmentation() {
  const { tooltipStyle, gridStroke, axisTick, cursorFill } = useChartTheme()
  const { selectedId, datasets, loading: dsLoading } = useDatasets()
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    if (!selectedId) return
    setLoading(true)
    setError('')
    try {
      const res = await segmentationApi.run({ dataset_id: selectedId })
      setResult(res.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Segmentation could not be run on this dataset.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { setResult(null) }, [selectedId])

  if (!dsLoading && datasets.length === 0) {
    return (
      <AppLayout title="Segmentation" subtitle="Automatic customer, product, or business clustering">
        <EmptyState icon={Users} title="No datasets yet" description="Upload a dataset to run segmentation."
          actionLabel="Upload a dataset" actionTo="/upload" />
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Segmentation" subtitle="K-Means clustering with automatic feature selection and k-selection">
      {!result && (
        <SectionCard>
          <p className="text-[13.5px] text-slate-500 dark:text-slate-400 mb-4">
            We'll automatically identify a suitable entity column (e.g. customer or product) and numeric features,
            then cluster them into meaningful segments.
          </p>
          <button onClick={run} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-600 text-white hover:bg-accent-500 disabled:opacity-50 transition-colors text-[13px] font-medium">
            {loading && <Loader2 size={14} className="animate-spin" />} Run Segmentation
          </button>
          {error && <p className="mt-3 text-[12.5px] text-coral-400">{error}</p>}
        </SectionCard>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-slate-500 dark:text-slate-400">
              Segmented by <span className="text-slate-800 dark:text-slate-200 font-medium">{result.entity_column.replace(/_/g, ' ')}</span> into{' '}
              <span className="text-slate-800 dark:text-slate-200 font-medium">{result.n_clusters} clusters</span>
            </p>
            <Badge tone="info">Silhouette: {result.silhouette_score}</Badge>
          </div>

          {result.scatter_data.length > 0 && (
            <SectionCard title="Cluster Visualization">
              <div style={{ width: '100%', height: 340 }}>
                <ResponsiveContainer>
                  <ScatterChart margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis type="number" dataKey="x" tick={axisTick} tickLine={false} axisLine={false} />
                    <YAxis type="number" dataKey="y" tick={axisTick} tickLine={false} axisLine={false} width={50} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }}
                      formatter={(v: any, n: any, p: any) => [v, n]} labelFormatter={() => ''} />
                    <Scatter data={result.scatter_data}>
                      {result.scatter_data.map((d: any, i: number) => (
                        <Cell key={i} fill={PALETTE[d.cluster % PALETTE.length]} fillOpacity={0.75} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {result.cluster_profiles.map((cp: any, i: number) => (
              <SectionCard key={cp.cluster_id}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <h3 className="text-[14px] font-semibold">{cp.label}</h3>
                </div>
                <p className="text-[12.5px] text-slate-500 mb-3">{cp.size} entities ({cp.pct_of_total}% of total)</p>
                <div className="space-y-1.5">
                  {Object.entries(cp.profile).slice(0, 4).map(([k, v]: [string, any]) => (
                    <div key={k} className="flex justify-between text-[12px]">
                      <span className="text-slate-500">{k.replace(/_/g, ' ')}</span>
                      <span className="text-slate-600 dark:text-slate-300 font-medium">{Number(v).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                {cp.sample_entities.length > 0 && (
                  <p className="text-[11.5px] text-slate-400 dark:text-slate-600 mt-3 pt-3 border-t border-slate-900/[0.06] dark:border-white/5">
                    e.g. {cp.sample_entities.join(', ')}
                  </p>
                )}
              </SectionCard>
            ))}
          </div>

          <p className="text-[11.5px] text-slate-400 dark:text-slate-600">{result.method}</p>
        </motion.div>
      )}
    </AppLayout>
  )
}
