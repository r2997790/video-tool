import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../api'
import { AdminFieldLabel } from '../../../components/AdminFieldLabel'
import { HELP } from '../../../adminHelpText'
import { UploadIcon, VideoIcon } from '../../../components/icons/uiIcons'
import { useEventAdmin } from './EventAdminContext'

export function EventSettingsTab() {
  const { ev, setEv, flows, save } = useEventAdmin()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="admin-card">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <AdminFieldLabel label="Title" help={HELP.events.title}>
          <input className="admin-input" value={ev.title} onChange={e => setEv({ ...ev, title: e.target.value })} onBlur={() => save({ title: ev.title })} />
        </AdminFieldLabel>
        <AdminFieldLabel label="Slug" help={HELP.events.slug}>
          <input className="admin-input" value={ev.slug} onChange={e => setEv({ ...ev, slug: e.target.value })} onBlur={() => save({ slug: ev.slug })} />
        </AdminFieldLabel>
        <AdminFieldLabel label="Flow" help={HELP.events.flow}>
          <select className="admin-input" value={ev.flowSlug || ''} onChange={e => save({ flowSlug: e.target.value })}>
            <option value="">Select flow…</option>
            {flows.map(f => <option key={f.id} value={f.slug}>{f.projectName}</option>)}
          </select>
        </AdminFieldLabel>
        <AdminFieldLabel label="Event kind">
          <select className="admin-input" value={ev.eventKind || 'scheduled'} onChange={e => save({ eventKind: e.target.value })}>
            <option value="scheduled">Scheduled</option>
            <option value="on_demand">On demand</option>
            <option value="instant">Instant</option>
          </select>
        </AdminFieldLabel>
      </div>
      <label style={{ display: 'block', marginTop: 12 }}>
        <input type="checkbox" checked={ev.isEnabled} onChange={e => save({ isEnabled: e.target.checked })} /> Event is active
      </label>
      <AdminFieldLabel label="Holding heading" help={HELP.events.holdingHeading}>
        <input className="admin-input" value={ev.holdingHeading || ''} onChange={e => setEv({ ...ev, holdingHeading: e.target.value })} onBlur={() => save({ holdingHeading: ev.holdingHeading })} />
      </AdminFieldLabel>
      <AdminFieldLabel label="Holding message" help={HELP.events.holdingMessage}>
        <textarea className="admin-textarea" rows={2} value={ev.holdingMessage || ''} onChange={e => setEv({ ...ev, holdingMessage: e.target.value })} onBlur={() => save({ holdingMessage: ev.holdingMessage })} />
      </AdminFieldLabel>
      <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={async e => {
        const file = e.target.files?.[0]; e.target.value = ''
        if (!file) return
        const { url } = await api.uploadMedia(file)
        save({ holdingImageUrl: url })
      }} />
      <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={async e => {
        const file = e.target.files?.[0]; e.target.value = ''
        if (!file) return
        const { url } = await api.uploadMedia(file)
        save({ holdingVideoUrl: url, holdingVideoType: 'direct' })
      }} />
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <button type="button" className="admin-btn admin-btn-sm btn-with-icon" onClick={() => imageInputRef.current?.click()}>
          <UploadIcon />
          Upload image
        </button>
        <button type="button" className="admin-btn admin-btn-sm btn-with-icon" onClick={() => videoInputRef.current?.click()}>
          <VideoIcon />
          Upload video
        </button>
      </div>
      <AdminFieldLabel label="Image URL" help={HELP.events.holdingImageUrl}>
        <input className="admin-input" value={ev.holdingImageUrl || ''} onChange={e => setEv({ ...ev, holdingImageUrl: e.target.value })} onBlur={() => save({ holdingImageUrl: ev.holdingImageUrl })} />
      </AdminFieldLabel>
      <AdminFieldLabel label="Video URL" help={HELP.events.holdingVideoUrl}>
        <input className="admin-input" value={ev.holdingVideoUrl || ''} onChange={e => setEv({ ...ev, holdingVideoUrl: e.target.value })} onBlur={() => save({ holdingVideoUrl: ev.holdingVideoUrl })} />
      </AdminFieldLabel>
      {!ev.flowSlug && (
        <p style={{ marginTop: 16, fontSize: 13, color: '#c9a227' }}>
          Assign a flow to enable live chat, leads, and insights monitoring for this event.
        </p>
      )}
    </div>
  )
}

export function EventNoFlowMessage() {
  const { eventId } = useEventAdmin()
  return (
    <div className="admin-card">
      <p style={{ color: '#9b9d9f', margin: 0 }}>
        Assign a flow in <Link to={`/admin/events/${eventId}`}>Settings</Link> to view event monitoring data.
      </p>
    </div>
  )
}
