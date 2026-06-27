import { useEffect, useRef } from 'react'
import { CancelIcon, ExternalLinkIcon } from './icons/uiIcons'

type LandingDemoPanelProps = {
  open: boolean
  flowSlug: string
  flowName?: string
  onClose: () => void
}

export function LandingDemoPanel({ open, flowSlug, flowName, onClose }: LandingDemoPanelProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const previewPath = `/flow/${encodeURIComponent(flowSlug)}`

  useEffect(() => {
    if (!open) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtnRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!flowSlug) return null

  return (
    <div
      className={`lp-demo-panel-root${open ? ' is-open' : ''}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="lp-demo-panel-backdrop"
        aria-label="Close demo"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <aside
        className={`lp-demo-panel${open ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={flowName ? `Demo: ${flowName}` : 'Interactive demo'}
      >
        <header className="lp-demo-panel-head">
          <div className="lp-demo-panel-head-text">
            <p className="lp-demo-panel-eyebrow">Interactive demo</p>
            <h2 className="lp-demo-panel-title">{flowName || 'Demo preview'}</h2>
          </div>
          <div className="lp-demo-panel-actions">
            <a
              href={previewPath}
              target="_blank"
              rel="noreferrer"
              className="lp-demo-panel-link lp-btn-with-icon"
              tabIndex={open ? 0 : -1}
            >
              <ExternalLinkIcon />
              Open full screen
            </a>
            <button
              ref={closeBtnRef}
              type="button"
              className="lp-demo-panel-close"
              aria-label="Close demo panel"
              tabIndex={open ? 0 : -1}
              onClick={onClose}
            >
              <CancelIcon />
            </button>
          </div>
        </header>
        <div className="lp-demo-panel-body">
          {open && (
            <iframe
              className="lp-demo-panel-frame"
              src={previewPath}
              title={flowName ? `Demo: ${flowName}` : 'Interactive demo'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          )}
        </div>
      </aside>
    </div>
  )
}
