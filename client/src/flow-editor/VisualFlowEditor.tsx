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
import {
  dropTargetToEdit,
  dropTargetToInsertTarget,
  isFreePositionNode,
  projectToGraph,
  resolveCombinedDropTarget,
  VIDEO_GROUP_HEADER_HEIGHT,
  NESTED_NODE_HEIGHT,
  VIDEO_GROUP_PADDING,
  type DropTarget,
} from './flowGraphLayout'
import { VIDEO_ATTACH_NO_VIDEO_MESSAGE } from './flowTimeline'
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

function VideoGroupNode({
  data,
}: {
  data: {
    label: string
    videoSubtitle?: string
    videoNodeId: string
    isDropTarget?: boolean
    eventInsertIndex?: number | null
  }
}) {
  return (
    <div className={`flow-video-group${data.isDropTarget ? ' is-drop-target' : ''}`}>
      <div className="flow-video-group-header">
        <span className="flow-video-group-icon">▶</span>
        <span className="flow-video-group-title">{data.label}</span>
        {data.videoSubtitle && <span className="flow-video-group-sub">{data.videoSubtitle}</span>}
      </div>
      <div className="flow-video-group-body">
        {data.isDropTarget && data.eventInsertIndex != null && (
          <div
            className="flow-video-insertion-line"
            style={{
              left: `${20 + data.eventInsertIndex * 160}px`,
              top: `${VIDEO_GROUP_HEADER_HEIGHT + VIDEO_GROUP_PADDING + NESTED_NODE_HEIGHT + 8}px`,
            }}
          />
        )}
        Drop pause / toaster / AI chat here
      </div>
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

const nodeTypes = { flowNode: FlowNodeCard, chapterGroup: ChapterGroupNode, videoDropZone: VideoDropZoneNode, videoGroup: VideoGroupNode }

function toReactFlowEdges(connections: FlowProject['connections']): Edge[] {
  return connections.map((c, i) => ({
    id: `e-${c.from}-${c.to}-${i}`,
    source: c.from,
    target: c.to,
    animated: true,
    deletable: true,
    reconnectable: true,
    style: { stroke: '#55e6c1', strokeWidth: 1.5 },
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
    setSelectedNodeIds,
    selectedEdge,
    layoutFitToken,
  } = state
  const toast = useToast()
  const { screenToFlowPosition, fitView } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [dragOverChapterId, setDragOverChapterId] = useState<string | null>(null)
  const [dragOverVideoId, setDragOverVideoId] = useState<string | null>(null)
  const [eventInsertIndex, setEventInsertIndex] = useState<number | null>(null)
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null)
  const [a11yMessage, setA11yMessage] = useState('')
  const canvasRef = useRef<HTMLDivElement>(null)
  const syncingRef = useRef(false)
  const nodesRef = useRef<Node[]>([])
  const fitViewOnceRef = useRef(false)
  const lastLayoutFitRef = useRef(0)
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
      if (n.type === 'videoGroup') {
        const videoNodeId = (n.data as { videoNodeId: string }).videoNodeId
        const videoNode = project.nodes.find(x => x.id === videoNodeId)
        const videoId = videoNode?.parameters.videoId as number | undefined
        const v = chapterVideos.find(x => x.id === videoId)
        const videoSubtitle = v ? `${v.title}${v.duration ? ` · ${v.duration}` : ''}` : videoId ? `Video #${videoId}` : undefined
        return {
          ...n,
          data: {
            ...n.data,
            label: videoNode?.name ?? (n.data as { label: string }).label,
            videoSubtitle,
            isDropTarget: videoNodeId === dragOverVideoId,
            eventInsertIndex: videoNodeId === dragOverVideoId ? eventInsertIndex : null,
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
  }, [project, chapters, chapterVideos, dragOverChapterId, dragOverVideoId, insertionIndex, eventInsertIndex])

  useEffect(() => {
    if (layoutFitToken === 0 || layoutFitToken === lastLayoutFitRef.current) return
    lastLayoutFitRef.current = layoutFitToken
    requestAnimationFrame(() => {
      fitView({ padding: 0.2, duration: 300, maxZoom: 1 })
    })
  }, [layoutFitToken, fitView])

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

  const updateDragTarget = useCallback((target: DropTarget | null) => {
    if (target?.scope === 'video') {
      setDragOverVideoId(target.videoNodeId)
      setDragOverChapterId(null)
      setInsertionIndex(null)
      setEventInsertIndex(target.eventInsertIndex ?? null)
    } else if (target?.scope === 'chapter') {
      setDragOverChapterId(target.chapterNodeId)
      setDragOverVideoId(null)
      setInsertionIndex(target.afterSegmentIndex ?? 0)
      setEventInsertIndex(null)
    } else {
      setDragOverChapterId(null)
      setDragOverVideoId(null)
      setInsertionIndex(null)
      setEventInsertIndex(null)
    }
  }, [])

  const onNodeDrag = useCallback((_: unknown, node: Node) => {
    const abs = absolutePosition(node, nodesRef.current)
    const target = resolveCombinedDropTarget(project, abs, nodesRef.current, chapterVideos, node.id)
    updateDragTarget(target)
  }, [project, chapterVideos, updateDragTarget])

  const onNodeDragStop = useCallback((_: unknown, node: Node) => {
    setDragOverChapterId(null)
    setDragOverVideoId(null)
    setInsertionIndex(null)
    setEventInsertIndex(null)
    if (syncingRef.current) return

    const abs = absolutePosition(node, nodesRef.current)
    const dropTarget = resolveCombinedDropTarget(project, abs, nodesRef.current, chapterVideos, node.id)
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
      const dropTarget = resolveCombinedDropTarget(
        project,
        flowPosition,
        nodesRef.current,
        chapterVideos,
        undefined,
        nodeType,
      )
      updateDragTarget(dropTarget)
    }
  }, [project, chapterVideos, screenToFlowPosition, updateDragTarget])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOverChapterId(null)
    setDragOverVideoId(null)
    setInsertionIndex(null)
    setEventInsertIndex(null)

    const nodeType = paletteDragTypeRef.current ?? getPaletteDragType(e.dataTransfer)
    paletteDragTypeRef.current = null
    if (!nodeType) return

    const flowPosition = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const dropTarget = resolveCombinedDropTarget(
      project,
      flowPosition,
      nodesRef.current,
      chapterVideos,
      undefined,
      nodeType,
    )

    if (!dropTarget) {
      const msg = (nodeType === 'pause' || nodeType === 'toaster')
        ? VIDEO_ATTACH_NO_VIDEO_MESSAGE
        : `Cannot place ${nodeType} here`
      toast.error(msg)
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
    canvasRef.current?.focus()
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
      stroke: selectedEdge?.from === e.source && selectedEdge?.to === e.target ? '#f59e0b' : '#55e6c1',
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
          onPaneClick={() => { selectEdge(null); canvasRef.current?.focus() }}
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
