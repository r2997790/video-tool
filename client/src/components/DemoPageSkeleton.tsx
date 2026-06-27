import '../styles/demo.css'

export function DemoPageSkeleton() {
  return (
    <div className="vd-shell vd-shell-skeleton" aria-busy="true" aria-label="Loading demo">
      <aside className="vd-sidebar vd-chapters-panel">
        <div className="vd-sidebar-head">
          <div className="vd-skeleton vd-skeleton-title" />
          <div className="vd-skeleton vd-skeleton-sub" />
        </div>
        <div className="vd-chapter-list">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="vd-skeleton vd-skeleton-chapter" />
          ))}
        </div>
      </aside>

      <main className="vd-main">
        <div className="vd-video-outer">
          <div className="vd-video-wrap">
            <div className="vd-skeleton vd-skeleton-video" />
          </div>
        </div>
      </main>

      <aside className="vd-sidebar vd-chat-panel">
        <div className="vd-sidebar-head">
          <div className="vd-skeleton vd-skeleton-title" />
          <div className="vd-skeleton vd-skeleton-sub" />
        </div>
        <div className="vd-skeleton vd-skeleton-chat" />
      </aside>
    </div>
  )
}
