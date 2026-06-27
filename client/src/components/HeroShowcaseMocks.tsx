export function FlowBuilderMock() {
  return (
    <div className="lp-showcase-app lp-showcase-builder" aria-hidden>
      <header className="lp-showcase-builder-top">
        <div className="lp-showcase-builder-brand">
          <span className="lp-showcase-builder-logo">Demo Studio</span>
          <span className="lp-showcase-builder-flow">Acme SaaS Product Tour</span>
          <span className="lp-showcase-builder-badge">Published</span>
        </div>
        <nav className="lp-showcase-builder-tabs" aria-hidden>
          <span className="is-active">Flow editor</span>
          <span>Chat scripts</span>
          <span>Live preview</span>
        </nav>
        <div className="lp-showcase-builder-actions">
          <span className="lp-showcase-builder-btn">Share</span>
          <span className="lp-showcase-builder-btn lp-showcase-builder-btn-primary">Preview demo</span>
        </div>
      </header>

      <div className="lp-showcase-builder-body">
        <div className="lp-showcase-builder-canvas">
          <div className="lp-showcase-grid" />

          <svg className="lp-showcase-edges" viewBox="0 0 720 360" preserveAspectRatio="none" aria-hidden>
            <path d="M118 72 H168" className="lp-showcase-edge" />
            <path d="M268 72 H318" className="lp-showcase-edge" />
            <path d="M368 92 V128 H248 V168" className="lp-showcase-edge" />
            <path d="M368 92 V128 H488 V168" className="lp-showcase-edge" />
            <path d="M248 208 H298" className="lp-showcase-edge" />
            <path d="M488 208 H538" className="lp-showcase-edge" />
            <path d="M348 208 H398" className="lp-showcase-edge" />
            <path d="M548 208 H598" className="lp-showcase-edge" />
          </svg>

          <div className="lp-showcase-node lp-showcase-node-event" style={{ top: '8%', left: '4%' }}>
            <span className="lp-showcase-node-type">event</span>
            <strong>Registration gate</strong>
            <span className="lp-showcase-node-sub">Collect name &amp; company</span>
          </div>

          <div className="lp-showcase-node lp-showcase-node-question" style={{ top: '8%', left: '28%' }}>
            <span className="lp-showcase-node-type">question</span>
            <strong>What&apos;s your role?</strong>
            <span className="lp-showcase-node-sub">Routes to tailored chapters</span>
          </div>

          <div className="lp-showcase-node lp-showcase-node-branch lp-showcase-node-branch-animate" style={{ top: '8%', left: '52%' }}>
            <span className="lp-showcase-node-type">branch</span>
            <strong>Role-based paths</strong>
            <span className="lp-showcase-node-sub">Leader vs practitioner</span>
          </div>

          <div className="lp-showcase-node lp-showcase-node-chapter" style={{ top: '48%', left: '18%' }}>
            <span className="lp-showcase-node-type">chapter</span>
            <strong>ROI for leaders</strong>
            <span className="lp-showcase-node-sub">3 min · Executive overview</span>
          </div>

          <div className="lp-showcase-node lp-showcase-node-chapter" style={{ top: '48%', left: '46%' }}>
            <span className="lp-showcase-node-type">chapter</span>
            <strong>Hands-on workflow</strong>
            <span className="lp-showcase-node-sub">5 min · Feature deep-dive</span>
          </div>

          <div className="lp-showcase-node lp-showcase-node-video" style={{ top: '48%', left: '68%' }}>
            <span className="lp-showcase-node-type">video</span>
            <strong>Dashboard walkthrough</strong>
            <span className="lp-showcase-node-sub">▶ Playing · 2:14</span>
          </div>

          <div className="lp-showcase-node lp-showcase-node-toaster" style={{ top: '72%', left: '34%' }}>
            <span className="lp-showcase-node-type">toaster</span>
            <strong>Pricing question</strong>
            <span className="lp-showcase-node-sub">@ 1:42 · In-video poll</span>
          </div>

          <div className="lp-showcase-node lp-showcase-node-aichat" style={{ top: '72%', left: '58%' }}>
            <span className="lp-showcase-node-type">ai chat</span>
            <strong>AI assistant</strong>
            <span className="lp-showcase-node-sub">Answers while you watch</span>
          </div>

          <div className="lp-showcase-minimap" aria-hidden>
            <span />
            <span />
            <span />
          </div>
        </div>

        <aside className="lp-showcase-builder-panel">
          <p className="lp-showcase-panel-title">Properties</p>
          <p className="lp-showcase-panel-label">Node</p>
          <div className="lp-showcase-panel-field">What&apos;s your role?</div>
          <p className="lp-showcase-panel-label">Options</p>
          <ul className="lp-showcase-panel-list">
            <li>VP / Director → ROI chapter</li>
            <li>Practitioner → Workflow chapter</li>
            <li>Evaluating → Full tour</li>
          </ul>
          <p className="lp-showcase-panel-label">Lead capture</p>
          <div className="lp-showcase-panel-toggle">
            <span className="is-on" /> Sync to HubSpot on answer
          </div>
        </aside>
      </div>
    </div>
  )
}

const CHAPTERS = [
  {
    num: '01',
    title: 'Welcome & context',
    desc: 'Set the scene — who this demo is for and what you will see.',
    dur: '1:20',
    active: false,
    locked: false,
  },
  {
    num: '02',
    title: 'Analytics dashboard',
    desc: 'See real-time KPIs, filters, and the reporting views your team uses daily.',
    dur: '3:45',
    active: true,
    locked: false,
  },
  {
    num: '03',
    title: 'Automation builder',
    desc: 'Watch a workflow get configured — triggers, actions, and approvals.',
    dur: '4:10',
    active: false,
    locked: false,
  },
  {
    num: '04',
    title: 'Enterprise security',
    desc: 'SSO, audit logs, and role-based access — unlock with your details.',
    dur: '2:30',
    active: false,
    locked: true,
  },
]

export function DemoViewerMock() {
  return (
    <div className="lp-showcase-app lp-showcase-demo" aria-hidden>
      <aside className="lp-showcase-demo-chapters">
        <div className="lp-showcase-demo-head">
          <p className="lp-showcase-demo-brand">Acme Analytics</p>
          <p className="lp-showcase-demo-head-sub">Guided product tour</p>
        </div>
        <div className="lp-showcase-demo-chapter-list">
          {CHAPTERS.map(ch => (
            <div
              key={ch.num}
              className={`lp-showcase-demo-chapter${ch.active ? ' is-active' : ''}${ch.locked ? ' is-locked' : ''}`}
            >
              <span className="lp-showcase-demo-ch-num">{ch.num}</span>
              <div>
                <p className="lp-showcase-demo-ch-title">{ch.title}</p>
                <p className="lp-showcase-demo-ch-desc">{ch.desc}</p>
                <div className="lp-showcase-demo-ch-foot">
                  <span>{ch.dur}</span>
                  {ch.locked && <span className="lp-showcase-demo-ch-badge">Details required</span>}
                  {ch.active && <span className="lp-showcase-demo-ch-badge is-live">Now playing</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="lp-showcase-demo-main">
        <div className="lp-showcase-demo-video-wrap">
          <div className="lp-showcase-demo-video">
            <div className="lp-showcase-demo-screen">
              <div className="lp-showcase-demo-screen-top">
                <span className="lp-showcase-demo-dot" />
                <span className="lp-showcase-demo-dot" />
                <span className="lp-showcase-demo-dot" />
                <span>app.acme.io/analytics</span>
              </div>
              <div className="lp-showcase-demo-screen-body">
                <div className="lp-showcase-demo-screen-nav">
                  <span className="is-active">Overview</span>
                  <span>Reports</span>
                  <span>Teams</span>
                </div>
                <div className="lp-showcase-demo-screen-content">
                  <div className="lp-showcase-demo-kpis">
                    <div><strong>128%</strong><span>Pipeline growth</span></div>
                    <div><strong>34</strong><span>Active accounts</span></div>
                    <div><strong>98.2%</strong><span>Uptime</span></div>
                  </div>
                  <div className="lp-showcase-demo-chart">
                    <div className="lp-showcase-demo-bar" style={{ height: '42%' }} />
                    <div className="lp-showcase-demo-bar" style={{ height: '68%' }} />
                    <div className="lp-showcase-demo-bar is-highlight" style={{ height: '88%' }} />
                    <div className="lp-showcase-demo-bar" style={{ height: '55%' }} />
                    <div className="lp-showcase-demo-bar" style={{ height: '72%' }} />
                    <div className="lp-showcase-demo-bar" style={{ height: '61%' }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="lp-showcase-demo-progress">
              <div className="lp-showcase-demo-progress-fill" />
            </div>
            <div className="lp-showcase-demo-play-indicator">
              <span className="lp-showcase-demo-live-dot" />
              Live demo
            </div>
          </div>
        </div>
        <div className="lp-showcase-demo-now-playing">
          <div>
            <span className="lp-showcase-demo-np-label">Now playing</span>
            <span className="lp-showcase-demo-np-title">Analytics dashboard</span>
          </div>
          <span className="lp-showcase-demo-np-time">1:24 / 3:45</span>
        </div>
      </main>

      <aside className="lp-showcase-demo-chat">
        <div className="lp-showcase-demo-head">
          <p className="lp-showcase-demo-brand">Live chat</p>
          <p className="lp-showcase-demo-head-sub">Ask anything about the demo</p>
        </div>
        <div className="lp-showcase-demo-messages">
          <div className="lp-showcase-demo-msg lp-showcase-demo-msg-user">
            <p>Can you show the reporting export?</p>
          </div>
          <div className="lp-showcase-demo-msg">
            <p>Absolutely — jumping to the Reports chapter now. You can also schedule a live session with our team.</p>
          </div>
          <div className="lp-showcase-demo-msg lp-showcase-demo-msg-user">
            <p>Does this integrate with Salesforce?</p>
          </div>
          <div className="lp-showcase-demo-msg is-typing">
            <span /><span /><span />
          </div>
        </div>
        <div className="lp-showcase-demo-input">
          <span>Ask a question…</span>
          <span className="lp-showcase-demo-send">Send</span>
        </div>
      </aside>
    </div>
  )
}
