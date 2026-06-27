import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { PlayIcon } from './icons/uiIcons'

export type LandingPillVariant = 'live' | 'ondemand' | 'replay' | 'limited' | 'register'
export type LandingPreviewVariant = 'live' | 'ondemand' | 'replay' | 'event'

type LandingMediaCardProps = {
  pill: string
  pillVariant: LandingPillVariant
  title: string
  meta: string
  buttonLabel: string
  url: string
  previewSeed?: string
  previewVariant?: LandingPreviewVariant
  buttonIcon?: ReactNode
}

function MockPreview({
  previewSeed,
  animated,
  live,
}: {
  previewSeed: string
  animated?: boolean
  live?: boolean
}) {
  const className = [
    'lp-video-preview',
    animated ? 'lp-video-preview-animated' : '',
    live ? 'lp-video-preview-live-mock' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={className} data-preview={previewSeed}>
      <div className="lp-video-preview-screen" aria-hidden>
        <div className="lp-video-preview-chrome">
          <span /><span /><span />
        </div>
        <div className="lp-video-preview-body">
          <div className="lp-video-preview-sidebar" />
          <div className="lp-video-preview-main">
            <div className="lp-video-preview-video">
              {live && <div className="lp-video-preview-scanlines" aria-hidden />}
            </div>
            <div className="lp-video-preview-timeline">
              <span className={`lp-video-preview-progress${live ? ' lp-video-preview-progress-live' : ''}`} />
            </div>
          </div>
          <div className="lp-video-preview-chat">
            {live && (
              <>
                <div className="lp-video-preview-chat-line" />
                <div className="lp-video-preview-chat-line lp-video-preview-chat-line-short" />
              </>
            )}
          </div>
        </div>
      </div>
      {live && <div className="lp-video-preview-live-badge" aria-hidden>LIVE</div>}
    </div>
  )
}

export function LandingMediaCard({
  pill,
  pillVariant,
  title,
  meta,
  buttonLabel,
  url,
  previewSeed = 'default',
  previewVariant = 'ondemand',
  buttonIcon = <PlayIcon />,
}: LandingMediaCardProps) {
  const isLive = previewVariant === 'live'
  const showPlayOverlay = !isLive

  return (
    <article className={`lp-media-card${isLive ? ' lp-media-card-live' : ''}`}>
      <span className={`lp-pill lp-pill-${pillVariant}${isLive ? ' lp-pill-pulse' : ''}`}>{pill}</span>

      <Link to={url} className="lp-media-preview-link" aria-label={`${buttonLabel}: ${title}`}>
        {isLive ? (
          <MockPreview previewSeed={previewSeed} live animated />
        ) : (
          <MockPreview
            previewSeed={previewSeed}
            animated={previewVariant === 'ondemand' || previewVariant === 'replay' || previewVariant === 'event'}
          />
        )}
        {showPlayOverlay && (
          <span className="lp-video-preview-play" aria-hidden>
            <span className="lp-video-preview-play-icon">
              <PlayIcon />
            </span>
          </span>
        )}
      </Link>

      <h3 className="lp-card-title">{title}</h3>
      <p className="lp-card-meta">{meta}</p>

      <Link to={url} className="lp-btn lp-btn-primary lp-media-card-btn lp-btn-with-icon">
        {buttonIcon}
        {buttonLabel}
      </Link>
    </article>
  )
}

export function padHomeItems<T>(items: T[], count: number): T[] {
  if (items.length === 0) return []
  return Array.from({ length: count }, (_, index) => items[index % items.length])
}
