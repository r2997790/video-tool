import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

export interface AdminMenuItem {
  id: string
  label: string
  description?: string
  color?: string
  icon?: ReactNode
  disabled?: boolean
  onClick: () => void
}

export interface AdminMenuGroup {
  label: string
  items: AdminMenuItem[]
}

interface AdminMenuProps {
  trigger: ReactNode
  groups?: AdminMenuGroup[]
  items?: AdminMenuItem[]
  align?: 'left' | 'right'
  onOpenChange?: (open: boolean) => void
}

export function AdminMenu({ trigger, groups, items, align = 'left', onOpenChange }: AdminMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const setOpenState = (next: boolean) => {
    setOpen(next)
    onOpenChange?.(next)
  }

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenState(false)
    }
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenState(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [open])

  const renderItem = (item: AdminMenuItem) => (
    <button
      key={item.id}
      type="button"
      role="menuitem"
      className="admin-menu-item btn-with-icon"
      disabled={item.disabled}
      onClick={() => {
        if (item.disabled) return
        item.onClick()
        setOpenState(false)
      }}
    >
      {item.icon}
      {item.color && !item.icon && <span className="admin-menu-item-dot" style={{ background: item.color }} aria-hidden="true" />}
      <span className="admin-menu-item-text">
        <span className="admin-menu-item-label">{item.label}</span>
        {item.description && <span className="admin-menu-item-desc">{item.description}</span>}
      </span>
    </button>
  )

  return (
    <div className="admin-menu" ref={rootRef}>
      <div
        className="admin-menu-trigger"
        role="button"
        tabIndex={0}
        onClick={() => setOpenState(!open)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpenState(!open)
          }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
      >
        {trigger}
      </div>
      {open && (
        <div
          id={menuId}
          role="menu"
          className={`admin-menu-panel admin-menu-panel-${align}`}
        >
          {groups?.map(group => (
            <div key={group.label} className="admin-menu-group">
              <div className="admin-menu-group-label" role="presentation">{group.label}</div>
              {group.items.map(renderItem)}
            </div>
          ))}
          {items?.map(renderItem)}
        </div>
      )}
    </div>
  )
}
