import { useMemo } from 'react'
import { loadFlowLibrary, type FlowLibraryEntry } from '../flow-editor/flowLibrary'

interface FlowLibraryModalProps {
  open: boolean
  onClose: () => void
  onSelect: (entry: FlowLibraryEntry) => void
}

export function FlowLibraryModal({ open, onClose, onSelect }: FlowLibraryModalProps) {
  const templates = useMemo(() => loadFlowLibrary(), [])

  if (!open) return null

  return (
    <div className="admin-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="admin-modal admin-modal-wide" role="dialog" aria-modal="true">
        <h3 className="admin-modal-title">Import from flow library</h3>
        <p className="admin-modal-message">Choose a starter template. A new flow will be created with this structure.</p>
        <div className="flow-library-modal">
          {templates.length === 0 ? (
            <p className="admin-field-hint">No templates found in flow-library.</p>
          ) : (
            templates.map(entry => (
              <button
                key={entry.id}
                type="button"
                className="flow-library-item"
                onClick={() => onSelect(entry)}
              >
                <span className="flow-library-item-title">{entry.title}</span>
                <span className="flow-library-item-desc">{entry.description}</span>
              </button>
            ))
          )}
        </div>
        <div className="admin-modal-actions">
          <button type="button" className="admin-btn admin-btn-sm" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
