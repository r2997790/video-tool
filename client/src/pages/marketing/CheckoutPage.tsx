import { useEffect, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'

import { api } from '../../api'
import { trackLandingCta } from '../../utils/landingAnalytics'
import { MarketingPageLayout } from './MarketingPageLayout'

const PLANS = {
  starter: {
    name: 'Starter',
    price: '$49',
    period: '/ month',
    highlights: [
      '3 published flows',
      '1 live event per month',
      'Basic analytics',
      'Email support',
    ],
  },
  pro: {
    name: 'Pro',
    price: '$149',
    period: '/ month',
    highlights: [
      'Unlimited flows and events',
      'AI chat assistance',
      'Slack and Teams integrations',
      'Lead webhooks',
      'Priority support',
    ],
  },
} as const

type PlanId = keyof typeof PLANS

function isPlanId(value: string | undefined): value is PlanId {
  return value === 'starter' || value === 'pro'
}

export function CheckoutPage() {
  const { plan: planParam } = useParams<{ plan: string }>()
  const [searchParams] = useSearchParams()
  const cancelled = searchParams.get('cancelled') === '1'

  const [billingConfigured, setBillingConfigured] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isPlanId(planParam)) {
    return <Navigate to="/#pricing" replace />
  }

  const plan = PLANS[planParam]

  useEffect(() => {
    api.getBillingConfig()
      .then(config => setBillingConfigured(config.configured))
      .catch(() => setBillingConfigured(false))
  }, [])

  const startCheckout = async () => {
    setError('')
    setLoading(true)
    trackLandingCta(planParam === 'starter' ? 'pricing_starter' : 'pricing_pro')

    const origin = window.location.origin
    try {
      const { url } = await api.createCheckoutSession(planParam, {
        successUrl: `${origin}/?checkout=success`,
        cancelUrl: `${origin}/checkout/${planParam}?cancelled=1`,
      })
      window.location.href = url
    } catch {
      setError('Unable to start checkout. Payment may not be configured yet — contact sales for help.')
      setLoading(false)
    }
  }

  return (
    <MarketingPageLayout
      eyebrow="Checkout"
      title={`Subscribe to ${plan.name}`}
      subtitle="Review your plan, then continue to secure payment."
    >
      <div className="lp-marketing-card lp-checkout-card">
        {cancelled && (
          <p className="lp-marketing-notice">Checkout was cancelled. You can try again when you are ready.</p>
        )}

        <div className="lp-checkout-summary">
          <div className="lp-checkout-price">
            <span className="lp-checkout-amount">{plan.price}</span>
            <span className="lp-checkout-period">{plan.period}</span>
          </div>

          <ul className="lp-checkout-highlights">
            {plan.highlights.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {error && <p className="lp-marketing-error">{error}</p>}

        {billingConfigured === false && !error && (
          <p className="lp-marketing-notice">
            Online payment is not available yet.{' '}
            <Link to="/sales">Talk to sales</Link> and we will help you get set up.
          </p>
        )}

        <div className="lp-checkout-actions">
          <button
            type="button"
            className="lp-btn lp-btn-primary lp-marketing-submit"
            disabled={loading || billingConfigured === false || billingConfigured === null}
            onClick={startCheckout}
          >
            {loading ? 'Redirecting to payment…' : 'Continue to secure payment'}
          </button>

          <Link to="/#pricing" className="lp-btn lp-btn-ghost lp-marketing-secondary">
            Back to pricing
          </Link>
        </div>

        <p className="lp-marketing-footnote">
          Prefer a custom plan? <Link to="/sales">Contact sales</Link>
        </p>
      </div>
    </MarketingPageLayout>
  )
}
