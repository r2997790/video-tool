import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import { DemoPageSkeleton } from './components/DemoPageSkeleton'
import { AdminLayout } from './pages/admin/AdminLayout'
import { FlowEditorPage } from './pages/admin/FlowEditorPage'
import { FlowLivePreviewPage } from './pages/admin/FlowLivePreviewPage'
import { FlowLayout } from './pages/admin/FlowLayout'
import { FlowsPage } from './pages/admin/FlowsPage'
import { DemoEntryPage } from './pages/DemoEntryPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/admin/LoginPage'
import { SeedChatPage } from './pages/admin/SeedChatPage'
import { SettingsPage } from './pages/admin/SettingsPage'
import { EventLobbyPage } from './pages/EventLobbyPage'
import { EventsListPage } from './pages/admin/EventsListPage'
import { EventLayout } from './pages/admin/event/EventLayout'
import { EventSettingsTab } from './pages/admin/event/EventSettingsTab'
import { EventScheduleTab } from './pages/admin/event/EventScheduleTab'
import { EventAccessTab } from './pages/admin/event/EventAccessTab'
import { EventAttendeesTab } from './pages/admin/event/EventAttendeesTab'
import { EventLiveChatPage } from './pages/admin/event/EventLiveChatPage'
import { EventLeadsPage } from './pages/admin/event/EventLeadsPage'
import { EventInsightsPage } from './pages/admin/event/EventInsightsPage'
import { ChangePasswordPage } from './pages/admin/ChangePasswordPage'
import { HelpPage } from './pages/admin/HelpPage'
import { TermsPage } from './pages/legal/TermsPage'
import { PrivacyPage } from './pages/legal/PrivacyPage'
import { GdprPage } from './pages/legal/GdprPage'
import { CheckoutPage } from './pages/marketing/CheckoutPage'
import { SalesPage } from './pages/marketing/SalesPage'
import { SignupPage } from './pages/marketing/SignupPage'

const DemoPage = lazy(() => import('./pages/DemoPage').then(m => ({ default: m.DemoPage })))

function LegacyFlowTabRedirect() {
  const { slug = '' } = useParams<{ slug: string }>()
  return <Navigate to={`/admin/flows/${slug}`} replace />
}

function FlowMonitoringRedirect() {
  const { slug = '' } = useParams<{ slug: string }>()
  return <Navigate to={`/admin/events?flow=${encodeURIComponent(slug)}`} replace />
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/gdpr" element={<GdprPage />} />
          <Route path="/demo" element={<DemoEntryPage />} />
          <Route path="/flow/:flowSlug" element={
            <Suspense fallback={<DemoPageSkeleton />}>
              <DemoPage />
            </Suspense>
          } />
          <Route path="/event/:slug" element={<EventLobbyPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/checkout/:plan" element={<CheckoutPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin/change-password" element={<ChangePasswordPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="flows" replace />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="flows" element={<FlowsPage />} />
            <Route path="flows/:slug" element={<FlowLayout />}>
              <Route index element={<FlowEditorPage />} />
              <Route path="chapters" element={<LegacyFlowTabRedirect />} />
              <Route path="toasters" element={<LegacyFlowTabRedirect />} />
              <Route path="pause-points" element={<LegacyFlowTabRedirect />} />
              <Route path="seed-chat" element={<SeedChatPage />} />
              <Route path="preview" element={<FlowLivePreviewPage />} />
              <Route path="live-chat" element={<FlowMonitoringRedirect />} />
              <Route path="engagement" element={<FlowMonitoringRedirect />} />
              <Route path="leads" element={<FlowMonitoringRedirect />} />
            </Route>
            <Route path="flow" element={<Navigate to="/admin/flows" replace />} />
            <Route path="chapters" element={<Navigate to="/admin/flows" replace />} />
            <Route path="seed-chat" element={<Navigate to="/admin/flows" replace />} />
            <Route path="live-chat" element={<Navigate to="/admin/flows" replace />} />
            <Route path="toasters" element={<Navigate to="/admin/flows" replace />} />
            <Route path="pause-points" element={<Navigate to="/admin/flows" replace />} />
            <Route path="engagement" element={<Navigate to="/admin/flows" replace />} />
            <Route path="events" element={<EventsListPage />} />
            <Route path="events/:id" element={<EventLayout />}>
              <Route index element={<EventSettingsTab />} />
              <Route path="schedule" element={<EventScheduleTab />} />
              <Route path="access" element={<EventAccessTab />} />
              <Route path="attendees" element={<EventAttendeesTab />} />
              <Route path="live-chat" element={<EventLiveChatPage />} />
              <Route path="leads" element={<EventLeadsPage />} />
              <Route path="insights" element={<EventInsightsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/demo" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
