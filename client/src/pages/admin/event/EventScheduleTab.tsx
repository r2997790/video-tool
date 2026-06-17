import { AdminFieldLabel } from '../../../components/AdminFieldLabel'
import { HELP } from '../../../adminHelpText'
import { useEventAdmin } from './EventAdminContext'
import { fromLocalInput, parseWeekly, toLocalInput, WEEKDAYS } from './eventAdminUtils'

export function EventScheduleTab() {
  const { ev, setEv, save } = useEventAdmin()
  const weekly = parseWeekly(ev.weeklyScheduleJson)

  return (
    <div className="admin-card">
      <AdminFieldLabel label="Recurrence" help={HELP.events.recurrence}>
        <select className="admin-input" value={ev.recurrenceType || 'none'} onChange={e => save({ recurrenceType: e.target.value })}>
          <option value="none">One-time</option>
          <option value="interval">Every X minutes / hours</option>
          <option value="weekly">Weekly schedule</option>
        </select>
      </AdminFieldLabel>
      {(ev.recurrenceType || 'none') === 'none' && (
        <AdminFieldLabel label="Starts at (local)" help={HELP.events.startsAt}>
          <input className="admin-input" type="datetime-local" value={toLocalInput(ev.startsAtUtc)}
            onChange={e => save({ startsAtUtc: fromLocalInput(e.target.value) || ev.startsAtUtc })} />
        </AdminFieldLabel>
      )}
      {ev.recurrenceType === 'interval' && (
        <>
          <AdminFieldLabel label="Every (minutes)" help={HELP.events.intervalMinutes}>
            <input className="admin-input" type="number" min={1} value={ev.intervalMinutes ?? 60}
              onChange={e => setEv({ ...ev, intervalMinutes: parseInt(e.target.value, 10) || 60 })}
              onBlur={() => save({ intervalMinutes: ev.intervalMinutes })} />
          </AdminFieldLabel>
          <AdminFieldLabel label="Anchor start (local)" help={HELP.events.anchorStart}>
            <input className="admin-input" type="datetime-local" value={toLocalInput(ev.recurrenceStartUtc || ev.startsAtUtc)}
              onChange={e => {
                const iso = fromLocalInput(e.target.value)
                save({ recurrenceStartUtc: iso ?? undefined, startsAtUtc: iso || ev.startsAtUtc })
              }} />
          </AdminFieldLabel>
        </>
      )}
      {ev.recurrenceType === 'weekly' && (
        <>
          <AdminFieldLabel label="Days" help={HELP.events.weeklyDays}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {WEEKDAYS.map(day => (
                <label key={day}>
                  <input type="checkbox" checked={weekly.days.includes(day)}
                    onChange={e => {
                      const days = e.target.checked ? [...weekly.days, day] : weekly.days.filter(d => d !== day)
                      save({ weeklyScheduleJson: JSON.stringify({ ...weekly, days }) })
                    }} /> {day}
                </label>
              ))}
            </div>
          </AdminFieldLabel>
          <AdminFieldLabel label="Times" help={HELP.events.weeklyTimes}>
            <input className="admin-input" value={weekly.times.join(', ')}
              onChange={e => {
                const times = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                save({ weeklyScheduleJson: JSON.stringify({ ...weekly, times }) })
              }} />
          </AdminFieldLabel>
          <AdminFieldLabel label="Timezone" help={HELP.events.timezone}>
            <input className="admin-input" value={ev.timezone || 'UTC'} onChange={e => setEv({ ...ev, timezone: e.target.value })} onBlur={() => save({ timezone: ev.timezone })} />
          </AdminFieldLabel>
        </>
      )}
      <AdminFieldLabel label="Series end (optional)" help={HELP.events.seriesEnd}>
        <input className="admin-input" type="datetime-local" value={toLocalInput(ev.recurrenceEndUtc)}
          onChange={e => save({ recurrenceEndUtc: fromLocalInput(e.target.value) ?? undefined })} />
      </AdminFieldLabel>
      <AdminFieldLabel label="Live duration (minutes)" help={HELP.events.liveDurationMinutes}>
        <input className="admin-input" type="number" min={0} placeholder="Open until next occurrence"
          value={ev.liveDurationMinutes ?? ''} onChange={e => setEv({ ...ev, liveDurationMinutes: e.target.value ? parseInt(e.target.value, 10) : null })}
          onBlur={() => save({ liveDurationMinutes: ev.liveDurationMinutes })} />
      </AdminFieldLabel>
      {ev.occurrence && (
        <p style={{ fontSize: 12, color: '#9b9d9f' }}>
          Status: {ev.occurrence.displayStatus ?? '—'} · Next: {ev.occurrence.nextStartsAtUtc ? new Date(ev.occurrence.nextStartsAtUtc).toLocaleString() : '—'}
        </p>
      )}
    </div>
  )
}
