import { api } from '../../../api'
import { AdminFieldLabel } from '../../../components/AdminFieldLabel'
import { useToast } from '../../../components/Toast'
import { useEventAdmin } from './EventAdminContext'
import { parseGate, updateQuestion } from './eventAdminUtils'

export function EventAccessTab() {
  const { ev, save } = useEventAdmin()
  const toast = useToast()
  const gate = parseGate(ev.registrationFormJson)

  return (
    <div className="admin-card">
      <AdminFieldLabel label="Access mode">
        <select className="admin-input" value={ev.accessMode || 'open'} onChange={e => save({ accessMode: e.target.value })}>
          <option value="open">Open — anyone can access</option>
          <option value="selective">Selective — invite list required</option>
        </select>
      </AdminFieldLabel>
      <AdminFieldLabel label="Registration approval">
        <select className="admin-input" value={ev.registrationApprovalMode || 'auto'} onChange={e => save({ registrationApprovalMode: e.target.value })}>
          <option value="auto">Auto-approve on form submit</option>
          <option value="manual">Manual approval required</option>
          <option value="crm_or_form">CRM list or manual approval</option>
        </select>
      </AdminFieldLabel>
      <AdminFieldLabel label="CRM list key">
        <input className="admin-input" value={ev.crmListKey || ''} placeholder="External list identifier"
          onChange={e => save({ crmListKey: e.target.value })} />
        <button type="button" className="admin-btn admin-btn-sm" style={{ marginTop: 8 }} onClick={async () => {
          const r = await api.syncEventCrm(ev.id)
          toast.success(`Synced ${r.imported} attendees from CRM`)
        }}>Sync CRM list</button>
      </AdminFieldLabel>
      {ev.attendeeWebhookSecret && (
        <p style={{ fontSize: 12, color: '#9b9d9f' }}>
          Webhook secret: <code>{ev.attendeeWebhookSecret}</code><br />
          POST to <code>/api/integrations/event-attendees/{ev.slug}</code> with header <code>X-Event-Signature: sha256=…</code>
        </p>
      )}
      <h3 style={{ marginTop: 24 }}>Registration form</h3>
      <AdminFieldLabel label="Heading">
        <input className="admin-input" value={gate.heading} onChange={e => {
          save({ registrationFormJson: JSON.stringify({ ...gate, heading: e.target.value }) })
        }} />
      </AdminFieldLabel>
      <AdminFieldLabel label="Subtext">
        <textarea className="admin-textarea" value={gate.subtext} onChange={e => {
          save({ registrationFormJson: JSON.stringify({ ...gate, subtext: e.target.value }) })
        }} />
      </AdminFieldLabel>
      {gate.questions.map((q, i) => (
        <div key={q.id} style={{ borderTop: '1px solid #2a2b2d', paddingTop: 12, marginTop: 12 }}>
          <AdminFieldLabel label={`Question ${i + 1} label`}>
            <input className="admin-input" value={q.label} onChange={e => updateQuestion(gate, i, { label: e.target.value }, save)} />
          </AdminFieldLabel>
          <AdminFieldLabel label="Field ID">
            <input className="admin-input" value={q.id} onChange={e => updateQuestion(gate, i, { id: e.target.value }, save)} />
          </AdminFieldLabel>
          <AdminFieldLabel label="Type">
            <select className="admin-input" value={q.type} onChange={e => updateQuestion(gate, i, { type: e.target.value }, save)}>
              <option value="text">Text</option>
              <option value="email">Email</option>
              <option value="textarea">Multiline</option>
            </select>
          </AdminFieldLabel>
          <label><input type="checkbox" checked={q.required} onChange={e => updateQuestion(gate, i, { required: e.target.checked }, save)} /> Required</label>
        </div>
      ))}
      <button type="button" className="admin-btn admin-btn-sm" style={{ marginTop: 12 }} onClick={() => {
        const qs = [...gate.questions, { id: `field_${Date.now()}`, label: 'New question', type: 'text', required: false }]
        save({ registrationFormJson: JSON.stringify({ ...gate, questions: qs }) })
      }}>Add question</button>
    </div>
  )
}
