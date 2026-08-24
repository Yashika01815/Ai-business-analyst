import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Download, RefreshCcw, Loader2 } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { EmptyState, Loader, SectionCard, Badge } from '../components/Shared'
import ChartCard from '../components/ChartCard'
import { useDatasets } from '../context/DatasetContext'
import { reportsApi } from '../lib/api'

export default function Reports() {
  const { selectedId, datasets, loading: dsLoading } = useDatasets()
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const load = () => {
    if (!selectedId) return
    setLoading(true)
    reportsApi.get(selectedId).then(res => setReport(res.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [selectedId])

  const downloadJson = () => {
    if (!report) return
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.dataset_name.replace(/\s+/g, '_')}_report.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!dsLoading && datasets.length === 0) {
    return (
      <AppLayout title="Reports" subtitle="Full business report: KPIs, trends, forecasts, and recommendations">
        <EmptyState icon={FileText} title="No datasets yet" description="Upload a dataset to generate a report."
          actionLabel="Upload a dataset" actionTo="/upload" />
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Reports" subtitle="A complete, exportable business report generated from verified data">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-900/10 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/5 transition-colors text-[12.5px] font-medium">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />} Regenerate
        </button>
        {report && (
          <button onClick={downloadJson}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-accent-600 text-white hover:bg-accent-500 transition-colors text-[12.5px] font-medium">
            <Download size={14} /> Export JSON
          </button>
        )}
      </div>

      {loading || !report ? <Loader label="Compiling report…" /> : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-4xl">
          <SectionCard title="Executive Summary">
            <p className="text-[13.5px] text-slate-600 dark:text-slate-300 leading-relaxed">{report.executive_summary}</p>
          </SectionCard>

          <SectionCard title="KPI Overview">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {report.kpi_overview.map((k: any) => (
                <div key={k.metric_key}>
                  <p className="text-[11.5px] text-slate-500">{k.label}</p>
                  <p className="text-[18px] font-display font-semibold">{k.total?.toLocaleString?.() ?? k.total}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {report.key_charts?.length > 0 && (
            <div className="grid md:grid-cols-2 gap-5">
              {report.key_charts.map((c: any, i: number) => <ChartCard key={i} chart={c} index={i} height={220} />)}
            </div>
          )}

          <SectionCard title="Trends & Insights">
            <div className="space-y-3">
              {report.trends_and_insights.map((ins: any, i: number) => (
                <div key={i} className="border-l-2 border-accent-500/40 pl-3.5 py-0.5">
                  <p className="text-[13px] font-medium">{ins.title}</p>
                  <p className="text-[12.5px] text-slate-500">{ins.explanation}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Anomalies" right={<Badge tone={report.anomalies.total_found > 0 ? 'warning' : 'positive'}>{report.anomalies.total_found} found</Badge>}>
            {report.anomalies.time_series_anomalies.length === 0 ? (
              <p className="text-[13px] text-slate-500">No significant anomalies detected.</p>
            ) : (
              <div className="space-y-2">
                {report.anomalies.time_series_anomalies.slice(0, 5).map((a: any, i: number) => (
                  <p key={i} className="text-[12.5px] text-slate-500 dark:text-slate-400">• {a.explanation}</p>
                ))}
              </div>
            )}
          </SectionCard>

          {report.forecast && (
            <SectionCard title={`Forecast Preview`} subtitle={report.forecast.method}>
              <p className="text-[12.5px] text-slate-500">
                {report.forecast.horizon}-period forecast generated · see Forecasting Studio for full detail and confidence intervals.
              </p>
            </SectionCard>
          )}

          <SectionCard title="Recommendations">
            <div className="space-y-3">
              {report.recommendations.map((r: any, i: number) => (
                <div key={i} className="flex items-start gap-2.5">
                  <Badge tone={r.priority === 'high' ? 'critical' : r.priority === 'medium' ? 'warning' : 'neutral'}>{r.priority}</Badge>
                  <p className="text-[13px] text-slate-600 dark:text-slate-300">{r.recommended_action}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Methodology">
            <ul className="space-y-1.5 text-[12.5px] text-slate-500">
              {report.methodology.map((m: string, i: number) => <li key={i}>• {m}</li>)}
            </ul>
          </SectionCard>

          <SectionCard title="Assumptions & Limitations">
            <ul className="space-y-1.5 text-[12.5px] text-slate-500">
              {report.assumptions_and_limitations.map((m: string, i: number) => <li key={i}>• {m}</li>)}
            </ul>
          </SectionCard>
        </motion.div>
      )}
    </AppLayout>
  )
}
