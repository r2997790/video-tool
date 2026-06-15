import { Link, Outlet, useLocation, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../../api'
import { PublishBadge } from '../../components/PublishBadge'
import { SharePanel } from '../../components/SharePanel'
import type { FlowDetail } from '../../types'

const tabs = [
  { label: 'Flow', path: '' },
  { label: 'Chat scripts', path: 'seed-chat' },
  { label: 'Live chat', path: 'live-chat' },
  { label: 'Leads', path: 'leads' },
  { label: 'Insights', path: 'engagement' },
]

export function FlowLayout() {
  const { slug = '' } = useParams<{ slug: string }>()
  const location = useLocation()
  const [flow, setFlow] = useState<FlowDetail | null>(null)
  const [insights, setInsights] = useState<{ sessions: number; watchSeconds: number; chatMessages: number } | null>(null)

  useEffect(() => {
    if (!slug) return
    api.getFlow(slug).then(setFlow).catch(() => setFlow(null))
    api.getEngagementLog(slug, 100).then(rows => {
      const sessions = rows.length
      const watchSeconds = rows.reduce((s, r) => s + r.totalWatchSeconds, 0)
      const chatMessages = rows.reduce((s, r) => s + r.chatMessages, 0)
      setInsights({ sessions, watchSeconds, chatMessages })
    }).catch(() => setInsights(null))
  }, [slug])

  const base = `/admin/flows/${slug}`

  const isTabActive = (tabPath: string) => {
    if (tabPath === '') return location.pathname === base || location.pathname === `${base}/`
    return location.pathname.startsWith(`${base}/${tabPath}`)
  }

  const isEnabled = flow?.isEnabled ?? false

  return (
    <>
      <div className="admin-flow-header">
        <div>
          <Link to="/admin/flows" className="admin-btn admin-btn-sm" style={{ marginBottom: 8, display: 'inline-block' }}>
            ← All flows
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0 }}>{flow?.projectName ?? 'Flow'}</h2>
            <PublishBadge isEnabled={isEnabled} />
          </div>
          <p style={{ color: '#9b9d9f', fontSize: 13, margin: '4px 0 0' }}>
            {isEnabled ? 'Live — public link is active' : 'Draft — enable Live to share with prospects'}
          </p>
        </div>
      </div>

      <SharePanel slug={slug} isEnabled={isEnabled} />

      {insights && (
        <div className="admin-insights-strip">
          <div className="admin-insight-card">
            <strong>{insights.sessions}</strong>
            <span>Sessions</span>
          </div>
          <div className="admin-insight-card">
            <strong>{Math.round(insights.watchSeconds / 60)}m</strong>
            <span>Watch time</span>
          </div>
          <div className="admin-insight-card">
            <strong>{insights.chatMessages}</strong>
            <span>Chat msgs</span>
          </div>
        </div>
      )}

      <div className="admin-scope-banner">
        Content on these tabs applies to <strong>this flow only</strong>. Theme, chat toggles, and AI settings are global — edit them under Settings.
      </div>

      <nav className="admin-flow-tabs">
        {tabs.map(tab => (
          <Link
            key={tab.path || 'flow'}
            to={tab.path ? `${base}/${tab.path}` : base}
            className={`admin-btn admin-btn-sm${isTabActive(tab.path) ? ' admin-btn-primary' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <Outlet />
    </>
  )
}
