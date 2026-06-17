import { createContext, useContext, type ReactNode } from 'react'
import type { FlowSummary, ScheduledEvent } from '../../../types'

export interface EventAdminContextValue {
  eventId: number
  ev: ScheduledEvent
  setEv: React.Dispatch<React.SetStateAction<ScheduledEvent | null>>
  flows: FlowSummary[]
  save: (patch: Partial<ScheduledEvent>) => Promise<void>
  goLive: () => Promise<void>
  reload: () => void
}

const EventAdminContext = createContext<EventAdminContextValue | null>(null)

export function EventAdminProvider({ value, children }: { value: EventAdminContextValue; children: ReactNode }) {
  return <EventAdminContext.Provider value={value}>{children}</EventAdminContext.Provider>
}

export function useEventAdmin() {
  const ctx = useContext(EventAdminContext)
  if (!ctx) throw new Error('useEventAdmin must be used within EventAdminProvider')
  return ctx
}
