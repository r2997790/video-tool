interface ThemePreviewProps {
  brandName: string
  logoUrl?: string
  primaryColor: string
  accentColor: string
  backgroundColor: string
  surfaceColor: string
  textColor: string
  chatTitle: string
  chatSubtitle?: string
}

export function ThemePreview({
  brandName,
  logoUrl,
  primaryColor,
  accentColor,
  backgroundColor,
  surfaceColor,
  textColor,
  chatTitle,
  chatSubtitle,
}: ThemePreviewProps) {
  return (
    <div
      className="admin-theme-preview"
      style={{
        background: backgroundColor,
        color: textColor,
        ['--preview-primary' as string]: primaryColor,
        ['--preview-accent' as string]: accentColor,
        ['--preview-surface' as string]: surfaceColor,
      }}
    >
      <div className="admin-theme-preview-header">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="admin-theme-preview-logo" />
        ) : (
          <span className="admin-theme-preview-brand">{brandName || 'Your brand'}</span>
        )}
      </div>
      <div className="admin-theme-preview-body">
        <div className="admin-theme-preview-video" style={{ background: surfaceColor }}>
          <span style={{ color: primaryColor }}>▶</span>
        </div>
        <div className="admin-theme-preview-chat" style={{ background: surfaceColor, borderColor: `${primaryColor}40` }}>
          <p className="admin-theme-preview-chat-title" style={{ color: textColor }}>{chatTitle || 'Chat'}</p>
          <p className="admin-theme-preview-chat-sub">{chatSubtitle || 'Ask questions about the demo'}</p>
          <div className="admin-theme-preview-msg" style={{ background: `${primaryColor}22`, borderLeftColor: primaryColor }}>
            Sample message
          </div>
          <div className="admin-theme-preview-send" style={{ background: primaryColor }} />
        </div>
      </div>
    </div>
  )
}
