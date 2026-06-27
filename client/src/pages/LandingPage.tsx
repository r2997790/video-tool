import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { HomePageData } from '../types'
import '../styles/landing.css'

function formatEventTime(iso: string | null | undefined, timezone?: string | null) {
  if (!iso) return null
  try {
    const date = new Date(iso.includes('T') && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? `${iso}Z` : iso)
    return date.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      ...(timezone ? { timeZone: timezone } : {}),
    })
  } catch {
    return null
  }
}

export function LandingPage() {
  const [data, setData] = useState<HomePageData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getHome()
      .then(setData)
      .catch(() => setError('Unable to load page content.'))
  }, [])

  const brandName = data?.brandName || 'Demo Studio'
  const tagline = data?.tagline || 'Interactive video demos with chapters, live chat, and guided flows.'
  const primary = data?.primaryColor || '#77c043'
  const accent = data?.accentColor || '#4f8a28'

  useEffect(() => {
    document.documentElement.style.setProperty('--landing-accent', primary)
    document.documentElement.style.setProperty('--landing-accent-deep', accent)
  }, [primary, accent])

  if (!data && !error) {
    return <div className="lp-loading">Loading…</div>
  }

  const flows = data?.flows ?? []
  const events = data?.events ?? []

  return (
    <div className="lp-page">
      <header className="lp-header">
        <div className="lp-wrap lp-header-inner">
          <div className="lp-brand">
            {data?.logoUrl
              ? <img src={data.logoUrl} alt={brandName} className="lp-logo" />
              : <span className="lp-brand-name">{brandName}</span>}
          </div>
          <nav className="lp-nav">
            {flows.length > 0 && <a href="#demos">Demos</a>}
            {events.length > 0 && <a href="#events">Events</a>}
            <Link to="/admin/login" className="lp-nav-admin">Admin</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-wrap lp-hero-inner">
            <p className="lp-eyebrow">Interactive demo platform</p>
            <h1 className="lp-title">
              Experience <span className="lp-accent">{brandName}</span> in action
            </h1>
            <p className="lp-subtitle">{tagline}</p>
            <div className="lp-hero-actions">
              {flows.length > 0 ? (
                <Link to={flows[0].url} className="lp-btn lp-btn-primary">
                  Start a demo
                </Link>
              ) : (
                <Link to="/admin/login" className="lp-btn lp-btn-primary">
                  Admin sign in
                </Link>
              )}
              {events.some(e => e.isLive) && (
                <Link to={events.find(e => e.isLive)!.url} className="lp-btn lp-btn-ghost">
                  Join live event
                </Link>
              )}
            </div>
            <ul className="lp-features">
              <li>Chapter-based video walkthroughs</li>
              <li>Live chat &amp; AI assistance</li>
              <li>Scheduled broadcast events</li>
            </ul>
          </div>
          <div className="lp-hero-glow" aria-hidden />
        </section>

        {error && (
          <section className="lp-wrap">
            <p className="lp-error">{error}</p>
          </section>
        )}

        {flows.length > 0 && (
          <section className="lp-section" id="demos">
            <div className="lp-wrap">
              <h2 className="lp-section-title">Available demos</h2>
              <p className="lp-section-sub">Choose a guided experience to explore at your own pace.</p>
              <div className="lp-grid">
                {flows.map(flow => (
                  <Link key={flow.slug} to={flow.url} className="lp-card">
                    <div className="lp-card-icon" aria-hidden>▶</div>
                    <h3 className="lp-card-title">{flow.projectName}</h3>
                    <p className="lp-card-meta">Interactive video demo</p>
                    <span className="lp-card-link">Launch demo →</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {events.length > 0 && (
          <section className="lp-section lp-section-alt" id="events">
            <div className="lp-wrap">
              <h2 className="lp-section-title">Upcoming events</h2>
              <p className="lp-section-sub">Register or join scheduled broadcast sessions.</p>
              <div className="lp-grid">
                {events.map(ev => (
                  <Link key={ev.slug} to={ev.url} className="lp-card">
                    {ev.isLive && <span className="lp-live-badge">Live now</span>}
                    <h3 className="lp-card-title">{ev.title}</h3>
                    <p className="lp-card-meta">
                      {ev.isLive
                        ? 'Broadcast in progress'
                        : formatEventTime(ev.nextStartsAtUtc ?? ev.startsAtUtc, ev.timezone) ?? 'Scheduled'}
                    </p>
                    <span className="lp-card-link">{ev.isLive ? 'Join now →' : 'View event →'}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {flows.length === 0 && !error && (
          <section className="lp-section">
            <div className="lp-wrap lp-empty">
              <h2 className="lp-section-title">Demos coming soon</h2>
              <p className="lp-section-sub">
                No public demos are published yet. Administrators can create and enable flows in the admin panel.
              </p>
              <Link to="/admin/login" className="lp-btn lp-btn-primary">Admin sign in</Link>
            </div>
          </section>
        )}
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-inner">
          <span>{brandName}</span>
          <Link to="/admin/login">Admin</Link>
        </div>
      </footer>
    </div>
  )
}
