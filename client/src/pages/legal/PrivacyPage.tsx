import { LegalPageLayout, useLegalContact } from './LegalPageLayout'
import { mailtoHref, resolveContactEmail } from '../../utils/contactEmail'

function PrivacyContactLink() {
  const contact = useLegalContact()
  const email = resolveContactEmail(contact, 'privacy')
  const href = mailtoHref(email)
  if (!href) return <span>Privacy enquiries (configure in admin settings)</span>
  return <a href={href}>{email}</a>
}

export function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy">
      <p className="lp-legal-lead">
        This Privacy Policy explains how Demo Studio collects, uses, and protects personal information.
        This is placeholder content and should be replaced with lawyer-reviewed text before production.
      </p>

      <h2>1. Information we collect</h2>
      <p>We may collect:</p>
      <ul>
        <li>Account details such as name, email address, and organisation</li>
        <li>Usage data including demo views, chat interactions, and analytics events</li>
        <li>Event registration information submitted by attendees</li>
        <li>Technical data such as IP address, browser type, and device information</li>
      </ul>

      <h2>2. How we use information</h2>
      <p>We use personal information to:</p>
      <ul>
        <li>Provide, operate, and improve Demo Studio</li>
        <li>Authenticate users and manage subscriptions</li>
        <li>Send service-related communications</li>
        <li>Generate analytics and insights for account holders</li>
        <li>Comply with legal obligations</li>
      </ul>

      <h2>3. Cookies and tracking</h2>
      <p>
        We use cookies and similar technologies for authentication, preferences, and analytics.
        You can control non-essential cookies through your browser settings, though some features
        may not function correctly without them.
      </p>

      <h2>4. Sharing with third parties</h2>
      <p>
        We may share data with service providers who help us operate the platform (such as hosting,
        payment processing, and email delivery). We do not sell personal information.
      </p>

      <h2>5. Data retention</h2>
      <p>
        We retain personal information for as long as needed to provide the service, fulfil contractual
        obligations, resolve disputes, and comply with legal requirements.
      </p>

      <h2>6. Security</h2>
      <p>
        We implement reasonable technical and organisational measures to protect personal information.
        No method of transmission or storage is completely secure.
      </p>

      <h2>7. Your rights</h2>
      <p>
        Depending on your location, you may have rights to access, correct, delete, or restrict processing
        of your personal information. See our GDPR page for additional EU/EEA rights.
      </p>

      <h2>8. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes will be posted on this page
        with an updated effective date.
      </p>

      <p className="lp-legal-contact">
        Privacy enquiries: <PrivacyContactLink />
      </p>
    </LegalPageLayout>
  )
}
