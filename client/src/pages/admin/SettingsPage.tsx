import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import { AdminFieldLabel } from '../../components/AdminFieldLabel'
import { ThemePreview } from '../../components/ThemePreview'
import { useToast } from '../../components/Toast'
import { HELP } from '../../adminHelpText'
import { EventAccessSettings } from './EventAccessSettings'

const THEME_FIELDS = [
  { key: 'themePrimaryColor', label: 'Primary color', type: 'color', help: HELP.settings.themePrimaryColor },
  { key: 'themeAccentColor', label: 'Accent color', type: 'color', help: HELP.settings.themeAccentColor },
  { key: 'themeBackgroundColor', label: 'Background color', type: 'color', help: HELP.settings.themeBackgroundColor },
  { key: 'themeSurfaceColor', label: 'Surface color', type: 'color', help: HELP.settings.themeSurfaceColor },
  { key: 'themeTextColor', label: 'Text color', type: 'color', help: HELP.settings.themeTextColor },
  { key: 'themeFontFamily', label: 'Font family', type: 'text', help: HELP.settings.themeFontFamily },
  { key: 'themeBrandName', label: 'Brand name', type: 'text', help: HELP.settings.themeBrandName },
  { key: 'themeChatTitle', label: 'Chat panel title', type: 'text', help: HELP.settings.themeChatTitle },
] as const

const TOGGLES = [
  { key: 'autoplay', label: 'Autoplay', help: HELP.settings.autoplay },
  { key: 'showDuration', label: 'Show duration', help: HELP.settings.showDuration },
  { key: 'chatEnabled', label: 'Chat', help: HELP.settings.chatEnabled },
  { key: 'aiEnabled', label: 'AI', help: HELP.settings.aiEnabled },
  { key: 'notificationsEnabled', label: 'Notifications', help: HELP.settings.notificationsEnabled },
  { key: 'liveChatEnabled', label: 'Live chat', help: HELP.settings.liveChatEnabled },
  { key: 'seedChatEnabled', label: 'Seed chat', help: HELP.settings.seedChatEnabled },
  { key: 'chapterPickEnabled', label: 'Chapter pick', help: HELP.settings.chapterPickEnabled },
  { key: 'pauseEnabled', label: 'Pause', help: HELP.settings.pauseEnabled },
] as const

function buildPayload(config: Record<string, unknown>) {
  return {
    autoplay: config.autoplay,
    showDuration: config.showDuration,
    chatEnabled: config.chatEnabled,
    aiEnabled: config.aiEnabled,
    notificationsEnabled: config.notificationsEnabled,
    liveChatEnabled: config.liveChatEnabled,
    seedChatEnabled: config.seedChatEnabled,
    chapterPickEnabled: config.chapterPickEnabled,
    pauseEnabled: config.pauseEnabled,
    aiSystemPrompt: config.aiSystemPrompt,
    themePrimaryColor: config.themePrimaryColor,
    themeAccentColor: config.themeAccentColor,
    themeBackgroundColor: config.themeBackgroundColor,
    themeSurfaceColor: config.themeSurfaceColor,
    themeTextColor: config.themeTextColor,
    themeFontFamily: config.themeFontFamily,
    themeBrandName: config.themeBrandName,
    themeChatTitle: config.themeChatTitle,
    themeLogoUrl: config.themeLogoUrl ?? '',
    demoChatSubtitle: config.demoChatSubtitle ?? '',
    slackEnabled: config.slackEnabled,
    slackChannelId: config.slackChannelId ?? '',
    teamsEnabled: config.teamsEnabled,
    teamsServiceUrl: config.teamsServiceUrl ?? '',
    leadWebhookUrl: config.leadWebhookUrl ?? '',
    leadNotifyEmail: config.leadNotifyEmail ?? '',
    attendeeWebhookUrl: config.attendeeWebhookUrl ?? '',
    blockedEmailDomainsJson: config.blockedEmailDomainsJson ?? '[]',
  }
}

export function SettingsPage() {
  const [config, setConfig] = useState<Record<string, unknown> | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState('')
  const [integrationStatus, setIntegrationStatus] = useState<Record<string, boolean> | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    api.getAdminConfig().then(c => {
      setConfig(c)
      setSavedSnapshot(JSON.stringify(buildPayload(c)))
    })
    api.getIntegrationsStatus().then(setIntegrationStatus).catch(() => setIntegrationStatus(null))
  }, [])

  const dirty = useMemo(() => {
    if (!config) return false
    return JSON.stringify(buildPayload(config)) !== savedSnapshot
  }, [config, savedSnapshot])

  if (!config) {
    return (
      <>
        <div className="admin-skeleton" style={{ width: 180, height: 28, marginBottom: 16 }} />
        <div className="admin-skeleton" style={{ height: 200 }} />
      </>
    )
  }

  const toggle = (key: string) => setConfig(c => ({ ...c!, [key]: !c![key] }))

  const save = async () => {
    setSaving(true)
    try {
      await api.updateAdminConfig(buildPayload(config))
      setSavedSnapshot(JSON.stringify(buildPayload(config)))
      toast.success('Settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const uploadLogo = async (file: File) => {
    setLogoUploading(true)
    try {
      const { url } = await api.uploadMedia(file)
      setConfig(c => ({ ...c!, themeLogoUrl: url }))
      toast.success('Logo uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLogoUploading(false)
    }
  }

  const statusOk = (key: string) => integrationStatus?.[key] ? 'Configured' : 'Ask IT to configure'

  return (
    <>
      <h2>Settings</h2>

      <div className="admin-scope-banner">
        These settings apply to <strong>every flow</strong> on this deployment — theme, chat toggles, AI, and integrations.
        Per-flow videos, scripts, and pop-ups are edited under each flow.
      </div>

      <div className="admin-settings-layout">
        <div className="admin-settings-main">
          <div className="admin-card">
            <h3 style={{ marginTop: 0 }}>Demo behavior</h3>
            {TOGGLES.map(t => (
              <div key={t.key} className="admin-toggle">
                <AdminFieldLabel label={t.label} help={t.help} inline />
                <input type="checkbox" checked={!!config[t.key]} onChange={() => toggle(t.key)} />
              </div>
            ))}
            <div style={{ marginTop: 20 }}>
              <AdminFieldLabel label="AI System Prompt" help={HELP.settings.aiSystemPrompt}>
                <textarea
                  className="admin-textarea"
                  value={(config.aiSystemPrompt as string) || ''}
                  onChange={e => setConfig(c => ({ ...c!, aiSystemPrompt: e.target.value }))}
                />
              </AdminFieldLabel>
            </div>
            <AdminFieldLabel label="Chat subtitle" help="Shown under the chat panel title in the public demo">
              <input
                className="admin-input"
                value={(config.demoChatSubtitle as string) || ''}
                placeholder="Questions about the demo, products, or services"
                onChange={e => setConfig(c => ({ ...c!, demoChatSubtitle: e.target.value }))}
              />
            </AdminFieldLabel>
          </div>

          <div className="admin-card" style={{ marginTop: 24 }}>
            <h3 style={{ marginTop: 0 }}>Theme</h3>
            <AdminFieldLabel label="Demo logo" help={HELP.settings.themeLogoUrl}>
              <input
                className="admin-input"
                value={(config.themeLogoUrl as string) || ''}
                placeholder="Logo URL"
                onChange={e => setConfig(c => ({ ...c!, themeLogoUrl: e.target.value }))}
              />
              <input type="file" accept="image/*" style={{ marginTop: 8 }}
                disabled={logoUploading}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f) }} />
              {logoUploading && <span style={{ fontSize: 12, color: '#9b9d9f' }}>Uploading…</span>}
            </AdminFieldLabel>
            <div className="admin-theme-grid">
              {THEME_FIELDS.map(f => (
                <AdminFieldLabel key={f.key} label={f.label} help={f.help}>
                  {f.type === 'color' ? (
                    <input
                      type="color"
                      className="admin-color-input"
                      value={(config[f.key] as string) || '#000000'}
                      onChange={e => setConfig(c => ({ ...c!, [f.key]: e.target.value }))}
                    />
                  ) : (
                    <input
                      className="admin-input"
                      value={(config[f.key] as string) || ''}
                      onChange={e => setConfig(c => ({ ...c!, [f.key]: e.target.value }))}
                    />
                  )}
                </AdminFieldLabel>
              ))}
            </div>
          </div>

          <div className="admin-card" style={{ marginTop: 24 }}>
            <h3 style={{ marginTop: 0 }}>Lead capture</h3>
            <p style={{ color: '#9b9d9f', fontSize: 13, marginTop: 0 }}>
              Optional notifications when a prospect submits a gate or form in the demo.
            </p>
            <AdminFieldLabel label="Webhook URL" help="POST JSON payload on each new lead">
              <input
                className="admin-input"
                value={(config.leadWebhookUrl as string) || ''}
                placeholder="https://hooks.example.com/leads"
                onChange={e => setConfig(c => ({ ...c!, leadWebhookUrl: e.target.value }))}
              />
            </AdminFieldLabel>
            <AdminFieldLabel label="Notify email" help="Requires SMTP_HOST env var on the server">
              <input
                className="admin-input"
                value={(config.leadNotifyEmail as string) || ''}
                placeholder="sales@company.com"
                onChange={e => setConfig(c => ({ ...c!, leadNotifyEmail: e.target.value }))}
              />
            </AdminFieldLabel>
          </div>

          <div className="admin-card" style={{ marginTop: 24 }}>
            <h3 style={{ marginTop: 0 }}>Event registrations</h3>
            <AdminFieldLabel label="Registration webhook URL" help="POST JSON when someone registers for an event">
              <input className="admin-input" value={(config.attendeeWebhookUrl as string) || ''}
                placeholder="https://hooks.example.com/event-registrations"
                onChange={e => setConfig(c => ({ ...c!, attendeeWebhookUrl: e.target.value }))} />
            </AdminFieldLabel>
            <AdminFieldLabel label="Blocked email domains (JSON array)" help="e.g. [&quot;gmail.com&quot;,&quot;yahoo.com&quot;] — non-work emails">
              <textarea className="admin-textarea" rows={2} value={(config.blockedEmailDomainsJson as string) || '[]'}
                onChange={e => setConfig(c => ({ ...c!, blockedEmailDomainsJson: e.target.value }))} />
            </AdminFieldLabel>
          </div>

          <EventAccessSettings />

          <div className="admin-card" style={{ marginTop: 24 }}>
            <h3 style={{ marginTop: 0 }}>Integrations</h3>
            <p style={{ color: '#9b9d9f', fontSize: 13, marginTop: 0 }}>
              Connect Slack or Microsoft Teams for live chat relay. Ask your IT team to configure credentials on the server — no secrets are stored in the admin UI.
            </p>
            <details className="admin-advanced-details">
              <summary>Advanced: server configuration</summary>
              <p style={{ fontSize: 12, color: '#9b9d9f' }}>
                Slack: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET · Teams: MICROSOFT_APP_ID, MICROSOFT_APP_PASSWORD · Email: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
              </p>
            </details>
            <div className="admin-toggle">
              <AdminFieldLabel label="Slack enabled" help={HELP.settings.slackEnabled} inline />
              <input type="checkbox" checked={!!config.slackEnabled} onChange={() => toggle('slackEnabled')} />
            </div>
            <AdminFieldLabel label="Slack default channel ID" help={HELP.settings.slackChannelId}>
              <input className="admin-input" value={(config.slackChannelId as string) || ''}
                placeholder="C0123456789"
                onChange={e => setConfig(c => ({ ...c!, slackChannelId: e.target.value }))} />
            </AdminFieldLabel>
            <p style={{ fontSize: 12, color: '#9b9d9f', margin: '8px 0 16px' }}>
              Slack bot token: {statusOk('slackBotTokenConfigured')}
              {' · '}Signing secret: {statusOk('slackSigningSecretConfigured')}
            </p>

            <div className="admin-toggle">
              <AdminFieldLabel label="Microsoft Teams enabled" help={HELP.settings.teamsEnabled} inline />
              <input type="checkbox" checked={!!config.teamsEnabled} onChange={() => toggle('teamsEnabled')} />
            </div>
            <AdminFieldLabel label="Teams service URL override" help={HELP.settings.teamsServiceUrl}>
              <input className="admin-input" value={(config.teamsServiceUrl as string) || ''}
                placeholder="Usually derived from bot activity"
                onChange={e => setConfig(c => ({ ...c!, teamsServiceUrl: e.target.value }))} />
            </AdminFieldLabel>
            <p style={{ fontSize: 12, color: '#9b9d9f', margin: '8px 0 0' }}>
              Teams app ID: {statusOk('teamsAppIdConfigured')}
              {' · '}App password: {statusOk('teamsAppPasswordConfigured')}
            </p>
          </div>
        </div>

        <aside className="admin-settings-preview">
          <p className="admin-label-text" style={{ marginBottom: 8 }}>Live preview</p>
          <ThemePreview
            brandName={(config.themeBrandName as string) || 'Your brand'}
            logoUrl={(config.themeLogoUrl as string) || undefined}
            primaryColor={(config.themePrimaryColor as string) || '#77c043'}
            accentColor={(config.themeAccentColor as string) || '#4f8a28'}
            backgroundColor={(config.themeBackgroundColor as string) || '#000'}
            surfaceColor={(config.themeSurfaceColor as string) || '#111213'}
            textColor={(config.themeTextColor as string) || '#fff'}
            chatTitle={(config.themeChatTitle as string) || 'Chat'}
            chatSubtitle={(config.demoChatSubtitle as string) || undefined}
          />
        </aside>
      </div>

      <div className={`admin-save-bar${dirty ? ' is-dirty' : ''}`}>
        <span>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
        <button type="button" className="admin-btn admin-btn-primary" onClick={save} disabled={!dirty || saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </>
  )
}
