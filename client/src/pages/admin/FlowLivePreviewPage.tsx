import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../api'
import { ExternalLinkIcon } from '../../components/icons/uiIcons'
import { FlowWorkflowNav } from '../../flow-editor/FlowWorkflowNav'

export function FlowLivePreviewPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const [isEnabled, setIsEnabled] = useState(true)
  const previewPath = `/flow/${encodeURIComponent(slug)}`

  useEffect(() => {
    if (!slug) return
    api.getFlow(slug).then(flow => setIsEnabled(flow.isEnabled)).catch(() => setIsEnabled(false))
  }, [slug])

  return (
    <div className="flow-live-preview">
      <FlowWorkflowNav />
      <div className="flow-live-preview-toolbar">
        {!isEnabled && (
          <p className="flow-live-preview-draft-hint">
            Draft preview — only visible to you until published.
          </p>
        )}
        <a
          href={previewPath}
          target="_blank"
          rel="noreferrer"
          className="admin-btn admin-btn-sm btn-with-icon"
        >
          <ExternalLinkIcon />
          Open in new tab
        </a>
      </div>
      <iframe
        className="flow-live-preview-frame"
        src={previewPath}
        title={`Live preview of ${slug}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  )
}
