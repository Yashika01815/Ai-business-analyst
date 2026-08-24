import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquareText, Send, Loader2, ChevronDown, Bot, User as UserIcon } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { EmptyState } from '../components/Shared'
import ChartCard from '../components/ChartCard'
import { useDatasets } from '../context/DatasetContext'
import { askApi, AskResponse } from '../lib/api'

interface ChatEntry {
  question: string
  response?: AskResponse
  loading?: boolean
  showDetails?: boolean
}

const SUGGESTED = [
  'What is the total revenue?',
  'Which product generated the most revenue?',
  'Show revenue by region',
  'What are the biggest risks in this dataset?',
]

export default function AskData() {
  const { selectedId, datasets, loading: dsLoading } = useDatasets()
  const [input, setInput] = useState('')
  const [entries, setEntries] = useState<ChatEntry[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  const ask = async (question: string) => {
    if (!selectedId || !question.trim()) return
    setInput('')
    setEntries(prev => [...prev, { question, loading: true }])
    try {
      const res = await askApi.ask(selectedId, question)
      setEntries(prev => prev.map((e, i) => i === prev.length - 1 ? { ...e, response: res.data, loading: false } : e))
    } catch (err: any) {
      setEntries(prev => prev.map((e, i) => i === prev.length - 1 ? {
        ...e, loading: false,
        response: { answer: err?.response?.data?.detail || 'Something went wrong answering this question.', tool_used: 'error', how_calculated: {}, chart: null, data: null },
      } : e))
    }
  }

  const toggleDetails = (idx: number) => {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, showDetails: !e.showDetails } : e))
  }

  if (!dsLoading && datasets.length === 0) {
    return (
      <AppLayout title="Ask Your Data" subtitle="Natural-language questions, verified answers">
        <EmptyState icon={MessageSquareText} title="No datasets yet" description="Upload a dataset to start asking questions."
          actionLabel="Upload a dataset" actionTo="/upload" />
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Ask Your Data" subtitle="Every answer is backed by real SQL or Python computation — never invented">
      <div className="flex flex-col h-[calc(100vh-180px)] max-w-3xl">
        <div className="flex-1 overflow-y-auto space-y-5 pb-4">
          {entries.length === 0 && (
            <div className="pt-6">
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mb-3">Try asking:</p>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {SUGGESTED.map(q => (
                  <button key={q} onClick={() => ask(q)}
                    className="text-left px-4 py-3 rounded-xl border border-slate-900/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.03] dark:hover:bg-white/5 hover:border-accent-500/30 transition-colors text-[13px] text-slate-600 dark:text-slate-300">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {entries.map((entry, idx) => (
            <div key={idx} className="space-y-3">
              <div className="flex items-start gap-3 justify-end">
                <div className="max-w-[80%] bg-accent-600/90 text-white rounded-2xl rounded-tr-sm px-4 py-2.5">
                  <p className="text-[13.5px]">{entry.question}</p>
                </div>
                <div className="w-7 h-7 rounded-full bg-black/[0.06] dark:bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <UserIcon size={13} />
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-accent-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={13} className="text-accent-400" />
                </div>
                <div className="max-w-[85%] space-y-3 flex-1">
                  {entry.loading ? (
                    <div className="card px-4 py-3 inline-flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-accent-400" />
                      <span className="text-[13px] text-slate-500 dark:text-slate-400">Choosing the right tool and computing…</span>
                    </div>
                  ) : entry.response && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card px-4 py-3.5">
                      <p className="text-[13.5px] leading-relaxed text-slate-800 dark:text-slate-200">{entry.response.answer}</p>

                      <button onClick={() => toggleDetails(idx)}
                        className="mt-3 flex items-center gap-1 text-[11.5px] font-medium text-accent-400 hover:text-accent-300">
                        <ChevronDown size={13} className={`transition-transform ${entry.showDetails ? 'rotate-180' : ''}`} />
                        How this was calculated
                      </button>
                      <AnimatePresence>
                        {entry.showDetails && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="mt-2.5 pt-2.5 border-t border-slate-900/[0.06] dark:border-white/5 text-[11.5px] font-mono text-slate-500 space-y-1.5 whitespace-pre-wrap break-words">
                              {Object.entries(entry.response.how_calculated).map(([k, v]) => (
                                <div key={k}><span className="text-accent-400/80">{k}:</span> {typeof v === 'string' ? v : JSON.stringify(v)}</div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}

                  {entry.response?.chart && (
                    <ChartCard chart={entry.response.chart} height={240} />
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={e => { e.preventDefault(); ask(input) }} className="flex items-center gap-2 mt-2">
          <input
            value={input} onChange={e => setInput(e.target.value)}
            placeholder="Ask a question about your data…"
            className="flex-1 px-4 py-3 rounded-xl bg-black/[0.03] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 text-[13.5px] transition-all"
          />
          <button type="submit" disabled={!input.trim()}
            className="p-3 rounded-xl bg-accent-600 text-white hover:bg-accent-500 disabled:opacity-40 transition-colors">
            <Send size={16} />
          </button>
        </form>
      </div>
    </AppLayout>
  )
}
