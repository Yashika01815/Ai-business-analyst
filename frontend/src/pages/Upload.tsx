import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Sparkles, Loader2 } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { datasetsApi, sampleApi } from '../lib/api'
import { useDatasets } from '../context/DatasetContext'

export default function Upload() {
  const navigate = useNavigate()
  const { refresh, setSelectedId } = useDatasets()
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<string | null>(null)
  const [samples, setSamples] = useState<Record<string, { file: string; label: string }>>({})
  const [loadingSample, setLoadingSample] = useState<string | null>(null)

  useEffect(() => {
    sampleApi.list().then(res => setSamples(res.data)).catch(() => {})
  }, [])

  const handleFile = useCallback(async (file: File) => {
    setError('')
    setUploading(true)
    try {
      const res = await datasetsApi.upload(file)
      setSuccess(res.data.name)
      await refresh()
      setSelectedId(res.data.id)
      setTimeout(() => navigate('/dashboard'), 900)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Upload failed. Please check the file and try again.')
    } finally {
      setUploading(false)
    }
  }, [refresh, setSelectedId, navigate])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const loadSample = async (key: string) => {
    setLoadingSample(key)
    setError('')
    try {
      const res = await sampleApi.load(key)
      setSuccess(res.data.name)
      await refresh()
      setSelectedId(res.data.id)
      setTimeout(() => navigate('/dashboard'), 900)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not load sample dataset.')
    } finally {
      setLoadingSample(null)
    }
  }

  return (
    <AppLayout title="Upload Dataset" subtitle="CSV or XLSX — we'll profile, clean, and analyze it automatically">
      <div className="max-w-2xl">
        <label
          onDragOver={e => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          className={`relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl px-6 py-16 cursor-pointer transition-all ${
            dragActive ? 'border-accent-400 bg-accent-500/5' : 'border-slate-900/[0.12] dark:border-white/15 hover:border-slate-900/20 dark:hover:border-white/25 bg-black/[0.02] dark:bg-white/[0.02]'
          }`}
        >
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

          <AnimatePresence mode="wait">
            {uploading ? (
              <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-accent-400" size={30} />
                <p className="text-[14px] font-medium">Profiling and cleaning your data…</p>
                <p className="text-[12.5px] text-slate-500">Detecting types, checking quality, storing to SQL</p>
              </motion.div>
            ) : success ? (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3">
                <CheckCircle2 className="text-mint-400" size={30} />
                <p className="text-[14px] font-medium">"{success}" is ready</p>
                <p className="text-[12.5px] text-slate-500">Redirecting to your dashboard…</p>
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-accent-500/10 flex items-center justify-center">
                  <UploadCloud size={24} className="text-accent-400" />
                </div>
                <p className="text-[15px] font-medium">Drop your file here, or click to browse</p>
                <p className="text-[12.5px] text-slate-500">Supports .csv, .xlsx, .xls — up to 25MB</p>
              </motion.div>
            )}
          </AnimatePresence>
        </label>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-[13px] text-coral-400 bg-coral-500/10 border border-coral-500/20 rounded-lg px-3.5 py-2.5">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <div className="mt-10">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-slate-600 dark:text-slate-300 mb-3">
            <Sparkles size={14} className="text-accent-400" /> Or try it instantly with sample data
          </p>
          <div className="grid sm:grid-cols-1 gap-2.5">
            {Object.entries(samples).map(([key, s]) => (
              <button
                key={key}
                onClick={() => loadSample(key)}
                disabled={loadingSample !== null}
                className="flex items-center justify-between gap-3 card px-4 py-3.5 text-left hover:border-accent-500/30 transition-colors disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet size={17} className="text-accent-400 shrink-0" />
                  <span className="text-[13px] text-slate-600 dark:text-slate-300">{s.label}</span>
                </div>
                {loadingSample === key ? (
                  <Loader2 size={15} className="animate-spin text-accent-400" />
                ) : (
                  <span className="text-[12px] text-accent-400 font-medium">Load</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
