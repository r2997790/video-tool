import { useEffect, useState } from 'react'
import { slugify } from '../utils/slugify'

export type NewFlowWizardResult = {
  projectName: string
  slug: string
}

interface NewFlowWizardProps {
  open: boolean
  onClose: () => void
  onCreate: (result: NewFlowWizardResult) => void
}

export function NewFlowWizard({ open, onClose, onCreate }: NewFlowWizardProps) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    setName('')
    setSlug('')
    setSlugTouched(false)
  }, [open])

  useEffect(() => {
    if (!slugTouched && name) setSlug(slugify(name))
  }, [name, slugTouched])

  if (!open) return null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate({
      projectName: trimmed,
      slug: slugify(slug || trimmed),
    })
  }

  return (
    <div className="admin-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="admin-modal admin-modal-wide" role="dialog" aria-modal="true">
        <h3 className="admin-modal-title">Create a new demo flow</h3>
        <p className="admin-modal-message">Give your demo a name. You can add videos and share a link in a few minutes.</p>
        <form onSubmit={submit}>
          <div className="admin-field">
            <label>Demo name</label>
            <input
              className="admin-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Product walkthrough"
              autoFocus
            />
          </div>
          <div className="admin-field">
            <label>URL slug</label>
            <input
              className="admin-input"
              value={slug}
              onChange={e => { setSlug(e.target.value); setSlugTouched(true) }}
              placeholder="product-walkthrough"
            />
            <p className="admin-field-hint">Public link: /flow/{slug || 'your-slug'}</p>
          </div>
          <div className="admin-field">
            <p className="admin-field-hint">After creating, you&apos;ll land on the Flow editor (Timeline view) to add chapters, videos, and interactive steps.</p>
          </div>
          <div className="admin-modal-actions">
            <button type="button" className="admin-btn admin-btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="admin-btn admin-btn-sm admin-btn-primary" disabled={!name.trim()}>
              Create flow
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
