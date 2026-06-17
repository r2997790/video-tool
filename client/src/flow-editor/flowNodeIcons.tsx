import type { ReactNode } from 'react'
import type { FlowNode } from '../types'
import { FLOW_NODE_COLORS } from './flowNodeColors'

type IconProps = { color: string }

function SvgIcon({ color, children }: IconProps & { children: ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <g stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  )
}

const icons: Record<FlowNode['type'], (color: string) => ReactNode> = {
  intro: (color) => (
    <SvgIcon color={color}>
      <path d="M3 4h12M3 9h8M3 14h10" />
    </SvgIcon>
  ),
  event: (color) => (
    <SvgIcon color={color}>
      <circle cx="9" cy="10" r="6" />
      <path d="M9 7v3l2 2" />
    </SvgIcon>
  ),
  question: (color) => (
    <SvgIcon color={color}>
      <circle cx="9" cy="9" r="6" />
      <path d="M7 7a2 2 0 0 1 3.5 1.5c0 1-1.5 1.5-1.5 2.5M9 13.5h.01" />
    </SvgIcon>
  ),
  branch: (color) => (
    <SvgIcon color={color}>
      <path d="M9 3v4M9 11v4M9 7h-4M9 7h4M5 7l-2 3M13 7l2 3" />
    </SvgIcon>
  ),
  chapter: (color) => (
    <SvgIcon color={color}>
      <rect x="3" y="3" width="12" height="12" rx="2" />
      <path d="M6 7h6M6 11h4" />
    </SvgIcon>
  ),
  video: (color) => (
    <SvgIcon color={color}>
      <rect x="3" y="5" width="12" height="8" rx="1.5" />
      <path d="M8 7.5l3 1.5-3 1.5V7.5z" fill={color} stroke="none" />
    </SvgIcon>
  ),
  toaster: (color) => (
    <SvgIcon color={color}>
      <path d="M4 12h10l-1-6H5l-1 6zM6 6V4h6v2" />
    </SvgIcon>
  ),
  pause: (color) => (
    <SvgIcon color={color}>
      <rect x="5" y="4" width="3" height="10" rx="0.5" fill={color} stroke="none" />
      <rect x="10" y="4" width="3" height="10" rx="0.5" fill={color} stroke="none" />
    </SvgIcon>
  ),
  aichat: (color) => (
    <SvgIcon color={color}>
      <path d="M4 5h10a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H8l-3 2v-2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
    </SvgIcon>
  ),
  outro: (color) => (
    <SvgIcon color={color}>
      <path d="M4 6h10M4 10h7M4 14h9" />
      <path d="M13 12l2 2-2 2" />
    </SvgIcon>
  ),
}

export function FlowNodeIcon({ type }: { type: FlowNode['type'] }) {
  const color = FLOW_NODE_COLORS[type] || '#9ca3af'
  const render = icons[type]
  return <>{render ? render(color) : null}</>
}
