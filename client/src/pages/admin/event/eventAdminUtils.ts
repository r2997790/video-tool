import type { Gate, GateQuestion, ScheduledEvent, WeeklySchedule } from '../../../types'

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export function parseWeekly(json?: string | null): WeeklySchedule {
  if (!json) return { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], times: ['09:30'] }
  try { return JSON.parse(json) as WeeklySchedule } catch { return { days: [], times: [] } }
}

export function defaultGate(): Gate {
  return {
    heading: 'Register for this event',
    subtext: 'Complete the form below to request access.',
    questions: [
      { id: 'name', label: 'Full name', type: 'text', required: true },
      { id: 'email', label: 'Work email', type: 'email', required: true },
    ],
  }
}

export function parseGate(json?: string | null): Gate {
  if (!json) return defaultGate()
  try { return JSON.parse(json) as Gate } catch { return defaultGate() }
}

export function updateQuestion(
  gate: Gate,
  index: number,
  patch: Partial<GateQuestion>,
  save: (p: Partial<ScheduledEvent>) => void,
) {
  const questions = gate.questions.map((q, i) => i === index ? { ...q, ...patch } : q)
  save({ registrationFormJson: JSON.stringify({ ...gate, questions }) })
}

export function toLocalInput(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalInput(val: string) { return val ? new Date(val).toISOString() : null }

export function eventPayload(ev: ScheduledEvent) {
  return {
    slug: ev.slug, title: ev.title, startsAtUtc: ev.startsAtUtc,
    holdingHeading: ev.holdingHeading, holdingMessage: ev.holdingMessage,
    holdingImageUrl: ev.holdingImageUrl, holdingVideoUrl: ev.holdingVideoUrl,
    holdingVideoType: ev.holdingVideoType, defaultChapterId: ev.defaultChapterId,
    flowSlug: ev.flowSlug, recurrenceType: ev.recurrenceType || 'none',
    intervalMinutes: ev.intervalMinutes, recurrenceStartUtc: ev.recurrenceStartUtc,
    recurrenceEndUtc: ev.recurrenceEndUtc, timezone: ev.timezone,
    weeklyScheduleJson: ev.weeklyScheduleJson, liveDurationMinutes: ev.liveDurationMinutes,
    isEnabled: ev.isEnabled, eventKind: ev.eventKind, accessMode: ev.accessMode,
    registrationFormJson: ev.registrationFormJson, registrationApprovalMode: ev.registrationApprovalMode,
    crmListKey: ev.crmListKey, privacyPolicyOverrideJson: ev.privacyPolicyOverrideJson,
    accessOverrideJson: ev.accessOverrideJson,
  }
}
