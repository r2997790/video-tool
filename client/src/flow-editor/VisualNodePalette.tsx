import { useCallback, useRef, useState } from 'react'
import { Panel } from '@xyflow/react'
import { FLOW_STEPS } from './flowSchema'
import { FLOW_NODE_COLORS } from './flowNodeColors'
import { FlowNodeIcon } from './flowNodeIcons'
import type { FlowNode } from '../types'

const DRAG_TYPE_KEY = 'application/reactflow'

export function getPaletteDragType(dataTransfer: DataTransfer): FlowNode['type'] | null {
  const raw = dataTransfer.getData(DRAG_TYPE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { type?: FlowNode['type'] }
      if (parsed.type) return parsed.type
    } catch { /* fall through */ }
  }
  const plain = dataTransfer.getData('text/plain')
  if (plain && FLOW_STEPS.some(s => s.type === plain)) {
    return plain as FlowNode['type']
  }
  return null
}

interface VisualNodePaletteProps {
  onPaletteDragStart: (type: FlowNode['type']) => void
  onPaletteDragEnd: () => void
}

export function VisualNodePalette({ onPaletteDragStart, onPaletteDragEnd }: VisualNodePaletteProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)

  const onChipDragStart = (e: React.DragEvent, type: FlowNode['type']) => {
    e.stopPropagation()
    onPaletteDragStart(type)
    e.dataTransfer.setData(DRAG_TYPE_KEY, JSON.stringify({ type }))
    e.dataTransfer.setData('text/plain', type)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onChipDragEnd = () => {
    onPaletteDragEnd()
  }

  const onHeaderPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    }
  }, [offset.x, offset.y])

  const onHeaderPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setOffset({ x: dragRef.current.originX + dx, y: dragRef.current.originY + dy })
  }, [])

  const onHeaderPointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
  }, [])

  return (
    <Panel
      position="top-left"
      className="flow-node-palette-panel nodrag nopan"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      <div className="flow-node-palette nodrag nopan">
        <div
          className="flow-node-palette-header nodrag nopan"
          onPointerDown={onHeaderPointerDown}
          onPointerMove={onHeaderPointerMove}
          onPointerUp={onHeaderPointerUp}
          onPointerCancel={onHeaderPointerUp}
        >
          <span className="flow-node-palette-grip" aria-hidden="true">⠿</span>
        </div>
        <div className="flow-node-palette-icons nodrag nopan">
          {FLOW_STEPS.map(step => {
            const color = FLOW_NODE_COLORS[step.type] || '#666'
            return (
              <div
                key={step.type}
                className="flow-node-palette-icon nodrag nopan"
                draggable
                onDragStart={e => onChipDragStart(e, step.type)}
                onDragEnd={onChipDragEnd}
                aria-label={step.label}
                data-label={step.label}
                style={{ borderColor: color }}
              >
                <FlowNodeIcon type={step.type} />
              </div>
            )
          })}
        </div>
      </div>
    </Panel>
  )
}
