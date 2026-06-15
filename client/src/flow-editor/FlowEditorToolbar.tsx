import { FLOW_STEPS } from './flowSchema'
import type { FlowEditorState, FlowEditorView } from './useFlowEditorState'

interface FlowEditorToolbarProps {
  state: FlowEditorState
  onSave: (force?: boolean) => void
  onAddNode: (type: import('../types').FlowNode['type']) => void
  onAutoLayout?: () => void
}

export function FlowEditorToolbar({ state, onSave, onAddNode, onAutoLayout }: FlowEditorToolbarProps) {
  const { projectName, setProjectName, view, setViewMode, dirty, saving } = state

  return (
    <div className="flow-editor-toolbar">
      <div className="flow-editor-toolbar-row">
        <span className="admin-label-text">Project name</span>
        <input
          className="admin-input"
          style={{ maxWidth: 220 }}
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
        />
        <div className="flow-view-toggle" role="tablist" aria-label="Editor view">
          {(['timeline', 'visual'] as FlowEditorView[]).map(v => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              className={`flow-view-toggle-btn${view === v ? ' is-active' : ''}`}
              onClick={() => setViewMode(v)}
            >
              {v === 'timeline' ? 'Timeline' : 'Visual'}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={!dirty || saving}
          onClick={() => onSave()}
        >
          {saving ? 'Saving…' : dirty ? 'Save flow' : 'Saved'}
        </button>
        {onAutoLayout && (
          <button type="button" className="admin-btn admin-btn-sm" onClick={onAutoLayout}>
            Auto-layout
          </button>
        )}
      </div>
      <div className="flow-editor-toolbar-row flow-editor-add-buttons">
        {FLOW_STEPS.map(s => (
          <button
            key={s.type}
            type="button"
            className="admin-btn admin-btn-sm"
            title={s.desc}
            onClick={() => onAddNode(s.type as import('../types').FlowNode['type'])}
          >
            + {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
