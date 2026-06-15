export function NoDemoAvailablePage() {
  return (
    <div className="vd-event-lobby" role="main">
      <div className="vd-event-card">
        <h1 className="vd-event-title">No demo available</h1>
        <p className="vd-event-message">
          A demo requires a specific flow URL. Open a link like <code>/flow/your-flow-slug</code> to start a session.
        </p>
        <p className="vd-event-url-hint">
          If you are an administrator, create and enable flows in the admin panel.
        </p>
      </div>
    </div>
  )
}
