import { useParams } from 'react-router-dom'
import { FlowEditorShell } from '../../flow-editor/FlowEditorShell'

export function FlowEditorPage() {
  const { slug = 'default' } = useParams<{ slug: string }>()

  return <FlowEditorShell flowSlug={slug} />
}
