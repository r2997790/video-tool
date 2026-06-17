import { useEffect } from 'react'
import type { FlowNode, ScheduledEventPublic } from '../types'
import { eventHasStarted, formatCountdown, useEventCountdown } from '../utils/eventCountdown'

export interface FlowEventParams {
  mode?: 'slug' | 'inline'
  eventSlug?: string
  title?: string
  startsAtUtc?: string
  holdingHeading?: string
  holdingMessage?: string
  holdingImageUrl?: string
  holdingVideoUrl?: string
  holdingVideoType?: string
  defaultChapterId?: number
}

interface Props {
  node: FlowNode
  eventData?: ScheduledEventPublic | null
  onComplete: () => void
}

export function FlowEventOverlay({ node, eventData, onComplete }: Props) {
  const p = node.parameters as FlowEventParams
  const startsAt = eventData?.nextStartsAtUtc ?? eventData?.startsAtUtc ?? p.startsAtUtc ?? ''
  const serverNow = eventData?.serverNowUtc ?? new Date().toISOString()
  const remainingMs = useEventCountdown(startsAt || null, serverNow || null)

  const isLive = eventData?.isLive || eventHasStarted(remainingMs)

  const heading = eventData?.holdingHeading ?? p.holdingHeading ?? p.title ?? eventData?.title ?? 'Starting soon'
  const message = eventData?.holdingMessage ?? p.holdingMessage ?? ''
  const imageUrl = eventData?.holdingImageUrl ?? p.holdingImageUrl
  const videoType = eventData?.holdingVideoType ?? p.holdingVideoType ?? 'none'
  const videoValue = eventData?.holdingVideoValue ?? p.holdingVideoUrl ?? ''

  useEffect(() => {
    if (isLive || eventHasStarted(remainingMs)) onComplete()
  }, [remainingMs, onComplete, isLive])

  if (startsAt && remainingMs === null) {
    return (
      <div className="vd-gate-overlay">
        <div className="vd-gate-card vd-event-card-inline">
          <p className="vd-loading">Loading event schedule…</p>
        </div>
      </div>
    )
  }

  if (eventHasStarted(remainingMs) || isLive) return null

  const isYoutube = videoType === 'youtube' && videoValue
  const isDirect = videoType === 'direct' && videoValue
  const countdown = remainingMs ?? 0

  return (
    <div className="vd-gate-overlay" role="dialog" aria-modal="true" aria-labelledby="flow-event-title">
      <div className="vd-gate-card vd-gate-card-wide vd-event-card-inline">
        {imageUrl && <img className="vd-event-hero" src={imageUrl} alt="" />}
        {(isYoutube || isDirect) && (
          <div className="vd-event-video-wrap">
            {isYoutube ? (
              <iframe
                className="vd-event-video"
                src={`https://www.youtube-nocookie.com/embed/${videoValue}?controls=0&rel=0&modestbranding=1`}
                title="Event preview"
              />
            ) : (
              <video className="vd-event-video" src={videoValue} controls playsInline />
            )}
          </div>
        )}
        <h3 id="flow-event-title" className="vd-gate-heading">{heading}</h3>
        {message && <p className="vd-gate-sub">{message}</p>}
        <div className="vd-event-countdown" role="timer" aria-live="polite">
          <span className="vd-event-countdown-label">Broadcast begins in</span>
          <span className="vd-event-countdown-value">{formatCountdown(countdown)}</span>
        </div>
      </div>
    </div>
  )
}
