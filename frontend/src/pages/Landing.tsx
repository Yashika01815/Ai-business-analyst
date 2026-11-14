import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BrainCircuit, ArrowRight, Sparkles, TrendingUp, MessageSquareText,
  ShieldCheck, Zap, Users, Sliders,
} from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'
import HeroVisual from '../components/HeroVisual'

const FEATURES = [
  { icon: MessageSquareText, title: 'Ask Your Data', desc: 'Type a question in plain English and get a verified, SQL-backed answer — never a guess.' },
  { icon: Sparkles, title: 'Automated Insights', desc: 'Every upload is scanned for trends, top performers, and correlations, no clicking required.' },
  { icon: TrendingUp, title: 'Forecasting Studio', desc: 'Statistically sound forecasts with confidence intervals and accuracy metrics.' },
  { icon: Users, title: 'Segmentation', desc: 'K-Means clustering surfaces customer and product segments automatically.' },
  { icon: Sliders, title: 'Decision Simulator', desc: 'Model what-if scenarios with an explicit, explainable regression model.' },
  { icon: Zap, title: 'Automation Center', desc: 'Scheduled reports and threshold alerts delivered straight to your inbox.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-ink-950 bg-grid-fade overflow-hidden">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-glow">
            <BrainCircuit className="w-4.5 h-4.5 text-white" size={18} />
          </div>
          <span className="font-display font-semibold tracking-tight">AI Business Analyst</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/login" className="text-[13.5px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors px-3 py-2">
            Sign in
          </Link>
          <Link to="/register" className="text-[13.5px] font-medium bg-accent-600 text-white hover:bg-accent-500 transition-colors px-4 py-2 rounded-xl">
            Get started
          </Link>
        </div>
      </nav>

      <header className="max-w-4xl mx-auto text-center px-6 pt-20 pb-16">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-900/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/5 text-[12.5px] text-slate-600 dark:text-slate-300 mb-6">
          <Sparkles size={13} className="text-accent-400" /> Powered by Groq + real SQL/ML analytics
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.05 }}
          className="text-[44px] sm:text-[56px] leading-[1.05] font-display font-bold tracking-tight">
          Your spreadsheets, <span className="text-gradient">analyzed like an analyst would.</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1 }}
          className="mt-5 text-[16.5px] text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Upload a CSV or Excel file and get instant KPIs, verified answers to natural-language questions,
          forecasts, anomaly detection, and evidence-based recommendations — automatically.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.15 }}
          className="mt-8 flex items-center justify-center gap-3">
          <Link to="/register" className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent-600 text-white hover:bg-accent-500 transition-colors font-medium text-[14px]">
            Start free <ArrowRight size={16} />
          </Link>
          <Link to="/login" className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-900/10 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/5 transition-colors font-medium text-[14px]">
            Sign in
          </Link>
        </motion.div>
      </header>

      <section className="max-w-5xl mx-auto px-6 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
          <HeroVisual />
        </motion.div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-[28px] font-display font-semibold tracking-tight">Everything a business analyst does, automated</h2>
          <p className="text-slate-500 mt-2 text-[14.5px]">One workflow: upload, understand, decide, act.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.06 }}
              className="card p-6">
              <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center mb-4">
                <f.icon size={19} className="text-accent-400" />
              </div>
              <h3 className="font-semibold text-[15px]">{f.title}</h3>
              <p className="text-[13.5px] text-slate-500 mt-1.5 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <div className="card p-10">
          <ShieldCheck className="mx-auto text-mint-400 mb-4" size={28} />
          <h3 className="text-[20px] font-display font-semibold">Every number is verified</h3>
          <p className="text-slate-500 mt-2 text-[14px] max-w-lg mx-auto leading-relaxed">
            The AI layer never invents figures. Every KPI, chart, and answer is computed by real SQL and Python
            against your data — with an expandable "how this was calculated" trail for full transparency.
          </p>
          <Link to="/register" className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-xl bg-accent-600 text-white hover:bg-accent-500 transition-colors font-medium text-[14px]">
            Try it with your data <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  )
}
