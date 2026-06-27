import { Link } from 'react-router-dom'

import { LegalPageLayout, useLegalContact } from './LegalPageLayout'
import { mailtoHref, resolveContactEmail } from '../../utils/contactEmail'

function DpoContactLink() {
  const contact = useLegalContact()
  const email = resolveContactEmail(contact, 'dpo')
  const href = mailtoHref(email)
  if (!href) return <span>our Data Protection Officer (configure in admin settings)</span>
  return <a href={href}>{email}</a>
}

export function GdprPage() {
  return (
    <LegalPageLayout title="GDPR Information">
      <p className="lp-legal-lead">
        This page summarises how Demo Studio processes personal data under the EU General Data Protection
        Regulation (GDPR). This is placeholder content and should be replaced with lawyer-reviewed text
        before production.
      </p>

      <h2>1. Data controller</h2>
      <p>
        Demo Studio acts as the data controller for personal data collected through our platform.
        For customer-hosted demos and events, the account holder may act as an independent controller
        for attendee data they collect.
      </p>

      <h2>2. Lawful bases for processing</h2>
      <p>We process personal data on the following bases:</p>
      <ul>
        <li><strong>Contract</strong> — to provide the service you signed up for</li>
        <li><strong>Legitimate interests</strong> — to secure, improve, and analyse the platform</li>
        <li><strong>Consent</strong> — for optional marketing or non-essential cookies where required</li>
        <li><strong>Legal obligation</strong> — where we must retain or disclose data by law</li>
      </ul>

      <h2>3. International transfers</h2>
      <p>
        Personal data may be processed in countries outside the EEA. Where required, we use appropriate
        safeguards such as Standard Contractual Clauses or equivalent mechanisms.
      </p>

      <h2>4. Your GDPR rights</h2>
      <p>If you are in the EU/EEA, you may have the right to:</p>
      <ul>
        <li>Access a copy of your personal data</li>
        <li>Rectify inaccurate or incomplete data</li>
        <li>Erase data in certain circumstances</li>
        <li>Restrict or object to processing</li>
        <li>Data portability for data you provided</li>
        <li>Withdraw consent where processing is consent-based</li>
        <li>Lodge a complaint with your local supervisory authority</li>
      </ul>

      <h2>5. Data retention</h2>
      <p>
        We retain personal data only as long as necessary for the purposes described in our Privacy Policy,
        including to meet legal, accounting, or reporting requirements.
      </p>

      <h2>6. Automated decision-making</h2>
      <p>
        Demo Studio does not use automated decision-making that produces legal or similarly significant
        effects without human review, except where disclosed for specific product features.
      </p>

      <h2>7. Data Protection Officer</h2>
      <p>
        For GDPR-related requests, contact <DpoContactLink />. We aim to respond within 30 days.
      </p>

      <h2>8. Sub-processors</h2>
      <p>
        We use vetted sub-processors for hosting, payments, email, and analytics. A current list is
        available on request for enterprise customers.
      </p>

      <p className="lp-legal-contact">
        Related: see our <Link to="/privacy">Privacy Policy</Link> for general privacy practices.
      </p>
    </LegalPageLayout>
  )
}
