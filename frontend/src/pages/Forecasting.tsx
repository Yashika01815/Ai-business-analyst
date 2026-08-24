import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Loader2, Info } from 'lucide-react'
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts'
import AppLayout from '../components/AppLayout'
import { EmptyState, SectionCard, Badge } from '../components/Shared'
import { useDatasets } from '../context/DatasetContext'
import { forecastApi } from '../lib/api'
import { useChartTheme } from '../hooks/useChartTheme'

export default function Forecasting() {
  const { tooltipStyle, gridStroke, axisTick, legendColor, pageBg } = useChartTheme()
  const { selectedId, datasets, loading: dsLoading } = useDatasets()
  const [metrics, setMetrics] = useState<string[]>([])
  const [metric, setMetric] = useState('')
  const [horizon, setHorizon] = useState(30)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!selectedId) return
    forecastApi.metrics(selectedId).then(res => {
      setMetrics(res.data.metrics || [])
      if (res.data.metrics?.length) setMetric(res.data.metrics[0])
    })
    setResult(null)
  }, [selectedId])

  const runForecast = async () => {
    if (!selectedId || !metric) return
    setLoading(true)
    setError('')
    try {
      const res = await forecastApi.run({ dataset_id: selectedId, target_metric: metric, horizon })
      setResult(res.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not generate a forecast for this metric.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  if (!dsLoading && datasets.length === 0) {
    return (
      <AppLayout title="Forecasting Studio" subtitle="Predict future performance from real historical data">
        <EmptyState icon={TrendingUp} title="No datasets yet" description="Upload a dataset with a date column to forecast metrics."
          actionLabel="Upload a dataset" actionTo="/upload" />
      </AppLayout>
    )
  }

  const chartData = result ? [
    ...result.historical.map((h: any) => ({ period: h.period, actual: h.value })),
    ...result.forecast.map((f: any) => ({ period: f.period, predicted: f.value, lower: f.lower, upper: f.upper })),
  ] : []

  return (
    <AppLayout title="Forecasting Studio" subtitle="Choose a metric and horizon — we'll select the right forecasting method">
      <SectionCard>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Target metric</label>
            <select value={metric} onChange={e => setMetric(e.target.value)}
              className="px-3 py-2 rounded-lg bg-black/[0.03] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-[13px] focus:outline-none focus:border-accent-500 min-w-[180px]">
              {metrics.length === 0 && <option>No numeric metrics found</option>}
              {metrics.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Horizon (periods)</label>
            <input type="number" min={1} max={365} value={horizon} onChange={e => setHorizon(Number(e.target.value))}
              className="px-3 py-2 rounded-lg bg-black/[0.03] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-[13px] focus:outline-none focus:border-accent-500 w-28" />
          </div>
          <button onClick={runForecast} disabled={loading || !metric}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-600 text-white hover:bg-accent-500 disabled:opacity-50 transition-colors text-[13px] font-medium">
            {loading && <Loader2 size={14} className="animate-spin" />} Run Forecast
          </button>
        </div>
        {error && <p className="mt-3 text-[12.5px] text-coral-400">{error}</p>}
      </SectionCard>

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-5">
          <SectionCard title={`${metric.replace(/_/g, ' ')} — Historical vs. Forecast`}
            right={<Badge tone="info">{result.method}</Badge>}>
            <div style={{ width: '100%', height: 340 }}>
              <ResponsiveContainer>
                <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 10.5, fill: axisTick.fill }} tickLine={false} axisLine={false} />
                  <YAxis tick={axisTick} tickLine={false} axisLine={false} width={50} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11.5, color: legendColor }} />
                  <Area type="monotone" dataKey="upper" stroke="none" fill="#6366f1" fillOpacity={0.08} name="Upper bound" />
                  <Area type="monotone" dataKey="lower" stroke="none" fill={pageBg} fillOpacity={1} name="Lower bound" />
                  <Line type="monotone" dataKey="actual" stroke="#22c55e" strokeWidth={2.5} dot={false} name="Historical" />
                  <Line type="monotone" dataKey="predicted" stroke="#6366f1" strokeWidth={2.5} strokeDasharray="5 4" dot={false} name="Forecast" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <div className="grid md:grid-cols-3 gap-5">
            <SectionCard title="Evaluation Metrics" subtitle="Computed via holdout validation on real historical data">
              <div className="space-y-2.5">
                {Object.entries(result.evaluation_metrics || {}).map(([k, v]: [string, any]) => (
                  <div key={k} className="flex items-center justify-between text-[13px]">
                    <span className="text-slate-500 dark:text-slate-400 uppercase">{k}</span>
                    <span className="font-medium">{v !== null && v !== undefined ? Number(v).toFixed(2) : '—'}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Assumptions">
              <ul className="space-y-2 text-[12.5px] text-slate-500 dark:text-slate-400">
                {result.assumptions.map((a: string, i: number) => <li key={i} className="flex gap-2"><Info size={13} className="text-accent-400 mt-0.5 shrink-0" />{a}</li>)}
              </ul>
            </SectionCard>
            <SectionCard title="Limitations">
              <ul className="space-y-2 text-[12.5px] text-slate-500 dark:text-slate-400">
                {result.limitations.map((a: string, i: number) => <li key={i} className="flex gap-2"><Info size={13} className="text-amber-400 mt-0.5 shrink-0" />{a}</li>)}
              </ul>
            </SectionCard>
          </div>
        </motion.div>
      )}
    </AppLayout>
  )
}
