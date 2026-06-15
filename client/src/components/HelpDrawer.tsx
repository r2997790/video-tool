import { useState } from 'react'

export function HelpDrawer() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" className="admin-btn admin-btn-sm admin-help-drawer-toggle" onClick={() => setOpen(true)}>
        How it works
      </button>
      {open && (
        <div className="admin-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="admin-modal admin-modal-wide" role="dialog">
            <h3 className="admin-modal-title">How Demo Studio works</h3>
            <ol className="admin-checklist" style={{ marginBottom: 16 }}>
              <li>
                <span className="admin-checklist-num">1</span>
                <div><strong>Create a flow</strong><span>Name your demo and add video chapters.</span></div>
              </li>
              <li>
                <span className="admin-checklist-num">2</span>
                <div><strong>Configure globally in Settings</strong><span>Theme, chat, and AI apply to all flows.</span></div>
              </li>
              <li>
                <span className="admin-checklist-num">3</span>
                <div><strong>Customize per flow</strong><span>Chapters, chat scripts, pop-ups, and questions live under each flow.</span></div>
              </li>
              <li>
                <span className="admin-checklist-num">4</span>
                <div><strong>Publish & share</strong><span>Set status to Live, copy the link, send to prospects.</span></div>
              </li>
            </ol>
            <p className="admin-modal-message">
              Try the sample demo at <a href="/flow/test-demo" target="_blank" rel="noreferrer">/flow/test-demo</a> (if enabled).
            </p>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn-sm admin-btn-primary" onClick={() => setOpen(false)}>Got it</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
