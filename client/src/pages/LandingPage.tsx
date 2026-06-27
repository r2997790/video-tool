import { useEffect, useState } from 'react'

import { Link, useNavigate } from 'react-router-dom'

import { api } from '../api'

import type { HomePageData } from '../types'
import { getAuthNav, type AuthMeResponse } from '../utils/authNav'

import { FeatureExplorer } from '../components/FeatureExplorer'
import { HeroProductShowcase } from '../components/HeroProductShowcase'
import { HeroValueRotator } from '../components/HeroValueRotator'
import { LandingDemoPanel } from '../components/LandingDemoPanel'
import { LandingEventRegistrationModal } from '../components/LandingEventRegistrationModal'
import { LandingMediaCard, padHomeItems } from '../components/LandingMediaCard'
import type { FeaturePreviewKind } from '../components/FeatureExamplePreview'

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

  { pill: 'LIVE', pillVariant: 'live' as const, title: 'Demo Studio Live', meta: 'See the live experience', buttonLabel: 'Join Live', useLiveIcon: true, previewVariant: 'live' as const },

  { pill: 'On Demand', pillVariant: 'ondemand' as const, title: 'Demo Studio On Demand', meta: 'Immediate engagement', buttonLabel: 'Launch On Demand', useLiveIcon: false, previewVariant: 'ondemand' as const },

  { pill: 'Replay', pillVariant: 'replay' as const, title: 'Demo Studio Replay', meta: 'Catchup mode', buttonLabel: 'Watch Replay', useLiveIcon: false, previewVariant: 'replay' as const },

]



const LANDING_EVENT_CARDS = [

  {
    pill: 'Limited Access',
    pillVariant: 'limited' as const,
    title: 'Create a world-class demo lead magnet',
    buttonLabel: 'Register',
    meta: 'Exclusive session · Limited seats',
    previewVariant: 'event' as const,
  },

  {
    pill: 'Register Now',
    pillVariant: 'register' as const,
    title: 'How to make buyers self-identify',
    buttonLabel: 'Register',
    meta: 'Upcoming broadcast · Reserve your spot',
    previewVariant: 'event' as const,
  },

]



const FEATURES: {
  icon: typeof FlowDesignIcon
  title: string
  description: string
  preview: FeaturePreviewKind
}[] = [

  {

    icon: FlowDesignIcon,

    title: 'Visual flow editor',

    description: 'Build branching demo paths with drag-and-drop — no code required. Route viewers based on their answers.',

    preview: 'flow-editor',

  },

  {

    icon: ChaptersIcon,

    title: 'Chapter-based walkthroughs',

    description: 'Structure product tours as clear, navigable chapters so prospects always know where they are.',

    preview: 'chapters',

  },

  {

    icon: ChatIcon,

    title: 'Live chat and AI assistance',

    description: 'Engage viewers in real time or let AI handle common questions while your team focuses on high-intent leads.',

    preview: 'live-chat',

  },

  {

    icon: CalendarIcon,

    title: 'Scheduled broadcast events',

    description: 'Run live demo sessions with registration, countdown lobbies, and automatic go-live at the scheduled time.',

    preview: 'events',

  },

  {

    icon: DownloadIcon,

    title: 'Lead capture and webhooks',

    description: 'Collect contact details during demos and push them straight to your CRM via webhooks or email alerts.',

    preview: 'leads',

  },

  {

    icon: SettingsIcon,

    title: 'Fully branded experience',

    description: 'Match your logo, colours, and fonts so every demo feels like a natural extension of your website.',

    preview: 'branding',

  },

  {

    icon: VideoIcon,

    title: 'In-video engagement',

    description: 'Trigger timed pop-ups, pause for questions, and gate content — all without leaving the video player.',

    preview: 'in-video',

  },

  {

    icon: MessageIcon,

    title: 'Slack and Teams integration',

    description: 'Mirror demo chat into your team channels so sales and support can respond from tools they already use.',

    preview: 'integrations',

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



function normalizeBrandColor(color: string, fallback: string) {

  const normalized = color.trim().toLowerCase()

  if (normalized === '#77c043' || normalized === '#55e6c1') return fallback

  return color

}



export function LandingPage() {

  const navigate = useNavigate()
  const [data, setData] = useState<HomePageData | null>(null)

  const [error, setError] = useState('')

  const [auth, setAuth] = useState<AuthMeResponse | null>(null)

  const [demoPanelOpen, setDemoPanelOpen] = useState(false)
  const [registrationEvent, setRegistrationEvent] = useState<{ slug: string; title: string } | null>(null)



  useEffect(() => {

    api.getHome()

      .then(setData)

      .catch(() => setError('Unable to load page content.'))

    api.me()

      .then(setAuth)

      .catch(() => setAuth({ authenticated: false }))

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

  const authNav = getAuthNav(auth)

  const handleStartDemo = () => {
    if (flows.length > 0) {
      setDemoPanelOpen(true)
      return
    }
    const demos = document.getElementById('demos')
    if (demos) {
      demos.scrollIntoView({ behavior: 'smooth' })
      return
    }
    const eventsSection = document.getElementById('events')
    if (eventsSection) {
      eventsSection.scrollIntoView({ behavior: 'smooth' })
      return
    }
    navigate(authNav.to)
  }



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

            <Link to={authNav.to} className="lp-nav-admin">{authNav.label}</Link>

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

                <button
                  type="button"
                  className="lp-btn lp-btn-primary lp-btn-with-icon"
                  onClick={handleStartDemo}
                >

                  <PlayIcon />

                  Start a demo

                </button>

              </div>

            </div>

            <HeroProductShowcase />

            <HeroValueRotator />

          </div>

          <div className="lp-hero-glow" aria-hidden />

        </section>



        <section className="lp-section lp-section-features" id="features">

          <div className="lp-wrap">

            <h2 className="lp-section-title">Why {brandName}?</h2>

            <p className="lp-section-sub">

              Everything you need to create, publish, and run interactive product demos that convert viewers into qualified leads.

            </p>

            <FeatureExplorer features={FEATURES} />

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

                      title={slot.title}

                      meta={slot.meta}

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

                  const display = LANDING_EVENT_CARDS[index]

                  const openRegistration = () => setRegistrationEvent({
                    slug: ev.slug,
                    title: display.title,
                  })

                  return (

                    <LandingMediaCard

                      key={`${ev.slug}-${index}`}

                      pill={display.pill}

                      pillVariant={display.pillVariant}

                      title={display.title}

                      meta={display.meta}

                      buttonLabel={display.buttonLabel}

                      url={ev.url}

                      previewSeed={ev.slug}

                      previewVariant={display.previewVariant}

                      buttonIcon={null}

                      onButtonClick={openRegistration}

                      onPreviewClick={openRegistration}

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

                No public demos are published yet. Sign in to create and enable flows in the admin panel.

              </p>

              <Link to={authNav.to} className="lp-btn lp-btn-primary lp-btn-with-icon">

                <LoginIcon />

                {authNav.label}

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

                    <Link to={authNav.to} className={`lp-btn${tier.featured ? ' lp-btn-primary' : ' lp-btn-ghost'} lp-pricing-cta`}>

                      {tier.cta}

                    </Link>

                  )}

                </article>

              ))}

            </div>

          </div>

        </section>

      </main>



      {flows.length > 0 && (
        <LandingDemoPanel
          open={demoPanelOpen}
          flowSlug={flows[0].slug}
          flowName={flows[0].projectName}
          onClose={() => setDemoPanelOpen(false)}
        />
      )}

      <LandingEventRegistrationModal
        open={registrationEvent !== null}
        eventSlug={registrationEvent?.slug ?? ''}
        eventTitle={registrationEvent?.title ?? ''}
        onClose={() => setRegistrationEvent(null)}
      />

      <footer className="lp-footer">

        <div className="lp-wrap lp-footer-inner">

          <span>{brandName}</span>

          <div className="lp-footer-links">

            <a href="#features">Features</a>

            <a href="#pricing">Pricing</a>

            <Link to={authNav.to}>{authNav.label}</Link>

          </div>

        </div>

      </footer>

    </div>

  )

}


