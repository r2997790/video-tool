import { Link, Outlet, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../../api'
import { InlineEditableTitle } from '../../components/InlineEditableTitle'
import { PublishBadge } from '../../components/PublishBadge'
import { SharePanel } from '../../components/SharePanel'
import { FlowNameProvider, useFlowName } from '../../flow-editor/FlowNameContext'
import { BackIcon } from '../../components/icons/uiIcons'
import type { FlowDetail } from '../../types'

function FlowHeaderTitle() {
  const flowName = useFlowName()
  return (
    <InlineEditableTitle
      value={flowName.projectName}
      onChange={flowName.setProjectName}
      readOnly={!flowName.editable}
      placeholder="Untitled flow"
    />
  )
}

function FlowLayoutContent({
  slug,
  isEnabled,
}: {
  slug: string
  isEnabled: boolean
}) {
  return (
    <>
      <div className="admin-flow-header">
        <div>
          <Link to="/admin/flows" className="admin-back-link btn-with-icon">
            <BackIcon />
            Flow Design
          </Link>
          <div className="admin-flow-title-row">
            <FlowHeaderTitle />
            <PublishBadge isEnabled={isEnabled} />
          </div>
        </div>
        <SharePanel slug={slug} isEnabled={isEnabled} compact />
      </div>

      <Outlet />
    </>
  )
}

export function FlowLayout() {
  const { slug = '' } = useParams<{ slug: string }>()
  const [flow, setFlow] = useState<FlowDetail | null>(null)

  useEffect(() => {
    if (!slug) return
    api.getFlow(slug).then(setFlow).catch(() => setFlow(null))
  }, [slug])

  const isEnabled = flow?.isEnabled ?? false

  return (
    <FlowNameProvider key={slug} fallbackName={flow?.projectName ?? 'Flow'}>
      <FlowLayoutContent slug={slug} isEnabled={isEnabled} />
    </FlowNameProvider>
  )
}
