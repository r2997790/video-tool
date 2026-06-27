import { useEffect, useState } from 'react'

import { Link, useSearchParams } from 'react-router-dom'

import { api } from '../api'

import type { HomePageData } from '../types'
import { getAuthNav, type AuthMeResponse } from '../utils/authNav'

import { FeatureExplorer } from '../components/FeatureExplorer'
import { HeroProductShowcase } from '../components/HeroProductShowcase'
import { HeroValueRotator } from '../components/HeroValueRotator'
import { LandingEventRegistrationModal } from '../components/LandingEventRegistrationModal'
import { LandingFooter } from '../components/LandingFooter'
import { LandingMediaCard } from '../components/LandingMediaCard'
import { LandingTrustStrip } from '../components/LandingTrustStrip'
import { useToast } from '../components/Toast'
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

  SettingsIcon,
  VideoIcon,

} from '../components/icons/uiIcons'

import { mailtoHref, resolveContactEmail } from '../utils/contactEmail'
import { trackLandingCta } from '../utils/landingAnalytics'

import '../styles/landing.css'



const DEMO_EXAMPLES = [

  {
    pill: 'LIVE',
    pillVariant: 'live' as const,
    title: 'Example: live session',
    meta: 'See the live experience',
    buttonLabel: 'Join Live',
    useLiveIcon: true,
    previewVariant: 'live' as const,
    preferredSlug: 'default',
    urlSuffix: '',
  },

  {
    pill: 'On Demand',
    pillVariant: 'ondemand' as const,
    title: 'Example: on-demand',
    meta: 'Immediate engagement',
    buttonLabel: 'Launch On Demand',
    useLiveIcon: false,
    previewVariant: 'ondemand' as const,
    preferredSlug: 'test-demo',
    urlSuffix: '',
  },

  {
    pill: 'Replay',
    pillVariant: 'replay' as const,
    title: 'Example: replay',
    meta: 'Catchup mode',
    buttonLabel: 'Watch Replay',
    useLiveIcon: false,
    previewVariant: 'replay' as const,
    preferredSlug: 'default',
    urlSuffix: '?chapter=1',
  },

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

    title: 'Show each buyer only what they care about',

    description: 'Drag-and-drop branching paths route viewers by their answers. No code.',

    preview: 'flow-editor',

  },

  {

    icon: ChaptersIcon,

    title: 'Buyers always know where they are',

    description: 'Structure tours as clear, navigable chapters they can jump between.',

    preview: 'chapters',

  },

  {

    icon: ChatIcon,

    title: 'Answer questions the moment they arise',

    description: 'Reply live, or let AI handle the common ones so your team chases high-intent leads.',

    preview: 'live-chat',

  },

  {

    icon: CalendarIcon,

    title: 'Run webinars that feel like a live keynote',

    description: 'Registration, countdown lobbies, and automatic go-live — on your schedule.',

    preview: 'events',

  },

  {

    icon: DownloadIcon,

    title: 'Every lead lands in your CRM',

    description: 'Capture details mid-demo and push them to HubSpot, Slack, or email instantly.',

    preview: 'leads',

  },

  {

    icon: SettingsIcon,

    title: 'Demos that look like your website',

    description: 'Match your logo, colours, and fonts so nothing feels third-party.',

    preview: 'branding',

  },

  {

    icon: VideoIcon,

    title: 'Capture intent without pausing the story',

    description: 'Timed pop-ups, polls, and content gates — all inside the player.',

    preview: 'in-video',

  },

  {

    icon: MessageIcon,

    title: 'Respond from tools you already live in',

    description: 'Mirror demo chat into your channels for sales and support.',

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

    ctaEvent: 'pricing_free_trial' as const,

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

    cta: 'Choose Starter',

    ctaEvent: 'pricing_starter' as const,

    plan: 'starter' as const,

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

    cta: 'Choose Pro',

    ctaEvent: 'pricing_pro' as const,

    plan: 'pro' as const,

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

    ctaEvent: 'pricing_enterprise' as const,

    salesContact: true,

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



function padHomeItems<T>(items: T[], count: number): T[] {
  if (items.length === 0) return []
  return Array.from({ length: count }, (_, index) => items[index % items.length])
}

export function LandingPage() {

  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const [data, setData] = useState<HomePageData | null>(null)

  const [error, setError] = useState('')

  const [auth, setAuth] = useState<AuthMeResponse | null>(null)

  const [registrationEvent, setRegistrationEvent] = useState<{ slug: string; title: string } | null>(null)
  const [billingConfigured, setBillingConfigured] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)



  useEffect(() => {

    api.getHome()

      .then(setData)

      .catch(() => setError('Unable to load page content.'))

    api.me()

      .then(setAuth)

      .catch(() => setAuth({ authenticated: false }))

    api.getBillingConfig()

      .then(config => setBillingConfigured(config.configured))

      .catch(() => setBillingConfigured(false))

  }, [])



  useEffect(() => {

    const checkout = searchParams.get('checkout')

    if (checkout === 'success') {

      toast.success('Subscription checkout completed. Welcome to Demo Studio!')

      setSearchParams({}, { replace: true })

    } else if (checkout === 'cancel') {

      toast.toast('Checkout cancelled.', 'info')

      setSearchParams({}, { replace: true })

    }

  }, [searchParams, setSearchParams, toast])



  const brandName = data?.brandName || 'Demo Studio'

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

  const salesMailto = mailtoHref(resolveContactEmail(data?.contact, 'sales'))

  const resolveDemoExampleUrl = (example: typeof DEMO_EXAMPLES[number]) => {
    const flows = data?.flows ?? []
    const match = flows.find(f => f.slug === example.preferredSlug) ?? flows[0]
    if (!match) return null
    return `${match.url}${example.urlSuffix}`
  }

  const demoExampleCards = DEMO_EXAMPLES
    .map(example => ({ example, url: resolveDemoExampleUrl(example) }))
    .filter((item): item is { example: typeof DEMO_EXAMPLES[number]; url: string } => item.url != null)

  const handleCheckout = async (plan: 'starter' | 'pro') => {
    setCheckoutLoading(plan)
    try {
      const { url } = await api.createCheckoutSession(plan)
      window.location.href = url
    } catch {
      toast.error('Unable to start checkout. Please try again or contact support.')
      setCheckoutLoading(null)
    }
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

              <p className="lp-eyebrow">For B2B product demos &amp; webinars</p>

              <h1 className="lp-title">

                Turn product demos into a <span className="lp-accent">lead-qualifying machine</span>

              </h1>

              <p className="lp-subtitle">
                Build branching video demos and live webinars that route each B2B buyer to what matters to them — then push qualified leads straight to your CRM. No dev team, no code.
              </p>

              <div className="lp-hero-actions">

                <Link
                  to="/admin/login"
                  className="lp-btn lp-btn-primary"
                  onClick={() => trackLandingCta('hero_build_demo')}
                >
                  Build your first demo — free
                </Link>

                <Link
                  to="/flow/default"
                  className="lp-btn lp-btn-ghost"
                  onClick={() => trackLandingCta('hero_watch_example')}
                >
                  Watch a live example
                </Link>

              </div>

              <p className="lp-hero-trust-line">14-day free trial · No credit card · Live in minutes</p>

              <LandingTrustStrip logos={data?.trustLogos ?? []} />

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

              Everything you need to turn passive viewers into qualified pipeline — build, brand, publish, and broadcast from one place.

            </p>

            <FeatureExplorer features={FEATURES} />

          </div>

        </section>



        {error && (

          <section className="lp-wrap">

            <p className="lp-error">{error}</p>

          </section>

        )}



        {demoExampleCards.length > 0 && (

          <section className="lp-section lp-section-demos" id="demos">

            <div className="lp-wrap">

              <h2 className="lp-section-title">Available demos</h2>

              <p className="lp-section-sub">See Demo Studio in action — pick how you&apos;d watch it live, on demand, or as a replay.</p>

              <div className="lp-grid lp-grid-demos">

                {demoExampleCards.map(({ example, url }) => (

                    <LandingMediaCard

                      key={example.title}

                      pill={example.pill}

                      pillVariant={example.pillVariant}

                      title={example.title}

                      meta={example.meta}

                      buttonLabel={example.buttonLabel}

                      url={url}

                      previewSeed={example.preferredSlug}

                      previewVariant={example.previewVariant}

                      buttonIcon={example.useLiveIcon ? <LiveIcon /> : undefined}

                    />

                ))}

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

                  {'salesContact' in tier && tier.salesContact ? (
                    salesMailto ? (
                      <a
                        href={salesMailto}
                        className={`lp-btn${tier.featured ? ' lp-btn-primary' : ' lp-btn-ghost'} lp-pricing-cta`}
                        onClick={() => trackLandingCta('pricing_enterprise')}
                      >
                        {tier.cta}
                      </a>
                    ) : (
                      <button
                        type="button"
                        className={`lp-btn${tier.featured ? ' lp-btn-primary' : ' lp-btn-ghost'} lp-pricing-cta`}
                        onClick={() => {
                          trackLandingCta('pricing_enterprise')
                          toast.error('Sales contact email is not configured yet. Add it in Admin → Settings → Marketing.')
                        }}
                      >
                        {tier.cta}
                      </button>
                    )
                  ) : 'plan' in tier && tier.plan && billingConfigured ? (

                    <button
                      type="button"
                      className={`lp-btn${tier.featured ? ' lp-btn-primary' : ' lp-btn-ghost'} lp-pricing-cta`}
                      disabled={checkoutLoading === tier.plan}
                      onClick={() => {
                        trackLandingCta(tier.ctaEvent)
                        handleCheckout(tier.plan!)
                      }}
                    >
                      {checkoutLoading === tier.plan ? 'Redirecting…' : tier.cta}
                    </button>

                  ) : (

                    <Link
                      to={authNav.to}
                      className={`lp-btn${tier.featured ? ' lp-btn-primary' : ' lp-btn-ghost'} lp-pricing-cta`}
                      onClick={() => trackLandingCta(tier.ctaEvent)}
                    >
                      {tier.cta}
                    </Link>

                  )}

                </article>

              ))}

            </div>

          </div>

        </section>

      </main>



      <LandingEventRegistrationModal
        open={registrationEvent !== null}
        eventSlug={registrationEvent?.slug ?? ''}
        eventTitle={registrationEvent?.title ?? ''}
        onClose={() => setRegistrationEvent(null)}
      />

      <LandingFooter
        brandName={brandName}
        auth={auth}
        showDemos={demoExampleCards.length > 0}
        showEvents={events.length > 0}
      />

    </div>

  )

}


