import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, getSessionId } from '../api'
import type { EventPrivacyNotice, Gate, GateQuestion, ScheduledEventPublic } from '../types'
import { eventHasStarted, formatCountdown, useEventCountdown } from '../utils/eventCountdown'

const EMAIL_KEY_PREFIX = 'videotool_event_email_'

function formatStartTime(iso: string | null | undefined, timezone?: string | null) {
  if (!iso) return null
  try {
    const date = new Date(iso.includes('T') && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? `${iso}Z` : iso)
    return date.toLocaleString(undefined, {
      weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
      ...(timezone ? { timeZone: timezone } : {}),
    })
  } catch { return null }
}

export function EventLobbyPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const sessionId = getSessionId()
  const [event, setEvent] = useState<ScheduledEventPublic | null>(null)
  const [privacy, setPrivacy] = useState<EventPrivacyNotice | null>(null)
  const [error, setError] = useState('')
  const [viewerEmail, setViewerEmail] = useState(() =>
    slug ? localStorage.getItem(`${EMAIL_KEY_PREFIX}${slug}`) ?? '' : '')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [consentGiven, setConsentGiven] = useState(false)
  const [regError, setRegError] = useState('')
  const [registering, setRegistering] = useState(false)

  const countdownTarget = event?.nextStartsAtUtc ?? event?.startsAtUtc ?? null
  const remainingMs = useEventCountdown(countdownTarget, event?.serverNowUtc ?? null)

  const reloadEvent = (email?: string) => {
    if (!slug) return
    const em = email ?? (viewerEmail || undefined)
    api.getScheduledEvent(slug, sessionId, em)
      .then(setEvent)
      .catch(() => setError('Event not found or not available.'))
  }

  useEffect(() => {
    if (!slug) return
    reloadEvent()
    const locale = navigator.language
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    api.getEventPrivacy(slug, locale, timezone).then(setPrivacy).catch(() => {})
  }, [slug])

  useEffect(() => {
    if (!event) return
    const needsReg = event.requiresRegistration && (event.accessDenied || !viewerEmail)
    if (needsReg) return

    if (event.isLive || eventHasStarted(remainingMs)) {
      const flowSlug = event.flowSlug
      if (!flowSlug) { setError('This event is not linked to a flow.'); return }
      const q = new URLSearchParams()
      q.set('event', event.slug)
      if (event.defaultChapterId) q.set('chapter', String(event.defaultChapterId))
      navigate(`/flow/${encodeURIComponent(flowSlug)}?${q.toString()}`, { replace: true })
    }
  }, [event, remainingMs, navigate, viewerEmail])

  const submitRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug || !event) return
    setRegError('')
    const form = event.registrationForm as Gate | null | undefined
    const emailField = form?.questions.find(q => q.type === 'email')?.id ?? 'email'
    const email = answers[emailField] || answers.email || ''
    if (!email.includes('@')) { setRegError('Please enter a valid email.'); return }
    if (privacy?.consentRequired && !consentGiven) { setRegError('Please accept the privacy notice.'); return }

    setRegistering(true)
    try {
      const result = await api.registerForEvent(slug, {
        sessionId,
        email,
        name: answers.name,
        answersJson: JSON.stringify(answers),
        consentGiven: consentGiven || !privacy?.consentRequired,
        locale: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      localStorage.setItem(`${EMAIL_KEY_PREFIX}${slug}`, email)
      setViewerEmail(email)
      reloadEvent(email)
      if (result.status === 'pending') setRegError('')
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setRegistering(false)
    }
  }

  if (error) return <div className="vd-event-lobby"><p className="vd-event-error">{error}</p></div>
  if (!event) {
    return (
      <div className="vd-event-lobby">
        <div className="vd-loading-shell"><div className="vd-loading-spinner" aria-hidden="true" /><p>Loading event…</p></div>
      </div>
    )
  }

  const isLive = event.isLive || eventHasStarted(remainingMs)
  const isYoutube = event.holdingVideoType === 'youtube' && event.holdingVideoValue
  const isDirect = event.holdingVideoType === 'direct' && event.holdingVideoValue
  const countdown = remainingMs ?? 0
  const startLabel = formatStartTime(event.nextStartsAtUtc ?? event.startsAtUtc, event.timezone)
  const form = event.registrationForm as Gate | null | undefined

  if (event.requiresRegistration && event.accessDenied && form) {
    return (
      <div className="vd-event-lobby" role="main">
        <div className="vd-event-card vd-gate-card">
          <h1 className="vd-event-title">{form.heading}</h1>
          <p className="vd-event-message">{form.subtext}</p>
          <form onSubmit={submitRegistration}>
            {form.questions.map((q: GateQuestion) => (
              <label key={q.id} style={{ display: 'block', marginBottom: 12 }}>
                <span>{q.label}{q.required ? ' *' : ''}</span>
                <input className="admin-input" style={{ width: '100%', marginTop: 4 }}
                  type={q.type === 'email' ? 'email' : 'text'}
                  required={q.required}
                  value={answers[q.id] ?? ''}
                  onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} />
              </label>
            ))}
            {privacy && (
              <div style={{ marginBottom: 12, fontSize: 13, color: '#9b9d9f' }}>
                <div dangerouslySetInnerHTML={{ __html: privacy.noticeHtml }} />
                {privacy.consentRequired && (
                  <label style={{ display: 'block', marginTop: 8 }}>
                    <input type="checkbox" checked={consentGiven} onChange={e => setConsentGiven(e.target.checked)} />
                    {' '}I consent to the processing of my personal data
                  </label>
                )}
              </div>
            )}
            {regError && <p className="vd-event-error">{regError}</p>}
            <button type="submit" className="admin-btn admin-btn-primary" disabled={registering}>
              {registering ? 'Submitting…' : 'Register'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (event.attendeeStatus === 'pending') {
    return (
      <div className="vd-event-lobby">
        <div className="vd-event-card">
          <h1 className="vd-event-title">Registration received</h1>
          <p className="vd-event-message">Your registration is awaiting approval. You will be able to join when approved.</p>
        </div>
      </div>
    )
  }

  if (event.attendeeStatus === 'rejected') {
    return (
      <div className="vd-event-lobby">
        <div className="vd-event-card">
          <p className="vd-event-error">Your registration was not approved for this event.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="vd-event-lobby" role="main">
      <div className="vd-event-card">
        {event.holdingImageUrl && <img className="vd-event-hero" src={event.holdingImageUrl} alt="" />}
        {(isYoutube || isDirect) && (
          <div className="vd-event-video-wrap">
            {isYoutube ? (
              <iframe className="vd-event-video"
                src={`https://www.youtube-nocookie.com/embed/${event.holdingVideoValue}?autoplay=0&controls=1&rel=0&modestbranding=1`}
                title="Event preview" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            ) : (
              <video className="vd-event-video" src={event.holdingVideoValue} controls playsInline />
            )}
          </div>
        )}
        <h1 className="vd-event-title">{event.holdingHeading || event.title}</h1>
        {event.holdingMessage && <p className="vd-event-message">{event.holdingMessage}</p>}
        {startLabel && !isLive && <p className="vd-event-schedule">Starts {startLabel}</p>}
        <div className="vd-event-countdown" role="timer" aria-live="polite" aria-atomic="true">
          {isLive ? (
            <span className="vd-event-live">Starting now…</span>
          ) : (
            <>
              <span className="vd-event-countdown-label">Broadcast begins in</span>
              <span className="vd-event-countdown-value">{formatCountdown(countdown)}</span>
            </>
          )}
        </div>
        <p className="vd-event-hint">Stay on this page — you&apos;ll be taken to the demo automatically when we go live.</p>
      </div>
    </div>
  )
}
