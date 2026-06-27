import type { ReactNode } from 'react'

function ToolbarSvg({ children }: { children: ReactNode }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="toolbar-icon">
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  )
}

export function TimelineIcon() {
  return (
    <ToolbarSvg>
      <path d="M2 4h12M2 8h12M2 12h8" />
    </ToolbarSvg>
  )
}

export function VisualIcon() {
  return (
    <ToolbarSvg>
      <circle cx="4" cy="4" r="2" />
      <circle cx="12" cy="4" r="2" />
      <circle cx="8" cy="12" r="2" />
      <path d="M5.5 5.5L6.8 10.2M10.2 10.2L11.5 5.5" />
    </ToolbarSvg>
  )
}

export function AddStepIcon() {
  return (
    <ToolbarSvg>
      <path d="M8 3v10M3 8h10" />
    </ToolbarSvg>
  )
}

export function ImportIcon() {
  return (
    <ToolbarSvg>
      <path d="M8 2v8M5 7l3 3 3-3" />
      <path d="M2 12v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1" />
    </ToolbarSvg>
  )
}

export function ExportIcon() {
  return (
    <ToolbarSvg>
      <path d="M8 10V2M5 5l3-3 3 3" />
      <path d="M2 12v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1" />
    </ToolbarSvg>
  )
}

export function SaveIcon() {
  return (
    <ToolbarSvg>
      <path d="M3 2h8l2 2v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <path d="M5 2v4h6V2M5 11h6" />
    </ToolbarSvg>
  )
}

export function SavedIcon() {
  return (
    <ToolbarSvg>
      <path d="M3 8.5l3 3 7-7" />
    </ToolbarSvg>
  )
}
