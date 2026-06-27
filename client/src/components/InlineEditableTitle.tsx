import { useEffect, useRef, useState } from 'react'

interface InlineEditableTitleProps {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  placeholder?: string
}

export function InlineEditableTitle({
  value,
  onChange,
  readOnly = false,
  placeholder = 'Untitled flow',
}: InlineEditableTitleProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commit = () => {
    const next = draft.trim() || value || placeholder
    setDraft(next)
    if (next !== value) onChange(next)
    setEditing(false)
  }

  const cancel = () => {
    setDraft(value)
    setEditing(false)
  }

  if (readOnly) {
    return <h1 className="admin-inline-title admin-inline-title-readonly">{value || placeholder}</h1>
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="admin-inline-title-input"
        value={draft}
        aria-label="Project name"
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            cancel()
          }
        }}
      />
    )
  }

  return (
    <h1
      className="admin-inline-title"
      onClick={() => setEditing(true)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setEditing(true)
        }
      }}
      role="button"
      tabIndex={0}
      title="Click to rename"
    >
      {value || placeholder}
    </h1>
  )
}
