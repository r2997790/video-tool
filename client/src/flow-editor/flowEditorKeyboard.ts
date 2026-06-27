import type { FlowNode, FlowProject } from '../types'
import type { FlowEdit } from './applyFlowEdit'
import type { FlowClipboardPayload } from './flowClipboard'
import type { SelectedEdge } from './useFlowEditorState'

let sharedClipboard: FlowClipboardPayload | null = null

export function getFlowEditorClipboard(): FlowClipboardPayload | null {
  return sharedClipboard
}

export function setFlowEditorClipboard(payload: FlowClipboardPayload | null): void {
  sharedClipboard = payload
}

export function getSelectedNodeIds(
  project: FlowProject,
  selectedNodeIds: string[],
  selectedNodeId: string | null,
): string[] {
  const raw = selectedNodeIds.length
    ? selectedNodeIds
    : selectedNodeId
      ? [selectedNodeId]
      : []
  const projectIds = new Set(project.nodes.map(n => n.id))
  return raw.filter(id => projectIds.has(id))
}

export function buildClipboardFromProject(
  project: FlowProject,
  selectedIds: string[],
): FlowClipboardPayload | null {
  if (selectedIds.length === 0) return null
  const idSet = new Set(selectedIds)
  const nodes = project.nodes.filter(n => idSet.has(n.id))
  if (nodes.length === 0) return null
  const connections = (project.connections || [])
    .filter(c => idSet.has(c.from) && idSet.has(c.to))
    .map(c => ({ from: c.from, to: c.to }))
  return { nodes, connections }
}

function cloneNodesForPaste(payload: FlowClipboardPayload, offset = { x: 40, y: 40 }): {
  nodes: FlowNode[]
  idMap: Record<string, string>
} {
  const idMap: Record<string, string> = {}
  const nodes = payload.nodes.map(n => {
    const newId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    idMap[n.id] = newId
    return {
      ...n,
      id: newId,
      name: n.name,
      x: (n.x ?? 0) + offset.x,
      y: (n.y ?? 0) + offset.y,
    }
  })
  return { nodes, idMap }
}

export type FlowEditorKeyboardContext = {
  project: FlowProject
  selectedNodeIds: string[]
  selectedNodeId: string | null
  selectedEdge: SelectedEdge
  applyEdit: (edit: FlowEdit) => void
  onDeleteSelection: () => void
  selectNode: (node: FlowNode | null) => void
  setSelectedNodeIds: (ids: string[]) => void
  onA11yMessage?: (msg: string) => void
}

export function handleFlowEditorKeyDown(e: KeyboardEvent, ctx: FlowEditorKeyboardContext): boolean {
  const tag = (e.target as HTMLElement).tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return false

  const mod = e.ctrlKey || e.metaKey
  const ids = getSelectedNodeIds(ctx.project, ctx.selectedNodeIds, ctx.selectedNodeId)

  if (!mod && (e.key === 'Delete' || e.key === 'Backspace')) {
    if (ids.length > 0 || ctx.selectedEdge) {
      e.preventDefault()
      ctx.onDeleteSelection()
      ctx.onA11yMessage?.(ids.length > 0 ? `Deleted ${ids.length} node${ids.length === 1 ? '' : 's'}` : 'Connection removed')
      return true
    }
    return false
  }

  if (mod && e.key.toLowerCase() === 'c') {
    const clip = buildClipboardFromProject(ctx.project, ids)
    if (clip) {
      setFlowEditorClipboard(clip)
      e.preventDefault()
      ctx.onA11yMessage?.(`Copied ${clip.nodes.length} node${clip.nodes.length === 1 ? '' : 's'}`)
      return true
    }
    return false
  }

  if (mod && e.key.toLowerCase() === 'x') {
    const clip = buildClipboardFromProject(ctx.project, ids)
    if (clip) {
      setFlowEditorClipboard(clip)
      e.preventDefault()
      ctx.applyEdit({ type: 'removeNodes', nodeIds: ids })
      ctx.selectNode(null)
      ctx.setSelectedNodeIds([])
      ctx.onA11yMessage?.(`Cut ${clip.nodes.length} node${clip.nodes.length === 1 ? '' : 's'}`)
      return true
    }
    return false
  }

  if (mod && e.key.toLowerCase() === 'v') {
    const clip = getFlowEditorClipboard()
    if (!clip || clip.nodes.length === 0) return false

    e.preventDefault()
    const { nodes, idMap } = cloneNodesForPaste(clip)
    for (const node of nodes) {
      ctx.applyEdit({ type: 'insert', node, target: { scope: 'top' } })
    }
    for (const c of clip.connections) {
      const from = idMap[c.from]
      const to = idMap[c.to]
      if (from && to) {
        ctx.applyEdit({ type: 'connectNodes', from, to })
      }
    }
    if (nodes.length === 1) {
      ctx.selectNode(nodes[0])
      ctx.setSelectedNodeIds([nodes[0].id])
    } else {
      ctx.selectNode(null)
      ctx.setSelectedNodeIds(nodes.map(n => n.id))
    }
    ctx.onA11yMessage?.(`Pasted ${nodes.length} node${nodes.length === 1 ? '' : 's'}`)
    return true
  }

  return false
}
