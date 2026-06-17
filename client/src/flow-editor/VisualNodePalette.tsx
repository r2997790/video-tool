import { useState } from 'react'
import { Panel } from '@xyflow/react'
import { FLOW_STEPS } from './flowSchema'
import { FLOW_NODE_COLORS } from './flowNodeColors'
import type { FlowNode } from '../types'

const DRAG_TYPE_KEY = 'application/reactflow'

export function getPaletteDragType(dataTransfer: DataTransfer): FlowNode['type'] | null {
  const raw = dataTransfer.getData(DRAG_TYPE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { type?: FlowNode['type'] }
    return parsed.type ?? null
  } catch {
    return null
  }
}

export function VisualNodePalette() {
  const [collapsed, setCollapsed] = useState(false)

  const onDragStart = (e: React.DragEvent, type: FlowNode['type']) => {
    e.dataTransfer.setData(DRAG_TYPE_KEY, JSON.stringify({ type }))
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <Panel position="top-left" className="flow-node-palette-panel">
      <div className={`flow-node-palette${collapsed ? ' is-collapsed' : ''}`}>
        <div className="flow-node-palette-header">
          <span className="flow-node-palette-title">Nodes</span>
          <button
            type="button"
            className="flow-node-palette-toggle"
            onClick={() => setCollapsed(v => !v)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand node palette' : 'Collapse node palette'}
          >
            {collapsed ? '+' : '−'}
          </button>
        </div>
        {!collapsed && (
          <div className="flow-node-palette-chips">
            {FLOW_STEPS.map(step => {
              const color = FLOW_NODE_COLORS[step.type] || '#666'
              return (
                <div
                  key={step.type}
                  className="flow-node-palette-chip"
                  draggable
                  onDragStart={e => onDragStart(e, step.type)}
                  title={step.desc}
                  style={{ borderColor: color }}
                >
                  <span className="flow-node-palette-chip-dot" style={{ background: color }} />
                  {step.label}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Panel>
  )
}
