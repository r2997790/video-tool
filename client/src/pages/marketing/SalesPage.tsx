import { useState } from 'react'
import { Link } from 'react-router-dom'

import { api, getSessionId } from '../../api'
import { trackLandingCta } from '../../utils/landingAnalytics'
import { MarketingPageLayout } from './MarketingPageLayout'

const TEAM_SIZES = [
  '1–10',
  '11–50',
  '51–200',
  '201–1,000',
  '1,000+',
]

export function SalesPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [teamSize, setTeamSize] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Please enter your name.')
      return
    }
    if (!email.includes('@')) {
      setError('Please enter a valid work email.')
      return
    }
    if (!company.trim()) {
      setError('Please enter your company name.')
      return
    }
    if (!message.trim()) {
      setError('Please tell us what you are looking for.')
      return
    }

    setSubmitting(true)
    try {
      await api.submitSalesInquiry({
        sessionId: getSessionId(),
        name: name.trim(),
        email: email.trim(),
        company: company.trim(),
        teamSize: teamSize || undefined,
        phone: phone.trim() || undefined,
        message: message.trim(),
      })
      trackLandingCta('pricing_enterprise')
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit your request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <MarketingPageLayout
      eyebrow="Enterprise"
      title="Talk to sales"
      subtitle="Tell us about your team and goals. We will follow up with pricing and a tailored demo."
    >
      <div className="lp-marketing-card">
        {submitted ? (
          <div className="lp-marketing-success">
            <h2>Thanks — we have your details</h2>
            <p>Our sales team will reach out shortly to discuss enterprise pricing and onboarding.</p>
            <Link to="/" className="lp-btn lp-btn-primary">Back to home</Link>
          </div>
        ) : (
          <>
            {error && <p className="lp-marketing-error">{error}</p>}

            <form className="lp-marketing-form" onSubmit={submit}>
              <div className="lp-marketing-field">
                <label htmlFor="sales-name">Full name</label>
                <input
                  id="sales-name"
                  className="lp-marketing-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>

              <div className="lp-marketing-field">
                <label htmlFor="sales-email">Work email</label>
                <input
                  id="sales-email"
                  className="lp-marketing-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="lp-marketing-field">
                <label htmlFor="sales-company">Company</label>
                <input
                  id="sales-company"
                  className="lp-marketing-input"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  autoComplete="organization"
                />
              </div>

              <div className="lp-marketing-field">
                <label htmlFor="sales-team">Team size</label>
                <select
                  id="sales-team"
                  className="lp-marketing-input"
                  value={teamSize}
                  onChange={e => setTeamSize(e.target.value)}
                >
                  <option value="">Select…</option>
                  {TEAM_SIZES.map(size => (
                    <option key={size} value={size}>{size} people</option>
                  ))}
                </select>
              </div>

              <div className="lp-marketing-field">
                <label htmlFor="sales-phone">Phone (optional)</label>
                <input
                  id="sales-phone"
                  className="lp-marketing-input"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  autoComplete="tel"
                />
              </div>

              <div className="lp-marketing-field">
                <label htmlFor="sales-message">What are you looking to achieve?</label>
                <textarea
                  id="sales-message"
                  className="lp-marketing-input lp-marketing-textarea"
                  rows={4}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="SSO, custom branding, onboarding for a global team…"
                />
              </div>

              <button type="submit" className="lp-btn lp-btn-primary lp-marketing-submit" disabled={submitting}>
                {submitting ? 'Sending…' : 'Submit inquiry'}
              </button>
            </form>
          </>
        )}
      </div>
    </MarketingPageLayout>
  )
}
