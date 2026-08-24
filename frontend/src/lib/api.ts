import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aba_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('aba_token')
      localStorage.removeItem('aba_user')
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// ---------- Types ----------
export interface User {
  id: number
  email: string
  full_name?: string | null
  created_at: string
}

export interface ColumnInfo {
  name: string
  dtype: string
  role: 'date' | 'numeric' | 'categorical' | 'id'
  missing_count: number
  missing_pct: number
  unique_count: number
}

export interface DatasetProfile {
  row_count: number
  column_count: number
  columns: ColumnInfo[]
  roles: Record<string, any>
  duplicate_rows: number
  outliers: Record<string, any>
  missing_total_cells: number
}

export interface DatasetSummary {
  id: number
  name: string
  row_count: number
  column_count: number
  data_quality_score: number
  created_at: string
}

export interface Dataset extends DatasetSummary {
  original_filename: string
  table_name: string
  profile: DatasetProfile
  cleaning_log: { operation: string; detail: string }[]
  schema_map: Record<string, any>
}

export interface KPI {
  label: string
  metric_key: string
  total: number
  average: number | null
  min: number | null
  max: number | null
  trend_pct: number | null
}

export interface ChartSpec {
  type: 'line' | 'bar' | 'donut' | 'scatter'
  title: string
  x_key: string
  y_key: string
  data: any[]
}

export interface DashboardData {
  dataset_id: number
  dataset_name: string
  row_count_after_filter: number
  kpis: KPI[]
  charts: ChartSpec[]
  filter_options: Record<string, any>
}

export interface Insight {
  type: string
  title: string
  explanation: string
  metric: string | null
  value: number | null
  change_pct?: number
  suggested_action: string | null
  severity: 'positive' | 'warning' | 'info'
}

export interface AskResponse {
  answer: string
  tool_used: string
  how_calculated: Record<string, any>
  chart: ChartSpec | null
  data: any
}

export interface AutomationRule {
  id: number
  dataset_id: number
  name: string
  rule_type: 'schedule' | 'threshold' | 'anomaly'
  config: Record<string, any>
  recipient_email: string
  is_active: boolean
  last_run_at: string | null
  next_run_at: string | null
  created_at: string
}

export interface Alert {
  id: number
  dataset_id: number
  alert_type: string
  severity: 'info' | 'warning' | 'critical'
  metric: string | null
  value: number | null
  message: string
  is_acknowledged: boolean
  created_at: string
}

export interface AnalysisRecord {
  id: number
  dataset_id: number
  kind: string
  title: string
  input_payload: Record<string, any>
  result_payload: Record<string, any>
  explanation: string | null
  created_at: string
}

// ---------- Auth ----------
export const authApi = {
  register: (email: string, password: string, full_name?: string) =>
    api.post('/api/auth/register', { email, password, full_name }),
  login: (email: string, password: string) => {
    const form = new URLSearchParams()
    form.set('username', email)
    form.set('password', password)
    return api.post('/api/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  },
  me: () => api.get<User>('/api/auth/me'),
}

// ---------- Datasets ----------
export const datasetsApi = {
  upload: (file: File, name?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (name) form.append('name', name)
    return api.post<Dataset>('/api/datasets/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  list: () => api.get<DatasetSummary[]>('/api/datasets'),
  get: (id: number) => api.get<Dataset>(`/api/datasets/${id}`),
  preview: (id: number, limit = 50) =>
    api.get<{ columns: string[]; rows: any[] }>(`/api/datasets/${id}/preview`, { params: { limit } }),
  remove: (id: number) => api.delete(`/api/datasets/${id}`),
}

// ---------- Sample data ----------
export const sampleApi = {
  list: () => api.get<Record<string, { file: string; label: string }>>('/api/sample'),
  load: (key: string) => api.post<Dataset>(`/api/sample/${key}`),
}

// ---------- Dashboard ----------
export const dashboardApi = {
  get: (datasetId: number, filterDim?: string, filterValue?: string) =>
    api.get<DashboardData>(`/api/dashboard/${datasetId}`, {
      params: { filter_dim: filterDim, filter_value: filterValue },
    }),
}

// ---------- Ask ----------
export const askApi = {
  ask: (dataset_id: number, question: string) =>
    api.post<AskResponse>('/api/ask', { dataset_id, question }),
}

// ---------- Insights ----------
export const insightsApi = {
  get: (datasetId: number) => api.get<{ dataset_id: number; insights: Insight[] }>(`/api/insights/${datasetId}`),
}

// ---------- Anomaly ----------
export const anomalyApi = {
  get: (datasetId: number) => api.get(`/api/anomaly/${datasetId}`),
}

// ---------- Forecasting ----------
export const forecastApi = {
  metrics: (datasetId: number) => api.get(`/api/forecast/${datasetId}/metrics`),
  run: (payload: { dataset_id: number; target_metric: string; date_column?: string; horizon: number; frequency?: string }) =>
    api.post('/api/forecast', payload),
}

// ---------- Segmentation ----------
export const segmentationApi = {
  run: (payload: { dataset_id: number; entity_column?: string; feature_columns?: string[]; n_clusters?: number }) =>
    api.post('/api/segmentation', payload),
}

// ---------- What-if ----------
export const whatifApi = {
  run: (payload: { dataset_id: number; target_metric: string; driver_column: string; change_percent: number }) =>
    api.post('/api/whatif', payload),
}

// ---------- Recommendations ----------
export const recommendationsApi = {
  get: (datasetId: number) => api.get(`/api/recommendations/${datasetId}`),
}

// ---------- Reports ----------
export const reportsApi = {
  get: (datasetId: number) => api.get(`/api/reports/${datasetId}`),
}

// ---------- Automation ----------
export const automationApi = {
  listRules: () => api.get<AutomationRule[]>('/api/automation/rules'),
  createRule: (payload: any) => api.post<AutomationRule>('/api/automation/rules', payload),
  updateRule: (id: number, payload: any) => api.patch<AutomationRule>(`/api/automation/rules/${id}`, payload),
  deleteRule: (id: number) => api.delete(`/api/automation/rules/${id}`),
  runNow: (id: number) => api.post<Alert>(`/api/automation/rules/${id}/run-now`),
  listAlerts: () => api.get<Alert[]>('/api/automation/alerts'),
  acknowledgeAlert: (id: number) => api.patch<Alert>(`/api/automation/alerts/${id}/acknowledge`),
}

// ---------- History ----------
export const historyApi = {
  list: (params?: { dataset_id?: number; kind?: string }) =>
    api.get<AnalysisRecord[]>('/api/history', { params }),
}
