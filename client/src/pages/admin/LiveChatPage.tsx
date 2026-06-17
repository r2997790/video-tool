import { useParams } from 'react-router-dom'
import { LiveChatPanel } from './LiveChatPanel'

export function LiveChatPage() {
  const { slug = 'default' } = useParams<{ slug: string }>()
  return <LiveChatPanel flowSlug={slug} />
}
