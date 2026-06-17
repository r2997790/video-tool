import { useCallback, useState } from 'react'
import { FlowEditorToolbar } from './FlowEditorToolbar'
import { SelectionContextBar } from './SelectionContextBar'
import { TimelineEditor, addNodeWithContext } from './TimelineEditor'
import { VisualFlowEditor } from './VisualFlowEditor'
import { FlowNodePropertyPanel } from './FlowNodePropertyPanel'
import { useFlowEditorState } from './useFlowEditorState'
import { collectFlowFieldIds } from './flowRuntime'
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
  } = state

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

  const handleAddNode = useCallback((type: FlowNode['type']) => {
    addNodeWithContext(state, type, toast)
  }, [state, toast])

  const handleAutoLayout = useCallback(() => {
    applyEdit({ type: 'autoLayout' })
    toast.success('Graph auto-layout applied')
  }, [applyEdit, toast])

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
    .filter(n => ['question', 'intro', 'outro'].includes(n.type))
    .map(n => ({ id: n.id, label: n.name }))
  const chapterTargets = project.nodes
    .filter(n => n.type === 'chapter')
    .map(n => ({ id: n.id, label: n.name }))

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
        onAutoLayout={handleAutoLayout}
      />
      <SelectionContextBar
        state={state}
        onDeleteSelection={handleDeleteSelection}
        onBreakLink={handleBreakLink}
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
