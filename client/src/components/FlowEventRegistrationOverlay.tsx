import { useEffect, useState } from 'react'
import { api, getSessionId } from '../api'
import type { FlowNode, Gate, GateQuestion, ScheduledEventPublic } from '../types'
import { Button } from './Button'

const EMAIL_KEY_PREFIX = 'videotool_event_email_'

interface Props {
  node: FlowNode
  eventData: ScheduledEventPublic | null
  onComplete: () => void
}

export function FlowEventRegistrationOverlay({ node, eventData, onComplete }: Props) {
  const sessionId = getSessionId()
  const slug = (node.parameters.eventSlug as string) || eventData?.slug || ''
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const heading = (node.parameters.heading as string) || eventData?.registrationForm?.heading || 'Register for this event'
  const subtext = (node.parameters.subtext as string) || eventData?.registrationForm?.subtext || ''
  const form = eventData?.registrationForm as Gate | null | undefined

  useEffect(() => {
    if (!eventData) return
    if (!eventData.requiresRegistration) {
      onComplete()
      return
    }
    const storedEmail = slug ? localStorage.getItem(`${EMAIL_KEY_PREFIX}${slug}`) : null
    if (storedEmail && !eventData.accessDenied) {
      onComplete()
    }
  }, [eventData, slug, onComplete])

  if (!eventData) {
    return (
      <div className="vd-gate-overlay">
        <div className="vd-gate-card">
          <p className="vd-loading">Loading event…</p>
        </div>
      </div>
    )
  }

  if (!eventData.requiresRegistration) return null

  const storedEmail = slug ? localStorage.getItem(`${EMAIL_KEY_PREFIX}${slug}`) : null
  if (storedEmail && !eventData.accessDenied) return null

  if (!form?.questions?.length) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug) { setError('No event selected.'); return }
    setError('')
    const emailField = form.questions.find((q: GateQuestion) => q.type === 'email')?.id ?? 'email'
    const email = answers[emailField] || answers.email || ''
    if (!email.includes('@')) { setError('Please enter a valid email.'); return }

    setSubmitting(true)
    try {
      await api.registerForEvent(slug, {
        sessionId,
        email,
        name: answers.name,
        answersJson: JSON.stringify(answers),
        consentGiven: true,
        locale: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      localStorage.setItem(`${EMAIL_KEY_PREFIX}${slug}`, email)
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="vd-gate-overlay" role="dialog" aria-modal="true">
      <div className="vd-gate-card vd-gate-card-wide">
        <h3 className="vd-gate-heading">{heading}</h3>
        {subtext && <p className="vd-gate-sub">{subtext}</p>}
        <form className="vd-gate-form" onSubmit={submit}>
          {form.questions.map(q => (
            <div key={q.id} className="vd-gate-field">
              <label className="vd-gate-label">
                {q.label}{q.required && <span className="vd-req-star"> *</span>}
              </label>
              <input
                className="vd-gate-input"
                type={q.type === 'email' ? 'email' : 'text'}
                placeholder={q.placeholder}
                value={answers[q.id] || ''}
                onChange={e => { setAnswers(a => ({ ...a, [q.id]: e.target.value })); setError('') }}
              />
            </div>
          ))}
          {error && <p className="vd-gate-error">{error}</p>}
          <div className="vd-gate-actions">
            <Button variant="green" type="submit" disabled={submitting}>
              {submitting ? 'Registering…' : 'Register'}
            </Button>
          </div>
        </form>
        <p className="vd-gate-sub" style={{ marginTop: 12, fontSize: '0.85rem' }}>
          Event lobby and countdown are configured in Events admin.
        </p>
      </div>
    </div>
  )
}
