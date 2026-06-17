import { useMemo, useState } from 'react'
import type { FlowEditorState } from './useFlowEditorState'

interface SelectionContextBarProps {
  state: FlowEditorState
  onDeleteSelection: () => void
  onBreakLink: () => void
  onNestInChapter: (chapterNodeId: string) => void
}

export function SelectionContextBar({ state, onDeleteSelection, onBreakLink, onNestInChapter }: SelectionContextBarProps) {
  const { view, selectedNode, selectedNodeIds, selectedEdge, project } = state
  const [showHelp, setShowHelp] = useState(false)
  const [pickChapterId, setPickChapterId] = useState('')

  const hasNodeSelection = selectedNodeIds.length > 0 || !!selectedNode
  const hasEdgeSelection = !!selectedEdge
  const showBar = hasNodeSelection || hasEdgeSelection || view === 'visual'

  const chapterNodes = useMemo(
    () => project.nodes.filter(n => n.type === 'chapter'),
    [project.nodes],
  )

  const nestableIds = useMemo(() => {
    const ids = selectedNodeIds.length ? selectedNodeIds : selectedNode ? [selectedNode.id] : []
    return ids.filter(id => {
      const node = project.nodes.find(n => n.id === id)
      return node && node.type !== 'chapter'
    })
  }, [selectedNodeIds, selectedNode, project.nodes])

  const targetChapterFromSelection = useMemo(() => {
    const ids = selectedNodeIds.length ? selectedNodeIds : selectedNode ? [selectedNode.id] : []
    const chapters = ids.map(id => project.nodes.find(n => n.id === id)).filter(n => n?.type === 'chapter')
    if (chapters.length === 1) return chapters[0]!.id
    return null
  }, [selectedNodeIds, selectedNode, project.nodes])

  const canNest = nestableIds.length >= 1 && (targetChapterFromSelection || pickChapterId)

  if (!showBar) return null

  return (
    <div className="flow-visual-toolbar">
      <div className="flow-context-actions">
        {nestableIds.length >= 1 && chapterNodes.length > 0 && (
          <>
            {!targetChapterFromSelection && (
              <select
                className="admin-input admin-btn-sm"
                value={pickChapterId}
                onChange={e => setPickChapterId(e.target.value)}
                aria-label="Target chapter"
              >
                <option value="">Nest in chapter…</option>
                {chapterNodes.map(ch => (
                  <option key={ch.id} value={ch.id}>{ch.name}</option>
                ))}
              </select>
            )}
            <button
              type="button"
              className="admin-btn admin-btn-sm"
              disabled={!canNest}
              onClick={() => {
                const chapterId = targetChapterFromSelection || pickChapterId
                if (chapterId) onNestInChapter(chapterId)
              }}
            >
              Nest in chapter{nestableIds.length > 1 ? ` (${nestableIds.length})` : ''}
            </button>
          </>
        )}
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
              Drag nodes from the palette · Drop into chapter groups to nest · Shift+click multi-select ·
              Select nodes + Nest in chapter · Ctrl+C/V copy/paste
            </div>
          )}
        </div>
      )}
    </div>
  )
}
