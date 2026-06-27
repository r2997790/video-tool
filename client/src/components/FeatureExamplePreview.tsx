import { HELP_IMAGE_URLS } from '../helpImages'

export type FeaturePreviewKind =
  | 'flow-editor'
  | 'chapters'
  | 'live-chat'
  | 'events'
  | 'leads'
  | 'branding'
  | 'in-video'
  | 'integrations'

const SVG_PREVIEWS: Partial<Record<FeaturePreviewKind, string>> = {
  'flow-editor': HELP_IMAGE_URLS.flowEditor,
  chapters: HELP_IMAGE_URLS.publicDemo,
  'live-chat': HELP_IMAGE_URLS.liveChat,
  events: HELP_IMAGE_URLS.eventSetup,
  branding: HELP_IMAGE_URLS.settingsTheme,
}

type FeatureExamplePreviewProps = {
  kind: FeaturePreviewKind
  title: string
}

export function FeatureExamplePreview({ kind, title }: FeatureExamplePreviewProps) {
  const svgSrc = SVG_PREVIEWS[kind]

  if (svgSrc) {
    return (
      <div className="lp-feature-preview">
        <img src={svgSrc} alt={`Example: ${title}`} className="lp-feature-preview-img" />
      </div>
    )
  }

  return (
    <div className="lp-feature-preview">
      <div className={`lp-feature-preview-mock lp-feature-preview-mock-${kind}`} aria-hidden>
        {kind === 'leads' && <LeadsMock />}
        {kind === 'in-video' && <InVideoMock />}
        {kind === 'integrations' && <IntegrationsMock />}
      </div>
    </div>
  )
}

function LeadsMock() {
  return (
    <>
      <div className="lp-mock-player" />
      <div className="lp-mock-gate">
        <p className="lp-mock-gate-title">Continue watching</p>
        <p className="lp-mock-gate-sub">Enter your details to unlock the next chapter.</p>
        <div className="lp-mock-field" />
        <div className="lp-mock-field" />
        <div className="lp-mock-btn">Submit</div>
        <span className="lp-mock-badge">Webhook → CRM</span>
      </div>
    </>
  )
}

function InVideoMock() {
  return (
    <>
      <div className="lp-mock-player">
        <span className="lp-mock-play">▶</span>
      </div>
      <div className="lp-mock-toaster">
        <p className="lp-mock-toaster-title">Quick question</p>
        <p className="lp-mock-toaster-sub">Which plan fits your team best?</p>
        <div className="lp-mock-toaster-options">
          <span>Starter</span>
          <span>Pro</span>
          <span>Enterprise</span>
        </div>
      </div>
    </>
  )
}

function IntegrationsMock() {
  return (
    <>
      <div className="lp-mock-chat-col">
        <p className="lp-mock-chat-head">Live Chat</p>
        <div className="lp-mock-chat-bubble">Can we integrate with our CRM?</div>
        <div className="lp-mock-chat-bubble lp-mock-chat-bubble-reply">Yes — leads sync automatically.</div>
      </div>
      <div className="lp-mock-integrations">
        <span className="lp-mock-pill lp-mock-pill-slack">Slack</span>
        <span className="lp-mock-pill lp-mock-pill-teams">Teams</span>
        <div className="lp-mock-sync-line" />
        <div className="lp-mock-chat-bubble lp-mock-chat-bubble-muted">New lead from demo…</div>
      </div>
    </>
  )
}
