import { useParams } from 'react-router-dom'
import { LeadsPanel } from './LeadsPanel'

export function LeadsPage() {
  const { slug = 'default' } = useParams<{ slug: string }>()
  return <LeadsPanel flowSlug={slug} />
}
