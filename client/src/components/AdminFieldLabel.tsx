import type { ReactNode } from 'react'
import { FieldHelp } from './FieldHelp'

interface Props {
  label: string
  help?: string
  htmlFor?: string
  children?: ReactNode
  inline?: boolean
}

export function AdminFieldLabel({ label, help, htmlFor, children, inline }: Props) {
  if (inline) {
    return (
      <span className="admin-label-row admin-label-row-inline">
        <span>{label}</span>
        {help && <FieldHelp text={help} />}
      </span>
    )
  }

  return (
    <div className="admin-field">
      <div className="admin-label-row">
        {htmlFor ? (
          <label htmlFor={htmlFor}>{label}</label>
        ) : (
          <span className="admin-label-text">{label}</span>
        )}
        {help && <FieldHelp text={help} />}
      </div>
      {children}
    </div>
  )
}
