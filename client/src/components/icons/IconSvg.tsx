import type { ReactNode } from 'react'

interface IconSvgProps {
  children: ReactNode
  className?: string
}

export function IconSvg({ children, className = 'ui-icon' }: IconSvgProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  )
}
