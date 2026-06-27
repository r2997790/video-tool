import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { api } from '../../api'
import { getPostLoginPath } from '../../utils/authNav'
import { MarketingPageLayout } from './MarketingPageLayout'

export function SignupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    api.me()
      .then(res => {
        if (res.authenticated) navigate(getPostLoginPath(res), { replace: true })
      })
      .catch(() => {})
      .finally(() => setCheckingAuth(false))
  }, [navigate])

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
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!agreed) {
      setError('Please accept the terms to continue.')
      return
    }

    setSubmitting(true)
    try {
      const res = await api.register({ name: name.trim(), email: email.trim(), company: company.trim(), password })
      navigate(getPostLoginPath({ authenticated: true, ...res }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (checkingAuth) {
    return (
      <MarketingPageLayout eyebrow="Get started" title="Create your account" subtitle="Loading…">
        <div className="lp-marketing-card lp-marketing-loading">Loading…</div>
      </MarketingPageLayout>
    )
  }

  return (
    <MarketingPageLayout
      eyebrow="Get started"
      title="Start your free trial"
      subtitle="14 days full access. No credit card required."
    >
      <div className="lp-marketing-card">
        {error && <p className="lp-marketing-error">{error}</p>}

        <form className="lp-marketing-form" onSubmit={submit}>
          <div className="lp-marketing-field">
            <label htmlFor="signup-name">Full name</label>
            <input
              id="signup-name"
              className="lp-marketing-input"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
              placeholder="Jane Smith"
            />
          </div>

          <div className="lp-marketing-field">
            <label htmlFor="signup-email">Work email</label>
            <input
              id="signup-email"
              className="lp-marketing-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@company.com"
            />
          </div>

          <div className="lp-marketing-field">
            <label htmlFor="signup-company">Company</label>
            <input
              id="signup-company"
              className="lp-marketing-input"
              value={company}
              onChange={e => setCompany(e.target.value)}
              autoComplete="organization"
              placeholder="Your company"
            />
          </div>

          <div className="lp-marketing-field">
            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              className="lp-marketing-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="lp-marketing-field">
            <label htmlFor="signup-confirm">Confirm password</label>
            <input
              id="signup-confirm"
              className="lp-marketing-input"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <label className="lp-marketing-checkbox">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            <span>
              I agree to the{' '}
              <Link to="/terms" target="_blank" rel="noopener noreferrer">Terms & Conditions</Link>
              {' '}and{' '}
              <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>
            </span>
          </label>

          <button type="submit" className="lp-btn lp-btn-primary lp-marketing-submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="lp-marketing-footnote">
          Already have an account? <Link to="/admin/login">Sign in</Link>
        </p>
      </div>
    </MarketingPageLayout>
  )
}
