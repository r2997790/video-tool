interface FlowsEmptyStateProps {
  onCreate: () => void
}

const steps = [
  { n: 1, title: 'Create a flow', desc: 'Name your demo and open the Flow editor.' },
  { n: 2, title: 'Add videos', desc: 'Add chapter blocks with one or more video clips.' },
  { n: 3, title: 'Publish', desc: 'Turn on Live status so the public link works.' },
  { n: 4, title: 'Share', desc: 'Copy the link and send it to prospects.' },
]

export function FlowsEmptyState({ onCreate }: FlowsEmptyStateProps) {
  return (
    <div className="admin-empty-state">
      <div className="admin-empty-icon" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polygon points="5,3 19,12 5,21" />
        </svg>
      </div>
      <h3>Create your first interactive demo</h3>
      <p>Flows are shareable demo experiences with video, chat, and optional gating.</p>
      <ol className="admin-checklist">
        {steps.map(s => (
          <li key={s.n}>
            <span className="admin-checklist-num">{s.n}</span>
            <div>
              <strong>{s.title}</strong>
              <span>{s.desc}</span>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" className="admin-btn admin-btn-primary" onClick={onCreate}>
        Create your first flow
      </button>
    </div>
  )
}
