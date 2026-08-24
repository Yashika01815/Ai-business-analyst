import { useEffect, useState } from 'react'
import { LayoutDashboard, Filter } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { EmptyState, Loader } from '../components/Shared'
import KpiCard, { KpiCardSkeleton } from '../components/KpiCard'
import ChartCard, { ChartCardSkeleton } from '../components/ChartCard'
import { useDatasets } from '../context/DatasetContext'
import { dashboardApi, DashboardData } from '../lib/api'

export default function Dashboard() {
  const { selectedId, datasets, loading: datasetsLoading } = useDatasets()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [filterDim, setFilterDim] = useState<string>('')
  const [filterValue, setFilterValue] = useState<string>('')

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    dashboardApi.get(selectedId, filterDim || undefined, filterValue || undefined)
      .then(res => setData(res.data))
      .finally(() => setLoading(false))
  }, [selectedId, filterDim, filterValue])

  if (!datasetsLoading && datasets.length === 0) {
    return (
      <AppLayout title="Dashboard" subtitle="Automatically generated KPIs and visualizations">
        <EmptyState icon={LayoutDashboard} title="No datasets yet"
          description="Upload a CSV or Excel file to instantly generate KPIs, charts, and insights."
          actionLabel="Upload a dataset" actionTo="/upload" />
      </AppLayout>
    )
  }

  const filterOptions = data?.filter_options || {}
  const dimensionKeys = Object.keys(filterOptions).filter(k => k !== '_date_range')

  return (
    <AppLayout title="Dashboard" subtitle={data ? `${data.dataset_name} · ${data.row_count_after_filter.toLocaleString()} records` : 'Automatically generated KPIs and visualizations'}>
      {dimensionKeys.length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="flex items-center gap-1.5 text-[12.5px] text-slate-500 font-medium">
            <Filter size={13} /> Filter:
          </span>
          <select value={filterDim} onChange={e => { setFilterDim(e.target.value); setFilterValue('') }}
            className="px-3 py-1.5 rounded-lg bg-black/[0.03] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-[12.5px] focus:outline-none focus:border-accent-500">
            <option value="">All dimensions</option>
            {dimensionKeys.map(k => <option key={k} value={k}>{k.replace(/_/g, ' ')}</option>)}
          </select>
          {filterDim && (
            <select value={filterValue} onChange={e => setFilterValue(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-black/[0.03] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-[12.5px] focus:outline-none focus:border-accent-500">
              <option value="">All values</option>
              {(filterOptions[filterDim] || []).map((v: string) => <option key={v} value={v}>{v}</option>)}
            </select>
          )}
          {(filterDim || filterValue) && (
            <button onClick={() => { setFilterDim(''); setFilterValue('') }}
              className="text-[12px] text-accent-400 hover:text-accent-300 font-medium">Clear</button>
          )}
        </div>
      )}

      {loading || !data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)}
          </div>
          <div className="grid lg:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => <ChartCardSkeleton key={i} />)}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {data.kpis.map((kpi, i) => <KpiCard key={kpi.metric_key} kpi={kpi} index={i} />)}
          </div>

          {data.charts.length > 0 ? (
            <div className="grid lg:grid-cols-2 gap-5">
              {data.charts.map((chart, i) => <ChartCard key={chart.title} chart={chart} index={i} />)}
            </div>
          ) : (
            <EmptyState icon={LayoutDashboard} title="No charts available"
              description="We couldn't detect enough metric/dimension structure in this dataset to auto-generate charts." />
          )}
        </>
      )}
    </AppLayout>
  )
}
