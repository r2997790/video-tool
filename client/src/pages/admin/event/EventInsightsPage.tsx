import { useParams } from 'react-router-dom'
import { EngagementLog } from '../EngagementLog'
import { EventNoFlowMessage } from './EventSettingsTab'
import { useEventAdmin } from './EventAdminContext'

export function EventInsightsPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { ev } = useEventAdmin()
  if (!ev.flowSlug) return <EventNoFlowMessage />
  return <EngagementLog eventId={parseInt(id, 10)} />
}
