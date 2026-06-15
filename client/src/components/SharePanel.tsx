import { useState } from 'react'
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

  return (
    <div className={`admin-share-panel${compact ? ' admin-share-panel-compact' : ''}`}>
      <div className="admin-share-url-row">
        <input className="admin-input admin-share-input" readOnly value={fullUrl} onFocus={e => e.target.select()} />
        <button type="button" className="admin-btn admin-btn-sm" onClick={() => copy(fullUrl, 'Link')}>Copy link</button>
        <button
          type="button"
          className="admin-btn admin-btn-sm"
          onClick={() => window.open(publicPath, '_blank')}
        >
          Open preview
        </button>
      </div>
      {!isEnabled && (
        <p className="admin-share-hint">This flow is a draft — preview works for you; publish to share publicly.</p>
      )}
      {!compact && (
        <div className="admin-share-extra">
          <button type="button" className="admin-btn admin-btn-sm" onClick={() => setShowEmbed(v => !v)}>
            {showEmbed ? 'Hide embed' : 'Embed code'}
          </button>
          <button type="button" className="admin-btn admin-btn-sm" onClick={() => copy(embedCode, 'Embed code')}>
            Copy embed
          </button>
        </div>
      )}
      {showEmbed && !compact && (
        <textarea className="admin-textarea admin-share-embed" readOnly value={embedCode} rows={3} />
      )}
    </div>
  )
}
