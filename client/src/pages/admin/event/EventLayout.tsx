import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useParams } from 'react-router-dom'
import { api } from '../../../api'
import type { FlowSummary, ScheduledEvent } from '../../../types'
import { useToast } from '../../../components/Toast'
import { EventAdminProvider } from './EventAdminContext'
import { ExternalLinkIcon, LiveIcon } from '../../../components/icons/uiIcons'
import { eventPayload } from './eventAdminUtils'

const SETUP_TABS = [
  { label: 'Settings', path: '' },
  { label: 'Schedule', path: 'schedule' },
  { label: 'Access', path: 'access' },
  { label: 'Attendees', path: 'attendees' },
] as const

const MONITORING_TABS = [
  { label: 'Live chat', path: 'live-chat' },
  { label: 'Leads', path: 'leads' },
  { label: 'Insights', path: 'insights' },
] as const

export function EventLayout() {
  const { id = '' } = useParams<{ id: string }>()
  const eventId = parseInt(id, 10)
  const location = useLocation()
  const toast = useToast()
  const [ev, setEv] = useState<ScheduledEvent | null>(null)
  const [flows, setFlows] = useState<FlowSummary[]>([])

  const base = `/admin/events/${eventId}`

  const reload = () => {
    if (!eventId) return
    api.getScheduledEventAdmin(eventId).then(setEv).catch(() => setEv(null))
  }

  useEffect(() => {
    reload()
    api.getFlows().then(setFlows).catch(() => setFlows([]))
  }, [eventId])

  const isTabActive = (tabPath: string) => {
    if (tabPath === '') return location.pathname === base || location.pathname === `${base}/`
    return location.pathname.startsWith(`${base}/${tabPath}`)
  }

  const save = async (patch: Partial<ScheduledEvent>) => {
    if (!ev) return
    const updated = { ...ev, ...patch }
    const saved = await api.updateScheduledEvent(ev.id, eventPayload(updated)) as ScheduledEvent
    setEv(saved)
    toast.success('Saved')
  }

  const goLive = async () => {
    if (!ev) return
    const saved = await api.goLiveEvent(ev.id)
    setEv(saved)
    toast.success('Event is now live')
  }

  const ctxValue = useMemo(() => {
    if (!ev) return null
    return { eventId, ev, setEv, flows, save, goLive, reload }
  }, [eventId, ev, flows])

  if (!ev || !ctxValue) {
    return <p style={{ color: '#9b9d9f' }}>Loading event…</p>
  }

  const metrics = ev.metrics

  return (
    <EventAdminProvider value={ctxValue}>
      <div className="admin-flow-header">
        <div>
          <Link to="/admin/events" className="admin-back-link">← Events</Link>
          <div className="admin-flow-title-row">
            <h2>{ev.title}</h2>
          </div>
          <p className="admin-flow-status">
            Lobby: <code>/event/{ev.slug}</code>
            {ev.flowSlug && <> · Live: <code>/flow/{ev.flowSlug}?event={ev.slug}</code></>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ev.eventKind === 'on_demand' && (
            <button type="button" className="admin-btn admin-btn-primary admin-btn-sm btn-with-icon" onClick={goLive}>
              <LiveIcon />
              Go Live
            </button>
          )}
          <a className="admin-btn admin-btn-sm btn-with-icon" href={`/event/${ev.slug}`} target="_blank" rel="noopener noreferrer">
            <ExternalLinkIcon />
            Open lobby
          </a>
        </div>
      </div>

      {metrics && (
        <div className="admin-insights-strip">
          <div className="admin-insight-card">
            <strong>{metrics.attendeeCount}</strong>
            <span>Sessions</span>
          </div>
          <div className="admin-insight-card">
            <strong>{Math.round(metrics.totalWatchSeconds / 60)}m</strong>
            <span>Watch time</span>
          </div>
          <div className="admin-insight-card">
            <strong>{metrics.chatMessages ?? 0}</strong>
            <span>Chat msgs</span>
          </div>
        </div>
      )}

      <nav className="admin-flow-tabs" aria-label="Event sections">
        {SETUP_TABS.map(tab => (
          <Link
            key={tab.path || 'settings'}
            to={tab.path ? `${base}/${tab.path}` : base}
            className={`admin-flow-tab${isTabActive(tab.path) ? ' is-active' : ''}`}
          >
            {tab.label}
          </Link>
        ))}
        <span className="admin-event-tab-divider" aria-hidden="true" />
        {MONITORING_TABS.map(tab => (
          <Link
            key={tab.path}
            to={`${base}/${tab.path}`}
            className={`admin-flow-tab${isTabActive(tab.path) ? ' is-active' : ''}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <Outlet />
    </EventAdminProvider>
  )
}
