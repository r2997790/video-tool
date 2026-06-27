import { useCallback, useEffect, useRef, useState } from 'react'

const VALUE_LINES = [
  'Turn passive viewers into qualified leads — without another sales call',
  'Branch demos by role so every prospect sees what matters to them',
  'Capture intent with in-video questions, gates, and live chat',
  'Run broadcast events that feel like a live keynote, on your schedule',
  'Publish fully branded demos in minutes — no dev team required',
  'Push every lead straight to HubSpot, Slack, or your CRM',
]

const DISPLAY_MS = 7500

export function HeroValueRotator() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const advance = useCallback(() => {
    setActiveIndex(i => (i + 1) % VALUE_LINES.length)
  }, [])

  useEffect(() => {
    if (reducedMotion.current || paused) return

    const id = window.setInterval(advance, DISPLAY_MS)
    return () => window.clearInterval(id)
  }, [paused, advance])

  const stepPercent = 100 / VALUE_LINES.length

  return (
    <div
      className="lp-hero-values"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false)
      }}
    >
      <div
        className="lp-hero-values-track"
        style={{ transform: `translateY(-${activeIndex * stepPercent}%)` }}
      >
        {VALUE_LINES.map(line => (
          <p key={line} className="lp-hero-value-line">
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}
