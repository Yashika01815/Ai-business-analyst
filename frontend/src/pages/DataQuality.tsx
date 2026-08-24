import { useEffect, useState } from 'react'
import { ShieldCheck, CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { EmptyState, Loader, Badge, SectionCard } from '../components/Shared'
import { useDatasets } from '../context/DatasetContext'
import { datasetsApi, Dataset } from '../lib/api'

function scoreColor(score: number) {
  if (score >= 85) return 'text-mint-400'
  if (score >= 60) return 'text-amber-400'
  return 'text-coral-400'
}

export default function DataQuality() {
  const { selectedId, datasets, loading: dsLoading } = useDatasets()
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    datasetsApi.get(selectedId).then(res => setDataset(res.data)).finally(() => setLoading(false))
  }, [selectedId])

  if (!dsLoading && datasets.length === 0) {
    return (
      <AppLayout title="Data Quality Center" subtitle="Completeness, duplicates, and outliers at a glance">
        <EmptyState icon={ShieldCheck} title="No datasets yet" description="Upload a dataset to see its quality report."
          actionLabel="Upload a dataset" actionTo="/upload" />
      </AppLayout>
    )
  }

  if (loading || !dataset) return <AppLayout title="Data Quality Center"><Loader label="Analyzing data quality…" /></AppLayout>

  const { profile, cleaning_log, data_quality_score } = dataset

  return (
    <AppLayout title="Data Quality Center" subtitle={`Quality report for ${dataset.name}`}>
      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        <SectionCard>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" strokeLinecap="round"
                  stroke="currentColor" className={scoreColor(data_quality_score)}
                  strokeDasharray={`${(data_quality_score / 100) * 97.4} 97.4`} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-[17px] font-display font-bold ${scoreColor(data_quality_score)}`}>{data_quality_score}</span>
              </div>
            </div>
            <div>
              <p className="text-[13px] font-semibold">Overall Quality Score</p>
              <p className="text-[12px] text-slate-500 mt-1">Based on completeness, duplication, and outlier severity</p>
            </div>
          </div>
        </SectionCard>
        <SectionCard>
          <p className="text-[12.5px] text-slate-500 dark:text-slate-400">Dataset Size</p>
          <p className="text-[24px] font-display font-semibold mt-1">{profile.row_count.toLocaleString()} rows</p>
          <p className="text-[12.5px] text-slate-500 mt-1">{profile.column_count} columns</p>
        </SectionCard>
        <SectionCard>
          <p className="text-[12.5px] text-slate-500 dark:text-slate-400">Duplicates Removed</p>
          <p className="text-[24px] font-display font-semibold mt-1">{profile.duplicate_rows}</p>
          <p className="text-[12.5px] text-slate-500 mt-1">{profile.missing_total_cells} missing cells originally found</p>
        </SectionCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard title="Column Profile" subtitle="Detected types, roles, and completeness">
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-slate-500 text-left">
                  <th className="px-2 py-2 font-medium">Column</th>
                  <th className="px-2 py-2 font-medium">Role</th>
                  <th className="px-2 py-2 font-medium">Missing</th>
                  <th className="px-2 py-2 font-medium">Unique</th>
                </tr>
              </thead>
              <tbody>
                {profile.columns.map(col => (
                  <tr key={col.name} className="border-t border-slate-900/[0.06] dark:border-white/5">
                    <td className="px-2 py-2.5 font-medium text-slate-800 dark:text-slate-200">{col.name}</td>
                    <td className="px-2 py-2.5">
                      <Badge tone={col.role === 'numeric' ? 'positive' : col.role === 'date' ? 'info' : 'neutral'}>
                        {col.role}
                      </Badge>
                    </td>
                    <td className="px-2 py-2.5 text-slate-500 dark:text-slate-400">
                      {col.missing_pct > 0 ? `${col.missing_pct}%` : <span className="text-mint-400">0%</span>}
                    </td>
                    <td className="px-2 py-2.5 text-slate-500 dark:text-slate-400">{col.unique_count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Cleaning Operations Applied" subtitle="Full transparency — nothing changes silently">
          <div className="space-y-3">
            {cleaning_log.length === 0 ? (
              <p className="text-[13px] text-slate-500 flex items-center gap-2"><Info size={14} /> No cleaning was necessary.</p>
            ) : (
              cleaning_log.map((log, i) => (
                <div key={i} className="flex items-start gap-2.5 text-[13px]">
                  <CheckCircle2 size={15} className="text-mint-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-slate-600 dark:text-slate-300">{log.operation.replace(/_/g, ' ')}</span>
                    <p className="text-slate-500 mt-0.5">{log.detail}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {Object.keys(profile.outliers).length > 0 && (
            <div className="mt-5 pt-5 border-t border-slate-900/[0.06] dark:border-white/5">
              <p className="text-[12.5px] font-semibold text-slate-600 dark:text-slate-300 mb-2.5 flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-amber-400" /> Potential Outliers Detected
              </p>
              <div className="space-y-2">
                {Object.entries(profile.outliers).map(([col, info]: [string, any]) => (
                  <p key={col} className="text-[12.5px] text-slate-500">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">{col}</span>: {info.count} value(s) ({info.pct}%) outside the expected range
                  </p>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </AppLayout>
  )
}
