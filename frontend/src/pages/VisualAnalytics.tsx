import { useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { EmptyState, Loader } from '../components/Shared'
import ChartCard, { ChartCardSkeleton } from '../components/ChartCard'
import { useDatasets } from '../context/DatasetContext'
import { dashboardApi, DashboardData } from '../lib/api'

export default function VisualAnalytics() {
  const { selectedId, datasets, loading: dsLoading } = useDatasets()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    dashboardApi.get(selectedId).then(res => setData(res.data)).finally(() => setLoading(false))
  }, [selectedId])

  if (!dsLoading && datasets.length === 0) {
    return (
      <AppLayout title="Visual Analytics" subtitle="Interactive charts auto-selected for your data">
        <EmptyState icon={BarChart3} title="No datasets yet" description="Upload a dataset to explore visualizations."
          actionLabel="Upload a dataset" actionTo="/upload" />
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Visual Analytics" subtitle="Charts automatically selected based on your dataset's structure">
      {loading || !data ? (
        <div className="grid lg:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <ChartCardSkeleton key={i} />)}
        </div>
      ) : data.charts.length === 0 ? (
        <EmptyState icon={BarChart3} title="No charts available"
          description="We couldn't detect enough metric/dimension structure to build charts for this dataset." />
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          {data.charts.map((chart, i) => <ChartCard key={chart.title} chart={chart} index={i} height={320} />)}
        </div>
      )}
    </AppLayout>
  )
}
