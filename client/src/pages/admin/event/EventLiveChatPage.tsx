import { useParams } from 'react-router-dom'
import { LiveChatPanel } from '../LiveChatPanel'
import { EventNoFlowMessage } from './EventSettingsTab'
import { useEventAdmin } from './EventAdminContext'

export function EventLiveChatPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { ev } = useEventAdmin()
  if (!ev.flowSlug) return <EventNoFlowMessage />
  return <LiveChatPanel eventId={parseInt(id, 10)} flowSlug={ev.flowSlug} />
}
