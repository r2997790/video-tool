import { useEffect, useState } from 'react'
import { api } from '../api'
import type { AdminChapter } from '../types'
import { AdminFieldLabel } from '../components/AdminFieldLabel'
import { FieldHelp } from '../components/FieldHelp'
import { HELP } from '../adminHelpText'

interface Props {
  flowSlug: string
  chapterId: number | undefined
  chapters: AdminChapter[]
  onChapterIdChange: (id: number) => void
  onChaptersReload: () => void
}

type ShowDurationMode = 'global' | 'show' | 'hide'

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

export function ChapterNodeEditor({ flowSlug, chapterId, chapters, onChapterIdChange, onChaptersReload }: Props) {
  const selected = chapters.find(c => c.id === chapterId)
  const [draft, setDraft] = useState<Partial<AdminChapter>>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (selected) {
      setDraft({
        name: selected.name,
        description: selected.description,
        videoLink: selected.videoLink,
        duration: selected.duration,
        isLocked: selected.isLocked,
        showDuration: selected.showDuration ?? null,
      })
    } else {
      setDraft({})
    }
  }, [chapterId, selected?.id, selected?.name, selected?.description, selected?.videoLink,
    selected?.duration, selected?.isLocked, selected?.showDuration])

  const createChapter = async () => {
    const created = await api.createChapter(flowSlug, {
      name: 'New Chapter',
      description: '',
      videoLink: '',
      duration: '0:00',
      isLocked: false,
    }) as AdminChapter
    onChaptersReload()
    onChapterIdChange(created.id)
  }

  const saveChapter = async () => {
    if (!chapterId || !selected) return
    setSaving(true)
    try {
      await api.updateChapter(flowSlug, chapterId, {
        slug: selected.slug,
        name: draft.name ?? selected.name,
        description: draft.description ?? '',
        videoLink: draft.videoLink ?? '',
        duration: draft.duration ?? '',
        sortOrder: selected.sortOrder,
        isLocked: draft.isLocked ?? false,
        showDuration: draft.showDuration ?? null,
        gateJson: selected.gateJson,
      })
      onChaptersReload()
    } finally {
      setSaving(false)
    }
  }

  const uploadVideo = async (file: File) => {
    setUploading(true)
    try {
      const { url } = await api.uploadMedia(file)
      setDraft(d => ({ ...d, videoLink: url }))
    } finally {
      setUploading(false)
    }
  }

  const showDurationMode = toShowDurationMode(draft.showDuration)

  return (
    <>
      <AdminFieldLabel label="Chapter" help={HELP.flowEditor.chapterSelect}>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="admin-input" style={{ flex: 1 }} value={chapterId || ''}
            onChange={e => onChapterIdChange(parseInt(e.target.value, 10))}>
            <option value="">Select chapter…</option>
            {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
          </select>
          <button type="button" className="admin-btn admin-btn-sm" onClick={createChapter}>New</button>
        </div>
      </AdminFieldLabel>

      {chapterId && selected && (
        <>
          <AdminFieldLabel label="Name" help={HELP.flowEditor.chapterName}>
            <input className="admin-input" value={draft.name ?? ''}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
          </AdminFieldLabel>
          <AdminFieldLabel label="Description" help={HELP.flowEditor.chapterDescription}>
            <textarea className="admin-textarea" value={draft.description ?? ''}
              onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
          </AdminFieldLabel>
          <AdminFieldLabel label="Video link" help={HELP.flowEditor.chapterVideoLink}>
            <input className="admin-input" value={draft.videoLink ?? ''}
              onChange={e => setDraft(d => ({ ...d, videoLink: e.target.value }))} />
            <input type="file" accept="video/*" style={{ marginTop: 8 }}
              disabled={uploading}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadVideo(f) }} />
            {uploading && <span style={{ fontSize: 12, color: '#9b9d9f' }}>Uploading…</span>}
          </AdminFieldLabel>
          <AdminFieldLabel label="Duration" help={HELP.flowEditor.chapterDuration}>
            <input className="admin-input" style={{ width: 100 }} value={draft.duration ?? ''}
              onChange={e => setDraft(d => ({ ...d, duration: e.target.value }))} />
          </AdminFieldLabel>
          <AdminFieldLabel label="Show duration" help={HELP.flowEditor.chapterShowDuration}>
            <select className="admin-input" value={showDurationMode}
              onChange={e => setDraft(d => ({
                ...d,
                showDuration: fromShowDurationMode(e.target.value as ShowDurationMode),
              }))}>
              <option value="global">Use global setting</option>
              <option value="show">Show</option>
              <option value="hide">Hide</option>
            </select>
          </AdminFieldLabel>
          <div className="admin-field">
            <div className="admin-label-row">
              <span className="admin-label-text">Locked</span>
              <FieldHelp text={HELP.flowEditor.chapterLocked} />
            </div>
            <label>
              <input type="checkbox" checked={!!draft.isLocked}
                onChange={e => setDraft(d => ({ ...d, isLocked: e.target.checked }))} />
              {' '}Requires gate form
            </label>
          </div>
          <button type="button" className="admin-btn admin-btn-sm" onClick={saveChapter} disabled={saving}>
            {saving ? 'Saving…' : 'Save chapter'}
          </button>
        </>
      )}
    </>
  )
}
