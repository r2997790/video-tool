import type { VideoToaster } from '../types'
import { DownloadIcon } from './icons/uiIcons'

interface Props {
  toaster: VideoToaster
  onDismiss: () => void
  onDownload?: () => void
  onLinkClick?: () => void
}

export function VideoToasterPopup({ toaster, onDismiss, onDownload, onLinkClick }: Props) {
  const type = toaster.toasterType || 'popup'

  if (type === 'graphic') {
    const image = toaster.imageUrl
    const link = toaster.linkUrl?.trim()
    const content = image ? (
      <img className="vd-toaster-graphic-img" src={image} alt={toaster.title || 'Graphic'} />
    ) : (
      <p className="vd-toaster-msg">{toaster.message || 'No image configured'}</p>
    )

    return (
      <div className="vd-toaster vd-toaster-graphic" role="alert">
        <button className="vd-toaster-close" onClick={onDismiss} aria-label="Dismiss">&times;</button>
        {toaster.title && <p className="vd-toaster-title">{toaster.title}</p>}
        {link ? (
          <a
            className="vd-toaster-graphic-link"
            href={link.startsWith('http') ? link : `https://${link}`}
            target={toaster.linkNewWindow ? '_blank' : '_self'}
            rel={toaster.linkNewWindow ? 'noopener noreferrer' : undefined}
            onClick={() => onLinkClick?.()}
          >
            {content}
          </a>
        ) : content}
        {toaster.message && image && <p className="vd-toaster-msg">{toaster.message}</p>}
      </div>
    )
  }

  if (type === 'banner') {
    const pos = toaster.bannerPosition === 'bottom' ? 'bottom' : 'top'
    return (
      <div className={`vd-toaster vd-toaster-banner vd-toaster-banner-${pos}`} role="alert">
        <div className="vd-toaster-banner-inner">
          {toaster.title && <p className="vd-toaster-title">{toaster.title}</p>}
          <p className="vd-toaster-msg">{toaster.message}</p>
        </div>
        <button className="vd-toaster-close" onClick={onDismiss} aria-label="Dismiss">&times;</button>
      </div>
    )
  }

  if (type === 'download') {
    const href = toaster.downloadUrl || '#'
    const fileName = toaster.downloadFileName || 'download'
    return (
      <div className="vd-toaster vd-toaster-download" role="alert">
        <button className="vd-toaster-close" onClick={onDismiss} aria-label="Dismiss">&times;</button>
        {toaster.thumbnailUrl && (
          <img className="vd-toaster-download-thumb" src={toaster.thumbnailUrl} alt="" />
        )}
        {toaster.title && <p className="vd-toaster-title">{toaster.title}</p>}
        <p className="vd-toaster-msg">{toaster.message}</p>
        <a
          className="vd-toaster-download-btn btn-with-icon"
          href={href}
          download={fileName}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onDownload?.()}
        >
          <DownloadIcon />
          Download {fileName}
        </a>
      </div>
    )
  }

  return (
    <div className="vd-toaster" role="alert">
      <button className="vd-toaster-close" onClick={onDismiss} aria-label="Dismiss">&times;</button>
      {toaster.title && <p className="vd-toaster-title">{toaster.title}</p>}
      <p className="vd-toaster-msg">{toaster.message}</p>
    </div>
  )
}
