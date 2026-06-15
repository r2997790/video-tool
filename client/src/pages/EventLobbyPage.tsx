import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import type { ScheduledEventPublic } from '../types'
import { eventHasStarted, formatCountdown, useEventCountdown } from '../utils/eventCountdown'

function formatStartTime(iso: string | null | undefined, timezone?: string | null) {
  if (!iso) return null
  try {
    const date = new Date(iso.includes('T') && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? `${iso}Z` : iso)
    return date.toLocaleString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
      ...(timezone ? { timeZone: timezone } : {}),
    })
  } catch {
    return null
  }
}

export function EventLobbyPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [event, setEvent] = useState<ScheduledEventPublic | null>(null)
  const [error, setError] = useState('')
  const countdownTarget = event?.nextStartsAtUtc ?? event?.startsAtUtc ?? null
  const remainingMs = useEventCountdown(countdownTarget, event?.serverNowUtc ?? null)

  useEffect(() => {
    if (!slug) return
    api.getScheduledEvent(slug)
      .then(setEvent)
      .catch(() => setError('Event not found or not available.'))
  }, [slug])

  useEffect(() => {
    if (!event) return
    if (event.isLive || eventHasStarted(remainingMs)) {
      const flowSlug = event.flowSlug
      if (!flowSlug) {
        setError('This event is not linked to a flow.')
        return
      }
      const q = new URLSearchParams()
      q.set('event', event.slug)
      if (event.defaultChapterId) q.set('chapter', String(event.defaultChapterId))
      navigate(`/flow/${encodeURIComponent(flowSlug)}?${q.toString()}`, { replace: true })
    }
  }, [event, remainingMs, navigate])

  if (error) return <div className="vd-event-lobby"><p className="vd-event-error">{error}</p></div>
  if (!event) {
    return (
      <div className="vd-event-lobby">
        <div className="vd-loading-shell">
          <div className="vd-loading-spinner" aria-hidden="true" />
          <p>Loading event…</p>
        </div>
      </div>
    )
  }

  const isLive = event.isLive || eventHasStarted(remainingMs)
  const isYoutube = event.holdingVideoType === 'youtube' && event.holdingVideoValue
  const isDirect = event.holdingVideoType === 'direct' && event.holdingVideoValue
  const countdown = remainingMs ?? 0
  const startLabel = formatStartTime(event.nextStartsAtUtc ?? event.startsAtUtc, event.timezone)

  return (
    <div className="vd-event-lobby" role="main">
      <div className="vd-event-card">
        {event.holdingImageUrl && (
          <img className="vd-event-hero" src={event.holdingImageUrl} alt="" />
        )}

        {(isYoutube || isDirect) && (
          <div className="vd-event-video-wrap">
            {isYoutube ? (
              <iframe
                className="vd-event-video"
                src={`https://www.youtube-nocookie.com/embed/${event.holdingVideoValue}?autoplay=0&controls=1&rel=0&modestbranding=1`}
                title="Event preview"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video className="vd-event-video" src={event.holdingVideoValue} controls playsInline />
            )}
          </div>
        )}

        <h1 className="vd-event-title">{event.holdingHeading || event.title}</h1>
        {event.holdingMessage && <p className="vd-event-message">{event.holdingMessage}</p>}

        {startLabel && !isLive && (
          <p className="vd-event-schedule">Starts {startLabel}</p>
        )}

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
