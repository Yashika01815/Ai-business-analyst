import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Plus, Trash2, Play, Bell, CheckCircle2, Loader2, X } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { EmptyState, Loader, Badge, SectionCard } from '../components/Shared'
import { useDatasets } from '../context/DatasetContext'
import { automationApi, AutomationRule, Alert } from '../lib/api'

const severityTone: Record<string, any> = { critical: 'critical', warning: 'warning', info: 'info' }

function NewRuleModal({ datasetId, onClose, onCreated }: { datasetId: number; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [ruleType, setRuleType] = useState<'schedule' | 'threshold' | 'anomaly'>('schedule')
  const [email, setEmail] = useState('')
  const [frequency, setFrequency] = useState('weekly')
  const [dayOfWeek, setDayOfWeek] = useState('mon')
  const [metric, setMetric] = useState('revenue')
  const [direction, setDirection] = useState('drop')
  const [percent, setPercent] = useState(10)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setSubmitting(true)
    let config: any = {}
    if (ruleType === 'schedule') config = { frequency, day_of_week: dayOfWeek, hour: 8 }
    if (ruleType === 'threshold') config = { metric, direction, percent }
    if (ruleType === 'anomaly') config = { sensitivity: 'medium' }
    try {
      await automationApi.createRule({ dataset_id: datasetId, name, rule_type: ruleType, config, recipient_email: email })
      onCreated()
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[16px] font-display font-semibold">New Automation Rule</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Rule name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Weekly summary"
              className="w-full px-3 py-2 rounded-lg bg-black/[0.03] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-[13px] focus:outline-none focus:border-accent-500" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Rule type</label>
            <select value={ruleType} onChange={e => setRuleType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg bg-black/[0.03] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-[13px] focus:outline-none focus:border-accent-500">
              <option value="schedule">Scheduled report</option>
              <option value="threshold">Threshold alert</option>
              <option value="anomaly">Anomaly alert</option>
            </select>
          </div>

          {ruleType === 'schedule' && (
            <div className="flex gap-3">
              <select value={frequency} onChange={e => setFrequency(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-black/[0.03] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-[13px] focus:outline-none focus:border-accent-500">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              {frequency === 'weekly' && (
                <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-black/[0.03] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-[13px] focus:outline-none focus:border-accent-500">
                  {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              )}
            </div>
          )}

          {ruleType === 'threshold' && (
            <div className="flex gap-3">
              <input value={metric} onChange={e => setMetric(e.target.value)} placeholder="metric column"
                className="flex-1 px-3 py-2 rounded-lg bg-black/[0.03] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-[13px] focus:outline-none focus:border-accent-500" />
              <select value={direction} onChange={e => setDirection(e.target.value)}
                className="px-3 py-2 rounded-lg bg-black/[0.03] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-[13px] focus:outline-none focus:border-accent-500">
                <option value="drop">Drops by</option>
                <option value="increase">Increases by</option>
              </select>
              <input type="number" value={percent} onChange={e => setPercent(Number(e.target.value))}
                className="w-16 px-3 py-2 rounded-lg bg-black/[0.03] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-[13px] focus:outline-none focus:border-accent-500" />
              <span className="self-center text-[13px] text-slate-500">%</span>
            </div>
          )}

          <div>
            <label className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Recipient email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"
              className="w-full px-3 py-2 rounded-lg bg-black/[0.03] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-[13px] focus:outline-none focus:border-accent-500" />
          </div>

          <button onClick={submit} disabled={submitting || !name || !email}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent-600 text-white hover:bg-accent-500 disabled:opacity-50 transition-colors text-[13px] font-medium">
            {submitting && <Loader2 size={14} className="animate-spin" />} Create rule
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function Automation() {
  const { selectedId, datasets, loading: dsLoading } = useDatasets()
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [runningId, setRunningId] = useState<number | null>(null)

  const loadAll = () => {
    setLoading(true)
    Promise.all([automationApi.listRules(), automationApi.listAlerts()])
      .then(([r, a]) => { setRules(r.data); setAlerts(a.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadAll() }, [])

  const toggleActive = async (rule: AutomationRule) => {
    await automationApi.updateRule(rule.id, { is_active: !rule.is_active })
    loadAll()
  }

  const remove = async (id: number) => {
    await automationApi.deleteRule(id)
    loadAll()
  }

  const runNow = async (id: number) => {
    setRunningId(id)
    try {
      await automationApi.runNow(id)
      loadAll()
    } catch {
      // condition may simply not have been met — still refresh
      loadAll()
    } finally {
      setRunningId(null)
    }
  }

  const acknowledge = async (id: number) => {
    await automationApi.acknowledgeAlert(id)
    loadAll()
  }

  if (!dsLoading && datasets.length === 0) {
    return (
      <AppLayout title="Automation Center" subtitle="Scheduled reports and threshold alerts">
        <EmptyState icon={Zap} title="No datasets yet" description="Upload a dataset to configure automation rules."
          actionLabel="Upload a dataset" actionTo="/upload" />
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Automation Center" subtitle="Recurring email reports and alerts, delivered via Resend">
      <div className="flex items-center justify-between mb-5">
        <p className="text-[13px] text-slate-500">{rules.length} rule(s) configured</p>
        <button onClick={() => setShowModal(true)} disabled={!selectedId}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-accent-600 text-white hover:bg-accent-500 disabled:opacity-50 transition-colors text-[12.5px] font-medium">
          <Plus size={14} /> New rule
        </button>
      </div>

      {loading ? <Loader label="Loading automation…" /> : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-[12.5px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Rules</p>
            {rules.length === 0 ? (
              <p className="text-[13px] text-slate-500 card p-5">No automation rules yet. Create one to get started.</p>
            ) : rules.map(rule => (
              <div key={rule.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13.5px] font-medium">{rule.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge tone="info">{rule.rule_type}</Badge>
                      <Badge tone={rule.is_active ? 'positive' : 'neutral'}>{rule.is_active ? 'active' : 'paused'}</Badge>
                    </div>
                    <p className="text-[11.5px] text-slate-500 mt-2">to {rule.recipient_email}</p>
                    {rule.next_run_at && <p className="text-[11.5px] text-slate-400 dark:text-slate-600">Next run: {new Date(rule.next_run_at).toLocaleString()}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => runNow(rule.id)} disabled={runningId === rule.id}
                      title="Run now" className="p-1.5 rounded-md text-slate-500 hover:text-accent-400 hover:bg-black/[0.03] dark:hover:bg-white/5 transition-colors">
                      {runningId === rule.id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                    </button>
                    <button onClick={() => toggleActive(rule)} title="Toggle active"
                      className="p-1.5 rounded-md text-slate-500 hover:text-mint-400 hover:bg-black/[0.03] dark:hover:bg-white/5 transition-colors">
                      <CheckCircle2 size={14} />
                    </button>
                    <button onClick={() => remove(rule.id)} title="Delete"
                      className="p-1.5 rounded-md text-slate-500 hover:text-coral-400 hover:bg-black/[0.03] dark:hover:bg-white/5 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-[12.5px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
              <Bell size={13} /> Alert Center
            </p>
            {alerts.length === 0 ? (
              <p className="text-[13px] text-slate-500 card p-5">No alerts yet.</p>
            ) : alerts.map(alert => (
              <div key={alert.id} className={`card p-4 ${alert.is_acknowledged ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone={severityTone[alert.severity]}>{alert.severity}</Badge>
                      <span className="text-[11.5px] text-slate-500">{alert.alert_type}</span>
                    </div>
                    <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-2">{alert.message}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-1.5">{new Date(alert.created_at).toLocaleString()}</p>
                  </div>
                  {!alert.is_acknowledged && (
                    <button onClick={() => acknowledge(alert.id)}
                      className="text-[11.5px] text-accent-400 hover:text-accent-300 font-medium shrink-0">Acknowledge</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && selectedId && (
        <NewRuleModal datasetId={selectedId} onClose={() => setShowModal(false)} onCreated={loadAll} />
      )}
    </AppLayout>
  )
}
