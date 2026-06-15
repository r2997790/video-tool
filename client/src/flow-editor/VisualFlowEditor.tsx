import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  reconnectEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type OnSelectionChangeParams,
  SelectionMode,
  Handle,
  Position,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { FlowNode, FlowProject } from '../types'
import { canConnect } from './flowSchema'
import { findChapterAncestor, rebuildSpineConnections } from './flowTimeline'
import { buildClipboard, pasteClipboard, type FlowClipboardPayload } from './flowClipboard'
import type { FlowEditorState } from './useFlowEditorState'
import { useToast } from '../components/Toast'

const NODE_COLORS: Record<string, string> = {
  intro: '#6366f1',
  event: '#14b8a6',
  question: '#0ea5e9',
  branch: '#f59e0b',
  chapter: '#77c043',
  video: '#22c55e',
  toaster: '#f97316',
  pause: '#ef4444',
  aichat: '#a855f7',
  outro: '#ec4899',
}

function FlowNodeCard({ data }: { data: { label: string; nodeType: string; parameters: Record<string, unknown>; chapterSubtitle?: string; videoSubtitle?: string } }) {
  const color = NODE_COLORS[data.nodeType] || '#666'
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

const nodeTypes = { flowNode: FlowNodeCard }

function toReactFlowNodes(nodes: FlowNode[]): Node[] {
  return nodes.map((n, i) => ({
    id: n.id,
    type: 'flowNode',
    position: { x: n.x ?? 80 + (i % 4) * 220, y: n.y ?? 80 + Math.floor(i / 4) * 140 },
    data: { label: n.name, nodeType: n.type, parameters: n.parameters, raw: n },
  }))
}

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

function fromReactFlow(nodes: Node[], edges: Edge[], projectName: string): FlowProject {
  return {
    projectName,
    nodes: nodes.map(n => {
      const raw = (n.data as { raw?: FlowNode }).raw
      return {
        id: n.id,
        type: (raw?.type || (n.data as { nodeType: string }).nodeType) as FlowNode['type'],
        name: (n.data as { label: string }).label,
        parameters: (n.data as { parameters: Record<string, unknown> }).parameters || raw?.parameters || {},
        x: n.position.x,
        y: n.position.y,
      }
    }),
    connections: edges.map(e => ({ from: e.source, to: e.target })),
  }
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

interface VisualFlowEditorProps {
  state: FlowEditorState
}

export function VisualFlowEditor({ state }: VisualFlowEditorProps) {
  const { project, projectName, updateProject, chapters, chapterVideos, selectNode, selectedNodeId } = state
  const toast = useToast()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)
  const [a11yMessage, setA11yMessage] = useState('')
  const canvasRef = useRef<HTMLDivElement>(null)
  const clipboardRef = useRef<FlowClipboardPayload | null>(null)
  const syncingRef = useRef(false)

  useEffect(() => {
    syncingRef.current = true
    setNodes(toReactFlowNodes(project.nodes || []))
    setEdges(toReactFlowEdges(project.connections || []))
    requestAnimationFrame(() => { syncingRef.current = false })
  }, [project, setNodes, setEdges])

  useEffect(() => {
    setNodes(ns => ns.map(n => {
      const nodeType = (n.data as { nodeType: string }).nodeType
      const params = (n.data as { parameters: Record<string, unknown> }).parameters
      if (nodeType === 'chapter') {
        const chapterId = params.chapterId as number | undefined
        const ch = chapters.find(c => c.id === chapterId)
        const chapterSubtitle = ch
          ? `${ch.name}${ch.duration ? ` · ${ch.duration}` : ''}`
          : chapterId ? `Chapter #${chapterId}` : undefined
        return { ...n, data: { ...n.data, chapterSubtitle } }
      }
      if (nodeType === 'video') {
        const videoId = params.videoId as number | undefined
        const v = chapterVideos.find(x => x.id === videoId)
        const videoSubtitle = v ? `${v.title}${v.duration ? ` · ${v.duration}` : ''}` : videoId ? `Video #${videoId}` : undefined
        return { ...n, data: { ...n.data, videoSubtitle } }
      }
      return n
    }))
  }, [chapters, chapterVideos, setNodes])

  const pushToProject = useCallback((nextNodes: Node[], nextEdges: Edge[]) => {
    if (syncingRef.current) return
    updateProject(fromReactFlow(nextNodes, nextEdges, projectName))
  }, [updateProject, projectName])

  const onConnect = useCallback((params: Connection) => {
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
    setEdges(eds => {
      const next = addEdge({ ...params, animated: true, deletable: true, reconnectable: true, style: { stroke: '#77c043', strokeWidth: 1.5 } }, eds)
      if (syncingRef.current) return next
      const rfProject = fromReactFlow(nodes, next, projectName)
      const fromChapter = params.source ? findChapterAncestor(project, params.source) : null
      const toChapter = params.target ? findChapterAncestor(project, params.target) : null
      const synced = fromChapter && toChapter && fromChapter.id === toChapter.id
        ? rebuildSpineConnections(rfProject, chapters, chapterVideos)
        : rfProject
      updateProject(synced)
      return next
    })
  }, [nodes, setEdges, project, projectName, chapters, chapterVideos, updateProject, toast])

  const onEdgesChangeWrapped = useCallback((changes: Parameters<typeof onEdgesChange>[0]) => {
    onEdgesChange(changes)
    if (changes.some(c => c.type === 'remove' || c.type === 'add')) {
      setEdges(current => {
        pushToProject(nodes, current)
        return current
      })
    }
    for (const ch of changes) {
      if (ch.type === 'remove' && selectedEdge && ch.id === selectedEdge.id) {
        setSelectedEdge(null)
      }
    }
  }, [onEdgesChange, selectedEdge, nodes, pushToProject, setEdges])

  const onNodesChangeWrapped = useCallback((changes: Parameters<typeof onNodesChange>[0]) => {
    onNodesChange(changes)
    if (changes.some(c => c.type === 'position' && c.dragging === false)) {
      setNodes(current => {
        pushToProject(current, edges)
        return current
      })
    }
    const removed = changes.filter(c => c.type === 'remove').map(c => c.id)
    if (removed.length) {
      setSelectedNodeIds(ids => ids.filter(id => !removed.includes(id)))
      setEdges(current => {
        const next = current.filter(e => !removed.includes(e.source) && !removed.includes(e.target))
        setNodes(nds => {
          const filtered = nds.filter(n => !removed.includes(n.id))
          pushToProject(filtered, next)
          return filtered
        })
        return next
      })
    }
  }, [onNodesChange, edges, pushToProject, setNodes, setEdges])

  const onSelectionChange = useCallback(({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
    setSelectedEdge(selEdges[0] ?? null)
    const ids = selNodes.map(n => n.id)
    setSelectedNodeIds(ids)
    if (selNodes.length === 1) {
      selectNode(nodeFromCanvas(selNodes[0]))
      setA11yMessage(`Selected node ${selNodes[0].data.label}`)
    } else if (selNodes.length > 1) {
      selectNode(null)
      setA11yMessage(`${selNodes.length} nodes selected`)
    } else if (selEdges.length === 1) {
      selectNode(null)
      setA11yMessage('Connection selected')
    } else {
      selectNode(null)
    }
  }, [selectNode])

  const deleteSelection = useCallback(() => {
    const ids = new Set(selectedNodeIds.length ? selectedNodeIds : selectedNodeId ? [selectedNodeId] : [])
    if (ids.size === 0 && !selectedEdge) return
    if (ids.size > 0) {
      setNodes(nds => {
        const filtered = nds.filter(n => !ids.has(n.id))
        setEdges(eds => {
          const next = eds.filter(e => !ids.has(e.source) && !ids.has(e.target))
          pushToProject(filtered, next)
          return next
        })
        return filtered
      })
      selectNode(null)
      setSelectedNodeIds([])
      setA11yMessage(`Deleted ${ids.size} node${ids.size === 1 ? '' : 's'}`)
    } else if (selectedEdge) {
      setEdges(eds => {
        const next = eds.filter(e => e.id !== selectedEdge.id)
        pushToProject(nodes, next)
        return next
      })
      setSelectedEdge(null)
      setA11yMessage('Connection deleted')
    }
  }, [selectedNodeIds, selectedNodeId, selectedEdge, setNodes, setEdges, nodes, pushToProject, selectNode])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const mod = e.ctrlKey || e.metaKey
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
          const { nodes: pasted, edges: pastedEdges } = pasteClipboard(clip, toReactFlowNodes)
          setNodes(nds => {
            const next = [...nds, ...pasted]
            setEdges(eds => {
              const nextEdges = [...eds, ...pastedEdges]
              pushToProject(next, nextEdges)
              return nextEdges
            })
            return next
          })
          setA11yMessage(`Pasted ${pasted.length} node${pasted.length === 1 ? '' : 's'}`)
        }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedNodeIds.length || selectedNodeId || selectedEdge)) {
        e.preventDefault()
        deleteSelection()
      }
    }
    el.addEventListener('keydown', onKeyDown)
    return () => el.removeEventListener('keydown', onKeyDown)
  }, [nodes, edges, selectedNodeIds, selectedNodeId, selectedEdge, deleteSelection, setNodes, setEdges, pushToProject])

  const onReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
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
    setEdges(els => {
      const next = reconnectEdge(oldEdge, newConnection, els)
      pushToProject(nodes, next)
      return next
    })
    setSelectedEdge(null)
  }, [setEdges, nodes, pushToProject, toast])

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge)
  }, [])

  const breakSelectedEdge = () => {
    if (!selectedEdge) return
    setEdges(eds => {
      const next = eds.filter(e => e.id !== selectedEdge.id)
      pushToProject(nodes, next)
      return next
    })
    setSelectedEdge(null)
  }

  const styledEdges = useMemo(() => edges.map(e => ({
    ...e,
    style: {
      ...e.style,
      stroke: selectedEdge?.id === e.id ? '#f59e0b' : '#77c043',
      strokeWidth: selectedEdge?.id === e.id ? 3 : 1.5,
    },
  })), [edges, selectedEdge])

  return (
    <div className="flow-editor-canvas-wrap">
      <div className="flow-visual-toolbar">
        {selectedEdge && (
          <button type="button" className="admin-btn admin-btn-danger admin-btn-sm" onClick={breakSelectedEdge}>
            Break link
          </button>
        )}
        {(selectedNodeIds.length > 0 || selectedNodeId) && (
          <button type="button" className="admin-btn admin-btn-danger admin-btn-sm" onClick={deleteSelection}>
            Delete {selectedNodeIds.length > 1 ? `(${selectedNodeIds.length})` : 'node'}
          </button>
        )}
      </div>
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
          onConnect={onConnect}
          onReconnect={onReconnect}
          onEdgeClick={onEdgeClick}
          onSelectionChange={onSelectionChange}
          onPaneClick={() => { setSelectedEdge(null) }}
          selectionOnDrag
          panOnDrag={[1, 2]}
          multiSelectionKeyCode="Shift"
          selectionMode={SelectionMode.Partial}
          nodesFocusable
          elementsSelectable
          edgesReconnectable
          deleteKeyCode={null}
          nodeTypes={nodeTypes}
          fitView
          colorMode="dark"
        >
          <Background gap={20} color="#2e3032" />
          <Controls />
          <MiniMap nodeColor={n => NODE_COLORS[(n.data as { nodeType: string }).nodeType] || '#666'} />
          <Panel position="top-left">
            <span style={{ fontSize: 12, color: '#9b9d9f' }}>
              Shift+click multi-select · Ctrl+C/V copy/paste · Del delete
            </span>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  )
}
