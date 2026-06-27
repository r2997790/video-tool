import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../api'
import type { ToasterType } from '../../types'
import { AdminFieldLabel } from '../../components/AdminFieldLabel'
import { ConfirmModal } from '../../components/ConfirmModal'
import { DeleteIcon, PlusIcon } from '../../components/icons/uiIcons'
import { HELP } from '../../adminHelpText'
interface ToasterRow {
  id: number
  chapterId: number | null
  triggerAtSeconds: number
  durationSeconds: number
  title: string
  message: string
  toasterType: ToasterType
  imageUrl: string | null
  linkUrl: string | null
  linkNewWindow: boolean
  thumbnailUrl: string | null
  downloadUrl: string | null
  downloadFileName: string | null
  bannerPosition: string
  isEnabled: boolean
  sortOrder: number
}

export function ToastersPage() {
  const { slug = 'default' } = useParams<{ slug: string }>()
  const [toasters, setToasters] = useState<ToasterRow[]>([])
  const [chapters, setChapters] = useState<Array<{ id: number; name: string }>>([])
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const load = () => api.getToasters(slug).then(rows =>
    setToasters(rows.map(t => ({
      ...t,
      toasterType: (t.toasterType || 'popup') as ToasterType,
      imageUrl: t.imageUrl ?? null,
      linkUrl: t.linkUrl ?? null,
      linkNewWindow: !!t.linkNewWindow,
      thumbnailUrl: t.thumbnailUrl ?? null,
      downloadUrl: t.downloadUrl ?? null,
      downloadFileName: t.downloadFileName ?? null,
      bannerPosition: t.bannerPosition || 'top',
    })))
  )

  useEffect(() => {
    load()
    api.getAdminChapters(slug).then(cs => setChapters(cs.map(c => ({ id: c.id, name: c.name }))))
  }, [slug])

  const add = async () => {
    await api.createToaster(slug, {
      chapterId: chapters[0]?.id ?? null,
      triggerAtSeconds: 30,
      durationSeconds: 5,
      title: 'Tip',
      message: 'Your message here',
      toasterType: 'popup',
      isEnabled: true,
    })
    load()
  }

  const update = async (t: ToasterRow) => {
    await api.updateToaster(slug, t.id, {
      chapterId: t.chapterId,
      triggerAtSeconds: t.triggerAtSeconds,
      durationSeconds: t.durationSeconds,
      title: t.title,
      message: t.message,
      toasterType: t.toasterType,
      imageUrl: t.imageUrl,
      linkUrl: t.linkUrl,
      linkNewWindow: t.linkNewWindow,
      thumbnailUrl: t.thumbnailUrl,
      downloadUrl: t.downloadUrl,
      downloadFileName: t.downloadFileName,
      bannerPosition: t.bannerPosition,
      isEnabled: t.isEnabled,
      sortOrder: t.sortOrder,
    })
  }

  const remove = async (id: number) => {
    await api.deleteToaster(slug, id)
    load()
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <>
      <h2>Video Toasters</h2>
      <p style={{ color: '#9b9d9f', fontSize: 13, marginBottom: 16 }}>
        Popup, banner, graphic, or download prompts during playback.
      </p>
      <button className="admin-btn btn-with-icon" onClick={add} style={{ marginBottom: 16 }}>
        <PlusIcon />
        Add Toaster
      </button>
      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th><AdminFieldLabel label="Type" help={HELP.toasters.type} inline /></th>
              <th><AdminFieldLabel label="Chapter" help={HELP.toasters.chapter} inline /></th>
              <th><AdminFieldLabel label="Trigger" help={HELP.toasters.triggerAtSeconds} inline /></th>
              <th><AdminFieldLabel label="Dur" help={HELP.toasters.durationSeconds} inline /></th>
              <th><AdminFieldLabel label="Title" help={HELP.toasters.title} inline /></th>
              <th><AdminFieldLabel label="Message" help={HELP.toasters.message} inline /></th>
              <th>Extra</th>
              <th><AdminFieldLabel label="On" help={HELP.toasters.enabled} inline /></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {toasters.map(t => (
              <tr key={t.id}>
                <td>
                  <select className="admin-input" value={t.toasterType}
                    onChange={e => {
                      const updated = { ...t, toasterType: e.target.value as ToasterType }
                      setToasters(ts => ts.map(x => x.id === t.id ? updated : x))
                      update(updated)
                    }}>
                    <option value="popup">Popup</option>
                    <option value="banner">Banner</option>
                    <option value="graphic">Graphic</option>
                    <option value="download">Download</option>
                  </select>
                </td>
                <td>
                  <select className="admin-input" value={t.chapterId ?? ''}
                    onChange={e => {
                      const updated = { ...t, chapterId: e.target.value ? parseInt(e.target.value, 10) : null }
                      setToasters(ts => ts.map(x => x.id === t.id ? updated : x))
                      update(updated)
                    }}>
                    <option value="">All</option>
                    {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                  </select>
                </td>
                <td>
                  <input className="admin-input" style={{ width: 60 }} type="number" min={0} value={t.triggerAtSeconds}
                    onChange={e => setToasters(ts => ts.map(x => x.id === t.id ? { ...x, triggerAtSeconds: parseInt(e.target.value, 10) || 0 } : x))}
                    onBlur={() => update(toasters.find(x => x.id === t.id)!)} />
                  <small style={{ color: '#5f6164', display: 'block' }}>{formatTime(t.triggerAtSeconds)}</small>
                </td>
                <td>
                  <input className="admin-input" style={{ width: 50 }} type="number" min={1} value={t.durationSeconds}
                    onChange={e => setToasters(ts => ts.map(x => x.id === t.id ? { ...x, durationSeconds: parseInt(e.target.value, 10) || 5 } : x))}
                    onBlur={() => update(toasters.find(x => x.id === t.id)!)} />
                </td>
                <td>
                  <input className="admin-input" value={t.title}
                    onChange={e => setToasters(ts => ts.map(x => x.id === t.id ? { ...x, title: e.target.value } : x))}
                    onBlur={() => update(toasters.find(x => x.id === t.id)!)} />
                </td>
                <td>
                  <input className="admin-input" value={t.message}
                    onChange={e => setToasters(ts => ts.map(x => x.id === t.id ? { ...x, message: e.target.value } : x))}
                    onBlur={() => update(toasters.find(x => x.id === t.id)!)} />
                </td>
                <td>
                  {t.toasterType === 'graphic' && (
                    <>
                      <input className="admin-input" placeholder="Image URL" value={t.imageUrl || ''}
                        onChange={e => setToasters(ts => ts.map(x => x.id === t.id ? { ...x, imageUrl: e.target.value } : x))}
                        onBlur={() => update(toasters.find(x => x.id === t.id)!)} />
                      <input className="admin-input" placeholder="Link URL (optional)" value={t.linkUrl || ''}
                        onChange={e => setToasters(ts => ts.map(x => x.id === t.id ? { ...x, linkUrl: e.target.value } : x))}
                        onBlur={() => update(toasters.find(x => x.id === t.id)!)} />
                      <label style={{ fontSize: 12, color: '#9b9d9f' }}>
                        <input type="checkbox" checked={t.linkNewWindow}
                          onChange={e => {
                            const updated = { ...t, linkNewWindow: e.target.checked }
                            setToasters(ts => ts.map(x => x.id === t.id ? updated : x))
                            update(updated)
                          }} /> Open link in new window
                      </label>
                    </>
                  )}
                  {t.toasterType === 'download' && (
                    <>
                      <input className="admin-input" placeholder="Thumbnail URL" value={t.thumbnailUrl || ''}
                        onChange={e => setToasters(ts => ts.map(x => x.id === t.id ? { ...x, thumbnailUrl: e.target.value } : x))}
                        onBlur={() => update(toasters.find(x => x.id === t.id)!)} />
                      <input className="admin-input" placeholder="Download URL" value={t.downloadUrl || ''}
                        onChange={e => setToasters(ts => ts.map(x => x.id === t.id ? { ...x, downloadUrl: e.target.value } : x))}
                        onBlur={() => update(toasters.find(x => x.id === t.id)!)} />
                      <input className="admin-input" placeholder="File name" value={t.downloadFileName || ''}
                        onChange={e => setToasters(ts => ts.map(x => x.id === t.id ? { ...x, downloadFileName: e.target.value } : x))}
                        onBlur={() => update(toasters.find(x => x.id === t.id)!)} />
                    </>
                  )}
                  {t.toasterType === 'banner' && (
                    <select className="admin-input" value={t.bannerPosition}
                      onChange={e => {
                        const updated = { ...t, bannerPosition: e.target.value }
                        setToasters(ts => ts.map(x => x.id === t.id ? updated : x))
                        update(updated)
                      }}>
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                    </select>
                  )}
                </td>
                <td>
                  <input type="checkbox" checked={t.isEnabled}
                    onChange={e => {
                      const updated = { ...t, isEnabled: e.target.checked }
                      setToasters(ts => ts.map(x => x.id === t.id ? updated : x))
                      update(updated)
                    }} />
                </td>
                <td>
                  <button className="admin-btn admin-btn-danger admin-btn-sm btn-with-icon" onClick={() => setDeleteId(t.id)}>
                    <DeleteIcon />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {toasters.length === 0 && <p style={{ color: '#5f6164' }}>No toasters configured yet.</p>}
      </div>
      <ConfirmModal
        open={deleteId != null}
        title="Delete pop-up?"
        message="Remove this toaster from the demo."
        confirmLabel="Delete"
        danger
        onConfirm={() => { if (deleteId != null) remove(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </>
  )
}
