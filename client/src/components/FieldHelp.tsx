import { useId } from 'react'

interface Props {
  text: string
  id?: string
}

export function FieldHelp({ text, id: idProp }: Props) {
  const autoId = useId()
  const tooltipId = idProp ?? autoId

  return (
    <span className="admin-field-help">
      <button
        type="button"
        className="admin-field-help-btn"
        aria-describedby={tooltipId}
        aria-label="Field help"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      </button>
      <span id={tooltipId} role="tooltip" className="admin-field-help-tooltip">
        {text}
      </span>
    </span>
  )
}
