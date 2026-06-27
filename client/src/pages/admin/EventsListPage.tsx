import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api'
import type { EventsSummary, FlowSummary, ScheduledEvent } from '../../types'
import { ConfirmModal } from '../../components/ConfirmModal'
import { useToast } from '../../components/Toast'
import {
  ActivateIcon,
  CalendarIcon,
  CancelIcon,
  DeactivateIcon,
  DeleteIcon,
  DuplicateIcon,
  EditIcon,
  InstantIcon,
  RenameIcon,
  SaveIcon,
} from '../../components/icons/uiIcons'

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function statusLabel(status?: string) {
  switch (status) {
    case 'live': return 'Live'
    case 'instant': return 'Instant'
    case 'programmed': return 'Programmed'
    case 'past': return 'Past'
    case 'inactive': return 'Inactive'
    default: return status ?? '—'
  }
}

export function EventsListPage() {
  const [events, setEvents] = useState<ScheduledEvent[]>([])
  const [summary, setSummary] = useState<EventsSummary | null>(null)
  const [flows, setFlows] = useState<FlowSummary[]>([])
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [renameId, setRenameId] = useState<number | null>(null)
  const [renameTitle, setRenameTitle] = useState('')
  const toast = useToast()
  const navigate = useNavigate()

  const load = () => {
    api.getScheduledEvents().then(setEvents).catch(() => setEvents([]))
    api.getEventsSummary().then(setSummary).catch(() => setSummary(null))
  }

  useEffect(() => {
    load()
    api.getFlows().then(setFlows).catch(() => setFlows([]))
  }, [])

  const createEvent = async () => {
    const defaultFlow = flows.find(f => f.slug === 'default') ?? flows[0]
    if (!defaultFlow) {
      toast.error('Create at least one flow before scheduling an event.')
      return
    }
    const starts = new Date(Date.now() + 3600_000)
    const ev = await api.createScheduledEvent({
      slug: `event-${Date.now().toString(36)}`,
      title: 'New Broadcast',
      startsAtUtc: starts.toISOString(),
      holdingHeading: 'Starting soon',
      holdingMessage: 'Please wait while we prepare the broadcast.',
      holdingVideoType: 'none',
      flowSlug: defaultFlow.slug,
      recurrenceType: 'none',
      eventKind: 'scheduled',
      accessMode: 'open',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      isEnabled: true,
    }) as ScheduledEvent
    toast.success('Event created')
    navigate(`/admin/events/${ev.id}`)
  }

  const createInstant = async () => {
    const defaultFlow = flows.find(f => f.slug === 'default') ?? flows[0]
    if (!defaultFlow) {
      toast.error('Create at least one flow first.')
      return
    }
    const ev = await api.createInstantEvent({ flowSlug: defaultFlow.slug, title: 'Instant Broadcast' })
    toast.success('Instant event is live')
    navigate(`/admin/events/${ev.id}`)
  }

  const toggleEnabled = async (ev: ScheduledEvent) => {
    await api.updateScheduledEvent(ev.id, { ...eventPayload(ev), isEnabled: !ev.isEnabled })
    load()
  }

  const duplicate = async (ev: ScheduledEvent) => {
    const copy = await api.duplicateEvent(ev.id, { newTitle: `${ev.title} (copy)` })
    toast.success('Event duplicated')
    navigate(`/admin/events/${copy.id}`)
  }

  const remove = async (id: number) => {
    await api.deleteScheduledEvent(id)
    toast.success('Event deleted')
    load()
  }

  const saveRename = async () => {
    if (renameId == null) return
    const ev = events.find(e => e.id === renameId)
    if (!ev) return
    await api.updateScheduledEvent(ev.id, { ...eventPayload(ev), title: renameTitle })
    setRenameId(null)
    load()
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Event Management</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="admin-btn admin-btn-sm btn-with-icon" onClick={createInstant}>
            <InstantIcon />
            Instant Event
          </button>
          <button type="button" className="admin-btn admin-btn-primary btn-with-icon" onClick={createEvent}>
            <CalendarIcon />
            New Event
          </button>
        </div>
      </div>

      {summary && (
        <div className="admin-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div><div style={{ color: '#9b9d9f', fontSize: 12 }}>Total events</div><strong>{summary.totalEvents}</strong></div>
          <div><div style={{ color: '#9b9d9f', fontSize: 12 }}>Active</div><strong>{summary.activeEvents}</strong></div>
          <div><div style={{ color: '#9b9d9f', fontSize: 12 }}>Total attendees</div><strong>{summary.totalAttendees}</strong></div>
          <div><div style={{ color: '#9b9d9f', fontSize: 12 }}>Watch time</div><strong>{formatDuration(summary.totalWatchSeconds)}</strong></div>
          <div><div style={{ color: '#9b9d9f', fontSize: 12 }}>Engagement</div><strong>{summary.engagementScore}</strong></div>
        </div>
      )}

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Schedule</th>
              <th>Registered</th>
              <th>Attendees</th>
              <th>Engagement</th>
              <th>Duration</th>
              <th>Next</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map(ev => {
              const m = ev.metrics
              const next = ev.occurrence?.nextStartsAtUtc
              return (
                <tr key={ev.id}>
                  <td>
                    <Link to={`/admin/events/${ev.id}`}>{ev.title}</Link>
                    <div style={{ fontSize: 11, color: '#5f6164' }}>{ev.slug}</div>
                  </td>
                  <td>{statusLabel(m?.displayStatus ?? ev.occurrence?.displayStatus)}</td>
                  <td>{m?.recurrenceLabel ?? (ev.recurrenceType === 'none' ? 'Once' : 'Recurring')}</td>
                  <td>{m?.registeredCount ?? 0}</td>
                  <td>{m?.attendeeCount ?? 0}</td>
                  <td>{m?.engagementScore ?? 0}</td>
                  <td>{ev.liveDurationMinutes ? `${ev.liveDurationMinutes}m` : '—'}</td>
                  <td>{next ? new Date(next).toLocaleString() : '—'}</td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Link className="admin-btn admin-btn-sm btn-with-icon" to={`/admin/events/${ev.id}`}>
                      <EditIcon />
                      Edit
                    </Link>
                    <button type="button" className="admin-btn admin-btn-sm btn-with-icon" onClick={() => { setRenameId(ev.id); setRenameTitle(ev.title) }}>
                      <RenameIcon />
                      Rename
                    </button>
                    <button type="button" className="admin-btn admin-btn-sm btn-with-icon" onClick={() => duplicate(ev)}>
                      <DuplicateIcon />
                      Duplicate
                    </button>
                    <button type="button" className="admin-btn admin-btn-sm btn-with-icon" onClick={() => toggleEnabled(ev)}>
                      {ev.isEnabled ? <DeactivateIcon /> : <ActivateIcon />}
                      {ev.isEnabled ? 'Deactivate' : 'Activate'}
                    </button>
                    <button type="button" className="admin-btn admin-btn-danger admin-btn-sm btn-with-icon" onClick={() => setDeleteId(ev.id)}>
                      <DeleteIcon />
                      Delete
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {events.length === 0 && <p style={{ padding: 16, color: '#5f6164' }}>No events yet.</p>}
      </div>

      <ConfirmModal open={deleteId != null} title="Delete event?" message="Remove this event and all attendee records." confirmLabel="Delete" danger
        onConfirm={() => { if (deleteId != null) remove(deleteId); setDeleteId(null) }} onCancel={() => setDeleteId(null)} />

      {renameId != null && (
        <div className="admin-modal-backdrop" role="dialog">
          <div className="admin-card" style={{ maxWidth: 400, margin: '10vh auto' }}>
            <h3>Rename event</h3>
            <input className="admin-input" value={renameTitle} onChange={e => setRenameTitle(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="button" className="admin-btn admin-btn-primary btn-with-icon" onClick={saveRename}>
                <SaveIcon />
                Save
              </button>
              <button type="button" className="admin-btn btn-with-icon" onClick={() => setRenameId(null)}>
                <CancelIcon />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function eventPayload(ev: ScheduledEvent) {
  return {
    slug: ev.slug,
    title: ev.title,
    startsAtUtc: ev.startsAtUtc,
    holdingHeading: ev.holdingHeading,
    holdingMessage: ev.holdingMessage,
    holdingImageUrl: ev.holdingImageUrl,
    holdingVideoUrl: ev.holdingVideoUrl,
    holdingVideoType: ev.holdingVideoType,
    defaultChapterId: ev.defaultChapterId,
    flowSlug: ev.flowSlug,
    recurrenceType: ev.recurrenceType || 'none',
    intervalMinutes: ev.intervalMinutes,
    recurrenceStartUtc: ev.recurrenceStartUtc,
    recurrenceEndUtc: ev.recurrenceEndUtc,
    timezone: ev.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    weeklyScheduleJson: ev.weeklyScheduleJson,
    liveDurationMinutes: ev.liveDurationMinutes,
    isEnabled: ev.isEnabled,
    eventKind: ev.eventKind || 'scheduled',
    accessMode: ev.accessMode || 'open',
    registrationFormJson: ev.registrationFormJson,
    registrationApprovalMode: ev.registrationApprovalMode || 'auto',
    crmListKey: ev.crmListKey,
    privacyPolicyOverrideJson: ev.privacyPolicyOverrideJson,
    accessOverrideJson: ev.accessOverrideJson,
  }
}
