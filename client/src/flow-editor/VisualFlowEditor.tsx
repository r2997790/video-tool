import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
  type OnSelectionChangeParams,
  SelectionMode,
  Handle,
  Position,
  NodeResizer,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { FlowNode, FlowProject } from '../types'
import { FLOW_NODE_COLORS } from './flowNodeColors'
import { canConnect } from './flowSchema'
import { buildClipboard, pasteClipboard, type FlowClipboardPayload } from './flowClipboard'
import {
  dropTargetToEdit,
  dropTargetToInsertTarget,
  isFreePositionNode,
  projectToGraph,
  resolveDropTarget,
  resolveInsertDropTarget,
  resolveVideoDropTarget,
} from './flowGraphLayout'
import { insertNodeAtTarget } from './flowInsert'
import { getPaletteDragType, VisualNodePalette } from './VisualNodePalette'
import type { FlowEditorState } from './useFlowEditorState'
import { useToast } from '../components/Toast'

function FlowNodeCard({ data }: { data: { label: string; nodeType: string; parameters: Record<string, unknown>; chapterSubtitle?: string; videoSubtitle?: string } }) {
  const color = FLOW_NODE_COLORS[data.nodeType] || '#666'
  return (
    <div className="flow-canvas-node" style={{ borderColor: color }}>
      <Handle type="target" position={Position.Left} />
      <div className="flow-canvas-node-type" style={{ background: color }}>{data.nodeType}</div>
      <div className="flow-canvas-node-label">{data.label}</div>
      {data.nodeType === 'chapter' && data.chapterSubtitle && (
        <div className="flow-canvas-node-sub">{data.chapterSubtitle}</div>
      )}
      {data.nodeType === 'video' && data.videoSubtitle && (
        <div className="flow-canvas-node-sub">{data.videoSubtitle}</div>
      )}
      {data.nodeType === 'toaster' && (
        <div className="flow-canvas-node-sub">@ {String(data.parameters.triggerAtSeconds ?? 0)}s</div>
      )}
      {data.nodeType === 'pause' && (
        <div className="flow-canvas-node-sub">Pause @ {String(data.parameters.triggerAtSeconds ?? 0)}s</div>
      )}
      {data.nodeType === 'event' && (
        <div className="flow-canvas-node-sub">{(data.parameters.mode as string) === 'slug' ? String(data.parameters.eventSlug || 'event') : 'Countdown'}</div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

function VideoDropZoneNode({ data }: { data: { videoNodeId: string; isDropHover?: boolean } }) {
  return (
    <div className={`flow-video-drop-zone${data.isDropHover ? ' is-over' : ''}`}>
      Drop pause / toaster / question / AI chat here
    </div>
  )
}

function ChapterGroupNode({
  data,
  selected,
}: {
  data: {
    label: string
    chapterSubtitle?: string
    isDropTarget?: boolean
    insertionIndex?: number | null
  }
  selected?: boolean
}) {
  return (
    <div className={`flow-chapter-group${selected ? ' is-selected' : ''}${data.isDropTarget ? ' is-drop-target' : ''}`}>
      <NodeResizer minWidth={280} minHeight={160} isVisible={selected} />
      <div className="flow-chapter-group-header">
        <span className="flow-chapter-group-icon">▣</span>
        <span className="flow-chapter-group-title">{data.label}</span>
        {data.chapterSubtitle && <span className="flow-chapter-group-sub">{data.chapterSubtitle}</span>}
      </div>
      <div className="flow-chapter-group-body">
        {data.isDropTarget && data.insertionIndex != null && (
          <div
            className="flow-chapter-insertion-line"
            style={{ top: `${64 + (data.insertionIndex + 1) * 84}px` }}
          />
        )}
        Drop nodes here
      </div>
    </div>
  )
}

const nodeTypes = { flowNode: FlowNodeCard, chapterGroup: ChapterGroupNode, videoDropZone: VideoDropZoneNode }

function toReactFlowEdges(connections: FlowProject['connections']): Edge[] {
  return connections.map((c, i) => ({
    id: `e-${c.from}-${c.to}-${i}`,
    source: c.from,
    target: c.to,
    animated: true,
    deletable: true,
    reconnectable: true,
    style: { stroke: '#77c043', strokeWidth: 1.5 },
  }))
}

function nodeFromCanvas(n: Node): FlowNode {
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

function absolutePosition(node: Node, graphNodes: Node[]): { x: number; y: number } {
  let x = node.position.x
  let y = node.position.y
  let parentId = node.parentId
  while (parentId) {
    const parent = graphNodes.find(n => n.id === parentId)
    if (!parent) break
    x += parent.position.x
    y += parent.position.y
    parentId = parent.parentId
  }
  return { x, y }
}

interface VisualFlowEditorProps {
  state: FlowEditorState
}

function VisualFlowEditorCanvas({ state }: VisualFlowEditorProps) {
  const {
    project,
    applyEdit,
    chapters,
    chapterVideos,
    selectNode,
    selectEdge,
    selectedNodeId,
    selectedNodeIds,
    setSelectedNodeIds,
    selectedEdge,
  } = state
  const toast = useToast()
  const { screenToFlowPosition } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [dragOverChapterId, setDragOverChapterId] = useState<string | null>(null)
  const [dragOverVideoId, setDragOverVideoId] = useState<string | null>(null)
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null)
  const [a11yMessage, setA11yMessage] = useState('')
  const canvasRef = useRef<HTMLDivElement>(null)
  const clipboardRef = useRef<FlowClipboardPayload | null>(null)
  const syncingRef = useRef(false)
  const nodesRef = useRef<Node[]>([])
  const fitViewOnceRef = useRef(false)
  const paletteDragTypeRef = useRef<FlowNode['type'] | null>(null)

  const onPaletteDragStart = useCallback((type: FlowNode['type']) => {
    paletteDragTypeRef.current = type
  }, [])

  const onPaletteDragEnd = useCallback(() => {
    paletteDragTypeRef.current = null
  }, [])

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  const buildGraph = useCallback(() => {
    const graph = projectToGraph(project, chapters, chapterVideos)
    return graph.map(n => {
      const nodeType = (n.data as { nodeType: string }).nodeType
      const params = (n.data as { parameters: Record<string, unknown> }).parameters
      if (nodeType === 'chapter') {
        const chapterId = params.chapterId as number | undefined
        const ch = chapters.find(c => c.id === chapterId)
        const chapterSubtitle = ch
          ? `${ch.name}${ch.duration ? ` · ${ch.duration}` : ''}`
          : chapterId ? `Chapter #${chapterId}` : undefined
        return {
          ...n,
          data: {
            ...n.data,
            chapterSubtitle,
            isDropTarget: n.id === dragOverChapterId,
            insertionIndex: n.id === dragOverChapterId ? insertionIndex : null,
          },
        }
      }
      if (nodeType === 'video') {
        const videoId = params.videoId as number | undefined
        const v = chapterVideos.find(x => x.id === videoId)
        const videoSubtitle = v ? `${v.title}${v.duration ? ` · ${v.duration}` : ''}` : videoId ? `Video #${videoId}` : undefined
        return { ...n, data: { ...n.data, videoSubtitle } }
      }
      if (n.type === 'videoDropZone') {
        const videoNodeId = (n.data as { videoNodeId: string }).videoNodeId
        return {
          ...n,
          data: { ...n.data, isDropHover: videoNodeId === dragOverVideoId },
        }
      }
      return n
    })
  }, [project, chapters, chapterVideos, dragOverChapterId, dragOverVideoId, insertionIndex])

  useEffect(() => {
    syncingRef.current = true
    setNodes(buildGraph())
    setEdges(toReactFlowEdges(project.connections || []))
    requestAnimationFrame(() => { syncingRef.current = false })
  }, [project, buildGraph, setNodes, setEdges])

  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target) return
    const source = nodes.find(n => n.id === params.source)
    const target = nodes.find(n => n.id === params.target)
    if (source && target) {
      const from = nodeFromCanvas(source)
      const to = nodeFromCanvas(target)
      if (!canConnect(from, to)) {
        toast.error(`Cannot connect ${from.type} → ${to.type}`)
        return
      }
    }
    applyEdit({ type: 'connectNodes', from: params.source, to: params.target })
  }, [nodes, applyEdit, toast])

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    if (syncingRef.current) return
    for (const edge of deleted) {
      applyEdit({ type: 'disconnectEdge', from: edge.source, to: edge.target })
    }
    selectEdge(null)
  }, [applyEdit, selectEdge])

  const onEdgesChangeWrapped = useCallback((changes: Parameters<typeof onEdgesChange>[0]) => {
    onEdgesChange(changes)
    if (syncingRef.current) return
    for (const ch of changes) {
      if (ch.type === 'remove') {
        const edge = edges.find(e => e.id === ch.id)
        if (edge) {
          applyEdit({ type: 'disconnectEdge', from: edge.source, to: edge.target })
          if (selectedEdge?.from === edge.source && selectedEdge?.to === edge.target) {
            selectEdge(null)
          }
        }
      }
    }
  }, [onEdgesChange, edges, applyEdit, selectedEdge, selectEdge])

  const updateDragTarget = useCallback((target: ReturnType<typeof resolveDropTarget>) => {
    if (target?.scope === 'video') {
      setDragOverVideoId(target.videoNodeId)
      setDragOverChapterId(null)
      setInsertionIndex(null)
    } else if (target?.scope === 'chapter') {
      setDragOverChapterId(target.chapterNodeId)
      setDragOverVideoId(null)
      setInsertionIndex(target.afterSegmentIndex ?? 0)
    } else {
      setDragOverChapterId(null)
      setDragOverVideoId(null)
      setInsertionIndex(null)
    }
  }, [])

  const onNodeDrag = useCallback((_: unknown, node: Node) => {
    const abs = absolutePosition(node, nodesRef.current)
    const target = resolveDropTarget(project, node.id, abs, nodesRef.current, chapters, chapterVideos)
    updateDragTarget(target)
  }, [project, chapters, chapterVideos, updateDragTarget])

  const onNodeDragStop = useCallback((_: unknown, node: Node) => {
    setDragOverChapterId(null)
    setDragOverVideoId(null)
    setInsertionIndex(null)
    if (syncingRef.current) return

    const abs = absolutePosition(node, nodesRef.current)
    const dropTarget = resolveDropTarget(project, node.id, abs, nodesRef.current, chapters, chapterVideos)
    const structuralEdit = dropTarget ? dropTargetToEdit(node.id, dropTarget, project, chapterVideos) : null

    if (structuralEdit) {
      applyEdit(structuralEdit)
      return
    }

    if (!isFreePositionNode(project, node.id)) return

    const canvasNode = nodesRef.current.find(n => n.id === node.id)
    if (!canvasNode) return

    const pos = canvasNode.type === 'chapterGroup'
      ? { x: canvasNode.position.x, y: canvasNode.position.y }
      : abs

    applyEdit({ type: 'updatePositions', positions: [{ nodeId: node.id, x: pos.x, y: pos.y }] })
  }, [project, chapters, chapterVideos, applyEdit])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const nodeType = paletteDragTypeRef.current ?? getPaletteDragType(e.dataTransfer)
    if (nodeType) {
      const flowPosition = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      const videoDrop = resolveVideoDropTarget(flowPosition, nodesRef.current)
      if (videoDrop?.scope === 'video') {
        setDragOverVideoId(videoDrop.videoNodeId)
        setDragOverChapterId(null)
        setInsertionIndex(null)
        return
      }
      const dropTarget = resolveInsertDropTarget(
        project,
        flowPosition,
        nodeType,
        nodesRef.current,
        chapters,
        chapterVideos,
      )
      updateDragTarget(dropTarget)
    }
  }, [project, chapters, chapterVideos, screenToFlowPosition, updateDragTarget])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOverChapterId(null)
    setDragOverVideoId(null)
    setInsertionIndex(null)

    const nodeType = paletteDragTypeRef.current ?? getPaletteDragType(e.dataTransfer)
    paletteDragTypeRef.current = null
    if (!nodeType) return

    const flowPosition = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const videoDrop = resolveVideoDropTarget(flowPosition, nodesRef.current)
    const dropTarget = videoDrop ?? resolveInsertDropTarget(
      project,
      flowPosition,
      nodeType,
      nodesRef.current,
      chapters,
      chapterVideos,
    )

    if (!dropTarget) {
      toast.error(`Cannot place ${nodeType} here`)
      return
    }

    const insertTarget = dropTargetToInsertTarget(dropTarget)
    const node = insertNodeAtTarget(state, nodeType, insertTarget, toast)
    if (!node) return

    if (isFreePositionNode({ ...project, nodes: [...project.nodes, node] }, node.id)) {
      applyEdit({ type: 'updatePositions', positions: [{ nodeId: node.id, x: flowPosition.x, y: flowPosition.y }] })
    }
  }, [project, chapters, chapterVideos, screenToFlowPosition, state, applyEdit, toast])

  const onNodesChangeWrapped = useCallback((changes: Parameters<typeof onNodesChange>[0]) => {
    onNodesChange(changes)
    const removed = changes.filter(c => c.type === 'remove').map(c => c.id)
    if (removed.length && !syncingRef.current) {
      setSelectedNodeIds(ids => ids.filter(id => !removed.includes(id)))
      applyEdit({ type: 'removeNodes', nodeIds: removed })
    }
  }, [onNodesChange, applyEdit, setSelectedNodeIds])

  const onSelectionChange = useCallback(({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
    const ids = selNodes.map(n => n.id)
    setSelectedNodeIds(ids)
    if (selNodes.length === 1) {
      selectNode(nodeFromCanvas(selNodes[0]))
      selectEdge(null)
      setA11yMessage(`Selected node ${selNodes[0].data.label}`)
    } else if (selNodes.length > 1) {
      selectNode(null)
      selectEdge(null)
      setA11yMessage(`${selNodes.length} nodes selected`)
    } else if (selEdges.length === 1) {
      selectNode(null)
      selectEdge({ from: selEdges[0].source, to: selEdges[0].target })
      setA11yMessage('Connection selected')
    } else {
      selectNode(null)
      selectEdge(null)
    }
  }, [selectNode, selectEdge, setSelectedNodeIds])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const mod = e.ctrlKey || e.metaKey
      if (!mod && (e.key === 'Delete' || e.key === 'Backspace') && selectedEdge) {
        e.preventDefault()
        applyEdit({ type: 'disconnectEdge', from: selectedEdge.from, to: selectedEdge.to })
        selectEdge(null)
        setA11yMessage('Connection removed')
        return
      }
      if (mod && e.key.toLowerCase() === 'c') {
        const ids = selectedNodeIds.length ? selectedNodeIds : selectedNodeId ? [selectedNodeId] : []
        const clip = buildClipboard(nodes, edges, ids)
        if (clip) {
          clipboardRef.current = clip
          e.preventDefault()
          setA11yMessage(`Copied ${clip.nodes.length} node${clip.nodes.length === 1 ? '' : 's'}`)
        }
      }
      if (mod && e.key.toLowerCase() === 'v') {
        const clip = clipboardRef.current
        if (clip) {
          e.preventDefault()
          toast.toast('Paste adds nodes at default positions — adjust in timeline or drag into chapters.')
          const { nodes: pasted, edges: pastedEdges } = pasteClipboard(clip, (flowNodes: FlowNode[]) =>
            flowNodes.map((n, i) => ({
              id: n.id,
              type: 'flowNode',
              position: { x: 80 + (i % 4) * 220, y: 80 + Math.floor(i / 4) * 140 },
              data: { label: n.name, nodeType: n.type, parameters: n.parameters, raw: n },
            })),
          )
          for (const n of pasted) {
            const raw = (n.data as { raw?: FlowNode }).raw
            if (raw) applyEdit({ type: 'insert', node: raw, target: { scope: 'top' } })
          }
          for (const e of pastedEdges) {
            applyEdit({ type: 'connectNodes', from: e.source, to: e.target })
          }
          setA11yMessage(`Pasted ${pasted.length} node${pasted.length === 1 ? '' : 's'}`)
        }
      }
    }
    el.addEventListener('keydown', onKeyDown)
    return () => el.removeEventListener('keydown', onKeyDown)
  }, [nodes, edges, selectedNodeIds, selectedNodeId, selectedEdge, applyEdit, selectEdge, toast])

  const onReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
    if (!newConnection.source || !newConnection.target) return
    const source = nodes.find(n => n.id === newConnection.source)
    const target = nodes.find(n => n.id === newConnection.target)
    if (source && target) {
      const from = nodeFromCanvas(source)
      const to = nodeFromCanvas(target)
      if (!canConnect(from, to)) {
        toast.error(`Cannot connect ${from.type} → ${to.type}`)
        return
      }
    }
    applyEdit({
      type: 'reconnectEdge',
      oldFrom: oldEdge.source,
      oldTo: oldEdge.target,
      newFrom: newConnection.source,
      newTo: newConnection.target,
    })
    selectEdge(null)
  }, [nodes, applyEdit, toast, selectEdge])

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    selectEdge({ from: edge.source, to: edge.target })
    selectNode(null)
  }, [selectEdge, selectNode])

  const onInit = useCallback((instance: { fitView: () => void }) => {
    if (!fitViewOnceRef.current) {
      instance.fitView()
      fitViewOnceRef.current = true
    }
  }, [])

  const styledEdges = useMemo(() => edges.map(e => ({
    ...e,
    style: {
      ...e.style,
      stroke: selectedEdge?.from === e.source && selectedEdge?.to === e.target ? '#f59e0b' : '#77c043',
      strokeWidth: selectedEdge?.from === e.source && selectedEdge?.to === e.target ? 3 : 1.5,
    },
  })), [edges, selectedEdge])

  return (
    <div className="flow-editor-canvas-wrap">
      <div
        className="flow-editor-canvas"
        ref={canvasRef}
        tabIndex={0}
        role="application"
        aria-label="Flow editor canvas"
      >
        <div className="flow-a11y-live" aria-live="polite" aria-atomic="true">{a11yMessage}</div>
        <ReactFlow
          nodes={nodes}
          edges={styledEdges}
          onNodesChange={onNodesChangeWrapped}
          onEdgesChange={onEdgesChangeWrapped}
          onEdgesDelete={onEdgesDelete}
          onConnect={onConnect}
          onReconnect={onReconnect}
          onEdgeClick={onEdgeClick}
          onSelectionChange={onSelectionChange}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onPaneClick={() => { selectEdge(null) }}
          onInit={onInit}
          selectionOnDrag
          panOnDrag={[1, 2]}
          multiSelectionKeyCode="Shift"
          selectionMode={SelectionMode.Partial}
          nodesFocusable
          elementsSelectable
          edgesReconnectable
          deleteKeyCode={null}
          nodeTypes={nodeTypes}
          colorMode="dark"
        >
          <Background gap={20} color="#2e3032" />
          <Controls />
          <VisualNodePalette
            onPaletteDragStart={onPaletteDragStart}
            onPaletteDragEnd={onPaletteDragEnd}
          />
          <MiniMap
            className="flow-minimap"
            nodeColor={n => FLOW_NODE_COLORS[(n.data as { nodeType: string }).nodeType] || '#666'}
          />
        </ReactFlow>
      </div>
    </div>
  )
}

export function VisualFlowEditor({ state }: VisualFlowEditorProps) {
  return (
    <ReactFlowProvider>
      <VisualFlowEditorCanvas state={state} />
    </ReactFlowProvider>
  )
}
