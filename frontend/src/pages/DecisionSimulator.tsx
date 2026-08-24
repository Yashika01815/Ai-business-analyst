import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sliders, Loader2, ArrowRight } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { EmptyState, SectionCard, Badge } from '../components/Shared'
import { useDatasets } from '../context/DatasetContext'
import { datasetsApi, whatifApi } from '../lib/api'

export default function DecisionSimulator() {
  const { selectedId, datasets, loading: dsLoading } = useDatasets()
  const [numericCols, setNumericCols] = useState<string[]>([])
  const [target, setTarget] = useState('')
  const [driver, setDriver] = useState('')
  const [changePct, setChangePct] = useState(10)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!selectedId) return
    datasetsApi.get(selectedId).then(res => {
      const cols = res.data.schema_map.numeric_columns || []
      setNumericCols(cols)
      if (cols.length >= 2) { setTarget(cols[0]); setDriver(cols[1]) }
    })
    setResult(null)
  }, [selectedId])

  const run = async () => {
    if (!selectedId || !target || !driver) return
    setLoading(true)
    setError('')
    try {
      const res = await whatifApi.run({ dataset_id: selectedId, target_metric: target, driver_column: driver, change_percent: changePct })
      setResult(res.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not run this scenario.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  if (!dsLoading && datasets.length === 0) {
    return (
      <AppLayout title="Decision Simulator" subtitle="Model what-if scenarios with an explainable regression model">
        <EmptyState icon={Sliders} title="No datasets yet" description="Upload a dataset to explore what-if scenarios."
          actionLabel="Upload a dataset" actionTo="/upload" />
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Decision Simulator" subtitle="What-if analysis using an explicit, transparent statistical model">
      <SectionCard>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Target metric</label>
            <select value={target} onChange={e => setTarget(e.target.value)}
              className="px-3 py-2 rounded-lg bg-black/[0.03] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-[13px] min-w-[160px] focus:outline-none focus:border-accent-500">
              {numericCols.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <ArrowRight size={16} className="text-slate-400 dark:text-slate-600 mb-2.5" />
          <div>
            <label className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Driver</label>
            <select value={driver} onChange={e => setDriver(e.target.value)}
              className="px-3 py-2 rounded-lg bg-black/[0.03] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-[13px] min-w-[160px] focus:outline-none focus:border-accent-500">
              {numericCols.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Change (%)</label>
            <input type="number" value={changePct} onChange={e => setChangePct(Number(e.target.value))}
              className="px-3 py-2 rounded-lg bg-black/[0.03] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-[13px] w-24 focus:outline-none focus:border-accent-500" />
          </div>
          <button onClick={run} disabled={loading || target === driver}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-600 text-white hover:bg-accent-500 disabled:opacity-50 transition-colors text-[13px] font-medium">
            {loading && <Loader2 size={14} className="animate-spin" />} Simulate
          </button>
        </div>
        {target === driver && <p className="mt-3 text-[12px] text-amber-400">Choose two different columns.</p>}
        {error && <p className="mt-3 text-[12.5px] text-coral-400">{error}</p>}
      </SectionCard>

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <SectionCard title="Baseline">
              <p className="text-[12.5px] text-slate-500">{driver.replace(/_/g, ' ')}</p>
              <p className="text-[20px] font-display font-semibold">{result.baseline.driver_value.toLocaleString()}</p>
              <div className="h-px bg-black/[0.03] dark:bg-white/5 my-3" />
              <p className="text-[12.5px] text-slate-500">{target.replace(/_/g, ' ')}</p>
              <p className="text-[20px] font-display font-semibold">{result.baseline.target_value.toLocaleString()}</p>
            </SectionCard>
            <SectionCard title={`Scenario (${result.change_percent > 0 ? '+' : ''}${result.change_percent}%)`}>
              <p className="text-[12.5px] text-slate-500">{driver.replace(/_/g, ' ')}</p>
              <p className="text-[20px] font-display font-semibold text-accent-400">{result.scenario.driver_value.toLocaleString()}</p>
              <div className="h-px bg-black/[0.03] dark:bg-white/5 my-3" />
              <p className="text-[12.5px] text-slate-500">{target.replace(/_/g, ' ')}</p>
              <p className="text-[20px] font-display font-semibold text-accent-400">{result.scenario.target_value.toLocaleString()}</p>
            </SectionCard>
          </div>

          <SectionCard title="Estimated Impact" right={<Badge tone={result.confidence === 'high' ? 'positive' : result.confidence === 'moderate' ? 'warning' : 'critical'}>{result.confidence} confidence</Badge>}>
            <div className="flex items-baseline gap-3">
              <p className={`text-[28px] font-display font-bold ${result.estimated_impact.absolute >= 0 ? 'text-mint-400' : 'text-coral-400'}`}>
                {result.estimated_impact.absolute >= 0 ? '+' : ''}{result.estimated_impact.absolute.toLocaleString()}
              </p>
              {result.estimated_impact.percent !== null && (
                <p className="text-[15px] text-slate-500">({result.estimated_impact.percent >= 0 ? '+' : ''}{result.estimated_impact.percent}%)</p>
              )}
            </div>
            <p className="text-[12px] text-slate-500 mt-2">
              Model: {result.model.type} · R² = {result.model.r_squared} · n = {result.model.n_observations} periods
            </p>
          </SectionCard>

          <div className="grid md:grid-cols-2 gap-5">
            <SectionCard title="Assumptions">
              <ul className="space-y-2 text-[12.5px] text-slate-500 dark:text-slate-400">
                {result.assumptions.map((a: string, i: number) => <li key={i}>• {a}</li>)}
              </ul>
            </SectionCard>
            <SectionCard title="Disclaimer">
              <p className="text-[12.5px] text-amber-400/90">{result.disclaimer}</p>
            </SectionCard>
          </div>
        </motion.div>
      )}
    </AppLayout>
  )
}
