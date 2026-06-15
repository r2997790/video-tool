import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import { DemoPage } from './pages/DemoPage'
import { AdminLayout } from './pages/admin/AdminLayout'
import { FlowEditorPage } from './pages/admin/FlowEditorPage'
import { FlowLayout } from './pages/admin/FlowLayout'
import { FlowsPage } from './pages/admin/FlowsPage'
import { DemoEntryPage } from './pages/DemoEntryPage'
import { LiveChatPage } from './pages/admin/LiveChatPage'
import { LoginPage } from './pages/admin/LoginPage'
import { SeedChatPage } from './pages/admin/SeedChatPage'
import { SettingsPage } from './pages/admin/SettingsPage'
import { EventLobbyPage } from './pages/EventLobbyPage'
import { EngagementPage } from './pages/admin/EngagementPage'
import { LeadsPage } from './pages/admin/LeadsPage'
import { EventsPage } from './pages/admin/EventsPage'
import { ChangePasswordPage } from './pages/admin/ChangePasswordPage'

function LegacyFlowTabRedirect() {
  const { slug = '' } = useParams<{ slug: string }>()
  return <Navigate to={`/admin/flows/${slug}`} replace />
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/demo" replace />} />
          <Route path="/demo" element={<DemoEntryPage />} />
          <Route path="/flow/:flowSlug" element={<DemoPage />} />
          <Route path="/event/:slug" element={<EventLobbyPage />} />
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin/change-password" element={<ChangePasswordPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="flows" replace />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="flows" element={<FlowsPage />} />
            <Route path="flows/:slug" element={<FlowLayout />}>
              <Route index element={<FlowEditorPage />} />
              <Route path="chapters" element={<LegacyFlowTabRedirect />} />
              <Route path="toasters" element={<LegacyFlowTabRedirect />} />
              <Route path="pause-points" element={<LegacyFlowTabRedirect />} />
              <Route path="seed-chat" element={<SeedChatPage />} />
              <Route path="live-chat" element={<LiveChatPage />} />
              <Route path="engagement" element={<EngagementPage />} />
              <Route path="leads" element={<LeadsPage />} />
            </Route>
            <Route path="flow" element={<Navigate to="/admin/flows" replace />} />
            <Route path="chapters" element={<Navigate to="/admin/flows" replace />} />
            <Route path="seed-chat" element={<Navigate to="/admin/flows" replace />} />
            <Route path="live-chat" element={<Navigate to="/admin/flows" replace />} />
            <Route path="toasters" element={<Navigate to="/admin/flows" replace />} />
            <Route path="pause-points" element={<Navigate to="/admin/flows" replace />} />
            <Route path="engagement" element={<Navigate to="/admin/flows" replace />} />
            <Route path="events" element={<EventsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/demo" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
