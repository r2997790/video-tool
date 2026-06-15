import { useEffect, useRef, useState } from 'react'
import { api } from '../../api'
import type { FlowSummary, ScheduledEvent, WeeklySchedule } from '../../types'
import { AdminFieldLabel } from '../../components/AdminFieldLabel'
import { FieldHelp } from '../../components/FieldHelp'
import { ConfirmModal } from '../../components/ConfirmModal'
import { useToast } from '../../components/Toast'
import { HELP } from '../../adminHelpText'
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function parseWeekly(json?: string | null): WeeklySchedule {
  if (!json) return { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], times: ['09:30'] }
  try { return JSON.parse(json) as WeeklySchedule } catch { return { days: [], times: [] } }
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
  }
}

export function EventsPage() {
  const [events, setEvents] = useState<ScheduledEvent[]>([])
  const [flows, setFlows] = useState<FlowSummary[]>([])
  const [chaptersByFlow, setChaptersByFlow] = useState<Record<string, Array<{ id: number; name: string }>>>({})
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [uploadTarget, setUploadTarget] = useState<{ id: number; field: 'holdingImageUrl' | 'holdingVideoUrl' } | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const toast = useToast()

  const load = () => api.getScheduledEvents().then(setEvents)
  useEffect(() => {
    load()
    api.getFlows().then(setFlows).catch(() => setFlows([]))
  }, [])

  useEffect(() => {
    const slugs = [...new Set(events.map(e => e.flowSlug).filter((s): s is string => !!s))]
    slugs.forEach(slug => {
      api.getAdminChapters(slug).then(cs => {
        setChaptersByFlow(prev => {
          if (prev[slug]) return prev
          return {
            ...prev,
            [slug]: cs.map(c => ({ id: c.id, name: c.name })),
          }
        })
      }).catch(() => {})
    })
  }, [events])

  const add = async () => {
    const defaultFlow = flows.find(f => f.slug === 'default') ?? flows[0]
    if (!defaultFlow) {
      toast.error('Create at least one flow before scheduling an event.')
      return
    }
    const starts = new Date(Date.now() + 3600_000)
    await api.createScheduledEvent({
      slug: `event-${Date.now().toString(36)}`,
      title: 'New Broadcast',
      startsAtUtc: starts.toISOString(),
      holdingHeading: 'Starting soon',
      holdingMessage: 'Please wait while we prepare the broadcast.',
      holdingVideoType: 'none',
      flowSlug: defaultFlow.slug,
      recurrenceType: 'none',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      isEnabled: true,
    })
    load()
  }

  const update = async (ev: ScheduledEvent) => {
    await api.updateScheduledEvent(ev.id, eventPayload(ev))
    load()
  }

  const patch = (id: number, patch: Partial<ScheduledEvent>) => {
    setEvents(es => es.map(x => x.id === id ? { ...x, ...patch } : x))
  }

  const remove = async (id: number) => {
    await api.deleteScheduledEvent(id)
    load()
  }

  const toLocalInput = (iso?: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const fromLocalInput = (val: string) => val ? new Date(val).toISOString() : null

  const triggerUpload = (id: number, field: 'holdingImageUrl' | 'holdingVideoUrl') => {
    setUploadTarget({ id, field })
    ;(field === 'holdingImageUrl' ? imageInputRef : videoInputRef).current?.click()
  }

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !uploadTarget) return
    const { url } = await api.uploadMedia(file)
    const ev = events.find(x => x.id === uploadTarget.id)
    if (!ev) return
    const updated = {
      ...ev,
      [uploadTarget.field]: url,
      ...(uploadTarget.field === 'holdingVideoUrl' ? { holdingVideoType: 'direct' as const } : {}),
    }
    setEvents(es => es.map(x => x.id === ev.id ? updated : x))
    await update(updated)
    setUploadTarget(null)
  }

  const setWeekly = (ev: ScheduledEvent, weekly: WeeklySchedule) => {
    patch(ev.id, { weeklyScheduleJson: JSON.stringify(weekly) })
  }

  return (
    <>
      <h2>Scheduled Broadcasts</h2>
      <p style={{ color: '#9b9d9f', fontSize: 13, marginBottom: 16 }}>
        Each event has a lobby at <code>/event/your-slug</code> and plays a linked flow at <code>/flow/flow-slug</code> when live.
      </p>
      <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={onFilePicked} />
      <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={onFilePicked} />
      <button type="button" className="admin-btn" onClick={add} style={{ marginBottom: 16 }}>Add Event</button>
      <div className="admin-card">
        {events.map(ev => {
          const weekly = parseWeekly(ev.weeklyScheduleJson)
          const redirectPreview = ev.flowSlug
            ? `/flow/${ev.flowSlug}?event=${ev.slug}`
            : '(select a flow)'
          return (
            <div key={ev.id} className="admin-card" style={{ marginBottom: 16, background: '#111213' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <AdminFieldLabel label="Title" help={HELP.events.title}>
                    <input className="admin-input" value={ev.title}
                      onChange={e => patch(ev.id, { title: e.target.value })}
                      onBlur={() => update(events.find(x => x.id === ev.id)!)} />
                  </AdminFieldLabel>
                  <AdminFieldLabel label="Slug" help={HELP.events.slug}>
                    <input className="admin-input" value={ev.slug}
                      onChange={e => patch(ev.id, { slug: e.target.value })}
                      onBlur={() => update(events.find(x => x.id === ev.id)!)} />
                  </AdminFieldLabel>
                  <AdminFieldLabel label="Flow" help={HELP.events.flow}>
                    <select className="admin-input" value={ev.flowSlug || ''}
                      onChange={e => {
                        const flowSlug = e.target.value
                        patch(ev.id, { flowSlug })
                        update({ ...ev, flowSlug })
                        if (flowSlug && !chaptersByFlow[flowSlug]) {
                          api.getAdminChapters(flowSlug).then(cs => {
                            setChaptersByFlow(prev => ({
                              ...prev,
                              [flowSlug]: cs.map(c => ({ id: c.id, name: c.name })),
                            }))
                          }).catch(() => {})
                        }
                      }}>
                      <option value="">Select flow…</option>
                      {flows.map(f => <option key={f.id} value={f.slug}>{f.projectName} ({f.slug})</option>)}
                    </select>
                  </AdminFieldLabel>
                  <div className="admin-field">
                    <div className="admin-label-row">
                      <span className="admin-label-text">Enabled</span>
                      <FieldHelp text={HELP.events.enabled} />
                    </div>
                    <label>
                      <input type="checkbox" checked={ev.isEnabled}
                        onChange={e => {
                          patch(ev.id, { isEnabled: e.target.checked })
                          update({ ...ev, isEnabled: e.target.checked })
                        }} />
                      {' '}Event is enabled
                    </label>
                  </div>
                </div>
                <div>
                  <AdminFieldLabel label="Recurrence" help={HELP.events.recurrence}>
                    <select className="admin-input" value={ev.recurrenceType || 'none'}
                      onChange={e => {
                        patch(ev.id, { recurrenceType: e.target.value })
                        update({ ...ev, recurrenceType: e.target.value })
                      }}>
                      <option value="none">One-time</option>
                      <option value="interval">Every X minutes / hours</option>
                      <option value="weekly">Weekly schedule</option>
                    </select>
                  </AdminFieldLabel>
                  {(ev.recurrenceType || 'none') === 'none' && (
                    <AdminFieldLabel label="Starts at (local)" help={HELP.events.startsAt}>
                      <input className="admin-input" type="datetime-local" value={toLocalInput(ev.startsAtUtc)}
                        onChange={e => {
                          const updated = { ...ev, startsAtUtc: fromLocalInput(e.target.value) || ev.startsAtUtc }
                          patch(ev.id, { startsAtUtc: updated.startsAtUtc })
                          update(updated)
                        }} />
                    </AdminFieldLabel>
                  )}
                  {ev.recurrenceType === 'interval' && (
                    <>
                      <AdminFieldLabel label="Every (minutes)" help={HELP.events.intervalMinutes}>
                        <input className="admin-input" type="number" min={1}
                          value={ev.intervalMinutes ?? 60}
                          onChange={e => patch(ev.id, { intervalMinutes: parseInt(e.target.value, 10) || 60 })}
                          onBlur={() => update(events.find(x => x.id === ev.id)!)} />
                      </AdminFieldLabel>
                      <AdminFieldLabel label="Anchor start (local)" help={HELP.events.anchorStart}>
                        <input className="admin-input" type="datetime-local"
                          value={toLocalInput(ev.recurrenceStartUtc || ev.startsAtUtc)}
                          onChange={e => {
                            const iso = fromLocalInput(e.target.value)
                            patch(ev.id, { recurrenceStartUtc: iso, startsAtUtc: iso || ev.startsAtUtc })
                            update({ ...ev, recurrenceStartUtc: iso ?? undefined, startsAtUtc: iso || ev.startsAtUtc })
                          }} />
                      </AdminFieldLabel>
                    </>
                  )}
                  {ev.recurrenceType === 'weekly' && (
                    <>
                      <AdminFieldLabel label="Days" help={HELP.events.weeklyDays}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {WEEKDAYS.map(day => (
                            <label key={day}>
                              <input type="checkbox" checked={weekly.days.includes(day)}
                                onChange={e => {
                                  const days = e.target.checked
                                    ? [...weekly.days, day]
                                    : weekly.days.filter(d => d !== day)
                                  const next = { ...weekly, days }
                                  setWeekly(ev, next)
                                  update({ ...ev, weeklyScheduleJson: JSON.stringify(next) })
                                }} />
                              {' '}{day}
                            </label>
                          ))}
                        </div>
                      </AdminFieldLabel>
                      <AdminFieldLabel label="Times" help={HELP.events.weeklyTimes}>
                        <input className="admin-input" value={weekly.times.join(', ')}
                          onChange={e => {
                            const times = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                            const next = { ...weekly, times }
                            setWeekly(ev, next)
                          }}
                          onBlur={() => update(events.find(x => x.id === ev.id)!)} />
                      </AdminFieldLabel>
                      <AdminFieldLabel label="Timezone" help={HELP.events.timezone}>
                        <input className="admin-input" value={ev.timezone || 'UTC'}
                          onChange={e => patch(ev.id, { timezone: e.target.value })}
                          onBlur={() => update(events.find(x => x.id === ev.id)!)} />
                      </AdminFieldLabel>
                    </>
                  )}
                  <AdminFieldLabel label="Series end (optional, local)" help={HELP.events.seriesEnd}>
                    <input className="admin-input" type="datetime-local" value={toLocalInput(ev.recurrenceEndUtc)}
                      onChange={e => {
                        const iso = fromLocalInput(e.target.value)
                        patch(ev.id, { recurrenceEndUtc: iso })
                        update({ ...ev, recurrenceEndUtc: iso ?? undefined })
                      }} />
                  </AdminFieldLabel>
                  <AdminFieldLabel label="Live duration (minutes)" help={HELP.events.liveDurationMinutes}>
                    <input className="admin-input" type="number" min={0} placeholder="Open until next occurrence"
                      value={ev.liveDurationMinutes ?? ''}
                      onChange={e => patch(ev.id, { liveDurationMinutes: e.target.value ? parseInt(e.target.value, 10) : null })}
                      onBlur={() => update(events.find(x => x.id === ev.id)!)} />
                  </AdminFieldLabel>
                  {ev.occurrence && (
                    <p style={{ fontSize: 12, color: '#9b9d9f' }}>
                      Next: {ev.occurrence.nextStartsAtUtc ? new Date(ev.occurrence.nextStartsAtUtc).toLocaleString() : '—'}
                      {' · '}{ev.occurrence.isLive ? 'Live now' : 'Waiting'}
                    </p>
                  )}
                </div>
              </div>
              <AdminFieldLabel label="Holding heading" help={HELP.events.holdingHeading}>
                <input className="admin-input" value={ev.holdingHeading || ''}
                  onChange={e => patch(ev.id, { holdingHeading: e.target.value })}
                  onBlur={() => update(events.find(x => x.id === ev.id)!)} />
              </AdminFieldLabel>
              <AdminFieldLabel label="Holding message" help={HELP.events.holdingMessage}>
                <textarea className="admin-textarea" rows={2} value={ev.holdingMessage || ''}
                  onChange={e => patch(ev.id, { holdingMessage: e.target.value })}
                  onBlur={() => update(events.find(x => x.id === ev.id)!)} />
              </AdminFieldLabel>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                <button type="button" className="admin-btn admin-btn-sm" onClick={() => triggerUpload(ev.id, 'holdingImageUrl')}>Upload image</button>
                <button type="button" className="admin-btn admin-btn-sm" onClick={() => triggerUpload(ev.id, 'holdingVideoUrl')}>Upload video</button>
              </div>
              <AdminFieldLabel label="Image URL" help={HELP.events.holdingImageUrl}>
                <input className="admin-input" placeholder="Image URL" value={ev.holdingImageUrl || ''}
                  onChange={e => patch(ev.id, { holdingImageUrl: e.target.value })}
                  onBlur={() => update(events.find(x => x.id === ev.id)!)} />
              </AdminFieldLabel>
              <AdminFieldLabel label="Video URL" help={HELP.events.holdingVideoUrl}>
                <input className="admin-input" placeholder="Video URL or YouTube link" value={ev.holdingVideoUrl || ''}
                  onChange={e => patch(ev.id, { holdingVideoUrl: e.target.value })}
                  onBlur={() => update(events.find(x => x.id === ev.id)!)} />
              </AdminFieldLabel>
              <AdminFieldLabel label="Default chapter after live" help={HELP.events.defaultChapter}>
                <select className="admin-input" value={ev.defaultChapterId ?? ''}
                  onChange={e => {
                    const updated = { ...ev, defaultChapterId: e.target.value ? parseInt(e.target.value, 10) : null }
                    patch(ev.id, { defaultChapterId: updated.defaultChapterId })
                    update(updated)
                  }}>
                  <option value="">Use flow default</option>
                  {(chaptersByFlow[ev.flowSlug || ''] ?? []).map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                </select>
              </AdminFieldLabel>
              <p style={{ fontSize: 12, color: '#9b9d9f' }}>
                Lobby: <a href={`/event/${ev.slug}`} target="_blank" rel="noopener noreferrer">/event/{ev.slug}</a>
                {' · '}Live: <code>{redirectPreview}</code>
              </p>
              <button type="button" className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => setDeleteId(ev.id)}>Delete</button>
            </div>
          )
        })}
        {events.length === 0 && <p style={{ color: '#5f6164' }}>No scheduled events yet.</p>}
      </div>
      <ConfirmModal
        open={deleteId != null}
        title="Delete event?"
        message="Remove this scheduled broadcast and its lobby page."
        confirmLabel="Delete"
        danger
        onConfirm={() => { if (deleteId != null) remove(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </>
  )
}
