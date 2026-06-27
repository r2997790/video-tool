import { useRef, useState } from 'react'
import { AdminMenu } from '../components/AdminMenu'
import { FLOW_STEPS } from './flowSchema'
import { FLOW_NODE_COLORS } from './flowNodeColors'
import {
  downloadFlowDocument,
  mergeFlowProjects,
  parseFlowDocument,
  serializeFlowDocument,
  validateFlowDocument,
} from './flowDocument'
import { ConfirmModal } from '../components/ConfirmModal'
import type { FlowEditorState } from './useFlowEditorState'
import type { FlowNode } from '../types'
import { FlowWorkflowNav } from './FlowWorkflowNav'
import { SelectionContextBar } from './SelectionContextBar'
import {
  AddStepIcon,
  AutoArrangeIcon,
  ExportIcon,
  ImportIcon,
  SavedIcon,
  SaveIcon,
  TimelineIcon,
  VisualIcon,
} from './toolbarIcons'

interface FlowEditorToolbarProps {
  state: FlowEditorState
  onSave: (force?: boolean) => void
  onAddNode: (type: FlowNode['type']) => void
  onAutoArrange: () => void
  onViewModeChange: (view: 'timeline' | 'visual') => void
  onDeleteSelection: () => void
  onBreakLink: () => void
  onNestInChapter: (chapterNodeId: string) => void
}

const ADD_STEP_GROUPS: { label: string; types: FlowNode['type'][] }[] = [
  { label: 'Structure', types: ['chapter', 'video'] },
  { label: 'Registration', types: ['event'] },
  { label: 'Interaction', types: ['question', 'pause', 'aichat', 'toaster'] },
  { label: 'Logic', types: ['branch'] },
]

export function FlowEditorToolbar({
  state,
  onSave,
  onAddNode,
  onAutoArrange,
  onViewModeChange,
  onDeleteSelection,
  onBreakLink,
  onNestInChapter,
}: FlowEditorToolbarProps) {
  const {
    projectName,
    view,
    dirty,
    saving,
    flowSlug,
    project,
    chapters,
    chapterVideos,
    flowEnabled,
    importDocument,
  } = state

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importModal, setImportModal] = useState<{ warnings: string[]; mode: 'replace' | 'merge' } | null>(null)
  const [pendingDoc, setPendingDoc] = useState<ReturnType<typeof parseFlowDocument> | null>(null)

  const stepByType = Object.fromEntries(FLOW_STEPS.map(s => [s.type, s])) as Record<FlowNode['type'], (typeof FLOW_STEPS)[number]>

  const addStepGroups = ADD_STEP_GROUPS.map(group => ({
    label: group.label,
    items: group.types.map(type => {
      const step = stepByType[type]
      return {
        id: type,
        label: step.label,
        description: step.desc,
        color: FLOW_NODE_COLORS[type],
        onClick: () => onAddNode(type),
      }
    }),
  }))

  const handleExport = () => {
    const json = serializeFlowDocument(projectName, project, {
      slug: flowSlug,
      description: `Exported from ${flowSlug}`,
    })
    downloadFlowDocument(`${flowSlug}.flow.json`, json)
  }

  const handleImportFile = async (file: File) => {
    const text = await file.text()
    try {
      const parsed = parseFlowDocument(text)
      const validation = validateFlowDocument(parsed.document, {
        chapterCount: chapters.length,
        isEnabled: flowEnabled,
        chapterVideos,
      })
      setPendingDoc(parsed)
      setImportModal({
        warnings: [...parsed.warnings, ...validation],
        mode: project.nodes.length > 0 ? 'merge' : 'replace',
      })
    } catch (e) {
      alert(String(e))
    }
  }

  const confirmImport = () => {
    if (!pendingDoc || !importModal) return
    const { document: doc } = pendingDoc
    if (importModal.mode === 'replace') {
      importDocument(doc.project, doc.projectName)
    } else {
      const merged = mergeFlowProjects(project, doc.project)
      importDocument(merged, projectName)
    }
    setImportModal(null)
    setPendingDoc(null)
  }

  const saveLabel = saving ? 'Saving…' : dirty ? 'Save flow' : 'Saved'
  const SaveStateIcon = !saving && !dirty ? SavedIcon : SaveIcon

  return (
    <>
      <div className="flow-editor-toolbar">
        <div className="flow-editor-toolbar-row flow-editor-toolbar-primary">
          <div className="flow-view-toggle" role="tablist" aria-label="Editor view">
            {(['timeline', 'visual'] as const).map(v => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                className={`flow-view-toggle-btn admin-btn-with-icon${view === v ? ' is-active' : ''}`}
                onClick={() => onViewModeChange(v)}
              >
                {v === 'timeline' ? <TimelineIcon /> : <VisualIcon />}
                <span>{v === 'timeline' ? 'Timeline' : 'Visual'}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="admin-btn admin-btn-with-icon"
            onClick={onAutoArrange}
            title="Tidy up node positions on the visual canvas"
          >
            <AutoArrangeIcon />
            <span>Auto-arrange</span>
          </button>
          <div className="flow-editor-toolbar-actions">
            <AdminMenu
              align="left"
              groups={addStepGroups}
              trigger={
                <button type="button" className="admin-btn admin-btn-primary admin-btn-with-icon">
                  <AddStepIcon />
                  <span>Add step</span>
                </button>
              }
            />
            <button
              type="button"
              className="admin-btn admin-btn-with-icon"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImportIcon />
              <span>Import</span>
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-with-icon"
              onClick={handleExport}
            >
              <ExportIcon />
              <span>Export</span>
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-with-icon flow-editor-save-btn"
              disabled={!dirty || saving}
              onClick={() => onSave()}
            >
              <SaveStateIcon />
              <span>{saveLabel}</span>
            </button>
          </div>
        </div>
        <div className="flow-editor-toolbar-row flow-editor-toolbar-nav">
          <FlowWorkflowNav />
        </div>
        <div className="flow-editor-toolbar-row flow-editor-toolbar-selection">
          <SelectionContextBar
            state={state}
            onDeleteSelection={onDeleteSelection}
            onBreakLink={onBreakLink}
            onNestInChapter={onNestInChapter}
          />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.flow.json,application/json"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) void handleImportFile(file)
          e.target.value = ''
        }}
      />

      <ConfirmModal
        open={!!importModal && !!pendingDoc}
        title="Import flow JSON?"
        message={
          importModal
            ? `${importModal.warnings.length ? importModal.warnings.join(' ') + ' ' : ''}${
              importModal.mode === 'merge'
                ? 'Merge imported nodes into the current flow?'
                : 'Replace the current flow with the imported file?'
            }`
            : ''
        }
        confirmLabel={importModal?.mode === 'merge' ? 'Merge' : 'Replace'}
        cancelLabel="Cancel"
        onConfirm={confirmImport}
        onCancel={() => { setImportModal(null); setPendingDoc(null) }}
      />
    </>
  )
}
