import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../api'
import { AdminFieldLabel } from '../../components/AdminFieldLabel'
import { ConfirmModal } from '../../components/ConfirmModal'
import { DeleteIcon, PlusIcon } from '../../components/icons/uiIcons'
import { HELP } from '../../adminHelpText'
interface PausePointRow {
  id: number
  chapterId: number | null
  triggerAtSeconds: number
  prompt: string
  fieldId: string
  inputType: string
  optionsJson: string | null
  required: boolean
  placeholder: string | null
  isEnabled: boolean
  sortOrder: number
}

const INPUT_TYPES = ['text', 'textarea', 'radio', 'multiselect', 'date', 'datetime', 'email']

export function PausePointsPage() {
  const { slug = 'default' } = useParams<{ slug: string }>()
  const [points, setPoints] = useState<PausePointRow[]>([])
  const [chapters, setChapters] = useState<Array<{ id: number; name: string }>>([])
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const load = () => api.getPausePoints(slug).then(setPoints)
  useEffect(() => {
    load()
    api.getAdminChapters(slug).then(cs => setChapters(cs.map(c => ({ id: c.id, name: c.name }))))
  }, [slug])

  const parseOptions = (json: string | null) => {
    if (!json) return []
    try { return JSON.parse(json) as string[] } catch { return [] }
  }

  const optionsToJson = (opts: string[]) => JSON.stringify(opts)

  const add = async () => {
    await api.createPausePoint(slug, {
      chapterId: chapters[0]?.id ?? null,
      triggerAtSeconds: 45,
      prompt: 'What did you think of that section?',
      fieldId: 'reflection',
      inputType: 'text',
      optionsJson: '[]',
      required: true,
      isEnabled: true,
    })
    load()
  }

  const update = async (p: PausePointRow) => {
    await api.updatePausePoint(slug, p.id, {
      chapterId: p.chapterId,
      triggerAtSeconds: p.triggerAtSeconds,
      prompt: p.prompt,
      fieldId: p.fieldId,
      inputType: p.inputType,
      optionsJson: p.optionsJson,
      required: p.required,
      placeholder: p.placeholder,
      isEnabled: p.isEnabled,
      sortOrder: p.sortOrder,
    })
  }

  const remove = async (id: number) => {
    await api.deletePausePoint(slug, id)
    load()
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <>
      <h2>Pause &amp; Ask</h2>
      <p style={{ color: '#9b9d9f', fontSize: 13, marginBottom: 16 }}>
        Pause video playback at a timestamp and show a question overlay. Playback resumes after the user answers.
      </p>
      <button className="admin-btn btn-with-icon" onClick={add} style={{ marginBottom: 16 }}>
        <PlusIcon />
        Add Pause Question
      </button>
      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th><AdminFieldLabel label="Chapter" help={HELP.pause.chapter} inline /></th>
              <th><AdminFieldLabel label="At (s)" help={HELP.pause.triggerAtSeconds} inline /></th>
              <th><AdminFieldLabel label="Prompt" help={HELP.pause.prompt} inline /></th>
              <th><AdminFieldLabel label="Field ID" help={HELP.pause.fieldId} inline /></th>
              <th><AdminFieldLabel label="Type" help={HELP.pause.inputType} inline /></th>
              <th><AdminFieldLabel label="Options" help={HELP.pause.options} inline /></th>
              <th><AdminFieldLabel label="Req" help={HELP.pause.required} inline /></th>
              <th><AdminFieldLabel label="On" help={HELP.pause.enabled} inline /></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {points.map(p => (
              <tr key={p.id}>
                <td>
                  <select className="admin-input" value={p.chapterId ?? ''}
                    onChange={e => {
                      const updated = { ...p, chapterId: e.target.value ? parseInt(e.target.value, 10) : null }
                      setPoints(ps => ps.map(x => x.id === p.id ? updated : x))
                      update(updated)
                    }}>
                    <option value="">All chapters</option>
                    {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                  </select>
                </td>
                <td>
                  <input className="admin-input" style={{ width: 70 }} type="number" min={0} value={p.triggerAtSeconds}
                    onChange={e => setPoints(ps => ps.map(x => x.id === p.id ? { ...x, triggerAtSeconds: parseInt(e.target.value, 10) || 0 } : x))}
                    onBlur={() => update(points.find(x => x.id === p.id)!)} />
                  <small style={{ color: '#5f6164', display: 'block' }}>{formatTime(p.triggerAtSeconds)}</small>
                </td>
                <td>
                  <input className="admin-input" value={p.prompt}
                    onChange={e => setPoints(ps => ps.map(x => x.id === p.id ? { ...x, prompt: e.target.value } : x))}
                    onBlur={() => update(points.find(x => x.id === p.id)!)} />
                </td>
                <td>
                  <input className="admin-input" style={{ width: 90 }} value={p.fieldId}
                    onChange={e => setPoints(ps => ps.map(x => x.id === p.id ? { ...x, fieldId: e.target.value } : x))}
                    onBlur={() => update(points.find(x => x.id === p.id)!)} />
                </td>
                <td>
                  <select className="admin-input" value={p.inputType}
                    onChange={e => {
                      const updated = { ...p, inputType: e.target.value }
                      setPoints(ps => ps.map(x => x.id === p.id ? updated : x))
                      update(updated)
                    }}>
                    {INPUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td>
                  <input className="admin-input" placeholder="opt1, opt2"
                    value={parseOptions(p.optionsJson).join(', ')}
                    onChange={e => {
                      const opts = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      const updated = { ...p, optionsJson: optionsToJson(opts) }
                      setPoints(ps => ps.map(x => x.id === p.id ? updated : x))
                    }}
                    onBlur={() => update(points.find(x => x.id === p.id)!)} />
                </td>
                <td>
                  <input type="checkbox" checked={p.required}
                    onChange={e => {
                      const updated = { ...p, required: e.target.checked }
                      setPoints(ps => ps.map(x => x.id === p.id ? updated : x))
                      update(updated)
                    }} />
                </td>
                <td>
                  <input type="checkbox" checked={p.isEnabled}
                    onChange={e => {
                      const updated = { ...p, isEnabled: e.target.checked }
                      setPoints(ps => ps.map(x => x.id === p.id ? updated : x))
                      update(updated)
                    }} />
                </td>
                <td>
                  <button className="admin-btn admin-btn-danger admin-btn-sm btn-with-icon" onClick={() => setDeleteId(p.id)}>
                    <DeleteIcon />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {points.length === 0 && <p style={{ color: '#5f6164' }}>No pause questions configured yet.</p>}
      </div>
      <ConfirmModal
        open={deleteId != null}
        title="Delete pause question?"
        message="Remove this in-video question from the demo."
        confirmLabel="Delete"
        danger
        onConfirm={() => { if (deleteId != null) remove(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </>
  )
}
