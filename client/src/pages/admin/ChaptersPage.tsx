import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../api'
import { AdminFieldLabel } from '../../components/AdminFieldLabel'
import { ConfirmModal } from '../../components/ConfirmModal'
import { HELP } from '../../adminHelpText'
import { ArrowDownIcon, ArrowUpIcon, DeleteIcon, PlusIcon } from '../../components/icons/uiIcons'

type ShowDurationMode = 'global' | 'show' | 'hide'

interface ChapterRow {
  id: number
  slug: string
  name: string
  description: string
  videoLink: string
  duration: string
  sortOrder: number
  isLocked: boolean
  showDuration?: boolean | null
  gateJson: string | null
  totalWatchSeconds?: number
  viewerCount?: number
}

function formatWatchTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function toShowDurationMode(value: boolean | null | undefined): ShowDurationMode {
  if (value === true) return 'show'
  if (value === false) return 'hide'
  return 'global'
}

function fromShowDurationMode(mode: ShowDurationMode): boolean | null {
  if (mode === 'show') return true
  if (mode === 'hide') return false
  return null
}

export function ChaptersPage() {
  const { slug = 'default' } = useParams<{ slug: string }>()
  const [chapters, setChapters] = useState<ChapterRow[]>([])
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const load = () => api.getAdminChapters(slug).then(setChapters as (c: unknown) => void)
  useEffect(() => { load() }, [slug])

  const update = async (ch: ChapterRow) => {
    await api.updateChapter(slug, ch.id, {
      slug: ch.slug,
      name: ch.name,
      description: ch.description,
      videoLink: ch.videoLink,
      duration: ch.duration,
      sortOrder: ch.sortOrder,
      isLocked: ch.isLocked,
      showDuration: ch.showDuration ?? null,
      gateJson: ch.gateJson,
    })
  }

  const add = async () => {
    await api.createChapter(slug, {
      name: 'New Chapter',
      description: '',
      videoLink: '',
      duration: '0:00',
      isLocked: false,
    })
    load()
  }

  const remove = async (id: number) => {
    await api.deleteChapter(slug, id)
    load()
  }

  const move = async (idx: number, dir: -1 | 1) => {
    const next = [...chapters]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setChapters(next)
    await api.reorderChapters(slug, next.map(c => c.id))
  }

  return (
    <>
      <h2>Chapters</h2>
      <button className="admin-btn btn-with-icon" onClick={add} style={{ marginBottom: 16 }}>
        <PlusIcon />
        Add Chapter
      </button>
      <div className="admin-card" style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th><AdminFieldLabel label="Chapter Name" help={HELP.chapters.name} inline /></th>
              <th><AdminFieldLabel label="Description" help={HELP.chapters.description} inline /></th>
              <th><AdminFieldLabel label="Video Link" help={HELP.chapters.videoLink} inline /></th>
              <th><AdminFieldLabel label="Duration" help={HELP.chapters.duration} inline /></th>
              <th><AdminFieldLabel label="Show Duration" help={HELP.chapters.showDuration} inline /></th>
              <th>Watch Time</th>
              <th>Viewers</th>
              <th><AdminFieldLabel label="Locked" help={HELP.chapters.locked} inline /></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {chapters.map((ch, idx) => (
              <tr key={ch.id}>
                <td>
                  <button className="admin-btn admin-btn-sm btn-with-icon" onClick={() => move(idx, -1)} aria-label="Move up">
                    <ArrowUpIcon />
                  </button>
                  <button className="admin-btn admin-btn-sm btn-with-icon" onClick={() => move(idx, 1)} aria-label="Move down">
                    <ArrowDownIcon />
                  </button>
                </td>
                <td>
                  <input className="admin-input" value={ch.name}
                    onChange={e => setChapters(cs => cs.map(c => c.id === ch.id ? { ...c, name: e.target.value } : c))}
                    onBlur={() => update(chapters.find(c => c.id === ch.id)!)} />
                </td>
                <td>
                  <input className="admin-input" value={ch.description}
                    onChange={e => setChapters(cs => cs.map(c => c.id === ch.id ? { ...c, description: e.target.value } : c))}
                    onBlur={() => update(chapters.find(c => c.id === ch.id)!)} />
                </td>
                <td>
                  <input className="admin-input" value={ch.videoLink} placeholder="YouTube ID/URL or MP4"
                    onChange={e => setChapters(cs => cs.map(c => c.id === ch.id ? { ...c, videoLink: e.target.value } : c))}
                    onBlur={() => update(chapters.find(c => c.id === ch.id)!)} />
                </td>
                <td>
                  <input className="admin-input" style={{ width: 70 }} value={ch.duration}
                    onChange={e => setChapters(cs => cs.map(c => c.id === ch.id ? { ...c, duration: e.target.value } : c))}
                    onBlur={() => update(chapters.find(c => c.id === ch.id)!)} />
                </td>
                <td>
                  <select className="admin-input" style={{ width: 120 }}
                    value={toShowDurationMode(ch.showDuration)}
                    onChange={e => {
                      const showDuration = fromShowDurationMode(e.target.value as ShowDurationMode)
                      setChapters(cs => cs.map(c => c.id === ch.id ? { ...c, showDuration } : c))
                      update({ ...ch, showDuration })
                    }}>
                    <option value="global">Global</option>
                    <option value="show">Show</option>
                    <option value="hide">Hide</option>
                  </select>
                </td>
                <td style={{ whiteSpace: 'nowrap', color: 'var(--admin-accent)' }}>
                  {formatWatchTime(ch.totalWatchSeconds ?? 0)}
                </td>
                <td>{ch.viewerCount ?? 0}</td>
                <td>
                  <input type="checkbox" checked={ch.isLocked}
                    onChange={e => {
                      setChapters(cs => cs.map(c => c.id === ch.id ? { ...c, isLocked: e.target.checked } : c))
                      update({ ...ch, isLocked: e.target.checked })
                    }} />
                </td>
                <td>
                  <button className="admin-btn admin-btn-danger admin-btn-sm btn-with-icon" onClick={() => setDeleteId(ch.id)}>
                    <DeleteIcon />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmModal
        open={deleteId != null}
        title="Delete chapter?"
        message="This removes the chapter and its analytics. This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => { if (deleteId != null) remove(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </>
  )
}
