import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-ink-950 flex flex-col items-center justify-center px-6 text-center">
      <p className="text-[64px] font-display font-bold text-gradient">404</p>
      <p className="text-slate-500 dark:text-slate-400 mt-2">This page doesn't exist.</p>
      <Link to="/" className="mt-6 px-4 py-2 rounded-xl bg-accent-600 text-white hover:bg-accent-500 transition-colors text-[13.5px] font-medium">
        Go home
      </Link>
    </div>
  )
}
