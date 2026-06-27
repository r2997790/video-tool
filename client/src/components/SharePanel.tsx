import { useState } from 'react'
import { AdminMenu } from './AdminMenu'
import { copyToClipboard, fullPublicUrl } from '../utils/slugify'
import { useToast } from './Toast'

interface SharePanelProps {
  slug: string
  isEnabled?: boolean
  compact?: boolean
}

export function SharePanel({ slug, isEnabled = true, compact = false }: SharePanelProps) {
  const toast = useToast()
  const [showEmbed, setShowEmbed] = useState(false)
  const publicPath = `/flow/${slug}`
  const fullUrl = fullPublicUrl(publicPath)
  const embedCode = `<iframe src="${fullUrl}" width="100%" height="720" frameborder="0" allowfullscreen></iframe>`

  const copy = async (text: string, label: string) => {
    const ok = await copyToClipboard(text)
    toast[ok ? 'success' : 'error'](ok ? `${label} copied` : `Could not copy ${label.toLowerCase()}`)
  }

  const shareItems = [
    { id: 'copy', label: 'Copy link', description: 'Copy public demo URL', onClick: () => copy(fullUrl, 'Link') },
    {
      id: 'preview',
      label: 'Open preview',
      description: 'Open demo in a new tab',
      onClick: () => window.open(publicPath, '_blank'),
    },
    {
      id: 'embed',
      label: showEmbed ? 'Hide embed code' : 'Show embed code',
      description: 'Iframe snippet for your site',
      onClick: () => setShowEmbed(v => !v),
    },
    {
      id: 'copy-embed',
      label: 'Copy embed code',
      description: 'Copy iframe HTML to clipboard',
      onClick: () => copy(embedCode, 'Embed code'),
    },
  ]

  return (
    <div className={`admin-share-panel${compact ? ' admin-share-panel-compact' : ''}`}>
      <div className="admin-share-url-row">
        {!compact && (
          <input className="admin-input admin-share-input" readOnly value={fullUrl} onFocus={e => e.target.select()} />
        )}
        <AdminMenu
          align="right"
          items={shareItems}
          trigger={<button type="button" className="admin-btn admin-btn-sm">Share</button>}
        />
      </div>
      {!isEnabled && (
        <p className="admin-share-hint">This flow is a draft — preview works for you; publish to share publicly.</p>
      )}
      {showEmbed && !compact && (
        <textarea className="admin-textarea admin-share-embed" readOnly value={embedCode} rows={3} />
      )}
    </div>
  )
}
