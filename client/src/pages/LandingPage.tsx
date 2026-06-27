import { useEffect, useState } from 'react'

import { Link } from 'react-router-dom'

import { api } from '../api'

import type { HomePageData } from '../types'

import { LandingMediaCard, padHomeItems, type LandingPreviewVariant } from '../components/LandingMediaCard'

import {

  CalendarIcon,

  ChaptersIcon,

  ChatIcon,

  DownloadIcon,
  FlowDesignIcon,

  LiveIcon,

  LoginIcon,

  MessageIcon,

  PlayIcon,

  SettingsIcon,
  VideoIcon,

} from '../components/icons/uiIcons'

import '../styles/landing.css'



const DEMO_SLOTS = [

  { pill: 'LIVE', pillVariant: 'live' as const, buttonLabel: 'Join Live', useLiveIcon: true, previewVariant: 'live' as const },

  { pill: 'On Demand', pillVariant: 'ondemand' as const, buttonLabel: 'Launch On Demand', useLiveIcon: false, previewVariant: 'ondemand' as const },

  { pill: 'Replay', pillVariant: 'replay' as const, buttonLabel: 'Watch Replay', useLiveIcon: false, previewVariant: 'replay' as const },

]



const EVENT_SLOTS = [

  { pill: 'Limited Availability', pillVariant: 'limited' as const, buttonLabel: 'Join the Waitlist', previewVariant: 'event' as const },

  { pill: 'Register Now', pillVariant: 'register' as const, buttonLabel: 'Book your Seat', previewVariant: 'event' as const },

]



const FEATURES = [

  {

    icon: FlowDesignIcon,

    title: 'Visual flow editor',

    description: 'Build branching demo paths with drag-and-drop — no code required. Route viewers based on their answers.',

  },

  {

    icon: ChaptersIcon,

    title: 'Chapter-based walkthroughs',

    description: 'Structure product tours as clear, navigable chapters so prospects always know where they are.',

  },

  {

    icon: ChatIcon,

    title: 'Live chat and AI assistance',

    description: 'Engage viewers in real time or let AI handle common questions while your team focuses on high-intent leads.',

  },

  {

    icon: CalendarIcon,

    title: 'Scheduled broadcast events',

    description: 'Run live demo sessions with registration, countdown lobbies, and automatic go-live at the scheduled time.',

  },

  {

    icon: DownloadIcon,

    title: 'Lead capture and webhooks',

    description: 'Collect contact details during demos and push them straight to your CRM via webhooks or email alerts.',

  },

  {

    icon: SettingsIcon,

    title: 'Fully branded experience',

    description: 'Match your logo, colours, and fonts so every demo feels like a natural extension of your website.',

  },

  {

    icon: VideoIcon,

    title: 'In-video engagement',

    description: 'Trigger timed pop-ups, pause for questions, and gate content — all without leaving the video player.',

  },

  {

    icon: MessageIcon,

    title: 'Slack and Teams integration',

    description: 'Mirror demo chat into your team channels so sales and support can respond from tools they already use.',

  },

]



const PRICING_TIERS = [

  {

    name: 'Free trial',

    price: '14 days',

    period: 'full access',

    featured: false,

    cta: 'Start free trial',

    ctaTo: '/admin/login',

    highlights: [

      'All features unlocked',

      'No credit card required',

      'Unlimited test demos',

    ],

  },

  {

    name: 'Starter',

    price: '$49',

    period: '/ month',

    featured: false,

    cta: 'Get started',

    ctaTo: '/admin/login',

    highlights: [

      '3 published flows',

      '1 live event per month',

      'Basic analytics',

      'Email support',

    ],

  },

  {

    name: 'Pro',

    price: '$149',

    period: '/ month',

    featured: true,

    cta: 'Get started',

    ctaTo: '/admin/login',

    highlights: [

      'Unlimited flows and events',

      'AI chat assistance',

      'Slack and Teams integrations',

      'Lead webhooks',

      'Priority support',

    ],

  },

  {

    name: 'Enterprise',

    price: 'Contact us',

    period: 'custom pricing',

    featured: false,

    cta: 'Talk to sales',

    ctaTo: 'mailto:sales@example.com',

    external: true,

    highlights: [

      'SSO and advanced security',

      'Custom branding and SLA',

      'Dedicated account manager',

      'Onboarding and training',

    ],

  },

]



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



function normalizeBrandColor(color: string, fallback: string) {

  const normalized = color.trim().toLowerCase()

  if (normalized === '#77c043' || normalized === '#55e6c1') return fallback

  return color

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

  const primary = normalizeBrandColor(data?.primaryColor || '#5CF8D0', '#5CF8D0')

  const accent = normalizeBrandColor(data?.accentColor || '#47dcb0', '#47dcb0')



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

            <a href="#features">Features</a>

            {flows.length > 0 && <a href="#demos">Demos</a>}

            {events.length > 0 && <a href="#events">Events</a>}

            <a href="#pricing">Pricing</a>

            <Link to="/admin/login" className="lp-nav-admin">Admin</Link>

          </nav>

        </div>

      </header>



      <main>

        <section className="lp-hero">

          <div className="lp-wrap">

            <div className="lp-hero-inner">

              <p className="lp-eyebrow">Interactive demo platform</p>

              <h1 className="lp-title">

                Experience <span className="lp-accent">{brandName}</span> in action

              </h1>

              <p className="lp-subtitle">{tagline}</p>

              <div className="lp-hero-actions">

                {flows.length > 0 ? (

                  <Link to={flows[0].url} className="lp-btn lp-btn-primary lp-btn-with-icon">

                    <PlayIcon />

                    Start a demo

                  </Link>

                ) : (

                  <Link to="/admin/login" className="lp-btn lp-btn-primary lp-btn-with-icon">

                    <LoginIcon />

                    Admin sign in

                  </Link>

                )}

                {events.some(e => e.isLive) && (

                  <Link to={events.find(e => e.isLive)!.url} className="lp-btn lp-btn-ghost lp-btn-with-icon">

                    <LiveIcon />

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

          </div>

          <div className="lp-hero-glow" aria-hidden />

        </section>



        <section className="lp-section lp-section-features" id="features">

          <div className="lp-wrap">

            <h2 className="lp-section-title">Why {brandName}?</h2>

            <p className="lp-section-sub">

              Everything you need to create, publish, and run interactive product demos that convert viewers into qualified leads.

            </p>

            <div className="lp-feature-grid">

              {FEATURES.map(feature => {

                const Icon = feature.icon

                return (

                  <article key={feature.title} className="lp-feature-card">

                    <div className="lp-feature-icon">

                      <Icon />

                    </div>

                    <h3 className="lp-feature-title">{feature.title}</h3>

                    <p className="lp-feature-desc">{feature.description}</p>

                  </article>

                )

              })}

            </div>

          </div>

        </section>



        {error && (

          <section className="lp-wrap">

            <p className="lp-error">{error}</p>

          </section>

        )}



        {flows.length > 0 && (

          <section className="lp-section lp-section-demos" id="demos">

            <div className="lp-wrap">

              <h2 className="lp-section-title">Available demos</h2>

              <p className="lp-section-sub">Choose a guided experience to explore at your own pace.</p>

              <div className="lp-grid lp-grid-demos">

                {padHomeItems(flows, 3).map((flow, index) => {

                  const slot = DEMO_SLOTS[index]

                  return (

                    <LandingMediaCard

                      key={`${flow.slug}-${index}`}

                      pill={slot.pill}

                      pillVariant={slot.pillVariant}

                      title={flow.projectName}

                      meta="Interactive video demo"

                      buttonLabel={slot.buttonLabel}

                      url={flow.url}

                      previewSeed={flow.slug}

                      previewVariant={slot.previewVariant}

                      buttonIcon={slot.useLiveIcon ? <LiveIcon /> : undefined}

                    />

                  )

                })}

              </div>

            </div>

          </section>

        )}



        {events.length > 0 && (

          <section className="lp-section lp-section-alt lp-section-events" id="events">

            <div className="lp-wrap">

              <h2 className="lp-section-title">Upcoming events</h2>

              <p className="lp-section-sub">Register or join scheduled broadcast sessions.</p>

              <div className="lp-grid lp-grid-events">

                {padHomeItems(events, 2).map((ev, index) => {

                  const slot = EVENT_SLOTS[index]

                  const meta = ev.isLive

                    ? 'Broadcast in progress'

                    : formatEventTime(ev.nextStartsAtUtc ?? ev.startsAtUtc, ev.timezone) ?? 'Scheduled'

                  const previewVariant: LandingPreviewVariant = ev.isLive ? 'live' : slot.previewVariant

                  return (

                    <LandingMediaCard

                      key={`${ev.slug}-${index}`}

                      pill={ev.isLive ? 'LIVE' : slot.pill}

                      pillVariant={ev.isLive ? 'live' : slot.pillVariant}

                      title={ev.title}

                      meta={meta}

                      buttonLabel={ev.isLive ? 'Join Live' : slot.buttonLabel}

                      url={ev.url}

                      previewSeed={ev.slug}

                      previewVariant={previewVariant}

                      buttonIcon={ev.isLive ? <LiveIcon /> : undefined}

                    />

                  )

                })}

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

              <Link to="/admin/login" className="lp-btn lp-btn-primary lp-btn-with-icon">

                <LoginIcon />

                Admin sign in

              </Link>

            </div>

          </section>

        )}



        <section className="lp-section lp-section-pricing" id="pricing">

          <div className="lp-wrap">

            <h2 className="lp-section-title">Simple, transparent pricing</h2>

            <p className="lp-section-sub">

              Start with a free 14-day trial. Upgrade when you are ready to publish demos and run live events at scale.

            </p>

            <div className="lp-pricing-grid">

              {PRICING_TIERS.map(tier => (

                <article

                  key={tier.name}

                  className={`lp-pricing-card${tier.featured ? ' lp-pricing-card-featured' : ''}`}

                >

                  {tier.featured && <span className="lp-pricing-badge">Most popular</span>}

                  <h3 className="lp-pricing-name">{tier.name}</h3>

                  <div className="lp-pricing-price">

                    <span className="lp-pricing-amount">{tier.price}</span>

                    <span className="lp-pricing-period">{tier.period}</span>

                  </div>

                  <ul className="lp-pricing-highlights">

                    {tier.highlights.map(item => (

                      <li key={item}>{item}</li>

                    ))}

                  </ul>

                  {'external' in tier && tier.external ? (

                    <a href={tier.ctaTo} className={`lp-btn${tier.featured ? ' lp-btn-primary' : ' lp-btn-ghost'} lp-pricing-cta`}>

                      {tier.cta}

                    </a>

                  ) : (

                    <Link to={tier.ctaTo} className={`lp-btn${tier.featured ? ' lp-btn-primary' : ' lp-btn-ghost'} lp-pricing-cta`}>

                      {tier.cta}

                    </Link>

                  )}

                </article>

              ))}

            </div>

          </div>

        </section>

      </main>



      <footer className="lp-footer">

        <div className="lp-wrap lp-footer-inner">

          <span>{brandName}</span>

          <div className="lp-footer-links">

            <a href="#features">Features</a>

            <a href="#pricing">Pricing</a>

            <Link to="/admin/login">Admin</Link>

          </div>

        </div>

      </footer>

    </div>

  )

}


