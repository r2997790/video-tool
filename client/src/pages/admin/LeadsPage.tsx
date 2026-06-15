import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../api'
import { useToast } from '../../components/Toast'

interface LeadRow {
  id: number
  sessionId: string
  flowSlug: string
  source: string
  chapterId: number | null
  nodeId: string | null
  answersJson: string
  createdAt: string
}

function parseAnswers(json: string): Record<string, string> {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed)) out[k] = String(v ?? '')
    return out
  } catch {
    return {}
  }
}

export function LeadsPage() {
  const { slug = 'default' } = useParams<{ slug: string }>()
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const toast = useToast()

  const load = () => {
    setLoading(true)
    setError('')
    api.getFlowLeads(slug)
      .then(setLeads)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load leads'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [slug])

  const exportCsv = async () => {
    try {
      await api.exportFlowLeadsCsv(slug)
      toast.success('CSV download started')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    }
  }

  if (loading) {
    return (
      <>
        <h2>Leads</h2>
        <div className="admin-skeleton" style={{ height: 120 }} />
      </>
    )
  }

  if (error) {
    return (
      <>
        <h2>Leads</h2>
        <div className="admin-card">
          <p className="admin-error">{error}</p>
          <button type="button" className="admin-btn admin-btn-sm" onClick={load}>Retry</button>
        </div>
      </>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Leads</h2>
          <p style={{ color: '#9b9d9f', fontSize: 13, margin: '4px 0 0' }}>
            Gate forms, flow questions, and in-video prompts saved from the public demo.
          </p>
        </div>
        <button type="button" className="admin-btn admin-btn-sm" onClick={exportCsv}>Export CSV</button>
      </div>

      {leads.length === 0 ? (
        <div className="admin-card">
          <p style={{ color: '#9b9d9f', margin: 0 }}>No leads yet. Submissions appear here when prospects complete a gate or answer a form in the demo.</p>
        </div>
      ) : (
        <div className="admin-card" style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Source</th>
                <th>Answers</th>
                <th>Session</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => {
                const answers = parseAnswers(lead.answersJson)
                return (
                  <tr key={lead.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(lead.createdAt).toLocaleString()}</td>
                    <td>
                      <span className="admin-badge">{lead.source}</span>
                      {lead.chapterId != null && <span style={{ fontSize: 12, color: '#9b9d9f' }}> ch.{lead.chapterId}</span>}
                    </td>
                    <td>
                      {Object.entries(answers).map(([k, v]) => (
                        <div key={k} style={{ fontSize: 13 }}>
                          <strong>{k}:</strong> {v}
                        </div>
                      ))}
                    </td>
                    <td style={{ fontSize: 11, color: '#9b9d9f', fontFamily: 'monospace' }}>{lead.sessionId.slice(0, 8)}…</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
