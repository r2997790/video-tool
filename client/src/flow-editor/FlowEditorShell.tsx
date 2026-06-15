import { useCallback, useState } from 'react'
import { FlowEditorToolbar } from './FlowEditorToolbar'
import { TimelineEditor, addNodeWithContext } from './TimelineEditor'
import { VisualFlowEditor } from './VisualFlowEditor'
import { FlowNodePropertyPanel } from './FlowNodePropertyPanel'
import { useFlowEditorState } from './useFlowEditorState'
import { collectFlowFieldIds } from './flowRuntime'
import { applyTimelineEdit, autoLayoutProject } from './flowTimeline'
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
    chapters,
    chapterVideos,
    events,
    selectedNode,
    selectNode,
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
    updateProject(autoLayoutProject(project, chapters, chapterVideos))
    toast.success('Graph auto-layout applied')
  }, [project, chapters, chapterVideos, updateProject, toast])

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
    updateProject(applyTimelineEdit(project, { type: 'remove', nodeId: selectedNode.id }, chapters, chapterVideos))
    selectNode(null)
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

  return (
    <div className="flow-editor-wrap">
      <FlowEditorToolbar
        state={state}
        onSave={handleSave}
        onAddNode={handleAddNode}
        onAutoLayout={view === 'visual' ? handleAutoLayout : undefined}
      />
      <div className="flow-editor-body">
        <div className="flow-editor-main">
          {view === 'timeline' ? (
            <TimelineEditor state={state} />
          ) : (
            <VisualFlowEditor state={state} />
          )}
        </div>
        <aside className="flow-editor-panel">
          <h3>Parameters</h3>
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
