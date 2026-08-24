import { motion } from 'framer-motion'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { ChartSpec } from '../lib/api'
import { useChartTheme } from '../hooks/useChartTheme'

const PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#f43f5e', '#38bdf8', '#a78bfa', '#fb923c']

function truncateLabel(v: any) {
  const s = String(v)
  return s.length > 14 ? s.slice(0, 13) + '…' : s
}

export default function ChartCard({ chart, index = 0, height = 280 }: { chart: ChartSpec; index?: number; height?: number }) {
  const { tooltipStyle, gridStroke, axisTick, cursorFill, legendColor } = useChartTheme()
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: 'easeOut' }}
      className="card p-5"
    >
      <p className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-200 mb-4">{chart.title}</p>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          {chart.type === 'line' ? (
            <LineChart data={chart.data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey={chart.x_key} tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={48} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey={chart.y_key} stroke="#6366f1" strokeWidth={2.5}
                    dot={{ r: 2.5, fill: '#6366f1' }} activeDot={{ r: 5 }} />
            </LineChart>
          ) : chart.type === 'bar' ? (
            <BarChart data={chart.data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey={chart.x_key} tick={axisTick} tickLine={false} axisLine={false}
                     tickFormatter={truncateLabel} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={48} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: cursorFill }} />
              <Bar dataKey={chart.y_key} radius={[6, 6, 0, 0]}>
                {chart.data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Bar>
            </BarChart>
          ) : chart.type === 'donut' ? (
            <PieChart>
              <Pie data={chart.data} dataKey={chart.y_key} nameKey={chart.x_key}
                   innerRadius={60} outerRadius={95} paddingAngle={2}>
                {chart.data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="none" />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11.5, color: legendColor }} />
            </PieChart>
          ) : (
            <ScatterChart margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey={chart.x_key} type="number" tick={axisTick}
                     tickLine={false} axisLine={false} name={chart.x_key} />
              <YAxis dataKey={chart.y_key} type="number" tick={axisTick}
                     tickLine={false} axisLine={false} width={48} name={chart.y_key} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={chart.data} fill="#6366f1" fillOpacity={0.75} />
            </ScatterChart>
          )}
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

export function ChartCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="h-3.5 w-40 rounded skeleton mb-4" />
      <div className="h-64 rounded-xl skeleton" />
    </div>
  )
}
