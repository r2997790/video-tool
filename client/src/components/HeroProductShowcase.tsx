import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from './icons/uiIcons'
import flowEditorSvg from '../assets/help/flow-editor.svg?url'
import publicDemoSvg from '../assets/help/public-demo.svg?url'

type Callout = {
  text: string
  top: string
  left: string
}

type Slide = {
  label: string
  image: string
  alt: string
  callouts: Callout[]
}

const SLIDES: Slide[] = [
  {
    label: 'Build your demo',
    image: flowEditorSvg,
    alt: 'Visual flow editor with branching demo paths',
    callouts: [
      { text: 'Visual flow editor', top: '22%', left: '8%' },
      { text: 'Branching paths', top: '18%', left: '52%' },
      { text: 'No code required', top: '28%', left: '72%' },
    ],
  },
  {
    label: 'Run the experience',
    image: publicDemoSvg,
    alt: 'Live demo viewer with chapters and live chat',
    callouts: [
      { text: 'Chapter walkthroughs', top: '14%', left: '4%' },
      { text: 'Interactive video', top: '48%', left: '38%' },
      { text: 'Live chat & AI', top: '12%', left: '82%' },
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
              <img src={s.image} alt={s.alt} className="lp-hero-showcase-img" />
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
