import { useNavigate } from 'react-router-dom'
import { ChevronDown, Database, UploadCloud } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useDatasets } from '../context/DatasetContext'
import ThemeToggle from './ThemeToggle'

export default function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { datasets, selectedId, setSelectedId } = useDatasets()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = datasets.find(d => d.id === selectedId)

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-4 px-6 lg:px-8 py-5 border-b border-slate-900/[0.06] dark:border-white/5 bg-white/80 dark:bg-ink-950/80 backdrop-blur-xl">
      <div>
        <h1 className="text-[19px] font-display font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/pricing')}
          className="hidden sm:block text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors px-3 py-2"
        >
          Pricing
        </button>
        <ThemeToggle />
        {datasets.length > 0 ? (
          <div className="relative" ref={ref}>
            <button
              onClick={() => setOpen(o => !o)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-900/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/5 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors text-[13px] font-medium"
            >
              <Database size={14} className="text-accent-400" />
              <span className="max-w-[180px] truncate">{selected?.name ?? 'Select dataset'}</span>
              <ChevronDown size={14} className="text-slate-500" />
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-72 card p-1.5 z-30 animate-fade-up">
                {datasets.map(d => (
                  <button
                    key={d.id}
                    onClick={() => { setSelectedId(d.id); setOpen(false) }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between gap-2 text-[13px] transition-colors ${
                      d.id === selectedId ? 'bg-accent-500/15 text-accent-700 dark:text-white' : 'hover:bg-black/[0.03] dark:hover:bg-white/5 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span className="truncate">{d.name}</span>
                    <span className="text-[11px] text-slate-500 shrink-0">{d.row_count.toLocaleString()} rows</span>
                  </button>
                ))}
                <div className="h-px bg-black/[0.03] dark:bg-white/5 my-1" />
                <button
                  onClick={() => { setOpen(false); navigate('/upload') }}
                  className="w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 text-[13px] text-accent-400 hover:bg-accent-500/10"
                >
                  <UploadCloud size={14} /> Upload new dataset
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate('/upload')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent-600 text-white hover:bg-accent-500 transition-colors text-[13px] font-medium"
          >
            <UploadCloud size={14} /> Upload a dataset
          </button>
        )}
      </div>
    </div>
  )
}
