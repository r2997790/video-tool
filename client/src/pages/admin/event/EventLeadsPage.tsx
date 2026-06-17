import { useParams } from 'react-router-dom'
import { LeadsPanel } from '../LeadsPanel'
import { EventNoFlowMessage } from './EventSettingsTab'
import { useEventAdmin } from './EventAdminContext'

export function EventLeadsPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { ev } = useEventAdmin()
  if (!ev.flowSlug) return <EventNoFlowMessage />
  return <LeadsPanel eventId={parseInt(id, 10)} />
}
