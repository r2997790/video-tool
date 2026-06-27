import type { Edge, Node } from '@xyflow/react'
import type { FlowNode } from '../types'

export interface FlowClipboardPayload {
  nodes: FlowNode[]
  connections: Array<{ from: string; to: string }>
}

function nodeToFlowNode(n: Node): FlowNode {
  const raw = (n.data as { raw?: FlowNode }).raw
  return {
    id: n.id,
    type: (raw?.type || (n.data as { nodeType: string }).nodeType) as FlowNode['type'],
    name: (n.data as { label: string }).label,
    parameters: (n.data as { parameters: Record<string, unknown> }).parameters || raw?.parameters || {},
    x: n.position.x,
    y: n.position.y,
  }
}

export function buildClipboard(nodes: Node[], edges: Edge[], selectedIds: string[]): FlowClipboardPayload | null {
  if (selectedIds.length === 0) return null
  const idSet = new Set(selectedIds)
  const selectedNodes = nodes.filter(n => idSet.has(n.id)).map(nodeToFlowNode)
  const connections = edges
    .filter(e => idSet.has(e.source) && idSet.has(e.target))
    .map(e => ({ from: e.source, to: e.target }))
  return { nodes: selectedNodes, connections }
}

export function pasteClipboard(
  payload: FlowClipboardPayload,
  toReactFlowNodes: (nodes: FlowNode[]) => Node[],
  offset = { x: 40, y: 40 },
): { nodes: Node[]; edges: Edge[]; idMap: Record<string, string> } {
  const idMap: Record<string, string> = {}
  const newFlowNodes: FlowNode[] = payload.nodes.map(n => {
    const newId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    idMap[n.id] = newId
    return {
      ...n,
      id: newId,
      x: (n.x ?? 0) + offset.x,
      y: (n.y ?? 0) + offset.y,
    }
  })

  const newNodes = toReactFlowNodes(newFlowNodes)
  const newEdges: Edge[] = payload.connections.map((c, i) => ({
    id: `e-paste-${idMap[c.from]}-${idMap[c.to]}-${i}`,
    source: idMap[c.from],
    target: idMap[c.to],
    animated: true,
    deletable: true,
    reconnectable: true,
    style: { stroke: '#55e6c1', strokeWidth: 1.5 },
  }))

  return { nodes: newNodes, edges: newEdges, idMap }
}
