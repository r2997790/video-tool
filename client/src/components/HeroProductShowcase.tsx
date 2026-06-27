import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from './icons/uiIcons'
import { DemoViewerMock, FlowBuilderMock } from './HeroShowcaseMocks'

type Callout = {
  text: string
  top: string
  left: string
}

type Slide = {
  label: string
  alt: string
  content: ReactNode
  callouts: Callout[]
}

const SLIDES: Slide[] = [
  {
    label: 'Build your demo',
    alt: 'Visual flow editor with branching demo paths, chapters, and in-video engagement',
    content: <FlowBuilderMock />,
    callouts: [
      { text: 'Visual flow editor', top: '18%', left: '12%' },
      { text: 'Branch by role', top: '12%', left: '42%' },
      { text: 'In-video engagement', top: '78%', left: '48%' },
    ],
  },
  {
    label: 'Run the experience',
    alt: 'Interactive demo viewer with chapter guides, playing video, and live chat',
    content: <DemoViewerMock />,
    callouts: [
      { text: 'Chapter guides', top: '22%', left: '10%' },
      { text: 'Product in motion', top: '42%', left: '48%' },
      { text: 'Live chat & AI', top: '18%', left: '88%' },
    ],
  },
]

const AUTO_INTERVAL_MS = 6000

export function HeroProductShowcase() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const goTo = useCallback((index: number) => {
    setActiveIndex((index + SLIDES.length) % SLIDES.length)
  }, [])

  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo])
  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo])

  useEffect(() => {
    if (reducedMotion.current || paused) return

    const id = window.setInterval(() => {
      setActiveIndex(i => (i + 1) % SLIDES.length)
    }, AUTO_INTERVAL_MS)

    return () => window.clearInterval(id)
  }, [paused])

  const slide = SLIDES[activeIndex]

  return (
    <div
      className="lp-hero-showcase"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false)
      }}
    >
      <div className="lp-hero-showcase-header">
        <p className="lp-hero-showcase-label">{slide.label}</p>
        <div className="lp-hero-showcase-dots" role="tablist" aria-label="Product showcase slides">
          {SLIDES.map((s, i) => (
            <button
              key={s.label}
              type="button"
              role="tab"
              className={`lp-hero-showcase-dot${i === activeIndex ? ' is-active' : ''}`}
              aria-selected={i === activeIndex}
              aria-label={s.label}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      </div>

      <div className="lp-hero-showcase-frame">
        <button
          type="button"
          className="lp-hero-showcase-nav lp-hero-showcase-nav-prev"
          aria-label="Previous slide"
          onClick={goPrev}
        >
          <ChevronLeftIcon />
        </button>

        <div className="lp-hero-showcase-track">
          {SLIDES.map((s, i) => (
            <div
              key={s.label}
              className={`lp-hero-showcase-slide${i === activeIndex ? ' is-active' : ''}`}
              aria-hidden={i !== activeIndex}
            >
              <div className="lp-hero-showcase-ui" role="img" aria-label={s.alt}>
                {s.content}
              </div>
              <div className="lp-hero-showcase-callouts" aria-hidden>
                {s.callouts.map(c => (
                  <div
                    key={c.text}
                    className="lp-hero-callout"
                    style={{ top: c.top, left: c.left }}
                  >
                    <span className="lp-hero-callout-dot" />
                    <span className="lp-hero-callout-label">{c.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="lp-hero-showcase-nav lp-hero-showcase-nav-next"
          aria-label="Next slide"
          onClick={goNext}
        >
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  )
}
