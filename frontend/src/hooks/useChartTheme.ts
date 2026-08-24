import { useTheme } from '../context/ThemeContext'

/**
 * Recharts renders via inline SVG/JS styles, which Tailwind's `dark:`
 * variant can't reach. This hook centralizes the handful of colors charts
 * need so they stay legible and elegant in both themes.
 */
export function useChartTheme() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return {
    isDark,
    tooltipStyle: {
      background: isDark ? '#161829' : '#ffffff',
      border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
      borderRadius: 10,
      fontSize: 12.5,
      padding: '8px 12px',
      color: isDark ? '#e2e8f0' : '#0f172a',
      boxShadow: isDark ? 'none' : '0 8px 24px rgba(15,23,42,0.08)',
    },
    gridStroke: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.06)',
    axisTick: { fontSize: 11, fill: isDark ? '#64748b' : '#94a3b8' },
    cursorFill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.035)',
    legendColor: isDark ? '#94a3b8' : '#475569',
    pageBg: isDark ? '#0f1120' : '#f8fafc',
  }
}
