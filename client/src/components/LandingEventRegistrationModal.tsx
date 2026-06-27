import { useEffect, useRef, useState } from 'react'
import { api, getSessionId } from '../api'
import type { Gate, GateQuestion, ScheduledEventPublic } from '../types'
import { CancelIcon, CheckIcon } from './icons/uiIcons'

const EMAIL_KEY_PREFIX = 'videotool_event_email_'

type LandingEventRegistrationModalProps = {
  open: boolean
  eventSlug: string
  eventTitle: string
  onClose: () => void
}

export function LandingEventRegistrationModal({
  open,
  eventSlug,
  eventTitle,
  onClose,
}: LandingEventRegistrationModalProps) {
  const sessionId = getSessionId()
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const [eventData, setEventData] = useState<ScheduledEventPublic | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!open || !eventSlug) return

    setLoading(true)
    setLoadError('')
    setEventData(null)
    setAnswers({})
    setError('')
    setSubmitted(false)

    api.getScheduledEvent(eventSlug, sessionId)
      .then(setEventData)
      .catch(() => setLoadError('Unable to load registration form. Please try again.'))
      .finally(() => setLoading(false))
  }, [open, eventSlug])

  useEffect(() => {
    if (!open) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtnRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const form = eventData?.registrationForm as Gate | null | undefined
  const heading = form?.heading || eventData?.holdingHeading || `Register for ${eventTitle}`
  const subtext = form?.subtext || eventData?.holdingMessage || 'Save your seat and we will send joining details before the session starts.'

  const defaultQuestions: GateQuestion[] = [
    { id: 'name', label: 'Full name', type: 'text', required: true, placeholder: 'Your name' },
    { id: 'email', label: 'Work email', type: 'email', required: true, placeholder: 'you@company.com' },
  ]

  const questions = form?.questions?.length ? form.questions : defaultQuestions

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventSlug) return
    setError('')

    const emailField = questions.find(q => q.type === 'email')?.id ?? 'email'
    const email = answers[emailField] || answers.email || ''
    if (!email.includes('@')) {
      setError('Please enter a valid email.')
      return
    }

    setSubmitting(true)
    try {
      await api.registerForEvent(eventSlug, {
        sessionId,
        email,
        name: answers.name,
        answersJson: JSON.stringify(answers),
        consentGiven: true,
        locale: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      localStorage.setItem(`${EMAIL_KEY_PREFIX}${eventSlug}`, email)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="lp-event-modal-root is-open" aria-hidden={false}>
      <button
        type="button"
        className="lp-event-modal-backdrop"
        aria-label="Close registration"
        onClick={onClose}
      />
      <div
        className="lp-event-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lp-event-modal-title"
      >
        <header className="lp-event-modal-head">
          <div>
            <p className="lp-event-modal-eyebrow">Upcoming event</p>
            <h2 id="lp-event-modal-title" className="lp-event-modal-title">{eventTitle}</h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="lp-event-modal-close"
            aria-label="Close registration"
            onClick={onClose}
          >
            <CancelIcon />
          </button>
        </header>

        <div className="lp-event-modal-body">
          {loading && <p className="lp-event-modal-status">Loading registration…</p>}
          {loadError && <p className="lp-event-modal-error">{loadError}</p>}

          {!loading && !loadError && submitted && (
            <div className="lp-event-modal-success">
              <CheckIcon />
              <p>You are registered. Check your inbox for confirmation and joining details.</p>
              <button type="button" className="lp-btn lp-btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          )}

          {!loading && !loadError && !submitted && (
            <>
              <h3 className="lp-event-modal-form-title">{heading}</h3>
              {subtext && <p className="lp-event-modal-sub">{subtext}</p>}
              <form className="lp-event-modal-form" onSubmit={submit}>
                {questions.map(q => (
                  <div key={q.id} className="lp-event-modal-field">
                    <label className="lp-event-modal-label" htmlFor={`reg-${q.id}`}>
                      {q.label}{q.required && <span className="lp-event-modal-req"> *</span>}
                    </label>
                    <input
                      id={`reg-${q.id}`}
                      className="lp-event-modal-input"
                      type={q.type === 'email' ? 'email' : 'text'}
                      placeholder={q.placeholder}
                      value={answers[q.id] || ''}
                      onChange={e => {
                        setAnswers(a => ({ ...a, [q.id]: e.target.value }))
                        setError('')
                      }}
                    />
                  </div>
                ))}
                {error && <p className="lp-event-modal-error">{error}</p>}
                <button
                  type="submit"
                  className="lp-btn lp-btn-primary lp-btn-with-icon lp-event-modal-submit"
                  disabled={submitting}
                >
                  <CheckIcon />
                  {submitting ? 'Registering…' : 'Register'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
