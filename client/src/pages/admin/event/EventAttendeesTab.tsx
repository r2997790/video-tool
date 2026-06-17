import { useEffect, useRef, useState } from 'react'
import { api } from '../../../api'
import type { EventAttendee } from '../../../types'
import { useToast } from '../../../components/Toast'
import { useEventAdmin } from './EventAdminContext'

export function EventAttendeesTab() {
  const { eventId } = useEventAdmin()
  const [attendees, setAttendees] = useState<EventAttendee[]>([])
  const [attendeeFilter, setAttendeeFilter] = useState('')
  const csvInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const loadAttendees = () => {
    api.getEventAttendees(eventId, attendeeFilter || undefined).then(setAttendees).catch(() => setAttendees([]))
  }

  useEffect(() => { loadAttendees() }, [eventId, attendeeFilter])

  return (
    <div className="admin-card">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="admin-input" style={{ width: 160 }} value={attendeeFilter} onChange={e => setAttendeeFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <button type="button" className="admin-btn admin-btn-sm" onClick={() => csvInputRef.current?.click()}>Import CSV</button>
        <button type="button" className="admin-btn admin-btn-sm" onClick={() => api.exportEventAttendeesCsv(eventId)}>Export CSV</button>
        <button type="button" className="admin-btn admin-btn-sm" onClick={async () => {
          const email = prompt('Email address')
          if (!email) return
          await api.addEventAttendee(eventId, { email, status: 'approved' })
          loadAttendees()
        }}>Add attendee</button>
      </div>
      <input ref={csvInputRef} type="file" accept=".csv,text/csv" hidden onChange={async e => {
        const file = e.target.files?.[0]; e.target.value = ''
        if (!file) return
        const text = await file.text()
        const r = await api.importEventAttendeesCsv(eventId, text)
        toast.success(`Imported ${r.imported} attendees`)
        loadAttendees()
      }} />
      <table className="admin-table">
        <thead><tr><th>Email</th><th>Name</th><th>Status</th><th>Source</th><th>Actions</th></tr></thead>
        <tbody>
          {attendees.map(a => (
            <tr key={a.id}>
              <td>{a.email}</td>
              <td>{a.name ?? '—'}</td>
              <td>{a.status}</td>
              <td>{a.source}</td>
              <td style={{ display: 'flex', gap: 6 }}>
                {a.status !== 'approved' && <button type="button" className="admin-btn admin-btn-sm" onClick={async () => { await api.updateEventAttendee(eventId, a.id, { status: 'approved' }); loadAttendees() }}>Approve</button>}
                {a.status !== 'rejected' && <button type="button" className="admin-btn admin-btn-sm" onClick={async () => { await api.updateEventAttendee(eventId, a.id, { status: 'rejected', rejectedReason: 'Rejected by admin' }); loadAttendees() }}>Reject</button>}
                {a.status !== 'pending' && <button type="button" className="admin-btn admin-btn-sm" onClick={async () => { await api.updateEventAttendee(eventId, a.id, { status: 'pending' }); loadAttendees() }}>Pending</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {attendees.length === 0 && <p style={{ color: '#9b9d9f' }}>No attendees yet.</p>}
    </div>
  )
}
