import { useCallback, useEffect, useState } from 'react'
import { FlowEditorToolbar } from './FlowEditorToolbar'
import { useFlowName } from './FlowNameContext'
import { TimelineEditor, addNodeWithContext } from './TimelineEditor'
import { VisualFlowEditor } from './VisualFlowEditor'
import { FlowNodePropertyPanel } from './FlowNodePropertyPanel'
import { useFlowEditorState } from './useFlowEditorState'
import { collectFlowFieldIds } from './flowRuntime'
import { findChapterAncestor } from './flowTimeline'
import { ConfirmModal } from '../components/ConfirmModal'
import { useToast } from '../components/Toast'
import type { FlowNode } from '../types'

interface FlowEditorShellProps {
  flowSlug: string
}

export function FlowEditorShell({ flowSlug }: FlowEditorShellProps) {
  const state = useFlowEditorState(flowSlug)
  const toast = useToast()
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])
  const [pendingForce, setPendingForce] = useState(false)

  const {
    loading,
    project,
    updateProject,
    applyEdit,
    chapters,
    chapterVideos,
    events,
    selectedNode,
    selectedNodeId,
    selectedNodeIds,
    selectedEdge,
    selectNode,
    selectEdge,
    setSelectedNodeIds,
    view,
    save,
    projectName,
    setProjectName,
  } = state

  const { registerEditor, syncFromEditor } = useFlowName()

  useEffect(() => registerEditor(setProjectName), [registerEditor, setProjectName])
  useEffect(() => { syncFromEditor(projectName) }, [projectName, syncFromEditor])

  const handleSave = async (force = false) => {
    const result = await save(force)
    if (!result.ok) {
      setValidationWarnings(result.warnings)
      setPendingForce(true)
      return
    }
    toast.success('Flow saved')
    setValidationWarnings([])
    setPendingForce(false)
  }

  const handleAutoArrange = useCallback(() => {
    state.applyEdit({ type: 'autoLayout' })
    toast.success('Flow arranged')
  }, [state, toast])

  const handleViewModeChange = useCallback((v: 'timeline' | 'visual') => {
    state.applyEdit({ type: 'normalize' })
    state.setViewMode(v)
  }, [state])

  const handleAddNode = useCallback((type: FlowNode['type']) => {
    addNodeWithContext(state, type, toast)
  }, [state, toast])

  const handleDeleteSelection = useCallback(() => {
    const ids = selectedNodeIds.length
      ? selectedNodeIds
      : selectedNodeId
        ? [selectedNodeId]
        : []
    if (ids.length > 0) {
      applyEdit({ type: 'removeNodes', nodeIds: ids })
      selectNode(null)
      setSelectedNodeIds([])
      return
    }
    if (selectedEdge) {
      applyEdit({ type: 'disconnectEdge', from: selectedEdge.from, to: selectedEdge.to })
      selectEdge(null)
    }
  }, [selectedNodeIds, selectedNodeId, selectedEdge, applyEdit, selectNode, selectEdge, setSelectedNodeIds])

  const handleBreakLink = useCallback(() => {
    if (!selectedEdge) return
    applyEdit({ type: 'disconnectEdge', from: selectedEdge.from, to: selectedEdge.to })
    selectEdge(null)
  }, [selectedEdge, applyEdit, selectEdge])

  const handleNestInChapter = useCallback((chapterNodeId: string) => {
    const ids = selectedNodeIds.length
      ? selectedNodeIds
      : selectedNodeId
        ? [selectedNodeId]
        : []
    const nodeIds = ids.filter(id => {
      const node = project.nodes.find(n => n.id === id)
      return node && node.type !== 'chapter'
    })
    if (!nodeIds.length) return
    applyEdit({ type: 'moveNodesIntoChapter', nodeIds, chapterNodeId })
    selectNode(null)
    setSelectedNodeIds([])
  }, [selectedNodeIds, selectedNodeId, project.nodes, applyEdit, selectNode, setSelectedNodeIds])

  const updateSelected = (updates: Partial<FlowNode>) => {
    if (!selectedNode) return
    const updated = {
      ...selectedNode,
      ...updates,
      parameters: { ...selectedNode.parameters, ...(updates.parameters || {}) },
    }
    updateProject({
      ...project,
      nodes: project.nodes.map(n => n.id === updated.id ? updated : n),
    })
    selectNode(updated)
  }

  const deleteSelected = () => {
    if (!selectedNode) return
    applyEdit({ type: 'remove', nodeId: selectedNode.id })
    selectNode(null)
  }

  const closePanel = () => {
    selectNode(null)
    setSelectedNodeIds([])
    selectEdge(null)
  }

  const fieldIds = collectFlowFieldIds(project)
  const questionTargets = project.nodes
    .filter(n => n.type === 'question')
    .map(n => ({ id: n.id, label: n.name }))
  const chapterTargets = project.nodes
    .filter(n => n.type === 'chapter')
    .map(n => ({ id: n.id, label: n.name }))

  useEffect(() => {
    if (!state.dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [state.dirty])

  if (loading) {
    return <div className="admin-skeleton" style={{ height: 200 }} aria-busy="true" />
  }

  const panelOpen = !!selectedNode

  return (
    <div className="flow-editor-wrap">
      <FlowEditorToolbar
        state={state}
        onSave={handleSave}
        onAddNode={handleAddNode}
        onAutoArrange={handleAutoArrange}
        onViewModeChange={handleViewModeChange}
        onDeleteSelection={handleDeleteSelection}
        onBreakLink={handleBreakLink}
        onNestInChapter={handleNestInChapter}
      />
      <div className="flow-editor-body">
        <div className="flow-editor-main">
          {view === 'timeline' ? (
            <TimelineEditor state={state} />
          ) : (
            <VisualFlowEditor state={state} />
          )}
        </div>
        <aside className={`flow-editor-panel${panelOpen ? ' is-open' : ''}`}>
          <div className="flow-editor-panel-head">
            <h3>Parameters</h3>
            <button
              type="button"
              className="flow-editor-panel-close"
              onClick={closePanel}
              aria-label="Close parameters"
            >
              ×
            </button>
          </div>
          {selectedNode ? (
            <FlowNodePropertyPanel
              flowSlug={flowSlug}
              selected={selectedNode}
              inChapter={!!findChapterAncestor(project, selectedNode.id)}
              chapters={chapters}
              chapterVideos={chapterVideos}
              onChaptersReload={state.refreshVideos}
              events={events}
              fieldIds={fieldIds}
              questionTargets={questionTargets}
              chapterTargets={chapterTargets}
              onUpdate={updateSelected}
              onDelete={deleteSelected}
            />
          ) : (
            <p className="flow-panel-empty">Select a step in the timeline or visual editor to edit its properties.</p>
          )}
        </aside>
      </div>
      {panelOpen && (
        <div className="flow-editor-panel-backdrop" onClick={closePanel} aria-hidden="true" />
      )}
      <ConfirmModal
        open={pendingForce && validationWarnings.length > 0}
        title="Save with warnings?"
        message={validationWarnings.join(' ')}
        confirmLabel="Save anyway"
        onConfirm={() => { handleSave(true); setPendingForce(false) }}
        onCancel={() => { setValidationWarnings([]); setPendingForce(false) }}
      />
    </div>
  )
}
