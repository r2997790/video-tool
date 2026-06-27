import { useEffect, useRef, useCallback, useState } from 'react'
import YouTube, { type YouTubeEvent, type YouTubePlayer } from 'react-youtube'

interface VideoPlayerProps {
  chapter: { id?: number; name: string; videoType: string; videoValue: string; isLive?: boolean } | null
  playing: boolean
  held?: boolean
  videoKey: number
  pauseEnabled: boolean
  onPlay: () => void
  onTimeUpdate?: (seconds: number) => void
  onEnded?: () => void
}

export function VideoPlayer({ chapter, playing, held = false, videoKey, pauseEnabled, onPlay, onTimeUpdate, onEnded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<YouTubePlayer | null>(null)
  const intervalRef = useRef<number | null>(null)
  const [ytReady, setYtReady] = useState(false)

  const reportTime = useCallback(() => {
    if (!onTimeUpdate) return
    if (playerRef.current) {
      const result = playerRef.current.getCurrentTime()
      if (typeof result === 'number') {
        onTimeUpdate(Math.floor(result))
      } else if (result && typeof (result as Promise<number>).then === 'function') {
        ;(result as Promise<number>).then(t => {
          if (typeof t === 'number') onTimeUpdate(Math.floor(t))
        }).catch(() => {})
      }
    } else if (videoRef.current) {
      onTimeUpdate(Math.floor(videoRef.current.currentTime))
    }
  }, [onTimeUpdate])

  useEffect(() => {
    if (!playing || held) return
    intervalRef.current = window.setInterval(reportTime, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [playing, held, reportTime, videoKey])

  useEffect(() => {
    playerRef.current = null
    setYtReady(false)
  }, [videoKey])

  useEffect(() => {
    if (held) {
      playerRef.current?.pauseVideo?.()
      if (videoRef.current) videoRef.current.pause()
      return
    }
    if (playing) {
      playerRef.current?.playVideo?.()
      videoRef.current?.play().catch(() => {})
    }
  }, [held, playing, videoKey])

  if (!chapter) return null

  const isYoutube = chapter.videoType === 'youtube' && chapter.videoValue
  const isDirect = chapter.videoType === 'direct' && chapter.videoValue
  const isLive = !!chapter.isLive

  const ytOpts = {
    host: 'https://www.youtube-nocookie.com',
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: playing && !held ? 1 : 0,
      rel: 0,
      modestbranding: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3,
      cc_load_policy: 0,
      autohide: 1,
      playsinline: 1,
      enablejsapi: 1,
    },
  }

  const onYtReady = (e: YouTubeEvent) => {
    playerRef.current = e.target
    setYtReady(true)
    if (playing && !held) e.target.playVideo()
    else e.target.pauseVideo()
    reportTime()
  }

  const onYtStateChange = (e: YouTubeEvent) => {
    if (held && e.data === 1) {
      e.target.pauseVideo()
      return
    }
    if (e.data === 0 && !isLive) onEnded?.()
    if (!pauseEnabled && !held && e.data === 2) e.target.playVideo()
    reportTime()
  }

  const onVideoPause = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (!pauseEnabled && !held) {
      e.currentTarget.play().catch(() => {})
    }
    reportTime()
  }

  if (playing && isYoutube) {
    return (
      <div className="vd-yt-wrap">
        {isLive && <span className="vd-live-badge">Live</span>}
        {!ytReady && (
          <div className="vd-yt-loading" aria-hidden="true">
            <div className="vd-loading-spinner" />
          </div>
        )}
        <YouTube
          key={videoKey}
          videoId={chapter.videoValue}
          opts={ytOpts}
          className="vd-iframe vd-yt-player"
          onReady={onYtReady}
          onStateChange={onYtStateChange}
        />
        <div className="vd-yt-shield" aria-hidden="true" />
      </div>
    )
  }

  if (playing && isDirect) {
    return (
      <video
        key={videoKey}
        ref={videoRef}
        className="vd-iframe"
        src={chapter.videoValue}
        controls={pauseEnabled && !held}
        autoPlay={!held}
        playsInline
        onTimeUpdate={reportTime}
        onPause={onVideoPause}
        onEnded={() => { if (!isLive) onEnded?.() }}
      />
    )
  }

  return (
    <div className="vd-video-placeholder" onClick={onPlay}>
      <div className="vd-play-ring">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="6,4 20,12 6,20" />
        </svg>
      </div>
      <p className="vd-ph-title">{chapter.name}</p>
      <p className="vd-ph-sub">Click to play</p>
    </div>
  )
}
