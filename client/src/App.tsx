import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { Shell } from './components/Shell'
import { LoginPage } from './features/auth/LoginPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { AccountsPage } from './features/accounts/AccountsPage'
import { AssetsPage } from './features/assets/AssetsPage'
import { PipelinePage } from './features/pipeline/PipelinePage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-graphite-950 text-graphite-500">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Shell /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="quotes" element={<ComingSoon title="Quotes" />} />
        <Route path="rentals" element={<ComingSoon title="Rentals" />} />
        <Route path="service" element={<ComingSoon title="Service" />} />
        <Route path="parts" element={<ComingSoon title="Parts" />} />
        <Route path="settings" element={<ComingSoon title="Settings" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function ComingSoon({ title }: { title: string }) {
  return <div className="p-6"><h1 className="text-xl font-semibold">{title}</h1><p className="text-sm text-graphite-500 mt-2">Coming in a later phase. See plan.md for the delivery sequence.</p></div>
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>
}