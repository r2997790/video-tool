import { CancelIcon, CheckIcon, DeleteIcon } from './icons/uiIcons'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null

  return (
    <div className="admin-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h3 id="confirm-title" className="admin-modal-title">{title}</h3>
        <p className="admin-modal-message">{message}</p>
        <div className="admin-modal-actions">
          <button type="button" className="admin-btn admin-btn-sm btn-with-icon" onClick={onCancel}>
            <CancelIcon />
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`admin-btn admin-btn-sm btn-with-icon${danger ? ' admin-btn-danger' : ' admin-btn-primary'}`}
            onClick={onConfirm}
          >
            {danger ? <DeleteIcon /> : <CheckIcon />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
