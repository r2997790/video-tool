import { Link, Outlet, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../../api'
import { PublishBadge } from '../../components/PublishBadge'
import { SharePanel } from '../../components/SharePanel'
import type { FlowDetail } from '../../types'

const SCOPE_BANNER_KEY = 'videotool_flow_scope_dismissed'

export function FlowLayout() {
  const { slug = '' } = useParams<{ slug: string }>()
  const [flow, setFlow] = useState<FlowDetail | null>(null)
  const [scopeDismissed, setScopeDismissed] = useState(() => {
    try { return localStorage.getItem(SCOPE_BANNER_KEY) === '1' }
    catch { return false }
  })

  useEffect(() => {
    if (!slug) return
    api.getFlow(slug).then(setFlow).catch(() => setFlow(null))
  }, [slug])

  const isEnabled = flow?.isEnabled ?? false

  const dismissScope = () => {
    setScopeDismissed(true)
    try { localStorage.setItem(SCOPE_BANNER_KEY, '1') } catch { /* ignore */ }
  }

  return (
    <>
      <div className="admin-flow-header">
        <div>
          <Link to="/admin/flows" className="admin-back-link">
            ← All flows
          </Link>
          <div className="admin-flow-title-row">
            <h2>{flow?.projectName ?? 'Flow'}</h2>
            <PublishBadge isEnabled={isEnabled} />
            {scopeDismissed && (
              <button
                type="button"
                className="admin-scope-info-btn"
                title="Content on these tabs applies to this flow only. Theme, chat toggles, and AI settings are global — edit them under Settings."
                aria-label="Flow scope information"
              >
                i
              </button>
            )}
          </div>
          <p className="admin-flow-status">
            {isEnabled ? 'Live — public link is active' : 'Draft — enable Live to share with prospects'}
          </p>
        </div>
        <SharePanel slug={slug} isEnabled={isEnabled} compact />
      </div>

      {!scopeDismissed && (
        <div className="admin-scope-banner">
          <span>
            Content on these tabs applies to <strong>this flow only</strong>. Theme, chat toggles, and AI settings are global — edit them under Settings.
          </span>
          <button type="button" className="admin-scope-dismiss" onClick={dismissScope} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <Outlet />
    </>
  )
}
