import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../api'
import { AdminFieldLabel } from '../../components/AdminFieldLabel'
import { ConfirmModal } from '../../components/ConfirmModal'
import { HELP } from '../../adminHelpText'
import { DeleteIcon, PlusIcon } from '../../components/icons/uiIcons'
import { FlowWorkflowNav } from '../../flow-editor/FlowWorkflowNav'

interface SeedMsg {
  id: number
  role: string
  text: string
  sortOrder: number
}

export function SeedChatPage() {
  const { slug = 'default' } = useParams<{ slug: string }>()
  const [messages, setMessages] = useState<SeedMsg[]>([])
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const load = () => api.getSeedMessages(slug).then(setMessages)
  useEffect(() => { load() }, [slug])

  const add = async () => {
    await api.createSeedMessage(slug, { role: 'assistant', text: 'New seed message' })
    load()
  }

  const update = async (msg: SeedMsg) => {
    await api.updateSeedMessage(slug, msg.id, { role: msg.role, text: msg.text, sortOrder: msg.sortOrder })
  }

  const remove = async (id: number) => {
    await api.deleteSeedMessage(slug, id)
    load()
  }

  return (
    <>
      <FlowWorkflowNav />
      <h2>Seed Chat Messages</h2>
      <p style={{ color: '#9b9d9f', fontSize: 13, marginBottom: 16 }}>
        These messages appear when Seed Chat is enabled in settings.
      </p>
      <button className="admin-btn btn-with-icon" onClick={add} style={{ marginBottom: 16 }}>
        <PlusIcon />
        Add Message
      </button>
      <div className="admin-card">
        {messages.map(msg => (
          <div key={msg.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #26282a' }}>
            <AdminFieldLabel label="Role" help={HELP.seedChat.role}>
              <select
                className="admin-input"
                value={msg.role}
                onChange={e => setMessages(ms => ms.map(m => m.id === msg.id ? { ...m, role: e.target.value } : m))}
                onBlur={() => update(messages.find(m => m.id === msg.id)!)}
              >
                <option value="assistant">Assistant</option>
                <option value="user">User</option>
              </select>
            </AdminFieldLabel>
            <AdminFieldLabel label="Text" help={HELP.seedChat.text}>
              <textarea
                className="admin-textarea"
                value={msg.text}
                onChange={e => setMessages(ms => ms.map(m => m.id === msg.id ? { ...m, text: e.target.value } : m))}
                onBlur={() => update(messages.find(m => m.id === msg.id)!)}
              />
            </AdminFieldLabel>
            <button className="admin-btn admin-btn-danger admin-btn-sm btn-with-icon" onClick={() => setDeleteId(msg.id)}>
              <DeleteIcon />
              Delete
            </button>
          </div>
        ))}
        {messages.length === 0 && <p style={{ color: '#5f6164' }}>No seed messages yet.</p>}
      </div>
      <ConfirmModal
        open={deleteId != null}
        title="Delete message?"
        message="Remove this seed chat message from the demo."
        confirmLabel="Delete"
        danger
        onConfirm={() => { if (deleteId != null) remove(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </>
  )
}
