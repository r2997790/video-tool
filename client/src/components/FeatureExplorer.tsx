import { useCallback, useEffect, useRef, useState, type ComponentType, type CSSProperties } from 'react'
import { CancelIcon, ChevronLeftIcon, ChevronRightIcon } from './icons/uiIcons'
import { FeatureExamplePreview, type FeaturePreviewKind } from './FeatureExamplePreview'

export type FeatureItem = {
  icon: ComponentType
  title: string
  featureName: string
  description: string
  preview: FeaturePreviewKind
}

type FeatureExplorerProps = {
  features: FeatureItem[]
}

export function FeatureExplorer({ features }: FeatureExplorerProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [flipStyle, setFlipStyle] = useState<CSSProperties>({})
  const [animating, setAnimating] = useState(false)
  const gridWrapRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLElement | null)[]>([])
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const close = useCallback(() => {
    setActiveIndex(null)
    setFlipStyle({})
    setAnimating(false)
  }, [])

  const goToFeature = useCallback((index: number) => {
    setFlipStyle({})
    setAnimating(false)
    setActiveIndex(index)
  }, [])

  const openFeature = useCallback((index: number) => {
    const card = cardRefs.current[index]
    const wrap = gridWrapRef.current
    if (!card || !wrap) {
      setActiveIndex(index)
      return
    }

    if (reducedMotion.current) {
      setActiveIndex(index)
      return
    }

    const cardRect = card.getBoundingClientRect()
    const wrapRect = wrap.getBoundingClientRect()

    setFlipStyle({
      transform: `translate(${cardRect.left - wrapRect.left}px, ${cardRect.top - wrapRect.top}px) scale(${cardRect.width / wrapRect.width}, ${cardRect.height / wrapRect.height})`,
      borderRadius: '14px',
    })
    setActiveIndex(index)
    setAnimating(true)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFlipStyle({
          transform: 'translate(0, 0) scale(1, 1)',
          borderRadius: '14px',
        })
      })
    })
  }, [])

  useEffect(() => {
    if (activeIndex === null) return

    closeBtnRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goToFeature((activeIndex - 1 + features.length) % features.length)
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goToFeature((activeIndex + 1) % features.length)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeIndex, close, goToFeature, features.length])

  const activeFeature = activeIndex !== null ? features[activeIndex] : null

  return (
    <div className="lp-feature-grid-wrap" ref={gridWrapRef}>
      <div className={`lp-feature-grid${activeIndex !== null ? ' has-active' : ''}`}>
        {features.map((feature, index) => {
          const Icon = feature.icon
          const isActive = activeIndex === index
          const isHidden = activeIndex !== null && !isActive

          return (
            <button
              key={feature.featureName}
              type="button"
              ref={el => { cardRefs.current[index] = el }}
              className={`lp-feature-card${isHidden ? ' is-hidden' : ''}${isActive ? ' is-active-source' : ''}`}
              aria-expanded={isActive}
              disabled={activeIndex !== null && !isActive}
              onClick={() => openFeature(index)}
            >
              <div className="lp-feature-icon">
                <Icon />
              </div>
              <h3 className="lp-feature-title">{feature.title}</h3>
              <p className="lp-feature-name">{feature.featureName}</p>
              <p className="lp-feature-desc">{feature.description}</p>
            </button>
          )
        })}
      </div>

      {activeFeature && activeIndex !== null && (
        <>
          <button
            type="button"
            className="lp-feature-nav lp-feature-nav-prev"
            aria-label="Previous feature"
            onClick={() => goToFeature((activeIndex - 1 + features.length) % features.length)}
          >
            <ChevronLeftIcon />
          </button>

          <div
            className={`lp-feature-expanded${animating ? ' is-animating' : ''}`}
            style={Object.keys(flipStyle).length > 0 ? flipStyle : undefined}
            onTransitionEnd={() => setAnimating(false)}
          >
            <button
              ref={closeBtnRef}
              type="button"
              className="lp-feature-expanded-close"
              aria-label="Back to features"
              onClick={close}
            >
              <CancelIcon />
            </button>

            <div className="lp-feature-expanded-inner">
              <div className="lp-feature-expanded-copy">
                <div className="lp-feature-icon">
                  {(() => {
                    const Icon = activeFeature.icon
                    return <Icon />
                  })()}
                </div>
                <h3 className="lp-feature-expanded-title">{activeFeature.title}</h3>
                <p className="lp-feature-expanded-name">{activeFeature.featureName}</p>
                <p className="lp-feature-expanded-desc">{activeFeature.description}</p>
                <button type="button" className="lp-feature-expanded-back" onClick={close}>
                  Back to all features
                </button>
              </div>

              <div className="lp-feature-expanded-preview">
                <FeatureExamplePreview kind={activeFeature.preview} title={activeFeature.title} />
              </div>
            </div>
          </div>

          <button
            type="button"
            className="lp-feature-nav lp-feature-nav-next"
            aria-label="Next feature"
            onClick={() => goToFeature((activeIndex + 1) % features.length)}
          >
            <ChevronRightIcon />
          </button>
        </>
      )}
    </div>
  )
}
