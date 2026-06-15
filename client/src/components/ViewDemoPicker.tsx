import { useEffect, useState } from 'react'
import { api } from '../api'
import type { FlowSummary } from '../types'

export function ViewDemoPicker() {
  const [flows, setFlows] = useState<FlowSummary[]>([])
  const [selected, setSelected] = useState('')

  useEffect(() => {
    api.getFlows().then(list => {
      const enabled = list.filter(f => f.isEnabled)
      setFlows(enabled)
      const preferred = enabled.find(f => f.slug === 'test-demo') ?? enabled[0]
      if (preferred) setSelected(preferred.slug)
    }).catch(() => {})
  }, [])

  const openDemo = () => {
    if (!selected) return
    window.open(`/flow/${encodeURIComponent(selected)}`, '_blank')
  }

  if (flows.length === 0) {
    return <p style={{ color: '#9b9d9f', fontSize: 13, marginTop: 24 }}>No enabled flows</p>
  }

  return (
    <div className="admin-demo-picker" style={{ marginTop: 24 }}>
      <label style={{ display: 'block', fontSize: 12, color: '#9b9d9f', marginBottom: 6 }}>View Demo</label>
      <select
        className="admin-input"
        value={selected}
        onChange={e => setSelected(e.target.value)}
        style={{ width: '100%', marginBottom: 8 }}
      >
        {flows.map(f => (
          <option key={f.slug} value={f.slug}>{f.projectName}</option>
        ))}
      </select>
      <button className="admin-btn admin-btn-sm" style={{ width: '100%' }} onClick={openDemo} disabled={!selected}>
        Open demo
      </button>
    </div>
  )
}
