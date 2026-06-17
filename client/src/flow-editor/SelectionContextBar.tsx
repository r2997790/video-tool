import { useState } from 'react'
import type { FlowEditorState } from './useFlowEditorState'

interface SelectionContextBarProps {
  state: FlowEditorState
  onDeleteSelection: () => void
  onBreakLink: () => void
}

export function SelectionContextBar({ state, onDeleteSelection, onBreakLink }: SelectionContextBarProps) {
  const { view, selectedNode, selectedNodeIds, selectedEdge } = state
  const [showHelp, setShowHelp] = useState(false)

  const hasNodeSelection = selectedNodeIds.length > 0 || !!selectedNode
  const hasEdgeSelection = !!selectedEdge
  const showBar = hasNodeSelection || hasEdgeSelection || view === 'visual'

  if (!showBar) return null

  return (
    <div className="flow-visual-toolbar">
      <div className="flow-context-actions">
        {hasEdgeSelection && (
          <button type="button" className="admin-btn admin-btn-danger admin-btn-sm" onClick={onBreakLink}>
            Break link
          </button>
        )}
        {hasNodeSelection && (
          <button type="button" className="admin-btn admin-btn-danger admin-btn-sm" onClick={onDeleteSelection}>
            Delete {selectedNodeIds.length > 1 ? `(${selectedNodeIds.length})` : 'node'}
          </button>
        )}
      </div>
      {view === 'visual' && (
        <div className="flow-context-help">
          <button
            type="button"
            className="admin-btn admin-btn-sm flow-help-btn"
            aria-label="Canvas help"
            aria-expanded={showHelp}
            onClick={() => setShowHelp(v => !v)}
          >
            ?
          </button>
          {showHelp && (
            <div className="flow-help-tooltip" role="tooltip">
              Drag into chapter groups to nest · Shift+click multi-select · Ctrl+C/V copy/paste
            </div>
          )}
        </div>
      )}
    </div>
  )
}
