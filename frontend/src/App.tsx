import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { DatasetProvider } from './context/DatasetContext'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Explorer from './pages/Explorer'
import DataQuality from './pages/DataQuality'
import VisualAnalytics from './pages/VisualAnalytics'
import Insights from './pages/Insights'
import AskData from './pages/AskData'
import Forecasting from './pages/Forecasting'
import Segmentation from './pages/Segmentation'
import AnomalyDetection from './pages/AnomalyDetection'
import DecisionSimulator from './pages/DecisionSimulator'
import Recommendations from './pages/Recommendations'
import Reports from './pages/Reports'
import Automation from './pages/Automation'
import AnalysisHistory from './pages/AnalysisHistory'
import SettingsPage from './pages/Settings'
import NotFound from './pages/NotFound'

function Protected({ children }: { children: JSX.Element }) {
  return (
    <ProtectedRoute>
      <DatasetProvider>{children}</DatasetProvider>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/upload" element={<Protected><Upload /></Protected>} />
      <Route path="/explorer" element={<Protected><Explorer /></Protected>} />
      <Route path="/data-quality" element={<Protected><DataQuality /></Protected>} />
      <Route path="/analytics" element={<Protected><VisualAnalytics /></Protected>} />
      <Route path="/insights" element={<Protected><Insights /></Protected>} />
      <Route path="/ask" element={<Protected><AskData /></Protected>} />
      <Route path="/anomalies" element={<Protected><AnomalyDetection /></Protected>} />
      <Route path="/forecasting" element={<Protected><Forecasting /></Protected>} />
      <Route path="/segmentation" element={<Protected><Segmentation /></Protected>} />
      <Route path="/simulator" element={<Protected><DecisionSimulator /></Protected>} />
      <Route path="/recommendations" element={<Protected><Recommendations /></Protected>} />
      <Route path="/reports" element={<Protected><Reports /></Protected>} />
      <Route path="/automation" element={<Protected><Automation /></Protected>} />
      <Route path="/history" element={<Protected><AnalysisHistory /></Protected>} />
      <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
