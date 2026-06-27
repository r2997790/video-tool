import { LegalPageLayout, useLegalContact } from './LegalPageLayout'
import { mailtoHref, resolveContactEmail } from '../../utils/contactEmail'

function LegalContactLink({ kind, label }: { kind: 'legal' | 'privacy' | 'dpo'; label: string }) {
  const contact = useLegalContact()
  const email = resolveContactEmail(contact, kind)
  const href = mailtoHref(email)
  if (!href) return <span>{label} (configure in admin settings)</span>
  return <a href={href}>{email}</a>
}

export function TermsPage() {
  return (
    <LegalPageLayout title="Terms & Conditions">
      <p className="lp-legal-lead">
        These terms and conditions govern your use of Demo Studio and related services.
        This is placeholder content and should be replaced with lawyer-reviewed text before production.
      </p>

      <h2>1. Acceptance of terms</h2>
      <p>
        By accessing or using Demo Studio, you agree to be bound by these Terms & Conditions.
        If you do not agree, do not use the service.
      </p>

      <h2>2. Service description</h2>
      <p>
        Demo Studio provides an interactive video demo platform including flow editing, live events,
        chat, analytics, and related features. We may modify, suspend, or discontinue features at any time.
      </p>

      <h2>3. Accounts and access</h2>
      <p>
        You are responsible for maintaining the confidentiality of your account credentials and for all
        activity under your account. You must provide accurate registration information and notify us
        promptly of any unauthorized use.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the service for unlawful, harmful, or abusive purposes</li>
        <li>Upload content that infringes third-party intellectual property rights</li>
        <li>Attempt to interfere with or disrupt the platform or its infrastructure</li>
        <li>Reverse engineer or scrape the service except where permitted by law</li>
      </ul>

      <h2>5. Intellectual property</h2>
      <p>
        Demo Studio, its branding, and platform software remain our property or that of our licensors.
        You retain ownership of content you upload, and grant us a limited license to host and display
        it solely to provide the service.
      </p>

      <h2>6. Subscriptions and billing</h2>
      <p>
        Paid plans are billed according to the pricing shown at checkout. Subscriptions renew automatically
        unless cancelled. Refunds are handled in accordance with applicable law and our billing policies.
      </p>

      <h2>7. Disclaimer</h2>
      <p>
        The service is provided &quot;as is&quot; without warranties of any kind, except where required by law.
        We do not guarantee uninterrupted availability or error-free operation.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, we are not liable for indirect, incidental, special,
        or consequential damages arising from your use of the service.
      </p>

      <h2>9. Governing law</h2>
      <p>
        These terms are governed by the laws of the jurisdiction in which Demo Studio operates,
        without regard to conflict-of-law principles.
      </p>

      <p className="lp-legal-contact">
        Questions? Contact <LegalContactLink kind="legal" label="legal contact" />
      </p>
    </LegalPageLayout>
  )
}
