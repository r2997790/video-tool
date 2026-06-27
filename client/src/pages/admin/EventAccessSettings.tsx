import { useEffect, useState } from 'react'
import { api } from '../../api'
import type { AccessListEntry, PrivacyPolicyRegion } from '../../types'
import { AdminFieldLabel } from '../../components/AdminFieldLabel'
import { PlusIcon, RemoveIcon, SaveIcon } from '../../components/icons/uiIcons'
import { useToast } from '../../components/Toast'

export function EventAccessSettings() {
  const [lists, setLists] = useState<AccessListEntry[]>([])
  const [regions, setRegions] = useState<PrivacyPolicyRegion[]>([])
  const [newEntry, setNewEntry] = useState({ listType: 'blacklist', matchType: 'email', value: '', note: '' })
  const toast = useToast()

  const load = () => {
    api.getAccessLists().then(setLists).catch(() => setLists([]))
    api.getPrivacyRegions().then(setRegions).catch(() => setRegions([]))
  }

  useEffect(() => { load() }, [])

  const addEntry = async () => {
    if (!newEntry.value.trim()) return
    await api.addAccessListEntry(newEntry)
    setNewEntry({ listType: 'blacklist', matchType: 'email', value: '', note: '' })
    load()
    toast.success('Entry added')
  }

  const removeEntry = async (id: number) => {
    await api.deleteAccessListEntry(id)
    load()
  }

  const saveRegion = async (region: PrivacyPolicyRegion) => {
    await api.updatePrivacyRegion(region.regionCode, {
      noticeHtml: region.noticeHtml,
      consentRequired: region.consentRequired,
      policyUrl: region.policyUrl ?? undefined,
    })
    toast.success(`${region.regionCode} privacy notice saved`)
  }

  return (
    <>
      <div className="admin-card" style={{ marginTop: 24 }}>
        <h3 style={{ marginTop: 0 }}>Event access lists</h3>
        <p style={{ color: '#9b9d9f', fontSize: 13 }}>Global whitelist and blacklist applied to all events. Per-event overrides are configured on each event.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 1fr auto', gap: 8, marginBottom: 12 }}>
          <select className="admin-input" value={newEntry.listType} onChange={e => setNewEntry(n => ({ ...n, listType: e.target.value }))}>
            <option value="blacklist">Blacklist</option>
            <option value="whitelist">Whitelist</option>
          </select>
          <select className="admin-input" value={newEntry.matchType} onChange={e => setNewEntry(n => ({ ...n, matchType: e.target.value }))}>
            <option value="email">Email</option>
            <option value="domain">Domain</option>
          </select>
          <input className="admin-input" placeholder="value@company.com or gmail.com" value={newEntry.value}
            onChange={e => setNewEntry(n => ({ ...n, value: e.target.value }))} />
          <input className="admin-input" placeholder="Note" value={newEntry.note}
            onChange={e => setNewEntry(n => ({ ...n, note: e.target.value }))} />
          <button type="button" className="admin-btn admin-btn-sm btn-with-icon" onClick={addEntry}>
            <PlusIcon />
            Add
          </button>
        </div>
        <table className="admin-table">
          <thead><tr><th>Type</th><th>Match</th><th>Value</th><th>Note</th><th></th></tr></thead>
          <tbody>
            {lists.map(e => (
              <tr key={e.id}>
                <td>{e.listType}</td>
                <td>{e.matchType}</td>
                <td>{e.value}</td>
                <td>{e.note ?? '—'}</td>
                <td><button type="button" className="admin-btn admin-btn-danger admin-btn-sm btn-with-icon" onClick={() => removeEntry(e.id)}><RemoveIcon />Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-card" style={{ marginTop: 24 }}>
        <h3 style={{ marginTop: 0 }}>Privacy notices by region</h3>
        <p style={{ color: '#9b9d9f', fontSize: 13 }}>Shown on event registration forms. Region is detected from browser locale/timezone.</p>
        {regions.map(region => (
          <div key={region.regionCode} style={{ borderTop: '1px solid #2a2b2d', paddingTop: 16, marginTop: 16 }}>
            <strong>{region.regionCode}</strong>
            <AdminFieldLabel label="Notice HTML">
              <textarea className="admin-textarea" rows={3} value={region.noticeHtml}
                onChange={e => setRegions(rs => rs.map(r => r.regionCode === region.regionCode ? { ...r, noticeHtml: e.target.value } : r))} />
            </AdminFieldLabel>
            <label style={{ display: 'block', marginBottom: 8 }}>
              <input type="checkbox" checked={region.consentRequired}
                onChange={e => setRegions(rs => rs.map(r => r.regionCode === region.regionCode ? { ...r, consentRequired: e.target.checked } : r))} />
              {' '}Require explicit consent checkbox
            </label>
            <AdminFieldLabel label="Policy URL">
              <input className="admin-input" value={region.policyUrl ?? ''}
                onChange={e => setRegions(rs => rs.map(r => r.regionCode === region.regionCode ? { ...r, policyUrl: e.target.value } : r))} />
            </AdminFieldLabel>
            <button type="button" className="admin-btn admin-btn-sm btn-with-icon" onClick={() => saveRegion(regions.find(r => r.regionCode === region.regionCode)!)}>
              <SaveIcon />
              Save {region.regionCode}
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
