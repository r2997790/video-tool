import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { ConfirmModal } from '../../components/ConfirmModal'
import { FlowsEmptyState } from '../../components/FlowsEmptyState'
import { NewFlowWizard, type NewFlowWizardResult } from '../../components/NewFlowWizard'
import { PublishBadge } from '../../components/PublishBadge'
import { useToast } from '../../components/Toast'
import { AdminFieldLabel } from '../../components/AdminFieldLabel'
import { HELP } from '../../adminHelpText'
import type { FlowSummary } from '../../types'
import { copyToClipboard, fullPublicUrl } from '../../utils/slugify'

export function FlowsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [flows, setFlows] = useState<FlowSummary[]>([])
  const [error, setError] = useState('')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FlowSummary | null>(null)

  const load = () => api.getFlows().then(setFlows).catch(e => setError(String(e)))

  useEffect(() => { load() }, [])

  const createFromWizard = async (result: NewFlowWizardResult) => {
    try {
      await api.createFlow({ slug: result.slug, projectName: result.projectName, isEnabled: false })
      setWizardOpen(false)
      toast.success('Flow created')
      const dest = `/admin/flows/${result.slug}`
      navigate(dest)
    } catch (e) {
      toast.error(String(e))
    }
  }

  const toggle = async (flow: FlowSummary) => {
    await api.setFlowEnabled(flow.slug, !flow.isEnabled)
    toast.success(flow.isEnabled ? 'Flow unpublished' : 'Flow is now live')
    load()
  }

  const duplicate = async (flow: FlowSummary) => {
    const newSlug = `${flow.slug}-copy-${Date.now().toString(36).slice(-4)}`
    await api.duplicateFlow(flow.slug, { newSlug, newProjectName: `${flow.projectName} (copy)`, isEnabled: false })
    toast.success('Flow duplicated')
    load()
  }

  const remove = async () => {
    if (!deleteTarget) return
    try {
      await api.deleteFlow(deleteTarget.slug)
      toast.success('Flow deleted')
      setDeleteTarget(null)
      load()
    } catch (e) {
      toast.error(String(e))
    }
  }

  const copyUrl = async (flow: FlowSummary) => {
    const ok = await copyToClipboard(fullPublicUrl(flow.publicUrl))
    toast[ok ? 'success' : 'error'](ok ? 'Link copied' : 'Could not copy link')
  }

  if (flows.length === 0 && !error) {
    return (
      <>
        <FlowsEmptyState onCreate={() => setWizardOpen(true)} />
        <NewFlowWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onCreate={createFromWizard} />
      </>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Flows</h2>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => setWizardOpen(true)}>New flow</button>
      </div>
      <div className="admin-scope-banner">
        Each flow is a shareable demo. Add videos under a flow, set status to <strong>Live</strong>, then copy the public link.
      </div>
      {error && <p style={{ color: '#e05f5f' }}>{error}</p>}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Public URL</th>
              <th><AdminFieldLabel label="Live" help={HELP.flows.enabled} inline /></th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {flows.map(flow => (
              <tr key={flow.id}>
                <td>{flow.projectName}</td>
                <td><PublishBadge isEnabled={flow.isEnabled} /></td>
                <td>
                  <code style={{ fontSize: 11 }}>{flow.publicUrl}</code>
                  <button type="button" className="admin-btn admin-btn-sm" style={{ marginLeft: 8 }} onClick={() => copyUrl(flow)}>Copy</button>
                </td>
                <td>
                  <label>
                    <input type="checkbox" checked={flow.isEnabled} onChange={() => toggle(flow)} />
                    {' '}{flow.isEnabled ? 'Live' : 'Draft'}
                  </label>
                </td>
                <td>{flow.updatedAt ? new Date(flow.updatedAt).toLocaleString() : '—'}</td>
                <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link className="admin-btn admin-btn-sm" to={`/admin/flows/${flow.slug}/chapters`}>Edit</Link>
                  <button type="button" className="admin-btn admin-btn-sm" onClick={() => duplicate(flow)}>Duplicate</button>
                  <button type="button" className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => setDeleteTarget(flow)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NewFlowWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onCreate={createFromWizard} />
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete flow?"
        message={deleteTarget ? `"${deleteTarget.projectName}" and all its chapters, chat, and content will be permanently deleted.` : ''}
        confirmLabel="Delete"
        danger
        onConfirm={remove}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
