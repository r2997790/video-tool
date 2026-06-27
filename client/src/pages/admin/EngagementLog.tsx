import { Fragment, useEffect, useState } from 'react'
import { api } from '../../api'
import { CollapseIcon, ExpandIcon } from '../../components/icons/uiIcons'
import type { EngagementSession } from '../../types'

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

interface EngagementLogProps {
  eventId?: number
  flowSlug?: string
}

export function EngagementLog({ eventId, flowSlug = 'default' }: EngagementLogProps) {
  const [sessions, setSessions] = useState<EngagementSession[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    const load = eventId
      ? api.getEventEngagementLog(eventId, 100)
      : api.getEngagementLog(flowSlug, 100)
    load.then(setSessions).catch(console.error)
  }, [eventId, flowSlug])

  return (
    <>
      <h2>User Engagement Log</h2>
      <p style={{ color: '#9b9d9f', fontSize: 13, marginBottom: 16 }}>
        Per-session summary of watch time, chat messages, toaster views, downloads, and flow steps.
        {eventId ? ' Showing sessions linked to this event only.' : ''}
      </p>
      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Watch Time</th>
              <th>Chat</th>
              <th>Toasters</th>
              <th>Downloads</th>
              <th>Flow Steps</th>
              <th>Last Activity</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(s => (
              <Fragment key={s.sessionId}>
                <tr>
                  <td><code style={{ fontSize: 11 }}>{s.sessionId.slice(0, 8)}…</code></td>
                  <td>{formatDuration(s.totalWatchSeconds)}</td>
                  <td>{s.chatMessages}</td>
                  <td>{s.toasterViews} <small style={{ color: '#5f6164' }}>({s.toasterDismissals} dismissed)</small></td>
                  <td>{s.downloads}</td>
                  <td>{s.flowSteps}</td>
                  <td>{formatDate(s.lastActivity)}</td>
                  <td>
                    <button className="admin-btn admin-btn-sm btn-with-icon" onClick={() => setExpanded(expanded === s.sessionId ? null : s.sessionId)}>
                      {expanded === s.sessionId ? <CollapseIcon /> : <ExpandIcon />}
                      {expanded === s.sessionId ? 'Hide' : 'Events'}
                    </button>
                  </td>
                </tr>
                {expanded === s.sessionId && (
                  <tr>
                    <td colSpan={8}>
                      <div style={{ padding: '8px 0' }}>
                        {s.events.length === 0 && <p style={{ color: '#5f6164', margin: 0 }}>No logged events.</p>}
                        {s.events.map((e, i) => (
                          <div key={i} style={{ fontSize: 12, color: '#c8c9cb', marginBottom: 4 }}>
                            <strong>{e.eventType}</strong>
                            {e.chapterId != null && ` · chapter ${e.chapterId}`}
                            {e.toasterId != null && ` · toaster ${e.toasterId}`}
                            {e.dataJson && ` · ${e.dataJson}`}
                            <span style={{ color: '#5f6164' }}> — {formatDate(e.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {sessions.length === 0 && <p style={{ color: '#5f6164' }}>No engagement data yet.</p>}
      </div>
    </>
  )
}
