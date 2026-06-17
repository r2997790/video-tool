import { useParams } from 'react-router-dom'
import { EngagementLog } from './EngagementLog'

export function EngagementPage() {
  const { slug = 'default' } = useParams<{ slug: string }>()
  return <EngagementLog flowSlug={slug} />
}
