import { useState } from 'react'
import { Trash2, User as UserIcon, Database, ShieldAlert } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { SectionCard } from '../components/Shared'
import { useAuth } from '../context/AuthContext'
import { useDatasets } from '../context/DatasetContext'
import { datasetsApi } from '../lib/api'

export default function Settings() {
  const { user } = useAuth()
  const { datasets, refresh } = useDatasets()
  const [deleting, setDeleting] = useState<number | null>(null)

  const removeDataset = async (id: number) => {
    if (!confirm('Delete this dataset and all associated data permanently?')) return
    setDeleting(id)
    try {
      await datasetsApi.remove(id)
      await refresh()
    } finally {
      setDeleting(null)
    }
  }

  return (
    <AppLayout title="Settings" subtitle="Account and workspace preferences">
      <div className="max-w-2xl space-y-5">
        <SectionCard title="Account" right={<UserIcon size={16} className="text-accent-400" />}>
          <div className="space-y-2 text-[13.5px]">
            <div className="flex justify-between"><span className="text-slate-500">Name</span><span>{user?.full_name || '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Email</span><span>{user?.email}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Member since</span><span>{user ? new Date(user.created_at).toLocaleDateString() : '—'}</span></div>
          </div>
        </SectionCard>

        <SectionCard title="Datasets" subtitle="Manage your uploaded workspaces" right={<Database size={16} className="text-accent-400" />}>
          {datasets.length === 0 ? (
            <p className="text-[13px] text-slate-500">No datasets uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {datasets.map(d => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-slate-900/[0.06] dark:border-white/5 last:border-0">
                  <div>
                    <p className="text-[13px] font-medium">{d.name}</p>
                    <p className="text-[11.5px] text-slate-500">{d.row_count.toLocaleString()} rows · quality {d.data_quality_score}</p>
                  </div>
                  <button onClick={() => removeDataset(d.id)} disabled={deleting === d.id}
                    className="p-1.5 rounded-md text-slate-500 hover:text-coral-400 hover:bg-black/[0.03] dark:hover:bg-white/5 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="About this workspace" right={<ShieldAlert size={16} className="text-accent-400" />}>
          <p className="text-[13px] text-slate-500 leading-relaxed">
            AI Business Analyst computes every KPI, chart, forecast, and answer directly from your data via
            SQL and Python — the AI layer (Groq) is used only for tool selection and natural-language
            explanation, never for generating numbers on its own.
          </p>
        </SectionCard>
      </div>
    </AppLayout>
  )
}
