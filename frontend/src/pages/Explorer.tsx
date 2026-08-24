import { useEffect, useState } from 'react'
import { Table2 } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { EmptyState, Loader } from '../components/Shared'
import { useDatasets } from '../context/DatasetContext'
import { datasetsApi } from '../lib/api'

export default function Explorer() {
  const { selectedId, datasets, loading: dsLoading } = useDatasets()
  const [preview, setPreview] = useState<{ columns: string[]; rows: any[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    datasetsApi.preview(selectedId, 200).then(res => setPreview(res.data)).finally(() => setLoading(false))
  }, [selectedId])

  if (!dsLoading && datasets.length === 0) {
    return (
      <AppLayout title="Dataset Explorer" subtitle="Browse your cleaned, structured data">
        <EmptyState icon={Table2} title="No datasets yet" description="Upload a dataset to browse it here."
          actionLabel="Upload a dataset" actionTo="/upload" />
      </AppLayout>
    )
  }

  const filteredRows = preview?.rows.filter(row =>
    !search || Object.values(row).some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase()))
  ) ?? []

  return (
    <AppLayout title="Dataset Explorer" subtitle="Browse the cleaned, structured version of your data (showing up to 200 rows)">
      {loading || !preview ? <Loader label="Loading dataset…" /> : (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-900/[0.06] dark:border-white/5">
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search rows…"
              className="w-full max-w-xs px-3.5 py-2 rounded-lg bg-black/[0.03] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-[13px] focus:outline-none focus:border-accent-500"
            />
          </div>
          <div className="overflow-x-auto max-h-[65vh]">
            <table className="w-full text-[12.5px]">
              <thead className="sticky top-0 bg-white/95 dark:bg-ink-900/95 backdrop-blur z-10">
                <tr>
                  {preview.columns.map(col => (
                    <th key={col} className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap border-b border-slate-900/[0.06] dark:border-white/5">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, i) => (
                  <tr key={i} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                    {preview.columns.map(col => (
                      <td key={col} className="px-4 py-2.5 whitespace-nowrap border-b border-slate-900/[0.04] dark:border-white/[0.03] text-slate-600 dark:text-slate-300">
                        {row[col] === null || row[col] === undefined ? <span className="text-slate-400 dark:text-slate-600">—</span> : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-[12px] text-slate-500 border-t border-slate-900/[0.06] dark:border-white/5">
            Showing {filteredRows.length} of {preview.rows.length} previewed rows
          </div>
        </div>
      )}
    </AppLayout>
  )
}
