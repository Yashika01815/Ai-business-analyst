import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, BrainCircuit, ArrowRight } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'

type Plan = {
  name: string
  price: string
  tagline: string
  cta: string
  featured?: boolean
  features: string[]
}

const PLANS: Plan[] = [
  {
    name: 'Free',
    price: '₹0',
    tagline: 'For individuals and small shops',
    cta: 'Start free',
    features: [
      '1 business workspace',
      'Upload up to 2 datasets',
      'Basic sales, revenue and expense dashboard',
      'Limited AI business questions (10/month)',
      'Basic trend analysis',
      '1 basic automation',
      'Monthly business summary',
      'Standard CSV export',
    ],
  },
  {
    name: 'Pro',
    price: '₹499',
    tagline: 'For growing small businesses',
    cta: 'Choose Pro',
    featured: true,
    features: [
      'Up to 5 datasets',
      'Advanced dashboards and business KPIs',
      'More AI business questions (200/month)',
      'Time-series and multivariate anomaly detection',
      'Holt-Winters and Linear Regression forecasting',
      'Up to 10 active automations',
      'Scheduled reports and smart alerts',
      'AI-powered recommendations',
      'Export reports as CSV and PDF',
      'Automation execution history',
    ],
  },
  {
    name: 'Advanced',
    price: '₹1,499',
    tagline: 'For scaling businesses',
    cta: 'Choose Advanced',
    features: [
      'Multiple business workspaces or branches',
      'Higher dataset and data-volume limits',
      'Higher AI query allowance',
      'Advanced anomaly detection and forecasting',
      'Unlimited active automations (subject to fair-use limits)',
      'Predictive inventory and demand insights',
      'Custom automation workflows',
      'Automated weekly and monthly reports',
      'Advanced recommendation engine',
      'Priority support',
      'Team access and role-based permissions',
      'API and external integrations',
    ],
  },
]

export default function Pricing() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-ink-950 bg-grid-fade overflow-hidden">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-glow">
            <BrainCircuit className="text-white" size={18} />
          </div>
          <span className="font-display font-semibold tracking-tight">AI Business Analyst</span>
        </Link>
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

      <header className="max-w-3xl mx-auto text-center px-6 pt-14 pb-12">
        <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="text-[40px] sm:text-[48px] leading-[1.08] font-display font-bold tracking-tight">
          Simple pricing that <span className="text-gradient">grows with your business.</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-4 text-[15.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Start free, upgrade when your data and questions do. Every plan uses the same verified
          SQL + ML analytics engine — higher tiers just unlock more of it.
        </motion.p>
      </header>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-5 items-start">
          {PLANS.map((plan, i) => (
            <motion.div key={plan.name} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.08 }}
              className={`card p-7 relative ${plan.featured ? 'ring-2 ring-accent-500 shadow-glow md:-mt-3' : ''}`}>
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent-600 text-white text-[11px] font-semibold tracking-wide uppercase">
                  Recommended
                </span>
              )}
              <h2 className="text-[15px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{plan.name}</h2>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-[38px] font-display font-bold tracking-tight">{plan.price}</span>
                <span className="text-[13.5px] text-slate-500">/month</span>
              </div>
              <p className="mt-2 text-[13.5px] text-slate-500 dark:text-slate-400">{plan.tagline}</p>
              <Link to="/register"
                className={`mt-6 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium text-[14px] transition-colors ${
                  plan.featured
                    ? 'bg-accent-600 text-white hover:bg-accent-500'
                    : 'border border-slate-900/10 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/5'
                }`}>
                {plan.cta} <ArrowRight size={15} />
              </Link>
              <ul className="mt-6 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13.5px] leading-snug">
                    <Check size={15} className="text-mint-400 shrink-0 mt-0.5" />
                    <span className="text-slate-600 dark:text-slate-300">{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="max-w-3xl mx-auto px-6 pb-16 text-center">
        <p className="text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
          These are proposed launch prices and feature limits, not existing market quotations.
          You should validate willingness to pay with actual shop owners.
        </p>
      </footer>
    </div>
  )
}
