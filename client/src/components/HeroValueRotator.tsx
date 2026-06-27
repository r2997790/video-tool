import { useEffect, useRef, useState } from 'react'

const VALUE_LINES = [
  'Turn passive viewers into qualified leads — without another sales call',
  'Branch demos by role so every prospect sees what matters to them',
  'Capture intent with in-video questions, gates, and live chat',
  'Run broadcast events that feel like a live keynote, on your schedule',
  'Publish fully branded demos in minutes — no dev team required',
  'Push every lead straight to HubSpot, Slack, or your CRM',
]

const ROTATE_MS = 4500

export function HeroValueRotator() {
  const [activeIndex, setActiveIndex] = useState(0)
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    if (reducedMotion.current) return

    const id = window.setInterval(() => {
      setActiveIndex(i => (i + 1) % VALUE_LINES.length)
    }, ROTATE_MS)

    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="lp-hero-values" aria-live="polite">
      <div
        className="lp-hero-values-track"
        style={{ transform: `translateY(-${activeIndex * 100}%)` }}
      >
        {VALUE_LINES.map(line => (
          <p key={line} className="lp-hero-value-line">
            <span className="lp-hero-value-dot" aria-hidden />
            <span className="lp-hero-value-text">{line}</span>
          </p>
        ))}
      </div>
    </div>
  )
}
